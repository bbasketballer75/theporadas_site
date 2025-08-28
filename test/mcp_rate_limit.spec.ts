import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

interface ErrorData {
  domain?: string;
  symbol?: string;
  [k: string]: unknown;
}
interface ErrorShape {
  code: number;
  message: string;
  data?: ErrorData;
}
interface RpcResponse {
  jsonrpc: '2.0';
  id?: string;
  result?: unknown;
  error?: ErrorShape;
  type?: string;
}

function runLimited(calls: number): Promise<RpcResponse[]> {
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/mcp_test_metrics.mjs'], {
      env: {
        ...process.env,
        MCP_RATE_LIMIT: '1',
        MCP_RATE_LIMIT_CAPACITY: '2',
        MCP_RATE_LIMIT_REFILL_MS: '60000',
        MCP_RATE_LIMIT_MODE: 'method',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const responses: RpcResponse[] = [];
    child.stdout.on('data', (d) => {
      for (const line of d.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j.jsonrpc === '2.0') responses.push(j as RpcResponse);
        } catch {
          // ignore parse errors
        }
      }
    });
    let sent = 0;
    let ready = false;
    const send = () => {
      if (sent >= calls) {
        setTimeout(() => {
          try {
            child.kill();
          } catch {
            // ignore
          }
          resolve(responses);
        }, 120);
        return;
      }
      child.stdin.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: `c${sent}`,
          method: 'ok/ping',
          params: { msg: 'x' },
        }) + '\n',
      );
      sent++;
      setTimeout(send, 20);
    };
    child.stdout.on('data', (d) => {
      if (ready) return;
      for (const line of d.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j.type === 'ready') {
            ready = true;
            setTimeout(send, 30);
            break;
          }
        } catch {
          // ignore
        }
      }
    });
  });
}

describe('rate limit domain errors', () => {
  it('emits RL domain error after capacity exceeded', async () => {
    const responses = await runLimited(5);
    const errs = responses.filter((r) => r.error);
    expect(errs.length).toBeGreaterThanOrEqual(2);
    const rl = errs.find((e) => e.error?.data?.domain === 'rate-limit');
    expect(rl?.error?.code).toBe(3000);
    expect(rl?.error?.data?.symbol).toBe('E_RL_EXCEEDED');
  });
});
