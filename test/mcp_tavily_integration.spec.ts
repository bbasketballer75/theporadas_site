import { spawn } from 'node:child_process';
import process from 'node:process';

import { describe, it, expect } from 'vitest';

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type MockScenario = 'success' | 'auth' | 'quota' | 'http' | 'parse' | 'network';

type FetchFn = (...args: unknown[]) => Promise<FetchResponseLike>;

function buildFetch(scenario: MockScenario): FetchFn {
  return async () => {
    if (scenario === 'network') {
      throw new Error('simulated network failure');
    }
    if (scenario === 'parse') {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (n: string) => (n.toLowerCase() === 'content-type' ? 'application/json' : null),
        },
        async json() {
          throw new Error('bad json');
        },
        async text() {
          return 'unreachable';
        },
      };
    }
    const base = {
      headers: {
        get: (n: string) => (n.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      async json() {
        return { results: [{ url: 'http://example.com', title: 'Example' }], query: 'q' };
      },
      async text() {
        return JSON.stringify({ error: 'x' });
      },
    };
    if (scenario === 'success')
      return { ok: true, status: 200, statusText: 'OK', ...base } as FetchResponseLike;
    if (scenario === 'auth')
      return { ok: false, status: 401, statusText: 'Unauthorized', ...base } as FetchResponseLike;
    if (scenario === 'quota')
      return { ok: false, status: 429, statusText: 'Too Many', ...base } as FetchResponseLike;
    if (scenario === 'http')
      return { ok: false, status: 500, statusText: 'Server Error', ...base } as FetchResponseLike;
    return { ok: true, status: 200, statusText: 'OK', ...base } as FetchResponseLike;
  };
}

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
      env: { ...process.env, TAVILY_API_KEY: 'test-key' },
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
    child.stdin.write(
      'global.__MCP_FAKE_FETCH = (' + buildFetch.toString() + `)('${scenario}');\n`,
    );
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

describe('tavily server integration (mock fetch)', () => {
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
