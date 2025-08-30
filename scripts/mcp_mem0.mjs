#!/usr/bin/env node
// Persistent minimal MCP server for Mem0-like memory store
import './load_env.mjs';
import './mcp_logging.mjs';
import { createServer } from './mcp_rpc_base.mjs';

if (!process.env.MEM0_API_KEY) {
  process.stdout.write(JSON.stringify({ type: 'error', error: 'MEM0_API_KEY not set' }) + '\n');
  process.exit(1);
}

const store = [];

function add(text) {
  const m = { id: store.length + 1, text: text || '', ts: Date.now() };
  store.push(m);
  return m;
}

function list() {
  return store.slice(-50);
}

createServer(({ register }) => {
  register('mem0/add', (params) => {
    const text = params?.text || '';
    return { added: add(text) };
  });

  register('mem0/list', () => {
    return { memories: list() };
  });
});
