#!/usr/bin/env node
// Minimal Firebase MCP wrapper: provides readiness and a few CLI-backed methods when FIREBASE_TOKEN set.
// Falls back to stub (ping only) if token absent so smoke tests pass without credentials.
import { spawn } from 'child_process';

const token = process.env.FIREBASE_TOKEN || process.env.GCLOUD_TOKEN;
const methods = ['firebase/ping'];
if (token) {
  methods.push('firebase/projects', 'firebase/apps');
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

send({ type: 'ready', service: 'firebase', methods });

async function runFirebase(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (token) env.FIREBASE_TOKEN = token;
    const child = spawn('firebase', args.concat(['--non-interactive', '--json']), { env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => reject(e));
    child.on('exit', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(out));
        } catch (_) {
          resolve({ raw: out });
        }
      } else {
        reject(new Error(err || out || `firebase exited ${code}`));
      }
    });
  });
}

async function handle(id, method, params) {
  if (method === 'firebase/ping') {
    return { ok: true, authed: Boolean(token) };
  }
  if (!token) throw new Error('FIREBASE_TOKEN not set');
  if (method === 'firebase/projects') {
    const data = await runFirebase(['projects:list']);
    return data;
  }
  if (method === 'firebase/apps') {
    const project = params?.projectId;
    if (!project) throw new Error('projectId required');
    const data = await runFirebase(['apps:list', '--project', project]);
    return data;
  }
  throw new Error('Method not found');
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  const lines = buf.split(/\n/);
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      console.error(`Firebase MCP: Failed to parse message: ${line}, error: ${e.message}`);
      continue;
    }
    if (msg.method === 'listMethods') {
      send({ jsonrpc: '2.0', id: msg.id, result: { methods } });
      continue;
    }
    if (msg.method) {
      (async () => {
        try {
          const result = await handle(msg.id, msg.method, msg.params);
          send({ jsonrpc: '2.0', id: msg.id, result });
        } catch (e) {
          send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: e.message } });
        }
      })();
    }
  }
});
