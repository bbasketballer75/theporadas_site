/* eslint-env node */
/* global process */
import { spawn } from 'child_process';

function start(script, env = {}) {
  const proc = spawn(process.execPath, [script], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  const ready = new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'ready') return resolve(proc);
        } catch {
          // ignore
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

describe('MCP error metrics & verbose stack', () => {
  test('collects metrics and exposes via sys/errorStats', async () => {
    const { proc, ready } = start('scripts/mcp_python.mjs', {
      MCP_ERROR_METRICS: '1',
      MCP_ERRORS_VERBOSE: '2',
    });
    await ready;
    const res = await rpc(proc, 10, 'py/exec', { code: 'x'.repeat(3000) });
    expect(res.error).toBeDefined();
    expect(res.error.data.stack).toBeDefined();
    const stats = await rpc(proc, 11, 'sys/errorStats', {});
    proc.kill();
    expect(stats.result).toBeDefined();
    expect(stats.result.total).toBeGreaterThanOrEqual(1);
    expect(stats.result.byCode['1005']).toBe(1);
    expect(stats.result.bySymbol.E_INPUT_TOO_LARGE).toBe(1);
    expect(stats.result.byDomain.python).toBe(1);
  });
});
