/* eslint-env node */
/* global process */
import { spawn } from 'child_process';
import http from 'http';

function startSupervisor() {
  const env = {
    ...process.env,
    MCP_INCLUDE_SSE: '1',
    MCP_SSE_PORT: '39600',
    MCP_SSE_HEARTBEAT_MS: '50',
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
          // ignore parse errors
        }
      }
    });
    proc.once('error', reject);
  });
  return { proc, ready };
}

function fetchSSE(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: 39600, path }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c.toString()));
      // Resolve after short window; then destroy to end stream
      setTimeout(() => {
        resolve({ status: res.statusCode, headers: res.headers, body });
        try {
          req.destroy();
        } catch {
          // ignore destroy errors
        }
      }, 180);
    });
    req.on('error', reject);
  });
}

describe('supervisor + sse alias endpoints', () => {
  it('serves identical stream on alias and versioned paths', async () => {
    const { proc, ready } = startSupervisor();
    await ready;
    const paths = ['/sse', '/latest/sse', '/model_context_protocol/2024-11-05/sse'];
    const results = await Promise.all(paths.map((p) => fetchSSE(p)));
    try {
      proc.kill();
    } catch {
      // ignore
    }
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(/text\/event-stream/i.test(r.headers['content-type'] || '')).toBe(true);
      // Should contain at least one SSE line (comment or event)
      expect(/^(?:data:|event:|:)/m.test(r.body)).toBe(true);
    }
  });
});
