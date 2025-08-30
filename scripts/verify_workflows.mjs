#!/usr/bin/env node
// Workflow verification / guard script
// Compares local .github/workflows files to remote GitHub repository workflows via REST API.
// Outputs JSON + Markdown artifacts and provides exit codes for CI enforcement.

import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');

function parseArgs(argv) {
  const args = createDefaultArgs();
  let i = 2;

  while (i < argv.length) {
    const a = argv[i];
    i = processArgument(a, argv, args, i);
  }

  return args;
}

function createDefaultArgs() {
  return {
    require: [],
    ignore: [],
    failMissing: false,
    json: false,
    noRemote: false,
    noLocal: false,
    key: 'path',
    config: null,
    outputDir: null,
    nameDiffSeverity: 'warn',
    cacheRemote: false,
    cacheTTL: 300,
    remoteJson: null,
  };
}

function processArgument(arg, argv, args, index) {
  if (isBooleanFlag(arg)) {
    processBooleanFlag(arg, args);
  } else if (isValueFlag(arg)) {
    return processValueFlag(arg, argv, args, index);
  } else if (isListFlag(arg)) {
    return processListFlag(arg, argv, args, index);
  } else if (isHelpFlag(arg)) {
    printHelp();
    process.exit(0);
  }
  return index;
}

function isBooleanFlag(arg) {
  return ['--fail-missing', '--json', '--no-remote', '--no-local', '--cache-remote'].includes(arg);
}

function processBooleanFlag(arg, args) {
  switch (arg) {
    case '--fail-missing':
      args.failMissing = true;
      break;
    case '--json':
      args.json = true;
      break;
    case '--no-remote':
      args.noRemote = true;
      break;
    case '--no-local':
      args.noLocal = true;
      break;
    case '--cache-remote':
      args.cacheRemote = true;
      break;
  }
}

function isValueFlag(arg) {
  return (
    [
      '--key',
      '--config',
      '--output',
      '--name-diff-severity',
      '--cache-ttl',
      '--remote-json',
    ].includes(arg) ||
    arg.startsWith('--key=') ||
    arg.startsWith('--config=') ||
    arg.startsWith('--output=') ||
    arg.startsWith('--name-diff-severity=') ||
    arg.startsWith('--cache-ttl=') ||
    arg.startsWith('--remote-json=')
  );
}

function processValueFlag(arg, argv, args, index) {
  if (arg === '--key' || arg.startsWith('--key=')) {
    return parseKeyArgument(argv, args, index);
  }
  if (arg === '--config' || arg.startsWith('--config=')) {
    return parseConfigArgument(argv, args, index);
  }
  if (arg === '--output' || arg.startsWith('--output=')) {
    return parseOutputArgument(argv, args, index);
  }
  if (arg === '--name-diff-severity' || arg.startsWith('--name-diff-severity=')) {
    return parseNameDiffSeverityArgument(argv, args, index);
  }
  if (arg === '--cache-ttl' || arg.startsWith('--cache-ttl=')) {
    return parseCacheTtlArgument(argv, args, index);
  }
  if (arg === '--remote-json' || arg.startsWith('--remote-json=')) {
    return parseRemoteJsonArgument(argv, args, index);
  }
  return index;
}

function isListFlag(arg) {
  return (
    ['--ignore', '--require'].includes(arg) ||
    arg.startsWith('--ignore=') ||
    arg.startsWith('--require=')
  );
}

function processListFlag(arg, argv, args, index) {
  if (arg === '--ignore' || arg.startsWith('--ignore=')) {
    return parseIgnoreArgument(argv, args, index);
  }
  if (arg === '--require' || arg.startsWith('--require=')) {
    return parseRequireArgument(argv, args, index);
  }
  return index;
}

function isHelpFlag(arg) {
  return arg === '--help' || arg === '-h';
}

function parseKeyArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--key expects a value: path|name|both');
  args.key = next.trim();
  return index;
}

function parseConfigArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--config expects a path');
  args.config = next.trim();
  return index;
}

function parseOutputArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--output expects a directory path');
  args.outputDir = next.trim();
  return index;
}

function parseNameDiffSeverityArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--name-diff-severity expects warn|fail|ignore');
  args.nameDiffSeverity = next.trim();
  return index;
}

function parseCacheTtlArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--cache-ttl expects seconds');
  args.cacheTTL = parseInt(next.trim(), 10);
  return index;
}

function parseRemoteJsonArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--remote-json expects a file path');
  args.remoteJson = next.trim();
  return index;
}

function parseIgnoreArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--ignore expects a comma-separated list');
  parseIgnoreValue(next, args);
  return index;
}

function parseIgnoreValue(value, args) {
  args.ignore.push(
    ...value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function parseRequireArgument(argv, args, index) {
  const next = argv[++index];
  if (!next) throw new Error('--require expects a comma-separated list');
  parseRequireValue(next, args);
  return index;
}

function parseRequireValue(value, args) {
  args.require.push(
    ...value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
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
      `\nConfig file schema (all optional): {\n  "key": "path|name|both", "ignore": [..], "require": [..], "outputDir": "artifacts", "nameDiffSeverity": "warn|fail|ignore", "cacheTTL": 300 }\n` +
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
  } catch (error) {
    console.warn(`[verify-workflows] Failed to derive repo from git remote: ${error.message}`);
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
  const workflowMaps = createWorkflowMaps(local, remote, norm);
  const keys = computeKeys(local, remote, keyMode);
  const details = computeDetails(keys, workflowMaps, keyMode, norm);
  const pathDifferences = computePathDifferences(local, remote);
  const nameDifferences = computeNameDifferences(local, remote, norm);

  return {
    details,
    localOnlyPaths: pathDifferences.localOnlyPaths,
    remoteOnlyPaths: pathDifferences.remoteOnlyPaths,
    nameDifferences,
  };
}

function createWorkflowMaps(local, remote, norm) {
  return {
    localByName: new Map(local.map((l) => [norm(l.name), l])),
    localByPath: new Map(local.map((l) => [norm(l.path), l])),
    remoteByName: new Map(remote.map((r) => [norm(r.name), r])),
    remoteByPath: new Map(remote.map((r) => [norm(r.path), r])),
  };
}

function computeKeys(local, remote, keyMode) {
  const keys = new Set();

  if (keyMode === 'name') {
    addKeysFromWorkflows(local, 'name', keys);
    addKeysFromWorkflows(remote, 'name', keys);
  } else if (keyMode === 'path') {
    addKeysFromWorkflows(local, 'path', keys);
    addKeysFromWorkflows(remote, 'path', keys);
  } else {
    // both
    addKeysFromWorkflows(local, 'name', keys);
    addKeysFromWorkflows(local, 'path', keys);
    addKeysFromWorkflows(remote, 'name', keys);
    addKeysFromWorkflows(remote, 'path', keys);
  }

  return keys;
}

function addKeysFromWorkflows(workflows, property, keys) {
  for (const workflow of workflows) {
    keys.add(workflow[property]);
  }
}

function computeDetails(keys, workflowMaps, keyMode, norm) {
  const details = [];

  for (const key of [...keys].sort()) {
    const { local: l, remote: r } = findWorkflowsForKey(key, workflowMaps, keyMode, norm);

    details.push({
      key,
      name: key,
      local: !!l,
      remote: !!r,
      localPath: l?.path || null,
      remotePath: r?.path || null,
    });
  }

  return details;
}

function findWorkflowsForKey(key, workflowMaps, keyMode, norm) {
  const { localByName, localByPath, remoteByName, remoteByPath } = workflowMaps;
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

  return { local: l, remote: r };
}

function computePathDifferences(local, remote) {
  const localPaths = new Set(local.map((l) => l.path));
  const remotePaths = new Set(remote.map((r) => r.path));
  const localOnlyPaths = [...localPaths].filter((p) => !remotePaths.has(p));
  const remoteOnlyPaths = [...remotePaths].filter((p) => !localPaths.has(p));

  return { localOnlyPaths, remoteOnlyPaths };
}

function computeNameDifferences(local, remote, norm) {
  const byPathRemote = new Map(remote.map((r) => [norm(r.path), r]));
  const nameDifferences = [];

  for (const l of local) {
    const r = byPathRemote.get(norm(l.path));
    if (r && norm(r.name) !== norm(l.name)) {
      nameDifferences.push({ path: l.path, localName: l.name, remoteName: r.name });
    }
  }

  return nameDifferences;
}

function evaluateRequired(required, details) {
  if (!required.length) return { missing: [] };

  const indices = createRequirementIndices(details);
  const missing = [];

  for (const req of required) {
    const missingItem = checkRequirement(req, indices);
    if (missingItem) missing.push(missingItem);
  }

  return { missing };
}

function createRequirementIndices(details) {
  return {
    nameIndex: new Map(details.map((d) => [d.name.toLowerCase(), d])),
    pathIndex: new Map(details.map((d) => [d.localPath?.toLowerCase(), d])),
  };
}

function checkRequirement(req, indices) {
  const key = req.toLowerCase();
  const detail = indices.nameIndex.get(key) || indices.pathIndex.get(key);

  if (!detail) {
    return { requirement: req, reason: 'Not found locally or remotely by name/path' };
  }

  if (!detail.local) {
    return { requirement: req, reason: 'Missing locally' };
  }

  if (!detail.remote) {
    return { requirement: req, reason: 'Missing remotely' };
  }

  return null;
}

function buildMarkdown(summary) {
  const lines = [];

  addHeader(lines, summary);
  addTableSection(lines, summary);
  addNameDifferencesSection(lines, summary);
  addMissingRequiredSection(lines, summary);
  addPathMismatchesSection(lines, summary);

  return lines.join('\n');
}

function addHeader(lines, summary) {
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
}

function addTableSection(lines, summary) {
  addTableHeader(lines);
  addTableRows(lines, summary);
}

function addTableHeader(lines) {
  lines.push('| Key | Local | Remote | Local Path | Remote Path |');
  lines.push('| ---- | ----- | ------ | ---------- | ----------- |');
}

function addTableRows(lines, summary) {
  for (const d of summary.diff.details) {
    if (shouldSkipTableRow(d, summary)) continue;
    addTableRow(lines, d);
  }
}

function addTableRow(lines, detail) {
  lines.push(
    `| ${detail.key} | ${detail.local ? '✅' : '❌'} | ${detail.remote ? '✅' : '❌'} | ${detail.localPath || ''} | ${detail.remotePath || ''} |`,
  );
}

function shouldSkipTableRow(detail, summary) {
  return (
    summary.options.key === 'path' &&
    detail.local &&
    detail.remote &&
    detail.localPath === detail.remotePath
  );
}

function addNameDifferencesSection(lines, summary) {
  if (!summary.diff.nameDifferences?.length) return;

  lines.push('');
  lines.push('## Name Differences (same path)');
  for (const nd of summary.diff.nameDifferences) {
    lines.push(`- ${nd.path}: local="${nd.localName}" remote="${nd.remoteName}"`);
  }
}

function addMissingRequiredSection(lines, summary) {
  if (!summary.required.missing.length) return;

  lines.push('');
  lines.push('## Missing Required Workflows');
  for (const m of summary.required.missing) {
    lines.push(`- ${m.requirement}: ${m.reason}`);
  }
}

function addPathMismatchesSection(lines, summary) {
  if (!summary.diff.localOnlyPaths.length && !summary.diff.remoteOnlyPaths.length) return;

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

async function loadConfig(args) {
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
      mergeConfigData(args, configData);
    }
  } catch (e) {
    console.error('Failed to read config file:', e.message);
  }
  return configData;
}

function mergeConfigData(args, configData) {
  mergeIgnoreList(args, configData);
  mergeRequireList(args, configData);
  mergeKeyOption(args, configData);
  mergeOutputDir(args, configData);
  mergeNameDiffSeverity(args, configData);
  mergeCacheTTL(args, configData);
}

function mergeIgnoreList(args, configData) {
  if (configData.ignore && Array.isArray(configData.ignore)) {
    const mergedIgnore = new Set([
      ...configData.ignore.map((v) => String(v).trim()).filter(Boolean),
      ...args.ignore,
    ]);
    args.ignore = [...mergedIgnore];
  }
}

function mergeRequireList(args, configData) {
  if (configData.require && Array.isArray(configData.require)) {
    const mergedReq = new Set([
      ...configData.require.map((v) => String(v).trim()).filter(Boolean),
      ...args.require,
    ]);
    args.require = [...mergedReq];
  }
}

function mergeKeyOption(args, configData) {
  if (
    configData.key &&
    !process.argv.includes('--key') &&
    !process.argv.find((a) => a.startsWith('--key='))
  ) {
    args.key = configData.key;
  }
}

function mergeOutputDir(args, configData) {
  if (
    configData.outputDir &&
    !process.argv.includes('--output') &&
    !process.argv.find((a) => a.startsWith('--output='))
  ) {
    args.outputDir = configData.outputDir;
  }
}

function mergeNameDiffSeverity(args, configData) {
  if (
    configData.nameDiffSeverity &&
    !process.argv.includes('--name-diff-severity') &&
    !process.argv.find((a) => a.startsWith('--name-diff-severity='))
  ) {
    args.nameDiffSeverity = configData.nameDiffSeverity;
  }
}

function mergeCacheTTL(args, configData) {
  if (
    typeof configData.cacheTTL === 'number' &&
    !process.argv.includes('--cache-ttl') &&
    !process.argv.find((a) => a.startsWith('--cache-ttl='))
  ) {
    args.cacheTTL = configData.cacheTTL;
  }
}

async function setupRemoteWorkflows(args, repo, token) {
  let remote = [];
  let remoteAccess = { attempted: !args.noRemote, error: null, status: null };
  if (!args.noRemote) {
    if (args.remoteJson) {
      ({ remote, remoteAccess } = await loadRemoteJson(args, remoteAccess));
    } else if (!repo) {
      remoteAccess.error = 'Cannot derive repo (no git remote and GITHUB_REPOSITORY unset)';
    } else {
      ({ remote, remoteAccess } = await fetchRemoteWorkflowsWithCache(
        args,
        repo,
        token,
        remoteAccess,
      ));
    }
  }
  return { remote, remoteAccess };
}

async function loadRemoteJson(args, remoteAccess) {
  let remote = [];
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
  return { remote, remoteAccess };
}

async function fetchRemoteWorkflowsWithCache(args, repo, token, remoteAccess) {
  let remote = [];
  let fetched;
  let usedCache = false;
  if (args.cacheRemote) {
    ({ remote, usedCache, fetched } = await tryLoadFromCache(args, repo, token));
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
  return { remote, remoteAccess };
}

async function tryLoadFromCache(args, repo, token) {
  let remote = [];
  let usedCache = false;
  let fetched;
  try {
    const cacheDir = path.join(ARTIFACTS_DIR, '.cache');
    await fs.mkdir(cacheDir, { recursive: true });
    const cacheKey = repo.replace(/[^a-zA-Z0-9_.-]/g, '_');
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
  return { remote, usedCache, fetched };
}

function applyIgnoreFiltering(args, remote) {
  let ignored = [];
  if (args.ignore.length && remote.length) {
    const { kept, ignored: ignoredItems } = filterRemoteWorkflows(args.ignore, remote);
    ignored = ignoredItems;
    remote = kept;
  }
  return { remote, ignored };
}

function filterRemoteWorkflows(ignoreList, remote) {
  const { exact, patterns } = parseIgnoreList(ignoreList);
  return applyFiltering(exact, patterns, remote);
}

function parseIgnoreList(ignoreList) {
  const exact = new Set();
  const patterns = [];
  for (const raw of ignoreList) {
    const val = raw.trim();
    if (!val) continue;
    const isGlob = /[*?]/.test(val);
    if (!isGlob) {
      exact.add(val.toLowerCase());
      continue;
    }
    if (!/^[A-Za-z0-9._\-/*?]+$/.test(val)) {
      console.warn('Ignoring potentially unsafe pattern (disallowed chars):', val);
      continue;
    }
    const regexStr = buildRegexString(val);
    try {
      patterns.push(new RegExp('^' + regexStr + '$', 'i'));
    } catch (e) {
      console.warn('Invalid ignore pattern skipped:', val, e.message);
    }
  }
  return { exact, patterns };
}

function buildRegexString(val) {
  let regexStr = '';
  for (const ch of val) {
    if (ch === '*') regexStr += '.*';
    else if (ch === '?') regexStr += '.';
    else if (/[.\\+^$()|{}[\]/]/.test(ch)) regexStr += `\\${ch}`;
    else regexStr += ch;
  }
  return regexStr;
}

function applyFiltering(exact, patterns, remote) {
  const kept = [];
  const ignored = [];
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
  return { kept, ignored };
}

async function writeOutputFiles(summary, args) {
  const outDir = determineOutputDir(args);
  await fs.mkdir(outDir, { recursive: true });
  const jsonOut = path.join(outDir, 'workflows-verify.json');
  const mdOut = path.join(outDir, 'workflows-verify.md');

  const summaryJson = JSON.stringify(summary, null, 2);
  const summaryMd = buildMarkdown(summary);
  await fs.writeFile(jsonOut, summaryJson);
  await fs.writeFile(mdOut, summaryMd);

  return { jsonOut, mdOut };
}

function determineOutputDir(args) {
  if (!args.outputDir) {
    return ARTIFACTS_DIR;
  }
  return path.isAbsolute(args.outputDir)
    ? args.outputDir
    : path.join(process.cwd(), args.outputDir);
}

function calculateExitCode(args, summary, remoteAccess) {
  let exitCode = 0;
  if (!args.noRemote && remoteAccess.error) exitCode = 2;
  if (summary.required.missing.length) exitCode = Math.max(exitCode, 3);
  if (
    args.failMissing &&
    (summary.diff.localOnlyPaths.length || summary.diff.remoteOnlyPaths.length)
  ) {
    exitCode = Math.max(exitCode, 4);
  }
  if (args.nameDiffSeverity === 'fail' && summary.diff.nameDifferences.length) {
    exitCode = Math.max(exitCode, 5);
  }
  return exitCode;
}

async function prepareWorkflowData(args) {
  const repo = deriveRepo();
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_INSTALLATION_TOKEN;
  const local = args.noLocal ? [] : await listLocalWorkflows();
  const { remote, remoteAccess } = await setupRemoteWorkflows(args, repo, token);
  const { remote: filteredRemote, ignored } = applyIgnoreFiltering(args, remote);

  return { repo, token, local, remote: filteredRemote, ignored, remoteAccess };
}

function computeWorkflowAnalysis(local, filteredRemote, args) {
  const diff = computeSets(local, filteredRemote, args.key);
  const required = evaluateRequired(args.require, diff.details);
  return { diff, required };
}

function createSummary(repo, local, filteredRemote, ignored, analysis, remoteAccess, args) {
  return {
    repo,
    local,
    remote: filteredRemote,
    ignored,
    diff: analysis.diff,
    required: analysis.required,
    remoteAccess,
    generatedAt: new Date().toISOString(),
    options: { ...args },
  };
}

async function handleGitHubActionsSummary(summary) {
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
}

function printResults(args, summary, filteredRemote, jsonOut, mdOut) {
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printSummaryStats(summary, filteredRemote);
  printMissingRequired(summary);
  printPathMismatches(summary);
  printNameDifferences(args, summary);
  printRemoteAccessError(summary);
  printIgnoredCount(summary);
  printArtifactsWritten(jsonOut, mdOut);
}

function printSummaryStats(summary, filteredRemote) {
  console.log(
    `Workflow verification: local=${summary.local.length} remote=${filteredRemote.length}${summary.remoteAccess.error ? ' (remote access error)' : ''}`,
  );
}

function printMissingRequired(summary) {
  const missingReq = summary.required.missing.length;
  if (missingReq) console.log(`Missing required: ${missingReq}`);
}

function printPathMismatches(summary) {
  const mismatch = summary.diff.localOnlyPaths.length || summary.diff.remoteOnlyPaths.length;
  if (mismatch) {
    console.log(
      `Path mismatches: localOnly=${summary.diff.localOnlyPaths.length} remoteOnly=${summary.diff.remoteOnlyPaths.length}`,
    );
  }
}

function printNameDifferences(args, summary) {
  if (summary.diff.nameDifferences.length && args.nameDiffSeverity !== 'ignore') {
    console.log(
      `Name differences: ${summary.diff.nameDifferences.length} (mode=${args.nameDiffSeverity})`,
    );
  }
}

function printRemoteAccessError(summary) {
  if (summary.remoteAccess.error) {
    console.log(`Remote access error: ${summary.remoteAccess.error}`);
  }
}

function printIgnoredCount(summary) {
  if (summary.ignored.length) {
    console.log(`Ignored remote entries: ${summary.ignored.length}`);
  }
}

function printArtifactsWritten(jsonOut, mdOut) {
  console.log(
    `Artifacts written: ${path.relative(process.cwd(), jsonOut)}, ${path.relative(
      process.cwd(),
      mdOut,
    )}`,
  );
}

async function main() {
  const args = parseArgs(process.argv);
  await loadConfig(args);

  const {
    repo,
    local,
    remote: filteredRemote,
    ignored,
    remoteAccess,
  } = await prepareWorkflowData(args);
  const { diff, required } = computeWorkflowAnalysis(local, filteredRemote, args);
  const summary = createSummary(
    repo,
    local,
    filteredRemote,
    ignored,
    { diff, required },
    remoteAccess,
    args,
  );

  const { jsonOut, mdOut } = await writeOutputFiles(summary, args);
  await handleGitHubActionsSummary(summary);
  printResults(args, summary, filteredRemote, jsonOut, mdOut);

  const exitCode = calculateExitCode(args, summary, remoteAccess);
  process.exit(exitCode);
}

function safeRun() {
  main().catch((err) => {
    console.error('verify_workflows.mjs failed:', err.stack || err);
    process.exit(1);
  });
}

safeRun();
