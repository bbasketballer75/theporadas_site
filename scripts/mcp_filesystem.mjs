#!/usr/bin/env node
// Minimal placeholder MCP-style server for constrained filesystem ops
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, relative } from 'path';
import { out, fail } from './mcp_util.mjs';

const root = resolve(process.env.MCP_FS_ROOT || process.cwd());

function safePath(p) {
  const rp = resolve(root, p);
  if (!rp.startsWith(root)) throw new Error('Path escapes root');
  return rp;
}

function list(dir = '.') {
  const full = safePath(dir);
  return readdirSync(full).map((name) => {
    const fp = resolve(full, name);
    const st = statSync(fp);
    return { name, path: relative(root, fp), size: st.size, dir: st.isDirectory() };
  });
}
function read(p) {
  return readFileSync(safePath(p), 'utf8');
}
function write(p, content) {
  writeFileSync(safePath(p), content, 'utf8');
  return { written: true };
}

// Decide mode: if STDIN isTTY and args present -> CLI; otherwise JSON-RPC stream.
function runCli() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help') {
    out({
      notice: 'Filesystem MCP stub',
      root,
      usage: 'list [dir] | read <file> | write <file> <content>',
    });
    return;
  }
  try {
    if (cmd === 'list') {
      out({ items: list(rest[0]) });
    } else if (cmd === 'read') {
      out({ content: read(rest[0]) });
    } else if (cmd === 'write') {
      const [file, ...cparts] = rest;
      out(write(file, cparts.join(' ')));
    } else {
      fail('Unknown command');
    }
  } catch (e) {
    fail(e.message);
  }
}

function respond(id, result, error) {
  if (error) {
    out({ jsonrpc: '2.0', id, error: { message: error.message || String(error) } });
  } else {
    out({ jsonrpc: '2.0', id, result });
  }
}

function handleRequest(msg) {
  const { id, method, params } = msg;
  try {
    if (method === 'fs/list') {
      const dir = params?.dir || '.';
      return respond(id, { items: list(dir) });
    }
    if (method === 'fs/read') {
      if (!params?.path) throw new Error('path required');
      return respond(id, { content: read(params.path) });
    }
    if (method === 'fs/write') {
      if (!params?.path) throw new Error('path required');
      const content = params.content ?? '';
      return respond(id, write(params.path, content));
    }
    if (method === 'fs/root') {
      return respond(id, { root });
    }
    throw new Error('Unknown method');
  } catch (e) {
    respond(id, null, e);
  }
}

function runJsonRpc() {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (
          msg.jsonrpc === '2.0' &&
          (msg.method || Object.prototype.hasOwnProperty.call(msg, 'result'))
        ) {
          if (msg.method) handleRequest(msg);
        }
      } catch (e) {
        out({ jsonrpc: '2.0', error: { message: 'Parse error: ' + e.message } });
      }
    }
  });
  out({ jsonrpc: '2.0', method: 'fs/ready', params: { root } });
}

if (process.argv.length > 2 && process.stdin.isTTY) {
  runCli();
} else {
  runJsonRpc();
}
