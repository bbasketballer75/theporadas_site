#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const historyFile = 'quality-history.jsonl';
if (!existsSync(historyFile)) {
  console.log('No quality history present yet.');
  process.exit(0);
}

const lines = readFileSync(historyFile, 'utf8').split(/\r?\n/).filter(Boolean);
const records = [];
for (const line of lines) {
  try {
    records.push(JSON.parse(line));
  } catch {
    // ignore invalid line
  }
}

if (!records.length) {
  console.log('Quality history file is empty or unparsable.');
  process.exit(0);
}

const latest = records[records.length - 1];
const prev = records.length > 1 ? records[records.length - 2] : undefined;

function diff(a, b) {
  if (a == null || b == null || typeof a !== 'number' || typeof b !== 'number') return 'n/a';
  const delta = a - b;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}
function fmtPct(v) {
  return v == null ? 'n/a' : v.toFixed(2);
}

const cov = latest.coverage || {};
const prevCov = prev?.coverage || {};
const lh = latest.lighthouse || {};
const prevLh = prev?.lighthouse || {};

console.log('Quality Analysis Summary');
console.log('========================');
console.log(`Entries: ${records.length}`);
console.log(`Latest Commit: ${latest.commit} @ ${latest.ts}`);
console.log('Coverage (%):');
console.log(`  Lines:      ${fmtPct(cov.linesPct)} (Δ ${diff(cov.linesPct, prevCov.linesPct)})`);
console.log(
  `  Statements: ${fmtPct(cov.statementsPct)} (Δ ${diff(cov.statementsPct, prevCov.statementsPct)})`,
);
console.log(
  `  Functions:  ${fmtPct(cov.functionsPct)} (Δ ${diff(cov.functionsPct, prevCov.functionsPct)})`,
);
console.log(
  `  Branches:   ${fmtPct(cov.branchesPct)} (Δ ${diff(cov.branchesPct, prevCov.branchesPct)})`,
);
console.log(
  `  Performance: ${lh.performance ?? 'n/a'} (Δ ${diff(lh.performance, prevLh.performance)})`,
);
#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const historyFile = 'quality-history.jsonl';
if (!existsSync(historyFile)) {
  console.log('No quality history present yet.');
  process.exit(0);
}

const lines = readFileSync(historyFile, 'utf8').split(/\r?\n/).filter(Boolean);
const records = [];
for (const line of lines) {
  try {
    records.push(JSON.parse(line));
  } catch {
    // ignore invalid line
  }
}

if (!records.length) {
  console.log('Quality history file is empty or unparsable.');
  process.exit(0);
}

const latest = records[records.length - 1];
const prev = records.length > 1 ? records[records.length - 2] : undefined;

function diff(a, b) {
  if (a == null || b == null || typeof a !== 'number' || typeof b !== 'number') return 'n/a';
  const delta = a - b;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}
function fmtPct(v) {
  return v == null ? 'n/a' : v.toFixed(2);
}

const cov = latest.coverage || {};
const prevCov = prev?.coverage || {};
const lh = latest.lighthouse || {};
const prevLh = prev?.lighthouse || {};

console.log('Quality Analysis Summary');
console.log('========================');
console.log(`Entries: ${records.length}`);
console.log(`Latest Commit: ${latest.commit} @ ${latest.ts}`);
console.log('Coverage (%):');
console.log(`  Lines:      ${fmtPct(cov.linesPct)} (Δ ${diff(cov.linesPct, prevCov.linesPct)})`);
console.log(
  `  Statements: ${fmtPct(cov.statementsPct)} (Δ ${diff(
    cov.statementsPct,
    prevCov.statementsPct,
  )})`,
);
console.log(
  `  Functions:  ${fmtPct(cov.functionsPct)} (Δ ${diff(cov.functionsPct, prevCov.functionsPct)})`,
);
console.log(
  `  Branches:   ${fmtPct(cov.branchesPct)} (Δ ${diff(cov.branchesPct, prevCov.branchesPct)})`,
);
console.log('Lighthouse:');
console.log(
  `  Performance: ${lh.performance ?? 'n/a'} (Δ ${diff(lh.performance, prevLh.performance)})`,
);
