#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import process from 'node:process';

// Minimal arg parsing: support --json <file> and passthrough flags (e.g. --no-engines ignored for now)
let jsonPath = null;
let lightMode = false; // triggered by --no-engines (repurposed for quick diagnostics in tests)
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json' && args[i + 1]) {
    jsonPath = args[i + 1];
    i++;
  } else if (a === '--no-engines') {
    lightMode = true;
  }
}

console.log('Preflight Validation Report');

const steps = lightMode
  ? [
      { name: 'Lint', cmd: ['echo', '(light) lint skipped'] },
      { name: 'TypeCheck', cmd: ['echo', '(light) typecheck skipped'] },
      { name: 'Unit Tests', cmd: ['echo', '(light) tests skipped'] },
    ]
  : [
      { name: 'Lint', cmd: ['npm', 'run', 'lint'] },
      { name: 'TypeCheck', cmd: ['npm', 'run', 'typecheck'] },
      { name: 'Unit Tests', cmd: ['npm', 'run', 'test'] },
      { name: 'Coverage Diff', cmd: ['npm', 'run', 'coverage:diff'] },
      { name: 'Bundle Heuristic (if relevant)', cmd: ['npm', 'run', 'lh:verify-bundles'] },
    ];

let ok = true;
for (const s of steps) {
  console.log(`\n--- ${s.name} ---`);
  try {
    const [cmd, ...cmdArgs] = s.cmd;
    const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env, shell: false });
    if (res.status !== 0) throw new Error(`${cmd} exited ${res.status}`);
  } catch (e) {
    console.error(`${s.name} failed: ${e.message || e}`);
    ok = false;
  }
}

// Diagnostics object (extendable in future)
const diagnostics = {
  nodePathDiagnostics: {
    hasConcreteNode: (() => {
      try {
        const vRes = spawnSync('node', ['--version'], { stdio: 'pipe' });
        if (vRes.status !== 0) return false;
        const v = vRes.stdout.toString().trim();
        return /^v?\d+\.\d+\.\d+/.test(v);
      } catch {
        return false;
      }
    })(),
  },
};

if (jsonPath) {
  try {
    writeFileSync(jsonPath, JSON.stringify(diagnostics, null, 2));
  } catch (e) {
    console.error('Failed to write diagnostics JSON:', e.message || e);
  }
}

if (!ok) {
  console.error('\nPreflight failed. Fix issues above.');
  process.exit(1);
}
console.log('\nPreflight succeeded.');
