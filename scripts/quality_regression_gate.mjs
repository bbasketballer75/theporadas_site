#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

// Simple regression gating:
// Fail (exit 1) if latest coverage drops more than configured thresholds vs previous.
// Thresholds via env or defaults.
const historyFile = 'quality-history.jsonl';
if (!existsSync(historyFile)) {
  console.log('[regression-gate] No history file; skipping gate.');
  process.exit(0);
}
const lines = readFileSync(historyFile, 'utf8').split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.log('[regression-gate] <2 entries; skipping gate.');
  process.exit(0);
}
const latest = JSON.parse(lines[lines.length - 1]);
let prevIndex = lines.length - 2;
// Skip manual placeholder entries if present.
while (prevIndex >= 0) {
  try {
    const rec = JSON.parse(lines[prevIndex]);
    if (!rec.manual) break;
  } catch {
    /* ignore */
  }
  prevIndex--;
}
if (prevIndex < 0) {
  console.log('[regression-gate] No valid previous entry; skipping gate.');
  process.exit(0);
}
const prev = JSON.parse(lines[prevIndex]);

const cfg = {
  maxCoverageDrop: parseFloat(process.env.MAX_COVERAGE_DROP || '0.5'), // percentage points
  maxPerfDrop: parseFloat(process.env.MAX_PERF_DROP || '3'), // performance score points
};

function checkDrop(metricName, latestVal, prevVal, maxDrop) {
  if (latestVal == null || prevVal == null) return null; // can't evaluate
  const delta = latestVal - prevVal; // positive = improvement
  if (delta < 0 && Math.abs(delta) > maxDrop) {
    return { metric: metricName, delta, maxDrop };
  }
  return null;
}

const failures = [];
if (latest.coverage && prev.coverage) {
  failures.push(
    checkDrop('linesPct', latest.coverage.linesPct, prev.coverage.linesPct, cfg.maxCoverageDrop),
    checkDrop(
      'statementsPct',
      latest.coverage.statementsPct,
      prev.coverage.statementsPct,
      cfg.maxCoverageDrop,
    ),
    checkDrop(
      'functionsPct',
      latest.coverage.functionsPct,
      prev.coverage.functionsPct,
      cfg.maxCoverageDrop,
    ),
    checkDrop(
      'branchesPct',
      latest.coverage.branchesPct,
      prev.coverage.branchesPct,
      cfg.maxCoverageDrop,
    ),
  );
}
if (latest.lighthouse && prev.lighthouse) {
  failures.push(
    checkDrop(
      'performance',
      latest.lighthouse.performance,
      prev.lighthouse.performance,
      cfg.maxPerfDrop,
    ),
  );
}
const realFailures = failures.filter(Boolean);
if (realFailures.length) {
  console.error('[regression-gate] Detected regressions exceeding thresholds:');
  for (const f of realFailures) {
    console.error(`  - ${f.metric}: delta ${f.delta.toFixed(2)} (allowed drop ${f.maxDrop})`);
  }
  process.exit(1);
}
console.log('[regression-gate] Passed. No excessive regressions.');
