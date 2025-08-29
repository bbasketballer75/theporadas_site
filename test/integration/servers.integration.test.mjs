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
        try {
          child.kill();
        } catch {}
        reject(new Error('timeout waiting for ready'));
      }
    }, timeout);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      chunk
        .split(/\n/)
        .filter(Boolean)
        .forEach((line) => {
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
    child.on('error', (e) => {
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        reject(e);
      }
    });
    child.on('exit', (c) => {
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        reject(new Error('exited ' + c));
      }
    });
  });
}

async function rpc(child, method, params) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e6);
    const timer = setTimeout(() => reject(new Error('rpc timeout')), 3000);
    child.stdout.on('data', function onData(d) {
      d.split(/\n/)
        .filter(Boolean)
        .forEach((line) => {
          try {
            const obj = JSON.parse(line);
            if (obj.id === id) {
              clearTimeout(timer);
              child.stdout.off('data', onData);
              if (obj.error) reject(new Error(obj.error.message));
              else resolve(obj.result);
            }
          } catch {}
        });
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

describe('MCP servers integration', () => {
  it('github exposes expected methods', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_github.mjs']);
    expect(methods).toContain('gh/repo');
    // basic repo call (optional tokenless public)
    const repo = await rpc(child, 'gh/repo', { owner: 'octocat', repo: 'Hello-World' });
    expect(repo.repo).toBeDefined();
    child.kill();
  });
  it('vectordb add/search cycle', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_vectordb.mjs']);
    expect(methods).toContain('vec/add');
    await rpc(child, 'vec/reset', {});
    await rpc(child, 'vec/add', { id: 'a', vector: [0, 1, 0], metadata: { tag: 't' } });
    const res = await rpc(child, 'vec/search', { vector: [0, 1, 0], k: 1 });
    expect(res.results?.[0]?.id).toBe('a');
    child.kill();
  });
  it('scheduler schedule/list/cancel', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_scheduler.mjs']);
    expect(methods).toContain('sched/schedule');
    const job = await rpc(child, 'sched/schedule', { name: 'test', delayMs: 50 });
    expect(job.id).toBeDefined();
    const list = await rpc(child, 'sched/list', {});
    expect(Array.isArray(list.jobs)).toBe(true);
    const cancel = await rpc(child, 'sched/cancel', { id: job.id });
    expect(cancel.cancelled).toBe(true);
    child.kill();
  });
  it('secrets basic list/get', async () => {
    const { child, methods } = await startServer('node', ['scripts/mcp_secrets.mjs']);
    expect(methods).toContain('sec/list');
    const list = await rpc(child, 'sec/list', {});
    expect(Array.isArray(list.secrets)).toBe(true);
    child.kill();
  });
});
