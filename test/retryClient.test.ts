import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SqlRetryClient, parseConnectionString, createClientFromEnv } from '../src/db/retryClient';

interface MockReq {
  inputs: Record<string, unknown>;
  queries: string[];
}

interface QueryResultLike<T> {
  recordset?: T[];
}

function createMockPool(
  sequence: Array<{
    ok?: unknown;
    err?: Partial<{ number: number; code: number; message: string }>;
  }>,
) {
  let call = 0;
  const req: MockReq = { inputs: {}, queries: [] };
  const pool = {
    request() {
      return {
        input(n: string, v: unknown) {
          req.inputs[n] = v;
        },
        async query(q: string): Promise<QueryResultLike<unknown>> {
          req.queries.push(q);
          const step = sequence[call++];
          if (!step) return { recordset: [] };
          if (step.err) {
            const e = { ...step.err } as Error & { number?: number; code?: number };
            throw e;
          }
          return { recordset: Array.isArray(step.ok) ? (step.ok as unknown[]) : [step.ok] };
        },
      };
    },
    async close() {},
  };
  return {
    pool: pool as unknown as {
      request: () => {
        input: (n: string, v: unknown) => void;
        query: (q: string) => Promise<QueryResultLike<unknown>>;
      };
      close: () => Promise<void>;
    },
  };
}

describe('SqlRetryClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(globalThis.Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    (Math.random as unknown as { mockRestore?: () => void }).mockRestore?.();
  });

  it('succeeds first try without retries', async () => {
    const { pool } = createMockPool([{ ok: { a: 1 } }]);
    const client = new SqlRetryClient({}, { poolFactory: async () => pool });
    const rows = await client.query('select 1');
    expect(rows).toEqual([{ a: 1 }]);
  });

  it('retries on transient numeric code then succeeds', async () => {
    const { pool } = createMockPool([
      { err: { number: 40613, message: 'Transient error' } },
      { ok: { v: 2 } },
    ]);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 10, maxDelayMs: 20 },
    );
    const p = client.query('Q');
    await vi.runAllTimersAsync();
    const rows = await p;
    expect(rows).toEqual([{ v: 2 }]);
  });

  it('fails fast on non-transient error', async () => {
    const { pool } = createMockPool([{ err: { number: 12345, message: 'Permanent failure' } }]);
    const client = new SqlRetryClient({}, { poolFactory: async () => pool });
    const p = client.query('Q');
    p.catch(() => {});
    await expect(p).rejects.toMatchObject({ message: 'Permanent failure' });
  });

  it('stops after maxRetries for repeated transient errors', async () => {
    const maxRetries = 2;
    const seq = Array.from({ length: maxRetries + 2 }, () => ({
      err: { number: 40613, message: 'Transient again' },
    }));
    const { pool } = createMockPool(seq);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, maxRetries, baseDelayMs: 5, maxDelayMs: 10 },
    );
    const p = client.query('Q');
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toMatchObject({ message: 'Transient again' });
  });

  it('retries based on timeout message without numeric code', async () => {
    const { pool } = createMockPool([
      { err: { message: 'Connection timeout expired' } },
      { ok: { done: true } },
    ]);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 5, maxDelayMs: 10 },
    );
    const p = client.query('SELECT 1');
    await vi.runAllTimersAsync();
    const rows = await p;
    expect(rows[0]).toEqual({ done: true });
  });

  it('retries based on deadlock message', async () => {
    const { pool } = createMockPool([
      { err: { message: 'Transaction (Process ID 55) was deadlock victim' } },
      { ok: { x: 1 } },
    ]);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 5, maxDelayMs: 10 },
    );
    const p = client.query('UPDATE T');
    await vi.runAllTimersAsync();
    const rows = await p;
    expect(rows[0]).toEqual({ x: 1 });
  });

  it('uses exact exponential delays when jitter disabled', async () => {
    const { pool } = createMockPool([
      { err: { number: 40613, message: 't1' } },
      { err: { number: 40613, message: 't2' } },
      { ok: { ok: true } },
    ]);
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 10, maxDelayMs: 100, factor: 2, jitter: false },
    );
    const p = client.query('Q');
    await vi.runAllTimersAsync();
    await p;
    const delays = spy.mock.calls.map((c: unknown[]) => c[1] as number);
    expect(delays).toEqual([10, 20]);
  });

  it('createClientFromEnv throws if env missing', () => {
    const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };
    const prev = g.process?.env.SQLSERVER_CONNECTION_STRING;
    if (g.process) {
      delete g.process.env.SQLSERVER_CONNECTION_STRING;
    }
    const fn = () => createClientFromEnv();
    expect(fn).toThrow(/not set/);
    if (g.process && prev) {
      g.process.env.SQLSERVER_CONNECTION_STRING = prev;
    }
  });

  it('applies jitter (deterministic here) and exponential backoff', async () => {
    const { pool } = createMockPool([
      { err: { number: 40613, message: 't1' } },
      { err: { number: 40613, message: 't2' } },
      { ok: { done: true } },
    ]);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 10, maxDelayMs: 100, factor: 2 },
    );
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const p = client.query('Q');
    await vi.runAllTimersAsync();
    await p;
    const delays = spy.mock.calls.map((c: unknown[]) => c[1] as number);
    expect(delays[0]).toBe(5); // 10 -> half (0) + 0 * half = 5 when Math.random=0
    expect(delays[1]).toBe(10); // 20 -> half 10 + 0
  });

  it('jitter stays within half..full exponential window for varied random values', async () => {
    // Sequence of Math.random values we'll feed; verify each produced delay is within [expDelay/2, expDelay]
    const randomVals = [0, 0.25, 0.5, 0.75];
    let idx = 0;
    (
      Math.random as unknown as {
        mockRestore?: () => void;
        mockImplementation: (fn: () => number) => void;
      }
    ).mockImplementation?.(() => randomVals[idx++]);
    const { pool } = createMockPool([
      { err: { number: 40613, message: 'e1' } },
      { err: { number: 40613, message: 'e2' } },
      { err: { number: 40613, message: 'e3' } },
      { ok: { done: true } },
    ]);
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 8, factor: 2, maxDelayMs: 200, jitter: true },
    );
    const p = client.query('Q');
    await vi.runAllTimersAsync();
    await p;
    const delays = spy.mock.calls.map((c: unknown[]) => c[1] as number);
    // Expected raw exponential (no jitter) delays would be 8,16,32 -> windows [4..8],[8..16],[16..32]
    const bases = [8, 16, 32];
    for (let i = 0; i < bases.length; i++) {
      const min = bases[i] / 2;
      const max = bases[i];
      expect(delays[i]).toBeGreaterThanOrEqual(min);
      expect(delays[i]).toBeLessThanOrEqual(max);
    }
  });

  it('treats connection open failure message as transient', async () => {
    const { pool } = createMockPool([
      { err: { message: 'Could not open a connection to SQL Server' } },
      { ok: { done: true } },
    ]);
    const client = new SqlRetryClient(
      {},
      { poolFactory: async () => pool, baseDelayMs: 5, maxDelayMs: 10 },
    );
    const p = client.query('Q');
    await vi.runAllTimersAsync();
    const rows = await p;
    expect(rows[0]).toEqual({ done: true });
  });

  it('clamps delay to maxDelayMs once exponent exceeds cap', async () => {
    const seq = [
      { err: { number: 40613, message: 't1' } }, // 10
      { err: { number: 40613, message: 't2' } }, // 20
      { err: { number: 40613, message: 't3' } }, // 40
      { err: { number: 40613, message: 't4' } }, // 80
      { err: { number: 40613, message: 't5' } }, // 160 -> clamp 100
      { ok: { done: true } },
    ];
    const { pool } = createMockPool(seq);
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const client = new SqlRetryClient(
      {},
      {
        poolFactory: async () => pool,
        baseDelayMs: 10,
        maxDelayMs: 100,
        factor: 2,
        jitter: false,
        maxRetries: 6,
      },
    );
    const p = client.query('Q');
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await p;
    const delays = spy.mock.calls.map((c: unknown[]) => c[1] as number);
    expect(delays.slice(0, 5)).toEqual([10, 20, 40, 80, 100]);
  });
});

