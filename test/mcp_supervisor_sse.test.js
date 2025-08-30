/* eslint-env node */
/* global process */
import { spawn } from 'child_process';
import http from 'http';

function startSupervisor() {
  const env = {
    ...process.env,
    MCP_INCLUDE_SSE: '1',
    MCP_SSE_PORT: '39500',
    MCP_SSE_HEARTBEAT_MS: '60',
  };
  const proc = spawn(process.execPath, ['scripts/mcp_supervisor.mjs', '--only', 'sse'], { env });
  const ready = new Promise((resolve, reject) => {
    let stdoutBuf = '';
    proc.stdout.on('data', (d) => {
      stdoutBuf += d.toString();
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'supervisor' && obj.event === 'ready' && obj.server === 'sse') {
            return resolve(proc);
          }
        } catch {
          // ignore JSON parse
        }
      }
    });
    proc.once('error', reject);
  });
  return { proc, ready };
}

function getOnce(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: 39500, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      })
      .on('error', reject);
  });
}

describe('supervisor + sse integration', () => {
  it('starts SSE gateway under supervisor and serves metrics', async () => {
    const { proc, ready } = startSupervisor();
    await ready;
    const ssePromise = getOnce('/metrics/sse');
    const result = await ssePromise;
    try {
      proc.kill();
    } catch {
      // ignore
    }
    expect(result.status).toBe(200);
    expect(result.body).toContain('mcp_sse_clients');
  });
});
