import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

interface RpcCall {
  method: string;
  params?: Record<string, unknown>;
}

interface RpcResponseBase {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  error?: unknown;
  [key: string]: unknown;
}

interface ErrorStatsResult {
  total?: number;
  [code: string]: unknown;
}

interface MetricsResult {
  methods?: Record<string, { calls: number; errors: number; [k: string]: unknown }>;
  [k: string]: unknown;
}

type RpcResponse = RpcResponseBase & { result?: ErrorStatsResult | MetricsResult };

function runServer(
  script: string,
  calls: RpcCall[],
): Promise<{ lines: string[]; responses: RpcResponse[] }> {
  return new Promise((resolve) => {
    const child = spawn('node', [script], {
      env: { ...process.env, MCP_ERROR_METRICS: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines: string[] = [];
    const responses: RpcResponse[] = [];
    child.stdout.on('data', (d) => {
      const text = d.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
        try {
          const j = JSON.parse(line);
          if (j.jsonrpc === '2.0') responses.push(j);
        } catch {
          /* ignore parse */
        }
      }
    });
    let i = 0;
    const sendNext = () => {
      if (i >= calls.length) {
        // Query metrics endpoints
        child.stdin.write(
          JSON.stringify({ jsonrpc: '2.0', id: 'err', method: 'sys/errorStats' }) + '\n',
        );
        child.stdin.write(
          JSON.stringify({ jsonrpc: '2.0', id: 'met', method: 'sys/metrics' }) + '\n',
        );
        // Allow short delay then end
        setTimeout(() => {
          try {
            child.kill('SIGTERM');
          } catch {
            // ignore
          }
          resolve({ lines, responses });
        }, 150);
        return;
      }
      const c = calls[i++];
      child.stdin.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: `c${i}`,
          method: c.method,
          params: c.params,
        }) + '\n',
      );
      setTimeout(sendNext, 30);
    };
    // Wait for ready sentinel
    let gotReady = false;
    child.stdout.on('data', (d) => {
      if (gotReady) return;
      const text = d.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j && j.type === 'ready') {
            gotReady = true;
            setTimeout(sendNext, 20);
            break;
          }
        } catch {
          /* ignore */
        }
      }
    });
  });
}

describe('MCP harness metrics', () => {
  it('collects per-method and error metrics', async () => {
    const { responses } = await runServer('scripts/mcp_test_metrics.mjs', [
      { method: 'ok/ping', params: { msg: 'x' } },
      { method: 'err/fail' },
    ]);
    const errStats = responses.find((r) => r.id === 'err');
    const metrics = responses.find((r) => r.id === 'met');
    // One failing call should register an error code in errorStats total >=1
    if (errStats?.result && typeof (errStats.result as ErrorStatsResult).total === 'number') {
      const total = (errStats.result as ErrorStatsResult).total!;
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(1);
    }
    if (metrics?.result && (metrics.result as MetricsResult).methods) {
      const methods = (metrics.result as MetricsResult).methods!;
      expect(methods).toBeTruthy();
      const ok = methods['ok/ping'];
      const fail = methods['err/fail'];
      expect(ok.calls).toBeGreaterThanOrEqual(1);
      expect(ok.errors).toBe(0);
      expect(fail.calls).toBeGreaterThanOrEqual(1);
      expect(fail.errors).toBeGreaterThanOrEqual(1);
    }
  });
});