describe('parseConnectionString', () => {
  it('parses basic fields and defaults encrypt true', () => {
    const cfg = parseConnectionString('Server=localhost;Database=db;User Id=sa;Password=p;');
    expect(cfg.server).toBe('localhost');
    expect(cfg.database).toBe('db');
    expect(cfg.user).toBe('sa');
    expect(cfg.password).toBe('p');
    expect(cfg.options?.encrypt).toBe(true);
  });
  it('handles aliases and trustServerCertificate true', () => {
    const cfg = parseConnectionString(
      'SERVER=s;DATABASE=d;UID=u;PWD=pw;TrustServerCertificate=True;Encrypt=False;',
    );
    expect(cfg.user).toBe('u');
    expect(cfg.password).toBe('pw');
    expect(cfg.options?.encrypt).toBe(false);
    expect(cfg.options?.trustServerCertificate).toBe(true);
  });
  it('ignores empty segments and trims', () => {
    const cfg = parseConnectionString('Server= x ;;; Database= y ; User Id= z ; Password= q ');
    expect(cfg.server).toBe('x');
    expect(cfg.database).toBe('y');
    expect(cfg.user).toBe('z');
    expect(cfg.password).toBe('q');
  });
  it('Encrypt=False alone disables encryption but not trustServerCertificate', () => {
    const cfg = parseConnectionString('Server=s;Database=d;User Id=u;Password=p;Encrypt=False;');
    expect(cfg.options?.encrypt).toBe(false);
    expect(cfg.options?.trustServerCertificate).toBe(false);
  });
});
