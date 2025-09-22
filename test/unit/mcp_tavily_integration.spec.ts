import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

type MockScenario = 'success' | 'auth' | 'quota' | 'http' | 'parse' | 'network';
// Network mocking now handled by TAVILY_MOCK_SCENARIO env in server.

interface TavilySuccessInnerResult {
  url: string;
  title: string;
}

interface TavilySuccessPayload {
  result?: { results?: TavilySuccessInnerResult[] };
}

interface RpcErrorData {
  domain?: string;
}

interface RpcErrorShape {
  code: number;
  message: string;
  data?: RpcErrorData;
}

interface RpcResponse {
  jsonrpc: '2.0';
  id?: string;
  result?: TavilySuccessPayload;
  error?: RpcErrorShape;
  type?: string;
}

function runScenario(scenario: MockScenario): Promise<RpcResponse[]> {
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/mcp_tavily.mjs'], {
      env: { ...process.env, TAVILY_API_KEY: 'test-key', TAVILY_MOCK_SCENARIO: scenario },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const responses: RpcResponse[] = [];
    child.stdout.on('data', (d) => {
      for (const line of d.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j.jsonrpc === '2.0') responses.push(j as RpcResponse);
          if (j.type === 'ready') {
            child.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: '1',
                method: 'tv/search',
                params: { query: 'q' },
              }) + '\n',
            );
          }
        } catch {
          // ignore parse
        }
      }
    });
    // no stdin injection required
    setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      resolve(responses);
    }, 1500);
  });
}

describe('tavily server integration (env mock)', () => {
  it('returns success shape', async () => {
    const r = await runScenario('success');
    const resp = r.find((x) => x.id === '1');
    const list = resp?.result?.result?.results;
    expect(Array.isArray(list) && list.length > 0).toBe(true);
  });
  it('auth failure mapped', async () => {
    const r = await runScenario('auth');
    const resp = r.find((x) => x.id === '1');
    expect(resp?.error?.code).toBe(2901);
  });
  it('quota failure mapped', async () => {
    const r = await runScenario('quota');
    const resp = r.find((x) => x.id === '1');
    expect(resp?.error?.code).toBe(2905);
  });
  it('http error mapped', async () => {
    const r = await runScenario('http');
    const resp = r.find((x) => x.id === '1');
    expect(resp?.error?.code).toBe(2903);
  });
  it('parse error mapped', async () => {
    const r = await runScenario('parse');
    const resp = r.find((x) => x.id === '1');
    expect(resp?.error?.code).toBe(2906);
  });
  it('network error mapped', async () => {
    const r = await runScenario('network');
    const resp = r.find((x) => x.id === '1');
    expect(resp?.error?.code).toBe(2902);
  });
});
