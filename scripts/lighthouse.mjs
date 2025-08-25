#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Simple Lighthouse runner: builds site, starts preview (Vite), runs lighthouse against localhost
const PORT = process.env.LH_PORT || 5174;
const URL = `http://localhost:${PORT}`;

function run(cmd, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function main() {
  await run('npm', ['run', 'build']);
  // Start preview server
  const preview = spawn('npm', ['run', 'preview', '--', '--port', PORT], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  // Give server a moment to boot
  await new Promise((r) => setTimeout(r, 4000));
  // Run lighthouse
  await run('npx', [
    'lighthouse',
    URL,
    '--quiet',
    '--preset=desktop',
    '--output=json',
    '--output=html',
    '--output-path=./lighthouse-report.html',
  ]);
  preview.kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
