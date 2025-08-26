#!/usr/bin/env node
// Minimal placeholder MCP-style server for Mem0 (stub)
// Real implementation would use the Mem0 SDK when available.

import { out, fail } from './mcp_util.mjs';

const key = process.env.MEM0_API_KEY;
if (!key) fail('MEM0_API_KEY not set');

// In-memory fallback store for stub behavior
const store = [];

function addMemory(text) {
  const m = { id: store.length + 1, text, ts: Date.now() };
  store.push(m);
  return m;
}
function listMemories() {
  return store.slice(-10);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === 'help') {
  out({ notice: 'Mem0 MCP stub', usage: 'add <text> | list' });
  process.exit(0);
}
if (cmd === 'add') {
  const text = rest.join(' ');
  const saved = addMemory(text || '');
  out({ added: saved });
  process.exit(0);
}
if (cmd === 'list') {
  out({ memories: listMemories() });
  process.exit(0);
}
fail('Unknown command');
