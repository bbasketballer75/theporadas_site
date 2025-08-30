#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Merge multiple coverage-summary.json files by summing covered/total per metric.
function mergeSummaries(summaries) {
  const totals = {};
  for (const s of summaries) {
    for (const [k, v] of Object.entries(s.total || {})) {
      if (!totals[k]) {
        totals[k] = { total: 0, covered: 0, skipped: 0, pct: 0 };
      }
      totals[k].total += v.total || 0;
      totals[k].covered += v.covered || 0;
      totals[k].skipped += v.skipped || 0;
    }
  }
  // Recompute percentages
  for (const v of Object.values(totals)) {
    v.pct = v.total === 0 ? 100 : (v.covered / v.total) * 100;
  }
  return { total: totals };
}

function findSummaries(baseDir) {
  const summaries = [];
  const entries = readdirSync(baseDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      const candidate = resolve(baseDir, ent.name, 'coverage-summary.json');
      try {
        const raw = readFileSync(candidate, 'utf8');
        summaries.push(JSON.parse(raw));
      } catch {
        // ignore missing files
      }
    }
  }
  // Also check root coverage/coverage-summary.json if present
  const rootSummary = resolve('coverage', 'coverage-summary.json');
  try {
    const raw = readFileSync(rootSummary, 'utf8');
    summaries.push(JSON.parse(raw));
  } catch {
    // ignore missing root summary
  }
  return summaries;
}

function main() {
  const baseDir = resolve('coverage-matrix');
  let summaries = [];
  try {
    summaries = findSummaries(baseDir);
  } catch (e) {
    console.error('Failed scanning coverage-matrix:', e.message);
  }
  if (summaries.length === 0) {
    console.error('No coverage summaries found to aggregate.');
    process.exit(1);
  }
  const merged = mergeSummaries(summaries);
  mkdirSync('coverage', { recursive: true });
  const out = resolve('coverage', 'coverage-summary.json');
  writeFileSync(out, JSON.stringify(merged, null, 2));
  console.log('Aggregated', summaries.length, 'summaries ->', out);
}

main();
