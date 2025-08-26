#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/*
  Enforce quality gates before enabling auto-merge.
  - Coverage thresholds (overall and per type) from environment or defaults
  - Optional coverage delta guard vs previous (artifact) summary
  - Lighthouse category minimums & metric regression guards (LCP/CLS/TBT/INP)
  - Lighthouse diff: fail if category regressions beyond tolerance
  - Token growth gate (net / added tokens) if artifact present (added limit now opt-in)
  - Bundle size gate (total/file deltas) if artifacts present (optional / warn-first)

  Expected inputs:
    coverage current: coverage/coverage-summary.json (Vitest V8)
    coverage previous (optional): artifacts/prev-coverage-summary.json
    lighthouse assertions (optional): artifacts/lighthouse-assertions.json OR artifacts/lighthouse-assertions/lighthouse-assertions.json
    lighthouse diff (optional): artifacts/lighthouse-assertions-diff.md
  token deltas (optional): artifacts/token-deltas.json { net, added, removed }
  bundle sizes current (optional): artifacts/bundle-sizes.json { total: { raw, gzip, brotli }, files: [{path, raw, gzip, brotli}] }
  bundle sizes previous (optional): artifacts/prev-bundle-sizes.json (same shape)

  Env vars (override defaults):
    GATE_MIN_STATEMENTS, GATE_MIN_BRANCHES, GATE_MIN_FUNCTIONS, GATE_MIN_LINES
    GATE_MAX_COVERAGE_DROP_STATEMENTS / BRANCHES / FUNCTIONS / LINES (percent points)
    GATE_LH_CATEGORY_MIN_<category>
    GATE_LH_METRIC_MAX_LCP_DELTA_MS (ms increase allowed)
    GATE_LH_METRIC_MAX_CLS_DELTA (absolute increase allowed)
  GATE_LH_METRIC_MAX_TBT_DELTA_MS (ms increase allowed)
  GATE_LH_METRIC_MAX_INP_DELTA_MS (ms increase allowed)
  GATE_TOKEN_MAX_NET (soft warn limit, default 800)
  GATE_TOKEN_MAX_ADDED (hard fail limit; no default - must be explicitly set)
  GATE_BUNDLE_MAX_TOTAL_DELTA_KB (fail if total gzip KB increase > value)
  GATE_BUNDLE_MAX_FILE_DELTA_KB (fail if any single file gzip KB increase > value)

  Lighthouse budgets logic:
    If diff file exists and does not contain 'No differences detected.' then parse Category table; negative deltas beyond -tolerance fail. Metrics deltas enforced via assertions metrics blocks when previous/current info present.
*/

const DEFAULT_THRESHOLDS = {
  statements: +(process.env.GATE_MIN_STATEMENTS || 95),
  branches: +(process.env.GATE_MIN_BRANCHES || 90),
  functions: +(process.env.GATE_MIN_FUNCTIONS || 95),
  lines: +(process.env.GATE_MIN_LINES || 95),
};

const LH_CATEGORY_PREFIX = 'GATE_LH_CATEGORY_MIN_';
const LH_CATEGORY_TOLERANCE = +(process.env.GATE_LH_CATEGORY_TOLERANCE || 0.01); // allow minor rounding deltas
const COVERAGE_DROP_VARS = {
  statements: 'GATE_MAX_COVERAGE_DROP_STATEMENTS',
  branches: 'GATE_MAX_COVERAGE_DROP_BRANCHES',
  functions: 'GATE_MAX_COVERAGE_DROP_FUNCTIONS',
  lines: 'GATE_MAX_COVERAGE_DROP_LINES',
};
const TOKEN_LIMITS = {
  net: process.env.GATE_TOKEN_MAX_NET ? +process.env.GATE_TOKEN_MAX_NET : 800,
  // Added hard limit only enforced if explicitly provided.
  added: process.env.GATE_TOKEN_MAX_ADDED ? +process.env.GATE_TOKEN_MAX_ADDED : null,
};
const METRIC_DELTA_ENV = {
  lcp: 'GATE_LH_METRIC_MAX_LCP_DELTA_MS',
  cls: 'GATE_LH_METRIC_MAX_CLS_DELTA',
  tbt: 'GATE_LH_METRIC_MAX_TBT_DELTA_MS',
  inp: 'GATE_LH_METRIC_MAX_INP_DELTA_MS',
};
// Bundle delta environment variables (KB). Support gzip/raw & warn/fail tiers.
const BUNDLE_LIMIT_VARS = {
  // Hard fail (preferred specific forms)
  maxTotalGzip: 'GATE_BUNDLE_MAX_TOTAL_GZIP_DELTA_KB',
  maxFileGzip: 'GATE_BUNDLE_MAX_FILE_GZIP_DELTA_KB',
  maxTotalRaw: 'GATE_BUNDLE_MAX_TOTAL_RAW_DELTA_KB',
  maxFileRaw: 'GATE_BUNDLE_MAX_FILE_RAW_DELTA_KB',
  // Warn-only
  warnTotalGzip: 'GATE_BUNDLE_WARN_TOTAL_GZIP_DELTA_KB',
  warnFileGzip: 'GATE_BUNDLE_WARN_FILE_GZIP_DELTA_KB',
  warnTotalRaw: 'GATE_BUNDLE_WARN_TOTAL_RAW_DELTA_KB',
  warnFileRaw: 'GATE_BUNDLE_WARN_FILE_RAW_DELTA_KB',
  // Legacy (gzip hard fail fallback)
  legacyTotal: 'GATE_BUNDLE_MAX_TOTAL_DELTA_KB',
  legacyFile: 'GATE_BUNDLE_MAX_FILE_DELTA_KB',
};

