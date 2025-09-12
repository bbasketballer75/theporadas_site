#!/usr/bin/env node
/* Minimal KG memory RPC server */
import process from 'node:process';

const MAX = Number(process.env.MCP_KG_MAX_TRIPLES || 1000);
let count = 0;

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

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
    const { id, method } = msg || {};
    if (method === 'kg/add') {
      if (count >= MAX) {
        const error = {
          code: 2400,
          message: 'KG full',
          data: { symbol: 'E_KG_FULL' },
        };
        return respond({ jsonrpc: '2.0', id, error });
      }
      count += 1;
      return respond({ jsonrpc: '2.0', id, result: { ok: true } });
    }
    return respond({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});
