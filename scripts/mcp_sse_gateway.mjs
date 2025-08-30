#!/usr/bin/env node
// Minimal HTTP SSE gateway bridging to a single JSON-RPC harness (stdin/stdout) is NOT implemented yet.
// For now this provides a heartbeat event stream so clients hitting
// /model_context_protocol/2024-11-05/sse receive a 200 instead of 404.
// Future: multiplex multiple child MCP processes & forward events.

import crypto from 'node:crypto';
import http from 'node:http';
import process from 'node:process';

const PORT = parseInt(process.env.MCP_SSE_PORT || '39300', 10);
// Versioned base (default date-based). Provide aliases for forward compatibility.
const SSE_VERSION = process.env.MCP_SSE_VERSION || '2024-11-05';
const VERSIONED_SSE_PATH = `/model_context_protocol/${SSE_VERSION}/sse`;
const VERSIONED_INGEST_PATH = `/model_context_protocol/${SSE_VERSION}/events`; // POST
// Additional stable aliases
const SSE_ALIAS_PATHS = [
  VERSIONED_SSE_PATH,
  '/model_context_protocol/latest/sse',
  '/model_context_protocol/sse',
  // Short root aliases (tested via supervisor alias tests)
  '/latest/sse',
  '/sse',
];
const INGEST_ALIAS_PATHS = [
  VERSIONED_INGEST_PATH,
  '/model_context_protocol/latest/events',
  '/model_context_protocol/events',
];
const HEARTBEAT_MS = parseInt(process.env.MCP_SSE_HEARTBEAT_MS || '15000', 10);
const MAX_BUFFER = parseInt(process.env.MCP_SSE_RING_MAX || '500', 10); // ring buffer events retained
const AUTH_TOKEN = process.env.MCP_SSE_AUTH_TOKEN || ''; // for subscribers (optional)
const INGEST_TOKEN = process.env.MCP_SSE_INGEST_TOKEN || AUTH_TOKEN; // ingestion auth (defaults to same)
const HMAC_SECRET = process.env.MCP_SSE_HMAC_SECRET || ''; // optional additional integrity signature

// In-memory state
let nextId = 1;
const ring = [];
const clients = new Set(); // { res, topics:Set<string>, bytes, connectedTs }

// Metrics counters
let totalConnections = 0;
let totalEventsIngested = 0;
let totalEventsDelivered = 0;
let totalEventsDropped = 0; // due to backpressure
let totalBytesSent = 0;

