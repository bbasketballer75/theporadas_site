#!/usr/bin/env node
/*
 Minimal MCP-like JSON-RPC server for tests.
 Provides:
  - method: "py/exec" with size guard returning structured error
  - method: "sys/errorStats" returning aggregated error metrics
 Emits a {"type":"ready"} line on startup.
 Environment:
  - MCP_ERROR_METRICS=1 to enable metrics collection
  - MCP_ERRORS_VERBOSE=2 to include a synthetic stack in error.data.stack
*/
import process from 'node:process';

import { config } from 'dotenv';

// Load environment variables from .env file
config();

const metrics = {
  total: 0,
  byCode: Object.create(null),
  bySymbol: Object.create(null),
  byDomain: Object.create(null),
};

function recordError(code, symbol, domain) {
  if (process.env.MCP_ERROR_METRICS !== '1') return;
  metrics.total += 1;
  metrics.byCode[String(code)] = (metrics.byCode[String(code)] || 0) + 1;
  if (symbol) metrics.bySymbol[symbol] = (metrics.bySymbol[symbol] || 0) + 1;
  if (domain) metrics.byDomain[domain] = (metrics.byDomain[domain] || 0) + 1;
}

function makeTooLargeError(id) {
  const err = {
    jsonrpc: '2.0',
    id,
    error: {
      code: 1005,
      message: 'Input too large',
      data: {
        symbol: 'E_INPUT_TOO_LARGE',
        domain: 'python',
      },
    },
  };
  if (process.env.MCP_ERRORS_VERBOSE === '2') {
    err.error.data.stack = 'Error: Input too large\n    at py/exec (mcp_python.mjs:1)';
  }
  return err;
}

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// Ready sentinel
respond({ type: 'ready' });

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  for (const line of chunk.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const { id, method, params } = msg || {};
    if (!method) continue;

    if (method === 'py/exec') {
      const code = typeof params?.code === 'string' ? params.code : '';
      if (code.length > 2048) {
        recordError(1005, 'E_INPUT_TOO_LARGE', 'python');
        return respond(makeTooLargeError(id));
      }
      return respond({ jsonrpc: '2.0', id, result: { ok: true, stdout: '', stderr: '' } });
    }

    if (method === 'sys/errorStats') {
      return respond({ jsonrpc: '2.0', id, result: metrics });
    }

    return respond({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});

process.on('SIGTERM', () => process.exit(0));
