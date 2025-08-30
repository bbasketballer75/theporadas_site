/* eslint-env node */
/* global process */
import { spawn } from 'child_process';
import http from 'http';

function startGateway() {
  const env = { ...process.env, MCP_SSE_PORT: '39500', MCP_SSE_HEARTBEAT_MS: '40' };
  const proc = spawn(process.execPath, ['scripts/mcp_sse_gateway.mjs'], { env });
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
          // ignore parse errors
        }
      }
    });
    proc.once('error', reject);
  });
  return { proc, ready };
}

function fetchOnce(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: 39500, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        setTimeout(() => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }, 150);
      })
      .on('error', reject);
  });
}

describe('mcp_sse_gateway alias paths', () => {
  it('serves heartbeat via short aliases /sse and /latest/sse', async () => {
    const { proc, ready } = startGateway();
    await ready;
    const paths = ['/sse', '/latest/sse'];
    const results = await Promise.all(paths.map((p) => fetchOnce(p)));
    proc.kill();
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(/text\/event-stream/i.test(r.headers['content-type'] || '')).toBe(true);
      expect(r.body).toMatch(/event: heartbeat/);
    }
  });
});
