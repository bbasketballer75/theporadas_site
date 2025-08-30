// Helper to emit events into the local SSE gateway ingest endpoint.
// If the gateway is disabled or unreachable, emits are best-effort (silently ignored on failure).
// Configuration via env:
//   MCP_SSE_INGEST_URL  (default: http://127.0.0.1:39300/model_context_protocol/2024-11-05/events)
//   MCP_SSE_INGEST_TOKEN (optional bearer token)
// Exports: emitEvent(topic, data)

import http from 'node:http';
import { URL } from 'node:url';

const DEFAULT_URL = 'http://127.0.0.1:39300/model_context_protocol/2024-11-05/events';
const INGEST_URL = process.env.MCP_SSE_INGEST_URL || DEFAULT_URL;
const INGEST_TOKEN = process.env.MCP_SSE_INGEST_TOKEN || process.env.MCP_SSE_AUTH_TOKEN || '';

export function emitEvent(topic, data = {}) {
  try {
    if (!topic || typeof topic !== 'string') topic = 'message';
    const url = new URL(INGEST_URL);
    const body = JSON.stringify({ topic, data });
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    if (INGEST_TOKEN) opts.headers.Authorization = `Bearer ${INGEST_TOKEN}`;
    const req = http.request(opts, (res) => {
      // Drain data silently
      res.on('data', () => {});
    });
    req.on('error', () => {}); // suppress errors (best-effort)
    req.write(body);
    req.end();
  } catch (error) {
    console.warn(`[mcp-events] Failed to send HTTP request: ${error.message}`);
  }
}
