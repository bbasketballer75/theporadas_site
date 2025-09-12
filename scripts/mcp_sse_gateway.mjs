#!/usr/bin/env node
import http from 'node:http';
import url from 'node:url';

const PORT = parseInt(process.env.MCP_SSE_PORT || '39400', 10);
const HEARTBEAT_MS = parseInt(process.env.MCP_SSE_HEARTBEAT_MS || '10000', 10);
const AUTH_TOKEN = process.env.MCP_SSE_AUTH_TOKEN || '';
const INGEST_TOKEN = process.env.MCP_SSE_INGEST_TOKEN || '';

let nextId = 1;
const events = [];
let metricsIngested = 0;
let metricsDelivered = 0;

/**
 * Broadcast an event to all clients whose topic filter matches.
 */
const clients = new Set(); // Set<{ res, topics: Set<string> | null }>

function sendSSE(res, { event, data, id }) {
  if (id != null) res.write(`id: ${id}\n`);
  if (event) res.write(`event: ${event}\n`);
  if (data !== undefined) res.write(`data: ${JSON.stringify(data)}\n`);
  res.write('\n');
}

function parseTopics(searchParams) {
  const topics = searchParams.get('topics');
  if (!topics) return null;
  const set = new Set();
  for (const t of topics
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean))
    set.add(t);
  return set;
}

function authOk(req, token) {
  if (!token) return true;
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(Array.isArray(h) ? h[0] : h);
  return Boolean(m && m[1] === token);
}

function isSsePath(method, path) {
  return (
    method === 'GET' &&
    (path === '/model_context_protocol/2024-11-05/sse' || path === '/sse' || path === '/latest/sse')
  );
}

function handleMetrics(res) {
  const body = [
    `# TYPE mcp_sse_events_ingested counter`,
    `mcp_sse_events_ingested ${metricsIngested}`,
    `# TYPE mcp_sse_events_delivered counter`,
    `mcp_sse_events_delivered ${metricsDelivered}`,
    '',
  ].join('\n');
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function handleIngest(req, res) {
  if (!authOk(req, INGEST_TOKEN)) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('unauthorized');
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c.toString()));
  req.on('end', () => {
    try {
      const j = JSON.parse(body || '{}');
      const topic = String(j.topic || '').trim();
      if (!topic) throw new Error('missing topic');
      const data = j.data;
      const ev = { id: nextId++, topic, data, ts: Date.now() };
      events.push(ev);
      if (events.length > 1000) events.shift();
      metricsIngested++;
      for (const client of clients) {
        if (client.closed) continue;
        const { res: cRes, topics } = client;
        if (topics && !topics.has(topic)) continue;
        sendSSE(cRes, { id: ev.id, event: topic, data });
        metricsDelivered++;
      }
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad request');
    }
  });
}

function handleSse(req, res) {
  if (!authOk(req, AUTH_TOKEN)) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('unauthorized');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  const topics = parseTopics(new URL(req.url, `http://localhost:${PORT}`).searchParams);
  const client = { res, topics, closed: false };
  clients.add(client);
  req.on('close', () => {
    client.closed = true;
    clients.delete(client);
  });
  // Resume support via Last-Event-ID
  const last = parseInt(req.headers['last-event-id'] || '0', 10);
  if (!Number.isNaN(last) && last > 0) {
    for (const ev of events) {
      if (ev.id > last && (!topics || topics.has(ev.topic))) {
        sendSSE(res, { id: ev.id, event: ev.topic, data: ev.data });
        metricsDelivered++;
      }
    }
  }
  // Heartbeats
  const hb = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: {"ts":${Date.now()}}\n\n`);
    metricsDelivered++;
  }, HEARTBEAT_MS);
  res.on('close', () => clearInterval(hb));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname || '';

  // Metrics endpoint
  if (req.method === 'GET' && path === '/metrics/sse') {
    handleMetrics(res);
    return;
  }

  // Ingest endpoint
  if (req.method === 'POST' && path === '/model_context_protocol/2024-11-05/events') {
    handleIngest(req, res);
    return;
  }

  // SSE endpoints (aliases accepted)
  const isSSE = isSsePath(req.method, path);
  if (isSSE) {
    handleSse(req, res);
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(JSON.stringify({ type: 'ready', port: PORT }) + '\n');
});
