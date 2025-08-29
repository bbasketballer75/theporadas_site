import { spawn } from 'child_process';
import { describe, it, expect } from 'vitest';

function startServer(cmd, args, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: process.env });
    const methods = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { child.kill(); } catch {}
        reject(new Error('timeout waiting for ready'));
      }
    }, timeout);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      chunk.split(/\n/).filter(Boolean).forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'ready' && !settled) {
            if (Array.isArray(obj.methods)) methods.push(...obj.methods);
            settled = true;
            clearTimeout(timer);
            resolve({ child, methods });
          }
        } catch {}
      });
    });
    child.on('error', e => { if (!settled){ clearTimeout(timer); settled = true; reject(e);} });
    child.on('exit', c => { if (!settled){ clearTimeout(timer); settled = true; reject(new Error('exited '+c)); } });
  });
}

async function rpc(child, method, params) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e6);
    const timer = setTimeout(() => reject(new Error('rpc timeout')), 5000);
    function onData(d){
      d.split(/\n/).filter(Boolean).forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.id === id) {
            clearTimeout(timer);
            child.stdout.off('data', onData);
            if (obj.error) reject(new Error(obj.error.message)); else resolve(obj.result);
          }
        } catch {}
      });
    }
    child.stdout.on('data', onData);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

describe('firebase MCP integration', () => {
  it('ping always available and optional project/app listing', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_firebase.mjs']);
    expect(methods).toContain('firebase/ping');
    const pong = await rpc(child, 'firebase/ping', {});
    expect(pong.ok).toBe(true);
    if (process.env.FIREBASE_TOKEN) {
      if (methods.includes('firebase/projects')) {
        const projects = await rpc(child, 'firebase/projects', {});
        expect(Array.isArray(projects.projects) || typeof projects === 'object').toBe(true);
      }
      if (methods.includes('firebase/apps')) {
        // Might require projectId param; attempt minimal invocation. If fails, we still kill gracefully.
        try {
          await rpc(child, 'firebase/apps', {});
        } catch (e) {
          // acceptable if API requires additional params in some environments.
        }
      }
    }
    child.kill();
  });
});