function hmacSignature(payload) {
  if (!HMAC_SECRET) return null;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function writeEvent(res, evt) {
  try {
    let block = '';
    block += `id: ${evt.id}\n`;
    block += `event: ${evt.topic || 'message'}\n`;
    block += `data: ${JSON.stringify(evt.data)}\n`;
    if (evt.sig) block += `data: {"sig":"${evt.sig}"}\n`; // secondary line for signature if present
    block += '\n';
    res.write(block);
    return Buffer.byteLength(block);
  } catch {
    return 0;
  }
}

function addToRing(evt) {
  ring.push(evt);
  if (ring.length > MAX_BUFFER) ring.shift();
}

function deliver(evt) {
  for (const client of clients) {
    if (client.topics && client.topics.size && !client.topics.has(evt.topic)) continue;
    // Simple backpressure: if socket not writable mark dropped
    if (client.res.writableEnded || client.res.destroyed) continue;
    if (client.res.writeable === false) {
      totalEventsDropped++;
      continue;
    }
    const sent = writeEvent(client.res, evt);
    client.bytes += sent;
    totalBytesSent += sent;
    totalEventsDelivered++;
  }
}

function parseTopics(q) {
  if (!q) return null;
  const params = new URLSearchParams(q.startsWith('?') ? q : `?${q}`);
  if (!params.has('topics')) return null;
  return new Set(
    params
      .get('topics')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function authFailed(req) {
  const hdr = req.headers['authorization'];
  if (!AUTH_TOKEN) return false; // auth disabled
  if (!hdr || !hdr.startsWith('Bearer ')) return true;
  const token = hdr.slice(7).trim();
  return token !== AUTH_TOKEN;
}

function ingestAuthFailed(req) {
  const hdr = req.headers['authorization'];
  if (!INGEST_TOKEN) return false;
  if (!hdr || !hdr.startsWith('Bearer ')) return true;
  const token = hdr.slice(7).trim();
  return token !== INGEST_TOKEN;
}

function resumeFrom(lastId, topics) {
  if (!lastId) return [];
  const lid = parseInt(lastId, 10);
  if (!Number.isFinite(lid)) return [];
  return ring.filter((e) => e.id > lid && (!topics || !topics.size || topics.has(e.topic)));
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const base = url.split('?')[0];
  // Metrics endpoint (unauthenticated, low detail)
  if (req.method === 'GET' && base === '/metrics/sse') {
    const lines = [];
    lines.push('# TYPE mcp_sse_clients gauge');
    lines.push(`mcp_sse_clients ${clients.size}`);
    lines.push('# TYPE mcp_sse_total_connections counter');
    lines.push(`mcp_sse_total_connections ${totalConnections}`);
    lines.push('# TYPE mcp_sse_events_ingested counter');
    lines.push(`mcp_sse_events_ingested ${totalEventsIngested}`);
    lines.push('# TYPE mcp_sse_events_delivered counter');
    lines.push(`mcp_sse_events_delivered ${totalEventsDelivered}`);
    lines.push('# TYPE mcp_sse_events_dropped counter');
    lines.push(`mcp_sse_events_dropped ${totalEventsDropped}`);
    lines.push('# TYPE mcp_sse_bytes_sent counter');
    lines.push(`mcp_sse_bytes_sent ${totalBytesSent}`);
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(lines.join('\n') + '\n');
    return;
  }

  if (req.method === 'GET' && SSE_ALIAS_PATHS.includes(base)) {
    if (authFailed(req)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('unauthorized');
      return;
    }
    const topics = parseTopics(url.split('?')[1] || '');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`: stream start id=${nextId}\n\n`);
    const client = { res, topics, bytes: 0, connectedTs: Date.now() };
    clients.add(client);
    totalConnections++;
    // Resume support
    const last = req.headers['last-event-id'];
    const resumeEvents = resumeFrom(last, topics);
    for (const evt of resumeEvents) writeEvent(res, evt);
    // Heartbeat timer
    const hb = setInterval(() => {
      const evt = { id: nextId++, topic: 'heartbeat', data: { ts: Date.now() } };
      addToRing(evt);
      deliver(evt);
    }, HEARTBEAT_MS);
    req.on('close', () => {
      clearInterval(hb);
      clients.delete(client);
    });
    return;
  }

  if (req.method === 'POST' && INGEST_ALIAS_PATHS.includes(base)) {
    if (ingestAuthFailed(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', (d) => {
      body += d;
      if (body.length > 200_000) {
        // basic guard
        res.writeHead(413);
        res.end();
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        let { topic, data } = parsed;
        if (!topic || typeof topic !== 'string') topic = 'message';
        const evt = { id: nextId++, topic, data, ts: Date.now() };
        const payload = JSON.stringify({ topic: evt.topic, id: evt.id, ts: evt.ts });
        const sig = hmacSignature(payload);
        if (sig) evt.sig = sig;
        addToRing(evt);
        totalEventsIngested++;
        deliver(evt);
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: evt.id }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_json' }));
      }
    });
    return;
  }

  res.statusCode = 404;
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(
    JSON.stringify({
      type: 'ready',
      server: 'mcp-sse-gateway',
      port: PORT,
      sseVersion: SSE_VERSION,
      ssePaths: SSE_ALIAS_PATHS,
      ingestPaths: INGEST_ALIAS_PATHS,
      ringSize: MAX_BUFFER,
    }) + '\n',
  );
});
