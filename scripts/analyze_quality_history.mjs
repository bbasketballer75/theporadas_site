#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

/*
  Analyze artifacts/quality-history.jsonl and emit:
    - Counts & completeness
    - Distribution stats (min, p25, p50, p75, p90, p95, max) for numeric metrics
    - Outliers (IQR + modified Z score) per metric
    - Suggested WARN / FAIL thresholds following documented heuristics
    - Suggested env var lines (commented) ready to copy/uncomment

  Safe on empty / missing file (exits 0 with message).
*/

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.round(p * (sorted.length - 1)));
  return sorted[idx];
}

function basicStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q2 = percentile(sorted, 0.5);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 != null && q1 != null ? q3 - q1 : null;
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const variance =
    values.length > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1) : 0;
  return {
    count: values.length,
    min: sorted[0] ?? null,
    p25: q1,
    p50: q2,
    p75: q3,
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] ?? null,
    mean,
    std: Math.sqrt(variance),
    iqr,
    sorted,
  };
}

function detectOutliers(values, stats) {
  if (!values.length || stats.iqr === null) return [];
  const { p25: q1, p75: q3, iqr } = stats;
  if (iqr === 0) return [];
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  return values.filter((v) => v < lowerFence || v > upperFence);
}

function modifiedZScores(values) {
  if (!values.length) return [];
  const median = percentile(
    [...values].sort((a, b) => a - b),
    0.5,
  );
  const absDev = values.map((v) => Math.abs(v - median));
  const mad =
    percentile(
      absDev.sort((a, b) => a - b),
      0.5,
    ) || 0;
  return values.map((v) => ({ v, mz: mad ? (0.6745 * (v - median)) / mad : 0 }));
}

function pickThresholds(metric, stats, direction = 'increase') {
  if (!stats.count) return { warn: null, fail: null, rationale: 'Insufficient data' };
  const { p50, p90, p95, iqr } = stats;
  if (direction === 'increase') {
    const warn = Math.max(p90, p50 + 2 * (iqr || 0));
    const fail = Math.max(p95, Math.round(warn * 1.5));
    return { warn, fail, rationale: 'Warn ~p90/median+2*IQR; Fail ~max(p95,1.5*warn)' };
  } else if (direction === 'decrease') {
    return { warn: null, fail: null, rationale: 'Handled via delta analysis (not implemented)' };
  }
  return { warn: null, fail: null, rationale: 'Unknown direction' };
}

function formatNumber(n) {
  return n == null ? 'null' : Number.isInteger(n) ? String(n) : n.toFixed(2);
}

