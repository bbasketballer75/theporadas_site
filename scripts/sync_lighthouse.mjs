#!/usr/bin/env node
/**
 * Sync selected parts of upstream Lighthouse into the vendored `lighthouse/` directory.
 *
 * Goals:
 *  - Allow choosing a git ref (tag / commit / branch) from upstream (default: latest release tag)
 *  - Dry-run mode shows which files would change
 *  - Preserve locally modified helper scripts or patches (user-specified via --preserve globs)
 *  - Provide minimal safety checks to avoid overwriting uncommitted work
 *
 * This script purposefully focuses on the subset of Lighthouse that is actually used
 * (e.g. flow-report assets / core bundles). Full fidelity cloning is out-of-scope.
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import process from 'node:process';
import { glob } from 'glob';
import { Minimatch } from 'minimatch';

function log(msg) {
  console.log(`[sync-lh] ${msg}`);
}
function warn(msg) {
  console.warn(`[sync-lh] WARN: ${msg}`);
}
function fail(msg) {
  console.error(`[sync-lh] ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { ref: 'latest', dryRun: false, preserve: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ref') {
      out.ref = args[++i];
      continue;
    }
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--preserve') {
      out.preserve.push(args[++i]);
      continue;
    }
    if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/sync_lighthouse.mjs [--ref <git-ref>] [--dry-run] [--preserve <glob>]

Options:
  --ref <git-ref>     Upstream Lighthouse ref (tag/branch/commit). 'latest' = latest release tag.
  --dry-run           Show planned changes without copying.
  --preserve <glob>   Glob (minimatch) to exclude from overwrite inside local lighthouse/.
                       Repeatable. Examples: --preserve build/reset-link.js --preserve 'docs/**'
`);
      process.exit(0);
    }
    fail(`Unknown argument: ${a}`);
  }
  return out;
}

function ensureCleanGit() {
  const res = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (res.status !== 0) fail('git status failed');
  const lines = res.stdout.trim().split(/\n/).filter(Boolean);
  const dirty = lines.filter(
    (l) => l.startsWith(' M') || l.startsWith('A ') || l.startsWith('AM') || l.startsWith('MM'),
  );
  if (dirty.length) {
    warn('Workspace has uncommitted changes. Proceeding could overwrite local edits.');
  }
}

function getLatestTag() {
  try {
    const out = execSync('git ls-remote --tags https://github.com/GoogleChrome/lighthouse.git', {
      encoding: 'utf8',
    });
    // Tags look like: refs/tags/v11.7.0
    const tags = out
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split('\t')[1])
      .filter(Boolean)
      .filter((r) => /^refs\/tags\/v\d+\.\d+\.\d+$/.test(r));
    tags.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const last = tags[tags.length - 1];
    return last?.replace('refs/tags/', '') || null;
  } catch (e) {
    warn('Failed to fetch remote tags; falling back to hardcoded ref main');
    return 'main';
  }
}

function shouldPreserve(relPath, preserveGlobs) {
  if (!preserveGlobs.length) return false;
  return preserveGlobs.some((g) => new Minimatch(g).match(relPath));
}

async function copySubset(srcRoot, destRoot, preserveGlobs, dryRun) {
  const subsets = [
    'flow-report',
    'core/asset-saver.js',
    'core/computed/',
    'core/lib/',
    'core/config/',
    'core/fraggle-rock/',
    'report/',
    'shared/',
    'lighthouse-logger/',
    'third-party/',
    'treemap/',
    'types/',
  ];
  for (const subset of subsets) {
    const pattern = join(srcRoot, subset).replace(/\\/g, '/');
    const matches = glob.sync(pattern + (pattern.endsWith('/') ? '**/*' : ''), { nodir: true });
    for (const abs of matches) {
      const rel = abs.substring(srcRoot.length + 1).replace(/\\/g, '/');
      if (shouldPreserve(rel, preserveGlobs)) {
        log(`preserve ${rel}`);
        continue;
      }
      const dest = join(destRoot, rel);
      if (dryRun) {
        log(`would copy ${rel}`);
        continue;
      }
      // Ensure dir exists (sync okay for limited file counts)
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(abs, dest);
    }
  }
}

async function main() {
  const opts = parseArgs();
  ensureCleanGit();
  const ref = opts.ref === 'latest' ? getLatestTag() : opts.ref;
  if (!ref) fail('Could not resolve a Lighthouse ref');
  log(`Using ref: ${ref}`);

  const tmp = mkdtempSync(join(tmpdir(), 'lh-sync-'));
  log(`Cloning into temp ${tmp}`);
  const cloneCmd = `git clone --depth 1 --branch ${ref} https://github.com/GoogleChrome/lighthouse.git ${tmp}`;
  try {
    execSync(cloneCmd, { stdio: 'ignore' });
  } catch (e) {
    fail(`Clone failed for ref ${ref}: ${e.message}`);
  }

  const srcRoot = join(tmp, 'lighthouse');
  const destRoot = join(process.cwd(), 'lighthouse');
  let destExists = true;
  try {
    execSync(`test -d "${destRoot}" || echo missing`, { stdio: 'pipe' });
  } catch {
    destExists = false;
  }
  if (!destExists) fail('Expected local lighthouse/ directory');

  await copySubset(srcRoot, destRoot, opts.preserve, opts.dryRun);

  if (!opts.dryRun) {
    // Write a marker file with last sync metadata
    const metaPath = join(destRoot, 'SYNC_METADATA.json');
    writeFileSync(metaPath, JSON.stringify({ ref, date: new Date().toISOString() }, null, 2));
    log(`Wrote ${metaPath}`);
  } else {
    log('Dry-run complete (no files written).');
  }

  rmSync(tmp, { recursive: true, force: true });
  log('Done.');
}

main().catch((e) => fail(e.stack || e.message));
