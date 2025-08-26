#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/*
  Enforce quality gates before enabling auto-merge.
  - Coverage thresholds (overall and per type) from environment or defaults
  - Optional coverage delta guard vs previous (artifact) summary
  - Lighthouse category minimums & metric regression guards (LCP/CLS/TBT)
  - Lighthouse diff: fail if category regressions beyond tolerance
  - Token growth gate (net / added tokens) if artifact present

  Expected inputs:
    coverage current: coverage/coverage-summary.json (Vitest V8)
    coverage previous (optional): artifacts/prev-coverage-summary.json
    lighthouse assertions (optional): artifacts/lighthouse-assertions.json OR artifacts/lighthouse-assertions/lighthouse-assertions.json
    lighthouse diff (optional): artifacts/lighthouse-assertions-diff.md
    token deltas (optional): artifacts/token-deltas.json { net, added, removed }

  Env vars (override defaults):
    GATE_MIN_STATEMENTS, GATE_MIN_BRANCHES, GATE_MIN_FUNCTIONS, GATE_MIN_LINES
    GATE_MAX_COVERAGE_DROP_STATEMENTS / BRANCHES / FUNCTIONS / LINES (percent points)
    GATE_LH_CATEGORY_MIN_<category>
    GATE_LH_METRIC_MAX_LCP_DELTA_MS (ms increase allowed)
    GATE_LH_METRIC_MAX_CLS_DELTA (absolute increase allowed)
    GATE_LH_METRIC_MAX_TBT_DELTA_MS (ms increase allowed)
    GATE_TOKEN_MAX_NET (soft warn limit, default 800)
    GATE_TOKEN_MAX_ADDED (hard fail limit, default 1600)

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
  added: process.env.GATE_TOKEN_MAX_ADDED ? +process.env.GATE_TOKEN_MAX_ADDED : 1600,
};
const METRIC_DELTA_ENV = {
  lcp: 'GATE_LH_METRIC_MAX_LCP_DELTA_MS',
  cls: 'GATE_LH_METRIC_MAX_CLS_DELTA',
  tbt: 'GATE_LH_METRIC_MAX_TBT_DELTA_MS',
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
  const path = 'artifacts/prev-coverage-summary.json';
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8')).total || null;
  } catch {
    return null;
  }
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
  if (typeof data.added === 'number' && data.added > TOKEN_LIMITS.added) {
    issues.push({
      level: 'error',
      message: `Added tokens ${data.added} exceed hard limit ${TOKEN_LIMITS.added}`,
    });
  }
  return issues.length ? issues : [{ level: 'ok', message: 'Token growth within limits.' }];
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

  const all = [
    ...coverageResults,
    ...coverageDeltaResults,
    ...lhCategoryResults,
    ...lhMetricResults,
    ...lhDiffResults,
    ...tokenResults,
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
