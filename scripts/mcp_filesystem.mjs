#!/usr/bin/env node
// Minimal placeholder MCP-style server for constrained filesystem ops
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import './mcp_logging.mjs';

import { fsError } from './mcp_error_codes.mjs';
import { fail, out } from './mcp_util.mjs';

const root = resolve(process.env.MCP_FS_ROOT || process.cwd());
const maxBytes = process.env.MCP_FS_MAX_BYTES ? Number(process.env.MCP_FS_MAX_BYTES) : null;
const allowGlobsRaw = process.env.MCP_FS_ALLOW_WRITE_GLOBS || '';
const allowPatterns = allowGlobsRaw
  .split(/[\n,]/)
  .map((p) => p.trim())
  .filter(Boolean)
  .map((g) => globToRegex(g));

function globToRegex(glob) {
  let re = '^';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 2;
      } else {
        re += '[^/]*';
        i += 1;
      }
      continue;
    }
    if (c === '?') {
      re += '.';
      i += 1;
      continue;
    }
    re += /[\\.^$+()|{}[\]]/.test(c) ? `\\${c}` : c;
    i += 1;
  }
  re += '$';
  return new RegExp(re);
}

function allowedWrite(relPath) {
  if (!allowPatterns.length) return true;
  return allowPatterns.some((rx) => rx.test(relPath));
}

function safePath(p) {
  const rp = resolve(root, p);
  if (!rp.startsWith(root)) throw fsError('PATH_ESCAPE');
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
  const rel = p.replace(/^[./]+/, '');
  if (!allowedWrite(rel)) throw fsError('DENIED', { details: 'Path not in allowlist' });
  if (maxBytes != null && Buffer.byteLength(content, 'utf8') > maxBytes)
    throw fsError('WRITE_TOO_LARGE', { details: `>${maxBytes} bytes` });
  writeFileSync(safePath(p), content, 'utf8');
  return { written: true };
}

function mkdir(p) {
  const rel = p.replace(/^[./]+/, '');
  if (!allowedWrite(rel)) throw fsError('DENIED', { details: 'Path not in allowlist' });
  mkdirSync(safePath(p), { recursive: true });
  return { created: true };
}

function del(p) {
  const rel = p.replace(/^[./]+/, '');
  if (!allowedWrite(rel)) throw fsError('DENIED', { details: 'Path not in allowlist' });
  const sp = safePath(p);
  try {
    rmSync(sp, { recursive: true, force: false });
  } catch {
    throw fsError('NOT_FOUND');
  }
  return { deleted: true };
}

function statInfo(p) {
  const sp = safePath(p);
  let st;
  try {
    st = statSync(sp);
  } catch {
    throw fsError('NOT_FOUND');
  }
  return { path: p, size: st.size, dir: st.isDirectory(), mtimeMs: st.mtimeMs };
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
  } catch {
    fail('Command failed');
  }
}

function respond(id, result, error) {
  if (error) {
    if (error.appCode) {
      const data = {
        domain: error.domain,
        symbol: error.symbol,
        details: error.details,
        retryable: !!error.retryable,
      };
      out({ jsonrpc: '2.0', id, error: { code: error.appCode, message: error.message, data } });
    } else {
      out({ jsonrpc: '2.0', id, error: { message: error.message || String(error) } });
    }
    return;
  }
  out({ jsonrpc: '2.0', id, result });
}

function handleFsList(id, params) {
  const dir = params?.dir || '.';
  return respond(id, { items: list(dir) });
}

function handleFsRead(id, params) {
  if (!params?.path) throw new Error('path required');
  return respond(id, { content: read(params.path) });
}

function handleFsWrite(id, params) {
  if (!params?.path) throw new Error('path required');
  const content = params.content ?? '';
  return respond(id, write(params.path, content));
}

function handleFsMkdir(id, params) {
  if (!params?.path) throw fsError('INVALID_PARAMS');
  return respond(id, mkdir(params.path));
}

function handleFsDelete(id, params) {
  if (!params?.path) throw fsError('INVALID_PARAMS');
  return respond(id, del(params.path));
}

function handleFsStat(id, params) {
  if (!params?.path) throw fsError('INVALID_PARAMS');
  return respond(id, statInfo(params.path));
}

function handleFsCapabilities(id) {
  return respond(id, {
    methods: [
      'fs/list',
      'fs/read',
      'fs/write',
      'fs/mkdir',
      'fs/delete',
      'fs/stat',
      'fs/capabilities',
      'fs/root',
    ],
    maxBytes,
    allowGlobs: allowPatterns.length ? allowGlobsRaw : null,
  });
}

function handleFsRoot(id) {
  return respond(id, { root });
}

function handleRequest(msg) {
  const { id, method, params } = msg;
  try {
    const handler = getMethodHandler(method);
    if (handler) {
      return handler(id, params);
    }
    throw fsError('INVALID_PARAMS', { details: 'Unknown method' });
  } catch (e) {
    respond(id, null, e);
  }
}

function getMethodHandler(method) {
  const methodHandlers = {
    'fs/list': handleFsList,
    'fs/read': handleFsRead,
    'fs/write': handleFsWrite,
    'fs/mkdir': handleFsMkdir,
    'fs/delete': handleFsDelete,
    'fs/stat': handleFsStat,
    'fs/capabilities': handleFsCapabilities,
    'fs/root': handleFsRoot,
  };

  return methodHandlers[method];
}

function runJsonRpc() {
  let buffer = '';
  if (!global.__fsKeepAlive) {
    global.__fsKeepAlive = setInterval(() => {}, 60_000);
  }
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
        if (msg.jsonrpc === '2.0' && (msg.method || Object.hasOwn(msg, 'result'))) {
          if (msg.method) handleRequest(msg);
        }
      } catch {
        out({ jsonrpc: '2.0', error: { message: 'Parse error' } });
      }
    }
  });
  // Keep alive even if stdin closes (Docker may detach stdio)
  process.stdin.on('close', () => {
    if (!global.__fsKeepAlive) {
      global.__fsKeepAlive = setInterval(() => {}, 60_000);
    }
  });
  // Emit legacy custom readiness plus standard readiness envelope.
  out({ jsonrpc: '2.0', method: 'fs/ready', params: { root } });
  process.stdout.write(
    JSON.stringify({
      type: 'ready',
      methods: [
        'fs/list',
        'fs/read',
        'fs/write',
        'fs/mkdir',
        'fs/delete',
        'fs/stat',
        'fs/capabilities',
        'fs/root',
      ],
      schema: { service: 'filesystem', version: 1 },
      // Include server name so supervisor readiness parser (expects type==="ready" && server) registers this server.
      server: process.env.MCP_SERVER_NAME || 'fs',
    }) + '\n',
  );
}

if (process.argv.length > 2 && process.stdin.isTTY) {
  runCli();
} else {
  runJsonRpc();
}
