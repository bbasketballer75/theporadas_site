/* global process */
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';

import { describe, expect, it } from 'vitest';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1');
    srv.on('listening', () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error('no addr'));
      }
    });
    srv.on('error', reject);
  });
}

async function waitForReady(
  proc: ChildProcessWithoutNullStreams,
  timeoutMs = 4000,
): Promise<{ port?: number }> {
  const lines: string[] = [];
  return await new Promise<{ port?: number }>((resolve, reject) => {
    const to = setTimeout(
      () => reject(new Error('timeout waiting for ready: ' + lines.join('\n'))),
      timeoutMs,
    );
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk: string) => {
      for (const line of chunk.split(/\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
        if (line.includes('"type":"ready"')) {
          try {
            const msg = JSON.parse(line);
            clearTimeout(to);
            resolve({ port: msg.port });
            return;
          } catch {
            // fallthrough
          }
          clearTimeout(to);
          resolve({});
        }
      }
    });
    proc.on('exit', (code: number) => {
      clearTimeout(to);
      reject(new Error('proc exited early ' + code));
    });
  });
}

describe('MCP harness HTTP metrics', () => {
  it('serves /metrics with Prometheus content when enabled', async () => {
    const port = await getFreePort();
    const baseEnv: Record<string, string | undefined> =
      typeof process !== 'undefined' && process.env ? process.env : {};
    const env = {
      ...baseEnv,
      MCP_HEALTH_PORT: String(port),
      MCP_PROM_METRICS: '1',
      MCP_ERROR_METRICS: '1',
    };
    const proc = spawn('node', ['scripts/mcp_test_metrics.mjs'], { env });
    const ready = await waitForReady(proc);
    // trigger a success + error call via RPC over stdin/stdout
    proc.stdin.write('{"jsonrpc":"2.0","id":1,"method":"ok/ping"}\n');
    proc.stdin.write('{"jsonrpc":"2.0","id":2,"method":"err/fail"}\n');
    // Allow a brief tick for metrics to accumulate
    await new Promise((r) => setTimeout(r, 150));
    const realPort = ready.port ?? port;
    const metrics = await fetch(`http://127.0.0.1:${realPort}/metrics`).then((r) => r.text());
    try {
      expect(metrics).toMatch(/mcp_errors_total \d+/);
      expect(metrics).toMatch(/mcp_method_calls_total{method="ok\/ping"} 1/);
      expect(metrics).toMatch(/mcp_method_calls_total{method="err\/fail"} 1/);
      expect(metrics).toMatch(/mcp_method_errors_total{method="err\/fail"} 1/);
    } finally {
      proc.kill();
      await once(proc, 'exit');
    }
  });
});