async function main() {
  const path = 'artifacts/quality-history.jsonl';
  if (!existsSync(path) || statSync(path).size === 0) {
    console.log('No quality history yet (artifacts/quality-history.jsonl missing or empty).');
    process.exit(0);
  }
  const raw = await readFile(path, 'utf8');
  const lines = raw.trim().split(/\n+/).filter(Boolean);
  const records = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      /* ignore */
    }
  }
  if (!records.length) {
    console.log('No parsable records in quality history.');
    process.exit(0);
  }

  const bundleGzip = records.map((r) => r.bundle?.total?.gzip).filter((v) => typeof v === 'number');
  const bundleRaw = records.map((r) => r.bundle?.total?.raw).filter((v) => typeof v === 'number');
  const bundleGzipDelta = records
    .map((r) => r.bundleDelta?.total?.gzip)
    .filter((v) => typeof v === 'number');
  const bundleRawDelta = records
    .map((r) => r.bundleDelta?.total?.raw)
    .filter((v) => typeof v === 'number');
  const coverageStatements = records
    .map((r) => r.coverage?.statements)
    .filter((v) => typeof v === 'number');
  const coverageBranches = records
    .map((r) => r.coverage?.branches)
    .filter((v) => typeof v === 'number');
  const tokenAdded = records.map((r) => r.tokens?.added).filter((v) => typeof v === 'number');
  const tokenNet = records.map((r) => r.tokens?.net).filter((v) => typeof v === 'number');

  // Coverage drop (previous - current) reconstructed from sequential records where both present
  const coverageDrops = { statements: [], branches: [], functions: [], lines: [] };
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1].coverage;
    const curr = records[i].coverage;
    if (prev && curr) {
      for (const k of Object.keys(coverageDrops)) {
        const a = prev[k];
        const b = curr[k];
        if (typeof a === 'number' && typeof b === 'number') {
          const drop = a - b; // positive means regression
          if (drop > 0) coverageDrops[k].push(drop);
        }
      }
    }
  }

  // Lighthouse metric deltas (current - previous) and category drops (previous - current)
  const lhMetricDeltas = { lcp: [], cls: [], tbt: [], inp: [] };
  const lhCategoryDrops = {}; // dynamic keys; collect positive drops (prev - curr > 0)
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1].lighthouse;
    const curr = records[i].lighthouse;
    if (prev?.metrics && curr?.metrics) {
      for (const k of Object.keys(lhMetricDeltas)) {
        const a = prev.metrics[k];
        const b = curr.metrics[k];
        if (typeof a === 'number' && typeof b === 'number') {
          const delta = b - a; // positive worse for these metrics
          if (delta > 0) lhMetricDeltas[k].push(delta);
        }
      }
    }
    if (prev?.categories && curr?.categories) {
      for (const [cat, prevScore] of Object.entries(prev.categories)) {
        const currScore = curr.categories[cat];
        if (typeof prevScore === 'number' && typeof currScore === 'number') {
          const drop = prevScore - currScore; // positive means score decreased
          if (drop > 0) {
            if (!lhCategoryDrops[cat]) lhCategoryDrops[cat] = [];
            lhCategoryDrops[cat].push(drop);
          }
        }
      }
    }
  }

  const metrics = [
    { key: 'bundle.total.gzip', values: bundleGzip, direction: 'increase' },
    { key: 'bundle.total.raw', values: bundleRaw, direction: 'increase' },
    { key: 'bundle.delta.total.gzip', values: bundleGzipDelta, direction: 'increase' },
    { key: 'bundle.delta.total.raw', values: bundleRawDelta, direction: 'increase' },
    { key: 'coverage.statements', values: coverageStatements, direction: 'decrease' },
    { key: 'coverage.branches', values: coverageBranches, direction: 'decrease' },
    { key: 'tokens.added', values: tokenAdded, direction: 'increase' },
    { key: 'tokens.net', values: tokenNet, direction: 'increase' },
    // Coverage drops (treat as increase metrics for threshold suggestion logic on positive drop magnitudes)
    { key: 'coverage.drop.statements', values: coverageDrops.statements, direction: 'increase' },
    { key: 'coverage.drop.branches', values: coverageDrops.branches, direction: 'increase' },
    { key: 'coverage.drop.functions', values: coverageDrops.functions, direction: 'increase' },
    { key: 'coverage.drop.lines', values: coverageDrops.lines, direction: 'increase' },
    // Lighthouse metric positive regressions
    { key: 'lighthouse.delta.lcp', values: lhMetricDeltas.lcp, direction: 'increase' },
    { key: 'lighthouse.delta.cls', values: lhMetricDeltas.cls, direction: 'increase' },
    { key: 'lighthouse.delta.tbt', values: lhMetricDeltas.tbt, direction: 'increase' },
    { key: 'lighthouse.delta.inp', values: lhMetricDeltas.inp, direction: 'increase' },
  ];

  const report = [];
  const envSuggestions = [];

  for (const m of metrics) {
    const stats = basicStats(m.values);
    const outliers = detectOutliers(m.values, stats);
    const mz = modifiedZScores(m.values)
      .filter((o) => Math.abs(o.mz) > 3.5)
      .map((o) => o.v);
    let thresholds = { warn: null, fail: null, rationale: 'Not computed' };
    if (m.direction === 'increase' && m.values.length >= 10) {
      thresholds = pickThresholds(m.key, stats, 'increase');
    }
    report.push({ metric: m.key, stats, outliers, modifiedZ: mz, thresholds });
    if (thresholds.warn != null) {
      if (m.key === 'bundle.total.gzip') {
        envSuggestions.push(`# Suggested thresholds for bundle gzip (from analyzer)`);
        envSuggestions.push(`# BUNDLE_GZIP_TOTAL_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# BUNDLE_GZIP_TOTAL_MAX=${Math.round(thresholds.fail)}`);
      } else if (m.key === 'bundle.total.raw') {
        envSuggestions.push(`# BUNDLE_RAW_TOTAL_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# BUNDLE_RAW_TOTAL_MAX=${Math.round(thresholds.fail)}`);
      } else if (m.key === 'bundle.delta.total.gzip') {
        envSuggestions.push(`# BUNDLE_GZIP_TOTAL_DELTA_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# BUNDLE_GZIP_TOTAL_DELTA_MAX=${Math.round(thresholds.fail)}`);
      } else if (m.key === 'bundle.delta.total.raw') {
        envSuggestions.push(`# BUNDLE_RAW_TOTAL_DELTA_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# BUNDLE_RAW_TOTAL_DELTA_MAX=${Math.round(thresholds.fail)}`);
      } else if (m.key === 'tokens.added') {
        envSuggestions.push(`# TOKENS_MAX_ADDED_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# TOKENS_MAX_ADDED_FAIL=${Math.round(thresholds.fail)}`);
      } else if (m.key === 'tokens.net') {
        envSuggestions.push(`# TOKENS_NET_WARN=${Math.round(thresholds.warn)}`);
        envSuggestions.push(`# TOKENS_NET_FAIL=${Math.round(thresholds.fail)}`);
      } else if (m.key.startsWith('coverage.drop.')) {
        const metric = m.key.split('.').pop();
        envSuggestions.push(
          `# GATE_MAX_COVERAGE_DROP_${metric.toUpperCase()}=${thresholds.fail.toFixed(2)}`,
        );
      } else if (m.key.startsWith('lighthouse.delta.')) {
        const metric = m.key.split('.').pop();
        const envMap = {
          lcp: 'LCP_DELTA_MS',
          cls: 'CLS_DELTA',
          tbt: 'TBT_DELTA_MS',
          inp: 'INP_DELTA_MS',
        };
        const suffix = envMap[metric];
        if (suffix) {
          envSuggestions.push(`# GATE_LH_METRIC_MAX_${suffix}=${Math.round(thresholds.fail)}`);
        }
      }
    }
  }

  // Lighthouse category drops: compute stats separately (they are dynamic per category)
  const categoryEnvLines = [];
  for (const [cat, arr] of Object.entries(lhCategoryDrops)) {
    if (arr.length < 5) continue; // need more samples
    const stats = basicStats(arr);
    const warn = Math.max(stats.p90, stats.p50 + 2 * (stats.iqr || 0));
    const fail = Math.max(stats.p95, warn * 2, 0.01);
    categoryEnvLines.push(
      `# GATE_LH_CATEGORY_MIN_${cat.toUpperCase()}=0.9   # current drop p95 ${fail.toFixed(3)} (adjust manually)`,
    );
  }

  console.log('Quality History Analysis');
  console.log('Records:', records.length);
  for (const r of report) {
    const s = r.stats;
    console.log(`\nMetric: ${r.metric}`);
    console.log(`  Count: ${s.count}`);
    if (!s.count) continue;
    console.log(`  Min..Max: ${formatNumber(s.min)} .. ${formatNumber(s.max)}`);
    console.log(
      `  p25/p50/p75: ${formatNumber(s.p25)} / ${formatNumber(s.p50)} / ${formatNumber(s.p75)}`,
    );
    console.log(`  p90/p95: ${formatNumber(s.p90)} / ${formatNumber(s.p95)}`);
    console.log(`  Mean: ${formatNumber(s.mean)}  Std: ${formatNumber(s.std)}`);
    if (r.outliers.length)
      console.log(`  IQR outliers: ${r.outliers.map(formatNumber).join(', ')}`);
    if (r.modifiedZ.length)
      console.log(`  Modified-Z outliers: ${r.modifiedZ.map(formatNumber).join(', ')}`);
    if (r.thresholds.warn != null) {
      console.log(
        `  Suggested WARN: ${formatNumber(r.thresholds.warn)}  FAIL: ${formatNumber(r.thresholds.fail)}  (${r.thresholds.rationale})`,
      );
    }
  }
  if (envSuggestions.length) {
    console.log('\n--- Suggested env var lines (copy/uncomment as needed) ---');
    console.log(envSuggestions.join('\n'));
    if (categoryEnvLines.length) {
      console.log('\n# Lighthouse category minimum placeholders');
      console.log(categoryEnvLines.join('\n'));
    }
  } else {
    console.log('\n(No threshold suggestions yet - insufficient data)');
  }
}

main().catch((e) => {
  console.error('Analyzer failed:', e);
  process.exit(1);
});
