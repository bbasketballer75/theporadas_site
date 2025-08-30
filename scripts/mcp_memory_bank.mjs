#!/usr/bin/env node
// Memory Bank MCP server using shared harness
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { mbError } from './mcp_error_codes.mjs';
import { register, createServer, appError } from './mcp_rpc_base.mjs';

const dir = resolve(process.env.MCP_MEMORY_BANK_DIR || 'memory-bank');

function listFiles() {
  return readdirSync(dir).filter((f) => f.endsWith('.md') && f.length < 200);
}
function readFile(file) {
  return readFileSync(resolve(dir, file), 'utf8');
}
function search(q) {
  const lc = q.toLowerCase();
  const results = [];
  for (const f of listFiles()) {
    const lines = readFile(f).split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (line.length < 2000 && line.toLowerCase().includes(lc))
        results.push({ file: f, line: idx + 1, text: line.trim().slice(0, 500) });
    });
  }
  return results.slice(0, 50);
}

createServer(() => {
  register('mb/list', () => ({ files: listFiles() }));
  register('mb/read', (params) => {
    if (!params?.file)
      throw appError(1000, 'file required', { domain: 'memory-bank', symbol: 'E_INVALID_PARAMS' });
    if (typeof params.file !== 'string' || params.file.includes('..'))
      throw mbError('FILE_NOT_FOUND', { details: String(params.file) });
    return { content: readFile(params.file).slice(0, 20000) };
  });
  register('mb/search', (params) => {
    if (!params?.q)
      throw appError(1000, 'q required', { domain: 'memory-bank', symbol: 'E_INVALID_PARAMS' });
    if (typeof params.q !== 'string' || params.q.length > 200)
      throw appError(1005, 'query too long', {
        domain: 'memory-bank',
        symbol: 'E_INPUT_TOO_LARGE',
      });
    return { matches: search(params.q) };
  });
});
