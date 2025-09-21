#!/usr/bin/env node
/* Minimal memory bank RPC server to surface structured errors */
import process from 'node:process';

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
    const { id, method, params } = msg || {};
    if (method === 'mb/read') {
      const file = params?.file || '';
      if (String(file).startsWith('..')) {
        const error = {
          code: 2300,
          message: 'Invalid file',
          data: { symbol: 'E_MB_FILE_NOT_FOUND' },
        };
        return respond({ jsonrpc: '2.0', id, error });
      }
      return respond({ jsonrpc: '2.0', id, result: { content: '' } });
    }
    return respond({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});
