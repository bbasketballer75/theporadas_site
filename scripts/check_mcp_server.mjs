#!/usr/bin/env node
// Generic readiness / simple RPC probe for MCP-style JSON-RPC line servers.
// Usage:
//   node scripts/check_mcp_server.mjs --cmd "node scripts/mcp_tavily.mjs" --timeout 5000
//   node scripts/check_mcp_server.mjs --cmd "node scripts/mcp_tavily.mjs" --rpc tv/search --params '{"query":"test"}'
// Options:
//   --cmd <string>           Command to spawn (shell=true)
//   --timeout <ms>           Max wait for ready sentinel (default 8000)
//   --rpc <method>           Optional JSON-RPC method to call after ready
//   --params <json>          JSON string params for method
//   --expect-methods <csv>   Fail if any listed methods missing from ready.methods
// Exit codes:
//   0 success, 2 ready timeout, 3 rpc failure, 4 methods mismatch, 5 spawn error

import { spawn } from 'child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cmd') out.cmd = argv[++i];
    else if (a === '--timeout') out.timeout = parseInt(argv[++i], 10);
    else if (a === '--rpc') out.rpc = argv[++i];
    else if (a === '--params') out.params = argv[++i];
    else if (a === '--expect-methods') out.expect = argv[++i];
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.cmd) {
  console.error('missing --cmd');
  process.exit(1);
}
const timeoutMs = Number.isFinite(opts.timeout) ? opts.timeout : 8000;

const child = spawn(opts.cmd, { shell: true });
let done = false;
let readyPayload = null;
let stderrBuf = '';

function finish(code, msg) {
  if (done) return;
  done = true;
  if (msg) console.error(msg);
  try {
    child.kill();
  } catch {}
  process.exit(code);
}

const timer = setTimeout(() => finish(2, 'ready timeout'), timeoutMs);

child.stdout.setEncoding('utf8');
child.stdout.on('data', (data) => {
  for (const line of data.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    let obj;
    try {
      obj = JSON.parse(t);
    } catch {
      continue;
    }
    if (obj.type === 'ready') {
      readyPayload = obj;
      clearTimeout(timer);
      if (opts.expect) {
        const needed = opts.expect
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const missing = needed.filter((m) => !obj.methods || !obj.methods.includes(m));
        if (missing.length) return finish(4, 'missing methods: ' + missing.join(','));
      }
      if (!opts.rpc) return finish(0);
      invokeRPC(opts.rpc, opts.params ? JSON.parse(opts.params) : undefined);
    } else if (obj.id && (obj.result || obj.error)) {
      // RPC response handled in invokeRPC
    }
  }
});

child.stderr.setEncoding('utf8');
child.stderr.on('data', (d) => (stderrBuf += d));
child.on('error', (e) => finish(5, 'spawn error: ' + e.message));
child.on('exit', (c) => {
  if (!done) finish(5, 'child exited prematurely code=' + c + ' stderr=' + stderrBuf.slice(0, 400));
});

let nextId = 1;
function invokeRPC(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  const onData = (data) => {
    for (const line of data.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      let obj;
      try {
        obj = JSON.parse(t);
      } catch {
        continue;
      }
      if (obj.id === id) {
        child.stdout.off('data', onData);
        if (obj.error) return finish(3, 'rpc error: ' + JSON.stringify(obj.error));
        return finish(0);
      }
    }
  };
  child.stdout.on('data', onData);
}
