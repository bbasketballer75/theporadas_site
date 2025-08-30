#!/usr/bin/env node
// Automated smoke runner: iterates servers.json, spawns each persistent server, waits for readiness, optionally
// sends a post-ready listMethods (or first declared) probe. Supports skip list for ephemeral/CLI-style entries
// and custom readiness events (legacy fs/ready). Outputs table plus JSON summary for CI. Exits non-zero if any
// persistent server fails unless SMOKE_IGNORE_FAIL=1.
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const servers = JSON.parse(readFileSync('servers.json', 'utf8'));
const timeoutMs = parseInt(process.env.SMOKE_TIMEOUT_MS || '8000', 10);

// Servers to skip (ephemeral stubs or presently non-conforming): adjust as they are refactored
const skip = new Set(
  (process.env.SMOKE_SKIP || 'firebase')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

// Grace period after emitting ready to allow listMethods response
const postReadyMs = parseInt(process.env.SMOKE_POST_READY_MS || '350', 10);

function runServer(def) {
  return new Promise((resolve) => {
    if (skip.has(def.name)) {
      return resolve({ name: def.name, status: 'skipped', ms: 0, methods: [], stderr: '' });
    }
    const start = Date.now();
    const child = spawn(def.cmd, def.args, { env: process.env });
    let ready = false;
    let methods = [];
    let methodCount = 0;
    let stderr = '';
    let killTimer;
    let postReadyTimer;
    function finish(status) {
      clearTimeout(killTimer);
      clearTimeout(postReadyTimer);
      if (!child.killed) child.kill();
      resolve({
        name: def.name,
        status,
        ms: Date.now() - start,
        methods: methods.slice(0, 50),
        methodCount,
        stderr: stderr.slice(0, 400),
      });
    }
    killTimer = setTimeout(() => finish('timeout'), timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      const lines = chunk.split(/\n/).filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const isReady = obj.type === 'ready' || obj.method === 'fs/ready';
          if (isReady && !ready) {
            ready = true;
            methods = obj.methods || obj.params?.methods || [];
            // Attempt a listMethods style probe if available
            const listMethod = methods.find((m) => /listMethods$/i.test(m));
            if (listMethod) {
              child.stdin.write(
                JSON.stringify({ jsonrpc: '2.0', id: 101, method: listMethod }) + '\n',
              );
            }
            // Collect additional output briefly then finish
            postReadyTimer = setTimeout(() => finish('ready'), postReadyMs);
          } else if (obj.id === 101 && obj.result) {
            if (Array.isArray(obj.result.methods)) {
              methodCount = obj.result.methods.length;
            }
          }
        } catch {
          // ignore invalid JSON
        }
      }
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', () => finish('spawn-error'));
    child.on('exit', (code) => {
      if (!ready) finish('exit-' + code);
    });
  });
}

(async () => {
  const results = [];
  for (const def of servers) {
    try {
      results.push(await runServer(def));
    } catch {
      results.push({
        name: def.name,
        status: 'error',
        ms: 0,
        methods: [],
        stderr: 'unknown error',
      });
    }
  }
  const failed = results.filter((r) => r.status !== 'ready' && r.status !== 'skipped');
  console.log('Name\tStatus\tMs\tDeclared\tEnumerated');
  for (const r of results) {
    console.log(`${r.name}\t${r.status}\t${r.ms}\t${r.methods.length}\t${r.methodCount ?? ''}`);
  }
  // JSON summary for CI parsing
  console.log('\n' + JSON.stringify({ results, failed: failed.map((f) => f.name) }, null, 2));
  if (failed.length) {
    console.error('Failures:', failed.map((f) => f.name).join(','));
    if (process.env.SMOKE_IGNORE_FAIL !== '1') process.exit(1);
  }
})();
