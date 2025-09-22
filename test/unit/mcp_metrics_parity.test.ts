/* global process */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as net from 'node:net';

import { describe, it, expect } from 'vitest';

// Use the test metrics server script that registers methods
const HARNESS = 'scripts/mcp_test_metrics.mjs';

async function waitForPort(port: number, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port }, () => {
          socket.end();
          resolve();
        });
        socket.on('error', reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Port ${port} not ready in ${timeoutMs}ms`);
}

describe('MCP harness metrics parity', () => {
  it('RPC sys/promMetrics output matches HTTP /metrics body', async () => {
    const port = 37000 + Math.floor(Math.random() * 1000);

    const env = {
      ...process.env,
      MCP_PROM_METRICS: '1',
      MCP_ERROR_METRICS: '1',
      MCP_HEALTH_PORT: String(port),
    };

    const child = spawn(process.execPath, [HARNESS], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    const rpcLines: string[] = [];
    let ready = false;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      const parts = chunk.split(/\r?\n/).filter(Boolean);
      for (const line of parts) {
        rpcLines.push(line);
        if (line.includes('"type":"ready"')) {
          ready = true;
          continue;
        }
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', () => {
      // Useful if debugging locally; not failing test
      // console.error('[child stderr]', c.toString());
    });

    // Wait for ready
    const start = Date.now();
    while (!ready && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!ready) {
      child.kill();
      throw new Error('Harness did not emit ready in time');
    }

    await waitForPort(port);

    // Trigger a method call to ensure method stats increment
    const callId = randomUUID();
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id: callId, method: 'ok/ping', params: { msg: 'x' } }) +
        '\n',
    );

    // Collect response
    let gotPing = false;
    const waitPingStart = Date.now();
    while (!gotPing && Date.now() - waitPingStart < 3000) {
      for (const line of rpcLines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === callId) {
            gotPing = true;
            break;
          }
        } catch {
          /* ignore parse errors */
        }
      }
      if (!gotPing) await new Promise((r) => setTimeout(r, 25));
    }
    if (!gotPing) {
      child.kill();
      throw new Error('Did not receive ping response');
    }

    // Request RPC metrics
    const metricsId = randomUUID();
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id: metricsId, method: 'sys/promMetrics' }) + '\n',
    );

    let rpcMetrics: string | null = null;
    const waitMetricsStart = Date.now();
    while (!rpcMetrics && Date.now() - waitMetricsStart < 3000) {
      for (const line of rpcLines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === metricsId && msg.result?.body) {
            rpcMetrics = msg.result.body as string;
            break;
          }
        } catch {
          /* ignore parse errors */
        }
      }
      if (!rpcMetrics) await new Promise((r) => setTimeout(r, 25));
    }
    if (!rpcMetrics) {
      child.kill();
      throw new Error('Did not receive RPC metrics');
    }

    // Fetch HTTP metrics
    const httpRes = await fetch(`http://localhost:${port}/metrics`);
    expect(httpRes.status).toBe(200);
    const httpMetrics = await httpRes.text();

    const norm = (s: string) => s.trim().split(/\r?\n/).filter(Boolean).join('\n');

    expect(norm(rpcMetrics)).toBe(norm(httpMetrics));

    child.kill();
  }, 20000);
});
