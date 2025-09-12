#!/usr/bin/env node
/**
 * Deterministic MCP test harness emitting JSON-RPC over stdio with optional HTTP metrics.
 * Env flags:
 *  - MCP_PROM_METRICS=1 enables Prometheus metrics and HTTP server at MCP_HEALTH_PORT
 *  - MCP_ERROR_METRICS=1 tracks error statistics
 *  - MCP_HEALTH_PORT=port to bind HTTP /metrics
 *  - MCP_RATE_LIMIT=1 enables simple token-bucket rate limiting
 *  - MCP_RATE_LIMIT_MODE=method|global
 *  - MCP_RATE_LIMIT_CAPACITY (default 2), MCP_RATE_LIMIT_REFILL_MS (default 60000)
 */
import http from 'node:http';

const state = {
  methods: {
    'ok/ping': { calls: 0, errors: 0 },
    'err/fail': { calls: 0, errors: 0 },
    'sys/metrics': { calls: 0, errors: 0 },
    'sys/errorStats': { calls: 0, errors: 0 },
    'sys/promMetrics': { calls: 0, errors: 0 },
    'sys/listMethods': { calls: 0, errors: 0 },
  },
  errors: {}, // code -> count
};

function incMethod(name, ok) {
  if (!state.methods[name]) state.methods[name] = { calls: 0, errors: 0 };
  state.methods[name].calls++;
  if (!ok) state.methods[name].errors++;
}

function recordError(code) {
  state.errors[code] = (state.errors[code] || 0) + 1;
}

// Simple token-bucket limiter
const rlEnabled = process.env.MCP_RATE_LIMIT === '1';
const rlCapacity = Number(process.env.MCP_RATE_LIMIT_CAPACITY || 2);
const rlRefillMs = Number(process.env.MCP_RATE_LIMIT_REFILL_MS || 60000);
const rlMode = process.env.MCP_RATE_LIMIT_MODE || 'method';
const buckets = new Map(); // key -> {tokens, last}
function takeToken(key) {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: rlCapacity, last: now };
  const elapsed = now - b.last;
  if (elapsed >= rlRefillMs) {
    b.tokens = rlCapacity;
    b.last = now;
  }
  if (b.tokens <= 0) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

function listMethods() {
  return Object.keys(state.methods);
}

function buildMetricsText() {
  const lines = [];
  lines.push('# TYPE mcp_errors_total counter');
  let totalErr = 0;
  for (const [code, count] of Object.entries(state.errors)) {
    totalErr += count;
    lines.push(`mcp_errors_total{code="${code}"} ${count}`);
  }
  // Always include aggregate series without labels for parity with tests
  lines.push(`mcp_errors_total ${totalErr}`);

  lines.push('# TYPE mcp_method_calls_total counter');
  lines.push('# TYPE mcp_method_errors_total counter');
  for (const [name, m] of Object.entries(state.methods)) {
    lines.push(`mcp_method_calls_total{method="${name}"} ${m.calls}`);
    lines.push(`mcp_method_errors_total{method="${name}"} ${m.errors}`);
  }
  return lines.join('\n') + '\n';
}

// Optional HTTP server for /metrics
let server;
if (process.env.MCP_PROM_METRICS === '1') {
  const listenPort = Number(process.env.MCP_HEALTH_PORT || 0);
  server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      const body = buildMetricsText();
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      res.end(body);
    } else {
      res.statusCode = 404;
      res.end('not found');
    }
  });
  server.listen(listenPort, '127.0.0.1', () => {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : listenPort;
    process.stdout.write(JSON.stringify({ type: 'ready', port }) + '\n');
  });
} else {
  // Emit ready sentinel even if metrics are disabled
  process.stdout.write(JSON.stringify({ type: 'ready' }) + '\n');
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  for (const line of chunk.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const { id, method } = msg;
    if (!method) continue;

    const key = rlMode === 'global' ? 'global' : method;
    if (rlEnabled && !takeToken(key)) {
      const code = 3000; // rate-limit exceeded
      recordError(code);
      incMethod(method, false);
      const err = {
        jsonrpc: '2.0',
        id,
        error: {
          code,
          message: 'Rate limit exceeded',
          data: { domain: 'rate-limit', symbol: 'E_RL_EXCEEDED' },
        },
      };
      process.stdout.write(JSON.stringify(err) + '\n');
      continue;
    }

    if (method === 'ok/ping') {
      incMethod(method, true);
      const result = { ok: true, echo: msg.params?.msg ?? null };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
      continue;
    }
    if (method === 'err/fail') {
      incMethod(method, false);
      const code = 1001;
      if (process.env.MCP_ERROR_METRICS === '1') recordError(code);
      const error = { code, message: 'Intentional failure', data: { domain: 'test' } };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error }) + '\n');
      continue;
    }
    if (method === 'sys/errorStats') {
      incMethod(method, true);
      const total = Object.values(state.errors).reduce((a, b) => a + Number(b), 0);
      const result = { total, ...state.errors };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
      continue;
    }
    if (method === 'sys/metrics') {
      incMethod(method, true);
      const result = { methods: state.methods };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
      continue;
    }
    if (method === 'sys/promMetrics') {
      incMethod(method, true);
      const body = buildMetricsText();
      const result = { body };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
      continue;
    }
    if (method === 'sys/listMethods') {
      incMethod(method, true);
      const result = { methods: listMethods() };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
      continue;
    }

    // Unknown method
    incMethod(method, false);
    const code = -32601;
    if (process.env.MCP_ERROR_METRICS === '1') recordError(code);
    const error = { code, message: 'Method not found' };
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error }) + '\n');
  }
});

process.on('SIGTERM', () => {
  if (server) server.close();
  process.exit(0);
});
