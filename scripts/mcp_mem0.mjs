#!/usr/bin/env node
// Persistent minimal MCP server for Mem0-like memory store
import './load_env.mjs';

if (!process.env.MEM0_API_KEY) {
  process.stdout.write(JSON.stringify({ type: 'error', error: 'MEM0_API_KEY not set' }) + '\n');
  process.exit(1);
}

const store = [];
const methods = ['mem0/add', 'mem0/list'];
process.stdout.write(
  JSON.stringify({ type: 'ready', methods, schema: { service: 'mem0', version: 1 } }) + '\n',
);

function add(text) {
  const m = { id: store.length + 1, text: text || '', ts: Date.now() };
  store.push(m);
  return m;
}
function list() {
  return store.slice(-50);
}

process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  const lines = buf.split(/\n/);
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.jsonrpc !== '2.0' || !msg.method) continue;
    if (msg.method === 'mem0/add') {
      const text = msg.params?.text || '';
      return sendResult(msg.id, { added: add(text) });
    }
    if (msg.method === 'mem0/list') {
      return sendResult(msg.id, { memories: list() });
    }
    if (/listMethods$/i.test(msg.method)) {
      return sendResult(msg.id, { methods });
    }
    sendError(msg.id, 'NOT_IMPLEMENTED', 'Unknown method');
  }
});

function sendResult(id, result) {
  if (id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function sendError(id, code, message) {
  if (id !== undefined)
    process.stdout.write(
      JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, data: { code }, message } }) +
        '\n',
    );
}
