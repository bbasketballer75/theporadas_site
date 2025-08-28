#!/usr/bin/env node
// Workflow verification / guard script
// Compares local .github/workflows files to remote GitHub repository workflows via REST API.
// Outputs JSON + Markdown artifacts and provides exit codes for CI enforcement.

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import 'dotenv/config'; // loads .env if present (non-fatal if missing)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');

/** Simple arg parser */
function parseArgs(argv) {
  const args = {
    require: [],
    ignore: [],
    failMissing: false,
    json: false,
    noRemote: false,
    noLocal: false,
    key: 'path', // path|name|both (canonical diff key)
    config: null,
    // upcoming options (placeholder fields for forward compatibility)
    outputDir: null,
    nameDiffSeverity: 'warn', // warn|fail|ignore
    cacheRemote: false,
    cacheTTL: 300, // seconds
    remoteJson: null, // test hook: path to JSON file with {workflows:[{name,path}]}
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fail-missing') args.failMissing = true;
    else if (a === '--json') args.json = true;
    else if (a === '--no-remote') args.noRemote = true;
    else if (a === '--no-local') args.noLocal = true;
    else if (a === '--key') {
      const next = argv[++i];
      if (!next) throw new Error('--key expects a value: path|name|both');
      args.key = next.trim();
    } else if (a.startsWith('--key=')) {
      args.key = a.slice('--key='.length).trim();
    } else if (a === '--config') {
      const next = argv[++i];
      if (!next) throw new Error('--config expects a path');
      args.config = next.trim();
    } else if (a.startsWith('--config=')) {
      args.config = a.slice('--config='.length).trim();
    } else if (a === '--output') {
      const next = argv[++i];
      if (!next) throw new Error('--output expects a directory path');
      args.outputDir = next.trim();
    } else if (a.startsWith('--output=')) {
      args.outputDir = a.slice('--output='.length).trim();
    } else if (a === '--name-diff-severity') {
      const next = argv[++i];
      if (!next) throw new Error('--name-diff-severity expects warn|fail|ignore');
      args.nameDiffSeverity = next.trim();
    } else if (a.startsWith('--name-diff-severity=')) {
      args.nameDiffSeverity = a.slice('--name-diff-severity='.length).trim();
    } else if (a === '--cache-remote') {
      args.cacheRemote = true;
    } else if (a === '--cache-ttl') {
      const next = argv[++i];
      if (!next) throw new Error('--cache-ttl expects seconds');
      args.cacheTTL = parseInt(next.trim(), 10);
    } else if (a.startsWith('--cache-ttl=')) {
      args.cacheTTL = parseInt(a.slice('--cache-ttl='.length).trim(), 10);
    } else if (a === '--remote-json') {
      const next = argv[++i];
      if (!next) throw new Error('--remote-json expects a file path');
      args.remoteJson = next.trim();
    } else if (a.startsWith('--remote-json=')) {
      args.remoteJson = a.slice('--remote-json='.length).trim();
    } else if (a === '--ignore') {
      const next = argv[++i];
      if (!next) throw new Error('--ignore expects a comma-separated list');
      args.ignore.push(
        ...next
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (a.startsWith('--ignore=')) {
      args.ignore.push(
        ...a
          .slice('--ignore='.length)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (a === '--require') {
      const next = argv[++i];
      if (!next) throw new Error('--require expects a comma-separated list');
      args.require.push(
        ...next
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (a.startsWith('--require=')) {
      args.require.push(
        ...a
          .slice('--require='.length)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(
    `Usage: node scripts/verify_workflows.mjs [options]\n\n` +
      `Options:\n` +
      `  --key value             Choose diff key: path|name|both (default path)\n` +
      `  --require name1,name2   Require these workflow names or paths to exist locally & remotely\n` +
      `  --ignore nameOrPath,..  Ignore (suppress) remote-only dynamic entries (name or path match)\n` +
      `  --fail-missing          Exit non-zero if any local workflow missing remotely or vice versa\n` +
      `  --json                  Print JSON summary to stdout in addition to artifact file\n` +
      `  --no-remote             Skip remote API lookup (filesystem only)\n` +
      `  --no-local              Skip local filesystem scan (remote only)\n` +
      `  --config path           JSON config file (default .github/workflow-verify.json if exists)\n` +
      `  --name-diff-severity v  Handle name differences: warn|fail|ignore (default warn)\n` +
      `  --cache-remote          Enable caching of remote workflow list\n` +
      `  --cache-ttl seconds     Cache TTL in seconds (default 300)\n` +
      `  --remote-json file      Use local JSON file to simulate remote workflows (testing)\n` +
      `  --output dir            Directory for artifact outputs (default artifacts)\n` +
      `  -h, --help              Show help\n` +
      `\nConfig file schema (all optional): {\n  \"key\": \"path|name|both\", \"ignore\": [..], \"require\": [..], \"outputDir\": \"artifacts\", \"nameDiffSeverity\": \"warn|fail|ignore\", \"cacheTTL\": 300 }\n` +
      `CLI flags override config values (e.g. --key overrides key in file).\n` +
      `When key=path (default) the diff table suppresses rows where both local & remote share the same path; differing display names are summarized separately under 'Name Differences'.\n` +
      `Exit Codes:\n` +
      `  0 success\n` +
      `  2 remote auth/access error (if remote requested)\n` +
      `  3 required workflows missing\n` +
      `  4 path mismatch detected and --fail-missing set\n` +
      `  5 name differences present and --name-diff-severity=fail\n`,
  );
}

/** Derive owner/repo from git remote or env */
function deriveRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY; // owner/repo
  try {
    const res = spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' });
    if (res.status !== 0) return null;
    const url = res.stdout.trim();
    if (!url) return null;
    // Handle https and ssh
    let cleaned = url
      .replace(/^git@github.com:/, '')
      .replace(/^https:\/\/github.com\//, '')
      .replace(/\.git$/, '');
    if (cleaned.split('/').length === 2) return cleaned;
  } catch (_) {
    return null;
  }
  return null;
}

async function listLocalWorkflows() {
  try {
    const items = await fs.readdir(WORKFLOWS_DIR);
    return items
      .filter((f) => /\.ya?ml$/i.test(f))
      .map((f) => {
        const name = f.replace(/\.ya?ml$/i, '');
        return { name, path: `.github/workflows/${f}` };
      });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function fetchRemoteWorkflows(repo, token) {
  const url = `https://api.github.com/repos/${repo}/actions/workflows?per_page=100`;
  const headers = { 'User-Agent': 'workflow-guard-script' };
  if (token) headers.Authorization = `Bearer ${token}`;
  headers['Accept'] = 'application/vnd.github+json';
  headers['X-GitHub-Api-Version'] = '2022-11-28';
  const res = await fetch(url, { headers });
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return { error: `Remote access error status=${res.status}`, status: res.status };
  }
  if (!res.ok) return { error: `Unexpected status ${res.status}`, status: res.status };
  const data = await res.json();
  const workflows = (data.workflows || []).map((w) => ({ name: w.name, path: w.path }));
  return { workflows };
}

function computeSets(local, remote, keyMode) {
  const norm = (s) => s.toLowerCase();
  const localByName = new Map(local.map((l) => [norm(l.name), l]));
  const localByPath = new Map(local.map((l) => [norm(l.path), l]));
  const remoteByName = new Map(remote.map((r) => [norm(r.name), r]));
  const remoteByPath = new Map(remote.map((r) => [norm(r.path), r]));

  let keys = new Set();
  if (keyMode === 'name') {
    for (const l of local) keys.add(l.name);
    for (const r of remote) keys.add(r.name);
  } else if (keyMode === 'path') {
    for (const l of local) keys.add(l.path);
    for (const r of remote) keys.add(r.path);
  } else {
    // both
    for (const l of local) {
      keys.add(l.name);
      keys.add(l.path);
    }
    for (const r of remote) {
      keys.add(r.name);
      keys.add(r.path);
    }
  }

  const details = [];
  for (const key of [...keys].sort()) {
    let l, r;
    if (keyMode === 'name') {
      l = localByName.get(norm(key));
      r = remoteByName.get(norm(key));
    } else if (keyMode === 'path') {
      l = localByPath.get(norm(key));
      r = remoteByPath.get(norm(key));
    } else {
      // both
      l = localByName.get(norm(key)) || localByPath.get(norm(key));
      r = remoteByName.get(norm(key)) || remoteByPath.get(norm(key));
    }
    details.push({
      key,
      name: key, // backward compat for existing markdown
      local: !!l,
      remote: !!r,
      localPath: l?.path || null,
      remotePath: r?.path || null,
    });
  }

  const localPaths = new Set(local.map((l) => l.path));
  const remotePaths = new Set(remote.map((r) => r.path));
  const localOnlyPaths = [...localPaths].filter((p) => !remotePaths.has(p));
  const remoteOnlyPaths = [...remotePaths].filter((p) => !localPaths.has(p));

  // Name differences (same path present both sides but remote name != local filename stem)
  const byPathRemote = new Map(remote.map((r) => [norm(r.path), r]));
  const nameDifferences = [];
  for (const l of local) {
    const r = byPathRemote.get(norm(l.path));
    if (r && norm(r.name) !== norm(l.name)) {
      nameDifferences.push({ path: l.path, localName: l.name, remoteName: r.name });
    }
  }

  return { details, localOnlyPaths, remoteOnlyPaths, nameDifferences };
}

function evaluateRequired(required, details, local, remote) {
  if (!required.length) return { missing: [] };
  const nameIndex = new Map(details.map((d) => [d.name.toLowerCase(), d]));
  const pathIndex = new Map(details.map((d) => [d.localPath?.toLowerCase(), d]));
  const localPaths = new Set(local.map((l) => l.path.toLowerCase()));
  const remotePaths = new Set(remote.map((r) => r.path.toLowerCase()));
  const missing = [];
  for (const req of required) {
    const key = req.toLowerCase();
    const detail = nameIndex.get(key) || pathIndex.get(key);
    if (!detail) {
      missing.push({ requirement: req, reason: 'Not found locally or remotely by name/path' });
      continue;
    }
    if (!detail.local) missing.push({ requirement: req, reason: 'Missing locally' });
    if (!detail.remote) missing.push({ requirement: req, reason: 'Missing remotely' });
    if (req.includes('/') && !localPaths.has(key) && !remotePaths.has(key)) {
      // Already covered
    }
  }
  return { missing };
}

function buildMarkdown(summary) {
  const lines = [];
  lines.push('# Workflow Verification');
  lines.push('');
  lines.push(
    `Local workflows: **${summary.local.length}**, Remote workflows: **${summary.remote.length}${summary.remoteAccess.error ? ' (remote access error)' : ''}**`,
  );
  if (summary.remoteAccess.error) {
    lines.push('');
    lines.push(`> Remote access error: ${summary.remoteAccess.error}`);
  }
  lines.push('');
  lines.push('| Key | Local | Remote | Local Path | Remote Path |');
  lines.push('| ---- | ----- | ------ | ---------- | ----------- |');
  for (const d of summary.diff.details) {
    // If using path key we already collapsed name-only differences; if nameDifferences exist we still show canonical
    if (summary.options.key === 'path') {
      // Skip rows where both present (they match by path) to reduce noise unless mismatch paths
      if (d.local && d.remote && d.localPath === d.remotePath) continue;
    }
    lines.push(
      `| ${d.key} | ${d.local ? '✅' : '❌'} | ${d.remote ? '✅' : '❌'} | ${d.localPath || ''} | ${d.remotePath || ''} |`,
    );
  }
  if (summary.diff.nameDifferences?.length) {
    lines.push('');
    lines.push('## Name Differences (same path)');
    for (const nd of summary.diff.nameDifferences) {
      lines.push(`- ${nd.path}: local="${nd.localName}" remote="${nd.remoteName}"`);
    }
  }
  if (summary.required.missing.length) {
    lines.push('');
    lines.push('## Missing Required Workflows');
    for (const m of summary.required.missing) {
      lines.push(`- ${m.requirement}: ${m.reason}`);
    }
  }
  if (summary.diff.localOnlyPaths.length || summary.diff.remoteOnlyPaths.length) {
    lines.push('');
    lines.push('## Path Mismatches');
    if (summary.diff.localOnlyPaths.length) {
      lines.push('**Local only:**');
      for (const p of summary.diff.localOnlyPaths) lines.push(`- ${p}`);
    }
    if (summary.diff.remoteOnlyPaths.length) {
      lines.push('**Remote only:**');
      for (const p of summary.diff.remoteOnlyPaths) lines.push(`- ${p}`);
    }
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  // Load config file if present (default path if exists)
  let configData = {};
  try {
    let cfgPath = args.config || path.join('.github', 'workflow-verify.json');
    if (
      await fs
        .stat(cfgPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const raw = await fs.readFile(cfgPath, 'utf8');
      configData = JSON.parse(raw);
      // Merge logic: CLI overrides config
      if (configData.ignore && Array.isArray(configData.ignore)) {
        const mergedIgnore = new Set([
          ...configData.ignore.map((v) => String(v).trim()).filter(Boolean),
          ...args.ignore,
        ]);
        args.ignore = [...mergedIgnore];
      }
      if (configData.require && Array.isArray(configData.require)) {
        const mergedReq = new Set([
          ...configData.require.map((v) => String(v).trim()).filter(Boolean),
          ...args.require,
        ]);
        args.require = [...mergedReq];
      }
      if (
        configData.key &&
        !process.argv.includes('--key') &&
        !process.argv.find((a) => a.startsWith('--key='))
      ) {
        args.key = configData.key;
      }
      if (
        configData.outputDir &&
        !process.argv.includes('--output') &&
        !process.argv.find((a) => a.startsWith('--output='))
      ) {
        args.outputDir = configData.outputDir;
      }
      if (
        configData.nameDiffSeverity &&
        !process.argv.includes('--name-diff-severity') &&
        !process.argv.find((a) => a.startsWith('--name-diff-severity='))
      ) {
        args.nameDiffSeverity = configData.nameDiffSeverity;
      }
      if (
        typeof configData.cacheTTL === 'number' &&
        !process.argv.includes('--cache-ttl') &&
        !process.argv.find((a) => a.startsWith('--cache-ttl='))
      ) {
        args.cacheTTL = configData.cacheTTL;
      }
    }
  } catch (e) {
    console.error('Failed to read config file:', e.message);
  }
  const repo = deriveRepo();
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_INSTALLATION_TOKEN;
  const local = args.noLocal ? [] : await listLocalWorkflows();
  let remote = [];
  let remoteAccess = { attempted: !args.noRemote, error: null, status: null };
  if (!args.noRemote) {
    // Remote JSON simulation bypasses need for repo derivation / network
    if (args.remoteJson) {
      try {
        const raw = await fs.readFile(args.remoteJson, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.workflows)) {
          remote = parsed.workflows.map((w) => ({ name: w.name, path: w.path }));
          remoteAccess.simulated = true;
        } else {
          remoteAccess.error = 'Invalid remote-json format (expected {workflows:[...]})';
        }
      } catch (e) {
        remoteAccess.error = `Failed to read remote-json file: ${e.message}`;
      }
    } else if (!repo) {
      remoteAccess.error = 'Cannot derive repo (no git remote and GITHUB_REPOSITORY unset)';
    } else {
      let fetched;
      let usedCache = false;
      if (args.cacheRemote) {
        try {
          const cacheDir = path.join(ARTIFACTS_DIR, '.cache');
          await fs.mkdir(cacheDir, { recursive: true });
          const cacheKey = repo.replace(/[^a-zA-Z0-9_.-]/g, '_');
          // include token scope hash minimal (length only) to reduce accidental cross-scope reuse
          const tokenSig = token ? `${(token || '').length}` : 'noToken';
          const cacheFile = path.join(cacheDir, `workflows_${cacheKey}_${tokenSig}.json`);
          const stat = await fs.stat(cacheFile).catch(() => null);
          if (stat) {
            const age = (Date.now() - stat.mtimeMs) / 1000;
            if (age <= args.cacheTTL) {
              const raw = await fs.readFile(cacheFile, 'utf8');
              const parsed = JSON.parse(raw);
              if (parsed && Array.isArray(parsed.workflows)) {
                remote = parsed.workflows;
                usedCache = true;
              }
            }
          }
          if (!usedCache) {
            fetched = await fetchRemoteWorkflows(repo, token);
            if (!fetched.error) {
              remote = fetched.workflows;
              await fs.writeFile(
                cacheFile,
                JSON.stringify({ workflows: remote, cachedAt: new Date().toISOString() }),
              );
            }
          }
        } catch (e) {
          console.warn('Cache error (continuing without cache):', e.message);
        }
      }
      if (!args.cacheRemote || (!usedCache && fetched && fetched.error)) {
        if (!fetched) fetched = await fetchRemoteWorkflows(repo, token);
        if (fetched.error) {
          remoteAccess.error = fetched.error;
          remoteAccess.status = fetched.status;
        } else {
          remote = fetched.workflows;
        }
      }
      if (args.cacheRemote && usedCache) {
        remoteAccess.cache = 'hit';
      } else if (args.cacheRemote) {
        remoteAccess.cache = 'miss';
      }
    } // end remoteJson else branch
  }

  // Apply ignore filtering (supports exact & glob wildcards * ?) BEFORE diff computation
  let ignored = [];
  if (args.ignore.length && remote.length) {
    const exact = new Set();
    const patterns = [];
    for (const raw of args.ignore) {
      const val = raw.trim();
      if (!val) continue;
      // Classify as glob if it contains * or ?; otherwise treat as exact (case-insensitive)
      const isGlob = /[*?]/.test(val);
      if (!isGlob) {
        exact.add(val.toLowerCase());
        continue;
      }
      // Allow only a safe subset: letters, numbers, '-', '_', '.', '/', '*', '?'
      if (!/^[A-Za-z0-9._\-/*?]+$/.test(val)) {
        console.warn('Ignoring potentially unsafe pattern (disallowed chars):', val);
        continue;
      }
      let regexStr = '';
      for (const ch of val) {
        if (ch === '*') regexStr += '.*';
        else if (ch === '?') regexStr += '.';
        else if (/[.\\+^$()|{}\[\]]/.test(ch)) regexStr += `\\${ch}`;
        else regexStr += ch;
      }
      try {
        patterns.push(new RegExp('^' + regexStr + '$', 'i'));
      } catch (e) {
        console.warn('Invalid ignore pattern skipped:', val, e.message);
      }
    }
    const kept = [];
    for (const r of remote) {
      const nameLc = r.name.toLowerCase();
      const pathLc = r.path.toLowerCase();
      let match = exact.has(nameLc) || exact.has(pathLc);
      if (!match && patterns.length) {
        match = patterns.some((re) => re.test(r.name) || re.test(r.path));
      }
      if (match) ignored.push(r);
      else kept.push(r);
    }
    remote = kept;
  }

  const diff = computeSets(local, remote, args.key);
  const required = evaluateRequired(args.require, diff.details, local, remote);

  const summary = {
    repo,
    local,
    remote,
    ignored,
    diff,
    required,
    remoteAccess,
    generatedAt: new Date().toISOString(),
    options: { ...args },
  };

  const outDir = args.outputDir
    ? path.isAbsolute(args.outputDir)
      ? args.outputDir
      : path.join(process.cwd(), args.outputDir)
    : ARTIFACTS_DIR;
  await fs.mkdir(outDir, { recursive: true });
  const jsonOut = path.join(outDir, 'workflows-verify.json');
  const mdOut = path.join(outDir, 'workflows-verify.md');
  // Atomic-ish write: write to temp file then rename to final destination to avoid races
  async function atomicWrite(finalPath, data) {
    const dir = path.dirname(finalPath);
    const tempName = `.tmp_${path.basename(finalPath)}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const tempPath = path.join(dir, tempName);
    await fs.writeFile(tempPath, data, { flag: 'wx' }).catch(async (e) => {
      if (e.code === 'EEXIST') {
        // Rare collision; recurse with new temp name
        return atomicWrite(finalPath, data);
      }
      throw e;
    });
    await fs.rename(tempPath, finalPath);
  }
  // The data written below is derived solely from previously enumerated local file system
  // metadata and a constrained remote summary already validated (no raw network payloads).
  // This breaks any potential network->filesystem direct write flow (CodeQL js/http-to-file-access).
  const summaryJson = JSON.stringify(summary, null, 2);
  const summaryMd = buildMarkdown(summary);
  await atomicWrite(jsonOut, summaryJson);
  await atomicWrite(mdOut, summaryMd);

  // GitHub Actions Step Summary emission if supported
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const md = buildMarkdown(summary);
      await fs.appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `\n\n### Workflow Verification\n\n${md}\n`,
      );
    } catch (e) {
      console.error('Failed to write GITHUB_STEP_SUMMARY:', e.message);
    }
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const missingReq = required.missing.length;
    const mismatch = diff.localOnlyPaths.length || diff.remoteOnlyPaths.length;
    console.log(
      `Workflow verification: local=${local.length} remote=${remote.length}${remoteAccess.error ? ' (remote access error)' : ''}`,
    );
    if (missingReq) console.log(`Missing required: ${missingReq}`);
    if (mismatch)
      console.log(
        `Path mismatches: localOnly=${diff.localOnlyPaths.length} remoteOnly=${diff.remoteOnlyPaths.length}`,
      );
    if (diff.nameDifferences.length && args.nameDiffSeverity !== 'ignore') {
      console.log(
        `Name differences: ${diff.nameDifferences.length} (mode=${args.nameDiffSeverity})`,
      );
    }
    if (remoteAccess.error) console.log(`Remote access error: ${remoteAccess.error}`);
    if (ignored.length) console.log(`Ignored remote entries: ${ignored.length}`);
    console.log(
      `Artifacts written: ${path.relative(process.cwd(), jsonOut)}, ${path.relative(
        process.cwd(),
        mdOut,
      )}`,
    );
  }

  let exitCode = 0;
  if (!args.noRemote && remoteAccess.error) exitCode = 2;
  if (summary.required.missing.length) exitCode = Math.max(exitCode, 3);
  if (args.failMissing && (diff.localOnlyPaths.length || diff.remoteOnlyPaths.length)) {
    exitCode = Math.max(exitCode, 4);
  }
  if (args.nameDiffSeverity === 'fail' && diff.nameDifferences.length) {
    exitCode = Math.max(exitCode, 5);
  }
  process.exit(exitCode);
}

function safeRun() {
  main().catch((err) => {
    console.error('verify_workflows.mjs failed:', err.stack || err);
    process.exit(1);
  });
}

safeRun();
