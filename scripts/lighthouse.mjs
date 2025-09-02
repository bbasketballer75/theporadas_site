#!/usr/bin/env node
import { spawn } from 'node:child_process';

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

async function waitForServer(url, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Server is ready after ${attempt} attempts`);
        return;
      }
    } catch {
      // Server not ready yet
    }
    console.log(`Waiting for server... (attempt ${attempt}/${maxAttempts})`);
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second between attempts
  }
  throw new Error('Server failed to start within the expected time');
}

async function main() {
  await run('npm', ['run', 'build']);
  // Start preview server
  const preview = spawn('npm', ['run', 'preview', '--', '--port', PORT], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  // Wait for server to be ready
  await waitForServer(URL);

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
