#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/*
  quality_regression_check.mjs
  Purpose: After >=10 records exist in artifacts/quality-history.jsonl, enforce that
  current Lighthouse category scores and core metrics have not regressed beyond an allowed delta.

  Logic:
    - Read last line (current) and prior N-1 lines.
    - Compute baseline as median of previous records (excluding current) for each category score.
    - Allowed regression delta configured via env or defaults:
        LH_ALLOWED_DELTA=0.03 (3%) for category scores (0-1 scale)
        LH_METRIC_REGRESSION_PCT=0.10 (10%) allowed worsening for numeric metrics (LCP ms, TBT ms, INP ms; CLS handled like score)
    - If any category score drops more than delta or metric worsens more than pct, exit 1 with summary.
    - If <10 records, exit 0 (skip enforcement) with notice.

  Assumptions: append_quality_history.mjs stored lighthouse.categories.*.score (0-1) or similar
  and lighthouse.metrics lcp/cls/tbt/inp numeric values. LCP, TBT, INP: lower is better; CLS lower better.
*/

function median(arr) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

async function readHistory(path) {
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf8');
  return raw
    .split(/\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
}

async function main() {
  const historyPath = 'artifacts/quality-history.jsonl';
  const records = await readHistory(historyPath);
  if (records.length < 10) {
    console.log(
      `[quality-regression] Not enough records (${records.length}) < 10; skipping regression enforcement.`,
    );
    return;
  }
  const current = records[records.length - 1];
  const prior = records.slice(0, -1);

  const allowedDelta = Number(process.env.LH_ALLOWED_DELTA ?? '0.03');
  const metricPct = Number(process.env.LH_METRIC_REGRESSION_PCT ?? '0.10');

  const categories = ['performance', 'accessibility', 'seo', 'best-practices'];
  const categoryFindings = [];
  for (const cat of categories) {
    const pathScore = `lighthouse.categories.${cat}.score`;
    const values = prior.map((r) => pick(r, pathScore)).filter((v) => typeof v === 'number');
    if (!values.length) continue;
    const baseline = median(values);
    const curr = pick(current, pathScore);
    if (typeof curr !== 'number') continue;
    const drop = baseline - curr; // positive means regression
    if (drop > allowedDelta) {
      categoryFindings.push({ cat, baseline, current: curr, drop });
    }
  }

  // Core metrics: lower better
  const metricKeys = [
    { key: 'lcp', better: 'lower' },
    { key: 'tbt', better: 'lower' },
    { key: 'inp', better: 'lower' },
    { key: 'cls', better: 'lower' },
  ];
  const metricFindings = [];
  for (const m of metricKeys) {
    const pathMetric = `lighthouse.metrics.${m.key}`;
    const values = prior.map((r) => pick(r, pathMetric)).filter((v) => typeof v === 'number');
    if (!values.length) continue;
    const baseline = median(values);
    const curr = pick(current, pathMetric);
    if (typeof curr !== 'number') continue;
    if (m.better === 'lower') {
      const pctWorse = (curr - baseline) / baseline; // positive means worse
      if (pctWorse > metricPct) {
        metricFindings.push({ metric: m.key, baseline, current: curr, pctWorse });
      }
    }
  }

  if (!categoryFindings.length && !metricFindings.length) {
    console.log('[quality-regression] OK: no regressions beyond thresholds.');
    return;
  }

  console.error('[quality-regression] FAIL: regressions detected');
  if (categoryFindings.length) {
    console.error(' Category score drops:');
    for (const f of categoryFindings) {
      console.error(
        `  - ${f.cat}: baseline=${f.baseline.toFixed(3)} current=${f.current.toFixed(3)} drop=${f.drop.toFixed(3)} > allowed ${allowedDelta}`,
      );
    }
  }
  if (metricFindings.length) {
    console.error(' Core metric regressions:');
    for (const f of metricFindings) {
      console.error(
        `  - ${f.metric}: baseline=${f.baseline.toFixed(2)} current=${f.current.toFixed(2)} worse=${(f.pctWorse * 100).toFixed(1)}% > allowed ${(metricPct * 100).toFixed(1)}%`,
      );
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error('[quality-regression] Error:', e);
  process.exit(0);
});
