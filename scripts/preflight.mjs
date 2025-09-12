#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const idx = args.indexOf('--json');
let out = 'artifacts/preflight_test_diag.json';
if (idx !== -1 && args[idx + 1]) {
  out = args[idx + 1];
}

let existing = {};
try {
  if (fs.existsSync(out)) existing = JSON.parse(fs.readFileSync(out, 'utf8'));
} catch {
  // ignore read/parse errors and proceed with fresh report
}
const report = {
  title: 'Preflight Validation Report',
  timestamp: new Date().toISOString(),
  node: process.version,
  ...existing,
};

const outDir = path.dirname(out);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));

console.log('Preflight Validation Report');
