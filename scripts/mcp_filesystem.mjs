#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.MCP_FS_ROOT || process.cwd();
const SERVER_NAME = 'fs';
const MAX_BYTES = parseInt(process.env.MCP_FS_MAX_BYTES || '1048576', 10); // 1MB default
const ALLOW_WRITE_GLOBS = String(process.env.MCP_FS_ALLOW_WRITE_GLOBS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

send({
  type: 'ready',
  server: SERVER_NAME,
  methods: ['fs/ready', 'fs/list', 'fs/read', 'fs/write', 'fs/mkdir', 'fs/delete', 'fs/stat'],
});
send({ jsonrpc: '2.0', method: 'fs/ready', params: { root: ROOT } });

function safeJoin(p) {
  const abs = path.resolve(ROOT, p);
  if (!abs.startsWith(path.resolve(ROOT))) {
    throw Object.assign(new Error('Traversal'), { code: 2500 });
  }
  return abs;
}

function matchAllowlist(p) {
  if (ALLOW_WRITE_GLOBS.length === 0) return true; // if no globs provided, allow all under root
  // naive glob: only supports prefix folder/**
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  return ALLOW_WRITE_GLOBS.some((g) => {
    if (g.endsWith('/**')) return rel.startsWith(g.slice(0, -3));
    return rel === g;
  });
}

function sendError(id, code, message) {
  send({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function handleList(id, params) {
  const dir = String(params.dir || '.');
  try {
    const p = safeJoin(dir);
    const items = fs.readdirSync(p);
    sendResult(id, { items });
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function handleRead(id, params) {
  try {
    const p = safeJoin(String(params.path || ''));
    const content = fs.readFileSync(p, 'utf8');
    sendResult(id, { path: params.path, content });
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function handleWrite(id, params) {
  try {
    const p = safeJoin(String(params.path || ''));
    if (!matchAllowlist(p)) {
      sendError(id, 2501, 'write path not allowed');
      return;
    }
    const content = String(params.content ?? '');
    const size = Buffer.byteLength(content, 'utf8');
    if (size > MAX_BYTES) {
      sendError(id, 2503, 'content too large');
      return;
    }
    const dir = path.dirname(p);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, content);
    sendResult(id, { path: params.path, written: true });
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function handleMkdir(id, params) {
  try {
    const p = safeJoin(String(params.path || ''));
    if (!matchAllowlist(p)) {
      sendError(id, 2501, 'mkdir path not allowed');
      return;
    }
    fs.mkdirSync(p, { recursive: true });
    sendResult(id, { created: true });
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function handleDelete(id, params) {
  try {
    const p = safeJoin(String(params.path || ''));
    if (!matchAllowlist(p)) {
      sendError(id, 2501, 'delete path not allowed');
      return;
    }
    try {
      fs.rmSync(p, { recursive: true, force: true });
      sendResult(id, { deleted: true });
    } catch {
      sendError(id, 2502, 'not found or cannot delete');
    }
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function handleStat(id, params) {
  try {
    const p = safeJoin(String(params.path || ''));
    try {
      const st = fs.statSync(p);
      sendResult(id, { size: st.size, isDir: st.isDirectory() });
    } catch {
      sendError(id, 2502, 'not found');
    }
  } catch {
    sendError(id, 2500, 'traversal');
  }
}

function dispatch(msg) {
  const { id, method, params = {} } = msg;
  switch (method) {
    case 'fs/list':
      handleList(id, params);
      break;
    case 'fs/read':
      handleRead(id, params);
      break;
    case 'fs/write':
      handleWrite(id, params);
      break;
    case 'fs/mkdir':
      handleMkdir(id, params);
      break;
    case 'fs/delete':
      handleDelete(id, params);
      break;
    case 'fs/stat':
      handleStat(id, params);
      break;
    default:
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
}

process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      dispatch(msg);
    } catch {
      send({ jsonrpc: '2.0', error: { code: -32700, message: 'parse error' } });
    }
  }
});
