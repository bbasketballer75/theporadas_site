#!/usr/bin/env node
// Health check for Firebase experimental MCP server via PowerShell wrapper.
// Spawns scripts/firebase_mcp.ps1 and waits for readiness banner or fails on timeout.
import { spawn } from 'child_process';

const timeoutMs = parseInt(process.env.FIREBASE_MCP_CHECK_TIMEOUT_MS || '8000', 10);
const ps = spawn(
  'pwsh',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/firebase_mcp.ps1'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

let stdout = '';
let stderr = '';
let done = false;

function finish(ok, msg) {
  if (done) return;
  done = true;
  try {
    ps.kill('SIGKILL');
  } catch {}
  if (ok) {
    console.log(JSON.stringify({ ok: true, message: msg }));
    process.exit(0);
  } else {
    console.error(JSON.stringify({ ok: false, message: msg, stdout, stderr }));
    process.exit(1);
  }
}

const timer = setTimeout(() => finish(false, `timeout after ${timeoutMs}ms`), timeoutMs);

ps.stdout.on('data', (d) => {
  const text = d.toString();
  stdout += text;
  if (/firebase tools experimental MCP server/i.test(stdout)) {
    clearTimeout(timer);
    finish(true, 'firebase MCP ready banner detected');
  }
});
ps.stderr.on('data', (d) => (stderr += d.toString()));
ps.on('error', (e) => finish(false, `spawn error: ${e.message}`));
ps.on('exit', (code) => {
  if (!done) {
    clearTimeout(timer);
    finish(false, `process exited early code=${code}`);
  }
});
