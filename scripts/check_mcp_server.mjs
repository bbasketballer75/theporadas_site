#!/usr/bin/env node
/**
 * Check an MCP server by spawning a command, waiting for a ready sentinel,
 * optionally ensuring listed methods exist, and optionally performing one RPC.
 *
 * Exit codes:
 *  0: success
 *  2: ready timeout
 *  3: rpc error
 *  4: missing methods
 */

import { spawn } from 'node:child_process';
import process from 'node:process';

function parseArgs(argv) {
  const args = { cmd: null, timeout: 3000, expectMethods: [], rpc: null };
  let i = 2;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--cmd') {
      i += 1;
      args.cmd = argv[i] ?? null;
    } else if (a === '--timeout') {
      i += 1;
      args.timeout = Number(argv[i] ?? 3000);
    } else if (a === '--expect-methods') {
      i += 1;
      args.expectMethods = String(argv[i] ?? '')
        .split(',')
        .filter(Boolean);
    } else if (a === '--rpc') {
      i += 1;
      args.rpc = argv[i] ?? null;
    }
    i += 1;
  }
  return args;
}

async function main() {
  const { cmd, timeout, expectMethods, rpc } = parseArgs(process.argv);
  if (!cmd) {
    console.error('missing --cmd');
    process.exit(2);
    return;
  }
  // Support commands with spaces (e.g., node -e ...)
  const parts = cmd.split(' ');
  const bin = parts.shift();
  const child = spawn(bin, parts, { stdio: ['pipe', 'pipe', 'pipe'] });

  let ready = false;
  const needsMethods = Array.isArray(expectMethods) && expectMethods.length > 0;

  function writeJson(obj) {
    child.stdin.write(JSON.stringify(obj) + '\n');
  }

  function exitWithKill(code) {
    if (!child.killed) child.kill();
    process.exit(code);
  }

  function onReady() {
    ready = true;
    clearTimeout(to);
    if (needsMethods) {
      writeJson({ jsonrpc: '2.0', id: 'lm', method: 'sys/listMethods' });
      return;
    }
    if (rpc) {
      writeJson({ jsonrpc: '2.0', id: 'rc', method: rpc });
      return;
    }
    setTimeout(() => exitWithKill(0), 30);
  }

  function onListMethods(result) {
    const m = Array.isArray(result?.methods) ? result.methods : [];
    const missing = (expectMethods || []).filter((x) => !m.includes(x));
    if (missing.length) {
      console.error('missing methods:', missing.join(','));
      exitWithKill(4);
      return;
    }
    if (rpc) {
      writeJson({ jsonrpc: '2.0', id: 'rc', method: rpc });
      return;
    }
    setTimeout(() => exitWithKill(0), 30);
  }

  function onRpcResponse(msg) {
    if (msg.error) {
      console.error('rpc error:', msg.error?.message || 'unknown');
      exitWithKill(3);
      return;
    }
    setTimeout(() => exitWithKill(0), 30);
  }

  const to = setTimeout(() => {
    if (!ready) {
      console.error('ready timeout');
      exitWithKill(2);
    }
  }, timeout);

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.type === 'ready') {
          onReady();
        } else if (j.id === 'lm') {
          onListMethods(j.result);
        } else if (j.id === 'rc') {
          onRpcResponse(j);
        }
      } catch {
        // ignore parse
      }
    }
  });

  child.on('exit', () => {
    if (!ready) process.exit(2);
  });
}

main().catch((e) => {
  console.error('unexpected error', e);
  process.exit(1);
});
