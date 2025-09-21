#!/usr/bin/env node
// Minimal Tavily MCP mock server supporting optional mode and mock scenarios
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const OPTIONAL = process.env.TAVILY_OPTIONAL === '1';
const API_KEY = process.env.TAVILY_API_KEY || '';
const SCENARIO = (process.env.TAVILY_MOCK_SCENARIO || 'success').toLowerCase();
const FORCE_CRASH = process.env.TAVILY_FORCE_CRASH === '1';

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

if (FORCE_CRASH) {
  // Immediately exit to simulate crash for supervisor tests
  process.exit(1);
}

if (!API_KEY && !OPTIONAL) {
  console.error('Tavily API key missing and optional mode not enabled');
  process.exit(2);
}

if (!API_KEY && OPTIONAL) {
  console.error('optional mode: proceeding without API key');
}

send({ type: 'ready', server: 'tavily', methods: ['tv/search', 'sys/setLogLevel'] });

const ERR = {
  AUTH: {
    code: 2901,
    message: 'AUTH_FAILED',
    data: { domain: 'tavily', symbol: 'E_TV_AUTH_FAILED' },
  },
  QUOTA: {
    code: 2905,
    message: 'QUOTA_EXCEEDED',
    data: { domain: 'tavily', symbol: 'E_TV_QUOTA' },
  },
  HTTP: { code: 2903, message: 'HTTP_ERROR', data: { domain: 'tavily', symbol: 'E_TV_HTTP' } },
  PARSE: { code: 2906, message: 'PARSE_ERROR', data: { domain: 'tavily', symbol: 'E_TV_PARSE' } },
  NET: {
    code: 2902,
    message: 'NETWORK_ERROR',
    data: { domain: 'tavily', symbol: 'E_TV_NETWORK' },
  },
};

function handleTvSearch(id /*, params */) {
  if (!API_KEY && OPTIONAL) {
    return send({ jsonrpc: '2.0', id, error: ERR.AUTH });
  }
  switch (SCENARIO) {
    case 'auth':
      return send({ jsonrpc: '2.0', id, error: ERR.AUTH });
    case 'quota':
      return send({ jsonrpc: '2.0', id, error: ERR.QUOTA });
    case 'http':
      return send({ jsonrpc: '2.0', id, error: ERR.HTTP });
    case 'parse':
      return send({ jsonrpc: '2.0', id, error: ERR.PARSE });
    case 'network':
      return send({ jsonrpc: '2.0', id, error: ERR.NET });
    case 'success':
    default:
      return send({
        jsonrpc: '2.0',
        id,
        result: {
          result: {
            results: [
              { url: 'https://example.com/a', title: 'A' },
              { url: 'https://example.com/b', title: 'B' },
            ],
          },
        },
      });
  }
}

process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      const { id, method, params } = msg;
      if (method === 'tv/search') {
        handleTvSearch(id);
      } else if (method === 'sys/setLogLevel') {
        const lvl = String(params?.level || '').toLowerCase();
        const allowed = new Set(['debug', 'info', 'warn', 'error']);
        if (!allowed.has(lvl)) {
          send({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid params: level' } });
        } else {
          send({ jsonrpc: '2.0', id, result: { level: lvl } });
        }
      } else {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
      }
    } catch {
      // ignore
    }
  }
});
