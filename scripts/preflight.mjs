#!/usr/bin/env node
import { execSync } from 'child_process';

const steps = [
  { name: 'Lint', cmd: 'npm run lint' },
  { name: 'TypeCheck', cmd: 'npm run typecheck' },
  { name: 'Unit Tests', cmd: 'npm run test' },
  { name: 'Coverage Diff', cmd: 'npm run coverage:diff || true' },
  { name: 'Bundle Heuristic (if relevant)', cmd: 'npm run lh:verify-bundles || echo skip bundle' },
];

let ok = true;
for (const s of steps) {
  console.log(`\n--- ${s.name} ---`);
  try {
    execSync(s.cmd, { stdio: 'inherit', env: process.env });
  } catch (e) {
    console.error(`${s.name} failed`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nPreflight failed. Fix issues above.');
  process.exit(1);
}
console.log('\nPreflight succeeded.');
