import sql from 'mssql';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  // Optional factory for providing a custom pool (used in tests to mock driver behavior)
  poolFactory?: () => Promise<PoolLike>;
}

const DEFAULT_TRANSIENT_CODES = new Set<number>([
  40613, 40197, 40501, 4060, 49918, 49919, 49920, 11001,
]);

interface DbConfig {
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  options?: { encrypt?: boolean; trustServerCertificate?: boolean };
}
interface RawError {
  number?: unknown;
  code?: unknown;
  message?: unknown;
}
interface QueryResult<T> {
  recordset?: T[];
}
interface RequestLike {
  input: (n: string, v: unknown) => void;
  query: (q: string) => Promise<QueryResult<unknown>>;
}
interface PoolLike {
  request: () => RequestLike;
  close: () => Promise<void>;
}

export class SqlRetryClient {
  private poolPromise: Promise<PoolLike> | null = null;
  private readonly cfg: DbConfig;
  private readonly retry: Required<Omit<RetryOptions, 'poolFactory'>>;
  private readonly poolFactory?: () => Promise<PoolLike>;

  constructor(cfg: DbConfig, retry?: RetryOptions) {
    this.cfg = { options: { encrypt: true, trustServerCertificate: false }, ...cfg };
    this.retry = {
      maxRetries: retry?.maxRetries ?? 5,
      baseDelayMs: retry?.baseDelayMs ?? 250,
      maxDelayMs: retry?.maxDelayMs ?? 8000,
      factor: retry?.factor ?? 2,
      jitter: retry?.jitter ?? true,
    };
    this.poolFactory = retry?.poolFactory;
  }

  private async getPool(): Promise<PoolLike> {
    if (!this.poolPromise) {
      if (this.poolFactory) {
        this.poolPromise = this.poolFactory();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.poolPromise = sql.connect(this.cfg as any) as unknown as Promise<PoolLike>;
      }
    }
    return this.poolPromise;
  }

  private calcDelay(attempt: number): number {
    const { baseDelayMs, factor, maxDelayMs, jitter } = this.retry;
    let delay = Math.min(baseDelayMs * Math.pow(factor, attempt), maxDelayMs);
    if (jitter) {
      const rand = Math.random();
      delay = delay / 2 + rand * (delay / 2);
    }
    return delay;
  }

  private isTransient(err: unknown): boolean {
    const e = err as RawError | undefined;
    if (!e) return false;
    const code = (e.number as number) || (e.code as number);
    if (code && DEFAULT_TRANSIENT_CODES.has(Number(code))) return true;
    const message = (e.message as string | undefined)?.toLowerCase() || '';
    if (message.includes('timeout') || message.includes('deadlock')) return true;
    if (message.includes('could not open a connection') || message.includes('semaphore timeout'))
      return true;
    return false;
  }

  async query<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    let attempt = 0;
    while (true) {
      try {
        const pool = await this.getPool();
        const request = pool.request();
        if (params) {
          for (const [k, v] of Object.entries(params)) request.input(k, v);
        }
        const result = await request.query(query);
        return (result.recordset as T[] | undefined) || [];
      } catch (err) {
        if (attempt >= this.retry.maxRetries || !this.isTransient(err)) throw err;
        const delay = this.calcDelay(attempt);
        await new Promise((res) => setTimeout(res, delay));
        attempt += 1;
      }
    }
  }

  async close(): Promise<void> {
    if (this.poolPromise) {
      const pool = await this.poolPromise;
      await pool.close();
      this.poolPromise = null;
    }
  }
}

export function parseConnectionString(cs: string): DbConfig {
  const parts = cs.split(/;+/).filter(Boolean);
  const map: Record<string, string> = {};
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (!k || rest.length === 0) continue;
    map[k.trim().toLowerCase()] = rest.join('=').trim();
  }
  return {
    server: map['server'],
    database: map['database'],
    user: map['user id'] || map['uid'] || map['user'],
    password: map['password'] || map['pwd'],
    options: {
      encrypt: /true/i.test(map['encrypt'] || 'true'),
      trustServerCertificate: /true/i.test(map['trustservercertificate'] || 'false'),
    },
  };
}

export function createClientFromEnv(): SqlRetryClient {
  const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };
  const cs = g.process?.env.SQLSERVER_CONNECTION_STRING;
  if (!cs) throw new Error('SQLSERVER_CONNECTION_STRING not set');
  return new SqlRetryClient(parseConnectionString(cs));
}
