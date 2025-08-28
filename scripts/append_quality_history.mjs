#!/usr/bin/env node
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, openSync, closeSync } from 'node:fs';

/*
  Append a single JSON line of quality metrics to artifacts/quality-history.jsonl
  Metrics gathered (if present):
    timestamp (iso)
    git: { commit, branch }
    coverage: { statements, branches, functions, lines }
    bundle: { total: { raw, gzip, brotli } }
    tokens: { net, added, removed }
    lighthouse: { categories, metrics: { lcp, cls, tbt, inp } }

  Intended for longitudinal tracking & later percentile/median based ratcheting.
  Missing artifacts are simply omitted (sparse schema tolerance).
*/

async function safeJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function extractCoverage(cov) {
  if (!cov?.total) return null;
  const t = cov.total;
  const pick = (k) => (t[k]?.pct != null ? t[k].pct : null);
  return {
    statements: pick('statements'),
    branches: pick('branches'),
    functions: pick('functions'),
    lines: pick('lines'),
  };
}

function extractBundle(b) {
  if (!b?.total) return null;
  return {
    total: { raw: b.total.raw ?? null, gzip: b.total.gzip ?? null, brotli: b.total.brotli ?? null },
  };
}

function extractTokens(t) {
  if (!t) return null;
  return { net: t.net ?? null, added: t.added ?? null, removed: t.removed ?? null };
}

function extractLighthouse(lh) {
  if (!lh) return null;
  const out = {};
  if (lh.categories) out.categories = lh.categories;
  if (lh.metrics?.current) {
    const cur = lh.metrics.current;
    const val = (k) => cur[k]?.numericValue ?? cur[k] ?? null;
    out.metrics = {
      lcp: val('lcp'),
      cls: val('cls'),
      tbt: val('tbt'),
      inp: val('inp'),
    };
  }
  return Object.keys(out).length ? out : null;
}

async function main() {
  const coverage = extractCoverage(await safeJson('coverage/coverage-summary.json'));
  const bundle = extractBundle(await safeJson('artifacts/bundle-sizes.json'));
  const tokens = extractTokens(await safeJson('artifacts/token-deltas.json'));
  const lighthouse = extractLighthouse(
    (await safeJson('artifacts/lighthouse-assertions.json')) ||
      (await safeJson('artifacts/lighthouse-assertions/lighthouse-assertions.json')),
  );

  const record = {
    timestamp: new Date().toISOString(),
    git: {
      commit: process.env.GITHUB_SHA || process.env.GIT_COMMIT || null,
      branch: process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || null,
    },
    ...(coverage ? { coverage } : {}),
    ...(bundle ? { bundle } : {}),
    ...(tokens ? { tokens } : {}),
    ...(lighthouse ? { lighthouse } : {}),
  };

  if (!existsSync('artifacts')) await mkdir('artifacts', { recursive: true });
  const line = JSON.stringify(record) + '\n';
  const historyPath = 'artifacts/quality-history.jsonl';
  // Create file exclusively if it does not exist to avoid race between existence check and creation
  try {
    const fd = openSync(historyPath, 'wx');
    closeSync(fd);
  } catch {
    // already exists or cannot create; continue
  }
  await appendFile(historyPath, line, 'utf8');
  console.log('Appended quality history record.');
}

main().catch((e) => {
  console.error('Failed to append quality history:', e);
  process.exit(0); // non-fatal
});
