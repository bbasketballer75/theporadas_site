#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CURRENT = 'lighthouse-report.report.json';
const PREV = 'artifacts/prev-lighthouse-report.report.json';

if (!existsSync(CURRENT)) {
  console.log('[lh-diff] Current lighthouse report not found. Skipping.');
  process.exit(0);
}

const current = JSON.parse(readFileSync(CURRENT, 'utf8'));
let prev;
if (existsSync(PREV)) {
  try {
    prev = JSON.parse(readFileSync(PREV, 'utf8'));
  } catch (e) {
    console.warn('[lh-diff] Failed to parse previous report:', e.message);
  }
}

function extractScores(rep) {
  if (!rep?.categories) return {};
  const out = {};
  for (const [k, v] of Object.entries(rep.categories)) {
    if (v && typeof v.score === 'number') out[k] = Math.round(v.score * 100);
  }
  return out;
}

const curScores = extractScores(current);
const prevScores = extractScores(prev);

const categories = new Set([...Object.keys(curScores), ...Object.keys(prevScores)]);
const lines = ['Category,Current,Previous,Delta'];
for (const cat of categories) {
  const c = curScores[cat];
  const p = prevScores[cat];
  let deltaStr = '';
  if (c != null && p != null) {
    const d = c - p;
    deltaStr = (d >= 0 ? '+' : '') + d;
  }
  lines.push(`${cat},${c ?? ''},${p ?? ''},${deltaStr}`);
}

writeFileSync('artifacts/lighthouse-diff.csv', lines.join('\n'));
console.log('[lh-diff] Wrote artifacts/lighthouse-diff.csv');