async function loadCoverageSummary() {
  const path = 'coverage/coverage-summary.json';
  if (!existsSync(path)) return null;
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw).total || null;
}

function checkCoverage(total) {
  if (!total)
    return [{ level: 'warn', message: 'Coverage summary missing; skipping coverage gate.' }];
  const failures = [];
  for (const [k, min] of Object.entries(DEFAULT_THRESHOLDS)) {
    const pct = total[k]?.pct;
    if (typeof pct !== 'number') {
      failures.push({ level: 'error', message: `Coverage metric ${k} missing.` });
      continue;
    }
    if (pct + 1e-6 < min) {
      failures.push({ level: 'error', message: `Coverage ${k} ${pct}% < min ${min}%` });
    }
  }
  return failures.length ? failures : [{ level: 'ok', message: 'Coverage thresholds satisfied.' }];
}

function checkCoverageDelta(prevTotal, currTotal) {
  if (!prevTotal || !currTotal)
    return [{ level: 'warn', message: 'Previous coverage missing; skipping coverage delta gate.' }];
  const failures = [];
  for (const metric of Object.keys(DEFAULT_THRESHOLDS)) {
    const envVar = COVERAGE_DROP_VARS[metric];
    const maxDrop = envVar && process.env[envVar] ? +process.env[envVar] : null;
    if (!maxDrop) continue;
    const prevPct = prevTotal[metric]?.pct;
    const currPct = currTotal[metric]?.pct;
    if (typeof prevPct !== 'number' || typeof currPct !== 'number') continue;
    const drop = prevPct - currPct;
    if (drop > maxDrop + 1e-6) {
      failures.push({
        level: 'error',
        message: `Coverage ${metric} drop ${drop.toFixed(2)} > max ${maxDrop}`,
      });
    }
  }
  return failures.length
    ? failures
    : [{ level: 'ok', message: 'Coverage deltas within allowed limits.' }];
}

async function loadLighthouseAssertions() {
  const candidates = [
    'artifacts/lighthouse-assertions.json',
    'artifacts/lighthouse-assertions/lighthouse-assertions.json',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(await readFile(p, 'utf8'));
      } catch {
        // ignore parse error and continue
      }
    }
  }
  return null;
}

async function loadPreviousCoverage() {
  const candidates = [
    'artifacts/prev-coverage-summary.json',
    'artifacts/coverage-summary.json', // fallback if workflow downloaded under different name
    'coverage/coverage-summary.json', // last resort (treat current as previous for report-only scenario)
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const data = JSON.parse(await readFile(p, 'utf8'));
      if (data.total) return data.total;
    } catch {
      // continue
    }
  }
  return null;
}

async function loadTokenDeltas() {
  const path = 'artifacts/token-deltas.json';
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function loadBundleSizes(previous = false) {
  const paths = previous
    ? [
        'artifacts/prev-bundle-sizes.json',
        'artifacts/bundle-sizes-prev.json',
        'artifacts/bundle-sizes.json', // allow treating current as previous if no explicit prev present (report-only)
      ]
    : ['artifacts/bundle-sizes.json'];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(await readFile(p, 'utf8'));
    } catch {
      // continue
    }
  }
  return null;
}

async function parseLighthouseDiff() {
  const path = 'artifacts/lighthouse-assertions-diff.md';
  if (!existsSync(path)) return null;
  const text = await readFile(path, 'utf8');
  return text;
}

