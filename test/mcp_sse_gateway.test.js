/* eslint-env node */
/* global Buffer */
/* global process */
import { spawn } from 'child_process';
import http from 'http';

function startGateway(extraEnv = {}) {
  const env = { ...process.env, MCP_SSE_PORT: '39400', MCP_SSE_HEARTBEAT_MS: '40', ...extraEnv };
  const proc = spawn(process.execPath, ['scripts/mcp_sse_gateway.mjs'], { env });
  const ready = new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'ready') return resolve(proc);
        } catch {
          // ignore
        }
      }
    });
    proc.once('error', reject);
  });
  return { proc, ready };
}

function fetchSSEChunk(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: 39400, path, headers }, (res) => {
        if (res.statusCode !== 200) return reject(new Error('Bad status ' + res.statusCode));
        if (!/text\/event-stream/i.test(res.headers['content-type'] || '')) {
          return reject(new Error('Wrong content-type ' + res.headers['content-type']));
        }
        let collected = '';
        setTimeout(() => resolve(collected), 250);
        res.on('data', (chunk) => {
          collected += chunk.toString();
        });
        res.on('error', (e) => reject(e));
      })
      .on('error', reject);
  });
}

function postIngest(topic, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ topic, data });
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 39400,
        path: '/model_context_protocol/2024-11-05/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c.toString()));
        res.on('end', () => resolve({ status: res.statusCode, body: out }));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fetchMetrics() {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: 39400, path: '/metrics/sse' }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

describe('mcp_sse_gateway', () => {
  it('serves heartbeat SSE events', async () => {
    const { proc, ready } = startGateway();
    await ready;
    const data = await fetchSSEChunk('/model_context_protocol/2024-11-05/sse');
    proc.kill();
    expect(data).toContain('event: heartbeat');
    expect(data).toContain('data: {"ts":');
  });

  it('returns 404 for other paths', async () => {
    const { proc, ready } = startGateway();
    await ready;
    await expect(
      fetchSSEChunk('/model_context_protocol/2024-11-05/other').catch((e) => {
        throw e;
      }),
    ).rejects.toThrow(/Bad status/);
    proc.kill();
  });

  it('forwards ingested events to subscribers', async () => {
    const { proc, ready } = startGateway();
    await ready;
    // Start SSE collection (longer window to allow ingest)
    const ssePromise = fetchSSEChunk('/model_context_protocol/2024-11-05/sse');
    // Ingest custom event
    const r = await postIngest('test/topic', { value: 42 });
    expect(r.status).toBe(202);
    const data = await ssePromise;
    proc.kill();
    expect(data).toMatch(/event: test\/topic/);
    expect(data).toMatch(/"value":42/);
  });

  it('filters by topics query parameter', async () => {
    const { proc, ready } = startGateway();
    await ready;
    const ssePromise = fetchSSEChunk('/model_context_protocol/2024-11-05/sse?topics=only.this');
    await postIngest('other.topic', { a: 1 });
    await postIngest('only.this', { b: 2 });
    const data = await ssePromise;
    proc.kill();
    expect(data).not.toMatch(/event: other\.topic/);
    expect(data).toMatch(/event: only\.this/);
  });

  it('supports resume via Last-Event-ID', async () => {
    const { proc, ready } = startGateway();
    await ready;
    // Generate two events
    await postIngest('resume.test', { seq: 1 });
    await postIngest('resume.test', { seq: 2 });
    // Fetch metrics to find last id impossible; instead subscribe, capture first, then reconnect
    const firstBatch = await fetchSSEChunk(
      '/model_context_protocol/2024-11-05/sse?topics=resume.test',
    );
    // Parse last id from first batch (look for last event id line)
    const ids = Array.from(firstBatch.matchAll(/^id: (\d+)/gm)).map((m) => parseInt(m[1], 10));
    const lastId = Math.max(...ids);
    // Emit another event after capturing id
    await postIngest('resume.test', { seq: 3 });
    const resumed = await fetchSSEChunk(
      '/model_context_protocol/2024-11-05/sse?topics=resume.test',
      {
        'Last-Event-ID': String(lastId - 1),
      },
    );
    proc.kill();
    // Should include event(s) with id > lastId-1, i.e., at least two events
    const resumedIds = Array.from(resumed.matchAll(/^id: (\d+)/gm)).map((m) => parseInt(m[1], 10));
    expect(resumedIds.every((i) => i > lastId - 1)).toBe(true);
  });

  it('enforces auth tokens when configured', async () => {
    const token = 'secret123';
    const { proc, ready } = startGateway({
      MCP_SSE_AUTH_TOKEN: token,
      MCP_SSE_INGEST_TOKEN: token,
    });
    await ready;
    // Unauthorized access
    await expect(
      fetchSSEChunk('/model_context_protocol/2024-11-05/sse').catch((e) => {
        throw e;
      }),
    ).rejects.toThrow(/Bad status 401/);
    // Authorized
    const data = await fetchSSEChunk('/model_context_protocol/2024-11-05/sse', {
      Authorization: 'Bearer ' + token,
    });
    // Ingest unauthorized
    const bad = await postIngest('auth.test', { x: 1 });
    expect(bad.status).toBe(401);
    const good = await postIngest('auth.test', { x: 2 }, token);
    expect(good.status).toBe(202);
    proc.kill();
    expect(data).toContain('event: heartbeat');
  });

  it('exposes metrics endpoint with counters', async () => {
    const { proc, ready } = startGateway();
    await ready;
    await postIngest('metric.topic', { q: 1 });
    const metrics = await fetchMetrics();
    proc.kill();
    expect(metrics.status).toBe(200);
    expect(metrics.body).toMatch(/mcp_sse_events_ingested/);
    expect(metrics.body).toMatch(/mcp_sse_events_delivered/);
  });

  it('increments metrics after multiple events and client connection', async () => {
    const { proc, ready } = startGateway();
    await ready;
    // Open SSE (collect briefly) while sending events
    const sseP = fetchSSEChunk('/model_context_protocol/2024-11-05/sse?topics=multi.metric');
    await postIngest('multi.metric', { i: 1 });
    await postIngest('multi.metric', { i: 2 });
    await postIngest('multi.metric', { i: 3 });
    await sseP;
    const metrics1 = await fetchMetrics();
    proc.kill();
    const ingestedMatch = metrics1.body.match(/mcp_sse_events_ingested (\d+)/);
    const deliveredMatch = metrics1.body.match(/mcp_sse_events_delivered (\d+)/);
    expect(ingestedMatch).not.toBeNull();
    expect(deliveredMatch).not.toBeNull();
    const ingested = parseInt(ingestedMatch[1], 10);
    const delivered = parseInt(deliveredMatch[1], 10);
    expect(ingested).toBeGreaterThanOrEqual(3);
    expect(delivered).toBeGreaterThanOrEqual(3); // may include heartbeat
  });
});
