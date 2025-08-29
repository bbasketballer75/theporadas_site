#!/usr/bin/env node
// Tavily MCP JSON-RPC server using shared harness.
// Provides method: tv/search { query, depth?, maxResults? }
// Emits structured domain errors via tvError helper.

import './load_env.mjs';
import fetchOrig from 'node-fetch';
import { createServer } from './mcp_rpc_base.mjs';
import { tvError } from './mcp_error_codes.mjs';

const API_URL = process.env.TAVILY_API_URL || 'https://api.tavily.com/search';

// Ensure API key presence at startup so supervisor detects failure immediately when absent.
// Previous behavior lazily checked on first request, causing supervisor tests expecting give-up to fail.
const _eagerKey = process.env.TAVILY_API_KEY ? null : (() => requireKey())();

// Optional forced crash for supervisor testing: if set, exit immediately non-zero after emitting a diagnostic line.
if (process.env.TAVILY_FORCE_CRASH === '1') {
  process.stderr.write('Tavily forced crash for supervisor test (TAVILY_FORCE_CRASH=1)\n');
  process.exit(13);
}

function requireKey() {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    // Emit structured error then exit non-zero so supervisor can apply give-up logic.
    process.stderr.write('Tavily API key missing (TAVILY_API_KEY)\n');
    process.exit(12); // distinct non-zero
  }
  return key;
}

function maybeMockResponse(scenario) {
  if (!scenario) return null;
  const base = {
    headers: { get: (n) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) },
    async text() {
      return JSON.stringify({ error: 'x' });
    },
  };
  if (scenario === 'network') return 'NETWORK_ERROR';
  if (scenario === 'parse')
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      ...base,
      async json() {
        throw new Error('bad json');
      },
    };
  if (scenario === 'success')
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      ...base,
      async json() {
        return { results: [{ url: 'http://example.com', title: 'Example' }], query: 'q' };
      },
    };
  if (scenario === 'auth')
    return {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      ...base,
      async json() {
        return { error: 'unauthorized' };
      },
    };
  if (scenario === 'quota')
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many',
      ...base,
      async json() {
        return { error: 'quota' };
      },
    };
  if (scenario === 'http')
    return {
      ok: false,
      status: 500,
      statusText: 'Server Error',
      ...base,
      async json() {
        return { error: 'http' };
      },
    };
  return null;
}

async function tavilySearch(params = {}) {
  const { query, depth = 'basic', maxResults } = params;
  if (!query || typeof query !== 'string')
    throw tvError('INVALID_PARAMS', { details: 'query string required' });
  if (depth && !['basic', 'advanced'].includes(depth))
    throw tvError('INVALID_PARAMS', { details: 'depth must be basic|advanced' });
  const key = requireKey();
  let body = { query, search_depth: depth };
  if (Number.isInteger(maxResults) && maxResults > 0) body.max_results = maxResults;
  let res;
  const mockScenario = process.env.TAVILY_MOCK_SCENARIO;
  const mock = maybeMockResponse(mockScenario);
  if (mock) {
    if (mock === 'NETWORK_ERROR')
      throw tvError('NETWORK', { details: 'simulated network failure' });
    res = mock;
  } else {
    try {
      res = await fetchOrig(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw tvError('NETWORK', { details: e.message });
    }
  }
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    // Attempt to parse error body
    let errText = await res.text().catch(() => '');
    let detail = errText.slice(0, 500);
    if (res.status === 401 || res.status === 403) throw tvError('AUTH_FAILED', { details: detail });
    if (res.status === 429) throw tvError('QUOTA', { details: detail });
    throw tvError('HTTP_ERROR', { details: `${res.status} ${res.statusText} ${detail}` });
  }
  let json;
  if (ct.includes('application/json')) {
    try {
      json = await res.json();
    } catch (e) {
      throw tvError('PARSE', { details: e.message });
    }
  } else {
    const text = await res.text();
    throw tvError('PARSE', { details: `unexpected content-type ${ct} body:${text.slice(0, 200)}` });
  }
  // Normalize to nested shape expected by integration tests: { result: { results:[...] } }
  let nested = json;
  if (json && json.results && !json.result) {
    nested = { result: { results: json.results } };
  }
  return { query, depth, result: nested.result ? nested.result : nested };
}

createServer(({ register }) => {
  register('tv/search', tavilySearch);
});
