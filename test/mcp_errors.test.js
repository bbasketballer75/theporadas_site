/* eslint-env node */
/* global process */
import { spawn } from 'child_process';

function startServer(script) {
  const proc = spawn(process.execPath, [script], { stdio: ['pipe', 'pipe', 'pipe'] });
  const ready = new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d.toString();
      let lineIdx;
      while ((lineIdx = buf.indexOf('\n')) !== -1) {
        const part = buf.slice(0, lineIdx).trim();
        buf = buf.slice(lineIdx + 1);
        if (!part) continue;
        try {
          const obj = JSON.parse(part);
          if (obj.type === 'ready') return resolve({ proc });
        } catch {
          // ignore parse errors
        }
      }
    });
    proc.once('error', reject);
  });
  return { proc, ready };
}

function rpc(proc, id, method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return new Promise((resolve, reject) => {
    let buf = '';
    function onData(d) {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.id === id) {
            proc.stdout.off('data', onData);
            return resolve(obj);
          }
        } catch (e) {
          proc.stdout.off('data', onData);
          return reject(e);
        }
      }
    }
    proc.stdout.on('data', onData);
  });
}

describe('MCP structured errors', () => {
  test('python code too large structured error', async () => {
    const { proc, ready } = startServer('scripts/mcp_python.mjs');
    await ready;
    const big = 'x'.repeat(3000);
    const res = await rpc(proc, 2, 'py/exec', { code: big });
    proc.kill();
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(1005);
    expect(res.error.data.symbol).toBe('E_INPUT_TOO_LARGE');
    expect(res.error.data.domain).toBe('python');
  });

  test('memory bank invalid file structured error', async () => {
    const { proc, ready } = startServer('scripts/mcp_memory_bank.mjs');
    await ready;
    const res = await rpc(proc, 3, 'mb/read', { file: '../secret' });
    proc.kill();
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(2300);
    expect(res.error.data.symbol).toBe('E_MB_FILE_NOT_FOUND');
  });

  test('kg full structured error', async () => {
    process.env.MCP_KG_MAX_TRIPLES = '1';
    const { proc, ready } = startServer('scripts/mcp_kg_memory.mjs');
    await ready;
    const add1 = await rpc(proc, 4, 'kg/add', { subject: 'a', predicate: 'b', object: 'c' });
    expect(add1.result).toBeDefined();
    const add2 = await rpc(proc, 5, 'kg/add', { subject: 'd', predicate: 'e', object: 'f' });
    proc.kill();
    expect(add2.error).toBeDefined();
    expect(add2.error.code).toBe(2400);
    expect(add2.error.data.symbol).toBe('E_KG_FULL');
  });
});
