/* eslint-env node */
/* global process */
import { spawn } from 'child_process';

function start(script) {
  const proc = spawn(process.execPath, [script], { stdio: ['pipe', 'pipe', 'pipe'] });
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
          /* ignore non JSON */
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

describe('sys/setLogLevel', () => {
  it('sets log level to debug', async () => {
    const { proc, ready } = start('scripts/mcp_tavily.mjs');
    await ready;
    const res = await rpc(proc, 1, 'sys/setLogLevel', { level: 'debug' });
    proc.kill();
    expect(res.result).toBeDefined();
    expect(res.error).toBeUndefined();
  });
  it('rejects invalid level', async () => {
    const { proc, ready } = start('scripts/mcp_tavily.mjs');
    await ready;
    const res = await rpc(proc, 2, 'sys/setLogLevel', { level: 'verbose' });
    proc.kill();
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32602); // invalid params
  });
});