function checkLighthouseCategories(currentAssertions) {
  if (!currentAssertions)
    return [
      { level: 'warn', message: 'No Lighthouse assertions file found; skipping category gate.' },
    ];
  const failures = [];
  for (const [envVar, value] of Object.entries(process.env)) {
    if (!envVar.startsWith(LH_CATEGORY_PREFIX)) continue;
    const cat = envVar.substring(LH_CATEGORY_PREFIX.length).toLowerCase();
    const min = +value;
    const score = currentAssertions.categories?.[cat];
    if (typeof score !== 'number') {
      failures.push({ level: 'error', message: `Lighthouse category ${cat} score missing.` });
      continue;
    }
    if (score + 1e-6 < min)
      failures.push({ level: 'error', message: `Lighthouse ${cat} ${score} < min ${min}` });
  }
  return failures.length
    ? failures
    : [{ level: 'ok', message: 'Lighthouse category minimums satisfied.' }];
}

function analyzeLighthouseDiff(diffText) {
  if (!diffText)
    return [{ level: 'warn', message: 'No Lighthouse diff found; skipping diff regression gate.' }];
  if (diffText.includes('No differences detected.'))
    return [{ level: 'ok', message: 'No Lighthouse differences.' }];
  // simple parse: look at Category Score Changes table
  const lines = diffText.split(/\r?\n/);
  const tableStart = lines.findIndex((l) => l.startsWith('| Category |'));
  const failures = [];
  if (tableStart !== -1) {
    for (let i = tableStart + 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('|')) break;
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      // cells: Category, Prev, Curr, Delta (may include emoji)
      if (cells.length < 4) continue;
      const category = cells[0];
      const deltaCell = cells[3];
      const deltaMatch = deltaCell.match(/(-?\d+\.\d+)/);
      if (!deltaMatch) continue;
      const delta = parseFloat(deltaMatch[1]);
      if (delta < -LH_CATEGORY_TOLERANCE) {
        failures.push({
          level: 'error',
          message: `Lighthouse category ${category} regressed delta ${delta}`,
        });
      }
    }
  }
  return failures.length
    ? failures
    : [{ level: 'ok', message: 'Lighthouse diff within tolerated bounds.' }];
}

function checkLighthouseMetrics(assertions) {
  if (!assertions)
    return [
      { level: 'warn', message: 'No Lighthouse assertions for metrics; skipping metric gate.' },
    ];
  const metrics = assertions.metrics;
  if (!metrics || !metrics.previous || !metrics.current)
    return [
      { level: 'warn', message: 'Metrics previous/current missing; skipping metric delta gate.' },
    ];
  const failures = [];
  for (const [key, envVar] of Object.entries(METRIC_DELTA_ENV)) {
    const limit = process.env[envVar] ? +process.env[envVar] : null;
    if (!limit) continue;
    const prev = metrics.previous[key]?.numericValue ?? metrics.previous[key];
    const curr = metrics.current[key]?.numericValue ?? metrics.current[key];
    if (typeof prev !== 'number' || typeof curr !== 'number') continue;
    const delta = curr - prev; // positive worse for lcp/tbt/cls
    if (delta > limit + 1e-6) {
      failures.push({
        level: 'error',
        message: `${key.toUpperCase()} regression ${delta.toFixed(3)} > max ${limit}`,
      });
    }
  }
  return failures.length
    ? failures
    : [{ level: 'ok', message: 'Lighthouse metric deltas within limits.' }];
}

function checkTokenGrowth(data) {
  if (!data) return [{ level: 'warn', message: 'No token delta artifact; skipping token gate.' }];
  const issues = [];
  if (typeof data.net === 'number' && data.net > TOKEN_LIMITS.net) {
    issues.push({
      level: 'warn',
      message: `Net token growth ${data.net} exceeds soft limit ${TOKEN_LIMITS.net}`,
    });
  }
  if (
    TOKEN_LIMITS.added != null &&
    typeof data.added === 'number' &&
    data.added > TOKEN_LIMITS.added
  ) {
    issues.push({
      level: 'error',
      message: `Added tokens ${data.added} exceed hard limit ${TOKEN_LIMITS.added}`,
    });
  } else if (TOKEN_LIMITS.added == null) {
    issues.push({ level: 'warn', message: 'Token added hard limit not set; informational only.' });
  }
  return issues.length ? issues : [{ level: 'ok', message: 'Token growth within limits.' }];
}

function formatKb(bytes) {
  if (typeof bytes !== 'number') return 'n/a';
  return (bytes / 1024).toFixed(2) + 'KB';
}

