#!/usr/bin/env node
import { spawn as spawnProc } from 'node:child_process';
import { existsSync } from 'node:fs';

// Simple Lighthouse runner: builds site, starts preview (Vite), runs lighthouse against localhost
const PORT = process.env.LH_PORT || 5174;
const URL = `http://localhost:${PORT}/`;
// no-op

function run(cmd, args = [], options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawnProc(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

//

async function waitForServer(url, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        console.log(`Server is ready after ${attempt} attempts`);
        return;
      }
    } catch {
      // Server not ready yet
    }
    console.log(`Waiting for server... (attempt ${attempt}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Server failed to start within the expected time');
}

async function main() {
  // 1) Build production assets using npm script
  console.log('[lighthouse] Building production assets...');
  await run('npm', ['run', 'build']);

  // 2) Start preview server directly via Vite CLI to avoid double --port flags
  console.log('[lighthouse] Starting preview server...');
  const preview = spawnProc(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  try {
    // 3) Wait for server to be ready
    await waitForServer(URL);

    // 4) Run Lighthouse using local binary to avoid npx hangs on Windows
    const isWin = process.platform === 'win32';
    const lighthouseBin = isWin
      ? 'node_modules\\.bin\\lighthouse.cmd'
      : 'node_modules/.bin/lighthouse';
    const lighthouseArgs = [
      URL,
      '--quiet',
      '--preset=desktop',
      '--output=json',
      '--output=html',
      // Provide a base path so LH writes both .report.json and .report.html
      '--output-path=./lighthouse-report',
    ];
    console.log('[lighthouse] Running Lighthouse...');
    await run(lighthouseBin, lighthouseArgs, {
      env: { ...process.env, CI: process.env.CI || 'true' },
    });

    // Sanity: ensure JSON exists for downstream diff tools
    if (!existsSync('lighthouse-report.report.json')) {
      console.warn('[lighthouse] Expected lighthouse-report.report.json not found.');
    }

    // 5) Generate diff CSV against previous snapshot if present
    try {
      await run('node', ['scripts/lighthouse_diff.mjs']);
    } catch (e) {
      console.warn('[lighthouse] lighthouse diff generation failed:', e.message);
    }
  } finally {
    // Ensure preview is terminated
    try {
      preview.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