function bundleDeltaMessages(prev, curr) {
  if (!curr) return [{ level: 'warn', message: 'No bundle size artifact; skipping bundle gate.' }];
  if (!prev)
    return [{ level: 'warn', message: 'Previous bundle sizes missing; skipping delta gate.' }];

  const get = (v) => (process.env[v] ? +process.env[v] : null);
  // Hard limits
  let maxTotalGzip = get(BUNDLE_LIMIT_VARS.maxTotalGzip) || get(BUNDLE_LIMIT_VARS.legacyTotal);
  let maxFileGzip = get(BUNDLE_LIMIT_VARS.maxFileGzip) || get(BUNDLE_LIMIT_VARS.legacyFile);
  const maxTotalRaw = get(BUNDLE_LIMIT_VARS.maxTotalRaw);
  const maxFileRaw = get(BUNDLE_LIMIT_VARS.maxFileRaw);
  // Warn limits
  const warnTotalGzip = get(BUNDLE_LIMIT_VARS.warnTotalGzip);
  const warnFileGzip = get(BUNDLE_LIMIT_VARS.warnFileGzip);
  const warnTotalRaw = get(BUNDLE_LIMIT_VARS.warnTotalRaw);
  const warnFileRaw = get(BUNDLE_LIMIT_VARS.warnFileRaw);

  if (
    !maxTotalGzip &&
    !maxFileGzip &&
    !maxTotalRaw &&
    !maxFileRaw &&
    !warnTotalGzip &&
    !warnFileGzip &&
    !warnTotalRaw &&
    !warnFileRaw
  )
    return [{ level: 'warn', message: 'No bundle size limits set; reporting only.' }];

  const issues = [];
  const prevTotals = prev.total || {};
  const currTotals = curr.total || {};
  const delta = (field) => (currTotals[field] || 0) - (prevTotals[field] || 0);
  const deltaGzipKb = delta('gzip') / 1024;
  const deltaRawKb = delta('raw') / 1024;

  function evalThreshold(kind, value, warnLimit, failLimit) {
    if (failLimit != null && value > failLimit + 1e-6) {
      issues.push({
        level: 'error',
        message: `${kind} +${value.toFixed(2)}KB > fail ${failLimit}KB`,
      });
    } else if (warnLimit != null && value > warnLimit + 1e-6) {
      issues.push({
        level: 'warn',
        message: `${kind} +${value.toFixed(2)}KB > warn ${warnLimit}KB`,
      });
    }
  }

  evalThreshold('Total gzip delta', deltaGzipKb, warnTotalGzip, maxTotalGzip);
  evalThreshold('Total raw delta', deltaRawKb, warnTotalRaw, maxTotalRaw);

  const prevFiles = Object.fromEntries((prev.files || []).map((f) => [f.path, f]));
  for (const f of curr.files || []) {
    const pf = prevFiles[f.path];
    if (!pf) continue;
    const dGzipKb = ((f.gzip || 0) - (pf.gzip || 0)) / 1024;
    const dRawKb = ((f.raw || 0) - (pf.raw || 0)) / 1024;
    // Per-file thresholds
    const fileFailGzip = maxFileGzip;
    const fileWarnGzip = warnFileGzip;
    const fileFailRaw = maxFileRaw;
    const fileWarnRaw = warnFileRaw;
    if (fileFailGzip != null || fileWarnGzip != null) {
      evalThreshold(`File gzip delta (${f.path})`, dGzipKb, fileWarnGzip, fileFailGzip);
    }
    if (fileFailRaw != null || fileWarnRaw != null) {
      evalThreshold(`File raw delta (${f.path})`, dRawKb, fileWarnRaw, fileFailRaw);
    }
  }

  return issues.length
    ? issues
    : [
        {
          level: 'ok',
          message: 'Bundle size deltas within limits (or no deltas exceeded thresholds).',
        },
      ];
}

(async function run() {
  const coverage = await loadCoverageSummary();
  const prevCoverage = await loadPreviousCoverage();
  const coverageResults = checkCoverage(coverage);
  const coverageDeltaResults = checkCoverageDelta(prevCoverage, coverage);
  const lhAssertions = await loadLighthouseAssertions();
  const lhCategoryResults = checkLighthouseCategories(lhAssertions);
  const lhMetricResults = checkLighthouseMetrics(lhAssertions);
  const lhDiffText = await parseLighthouseDiff();
  const lhDiffResults = analyzeLighthouseDiff(lhDiffText);
  const tokenDeltas = await loadTokenDeltas();
  const tokenResults = checkTokenGrowth(tokenDeltas);
  const prevBundle = await loadBundleSizes(true);
  const currBundle = await loadBundleSizes(false);
  const bundleResults = bundleDeltaMessages(prevBundle, currBundle);

  const all = [
    ...coverageResults,
    ...coverageDeltaResults,
    ...lhCategoryResults,
    ...lhMetricResults,
    ...lhDiffResults,
    ...tokenResults,
    ...bundleResults,
  ];
  for (const r of all) {
    const tag = r.level === 'error' ? 'ERROR' : r.level === 'warn' ? 'WARN' : 'OK';
    console.log(`[gate][${tag}] ${r.message}`);
  }
  const failed = all.some((r) => r.level === 'error');
  if (failed) {
    console.error('Quality gates failed.');
    process.exit(1);
  } else {
    console.log('Quality gates passed.');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
