// Minimal shared JSON-RPC 2.0 line-delimited harness for MCP-style servers.
// Responsibilities:
//  - Register methods via register(name, handler)
//  - Read newline-delimited JSON objects from stdin
//  - Invoke handler with params; support async
//  - Emit JSON-RPC response objects with matching id; errors standardized
//  - Emit {type:'ready'} sentinel on startup
//  - Provide safeError helper for consistent error shapes
//  - Enforce optional max payload size & line length to mitigate abuse

const methods = new Map();
// Optional in-memory error metrics (enabled via MCP_ERROR_METRICS=1)
const errorMetricsEnabled = process.env.MCP_ERROR_METRICS === '1';
const promMetricsEnabled = process.env.MCP_PROM_METRICS === '1';
// Per-method invocation metrics (counts + errors) piggyback on same flag
const methodStats = new Map(); // name -> { calls, errors }

function incMethod(name, field) {
  if (!errorMetricsEnabled) return;
  if (!methodStats.has(name)) methodStats.set(name, { calls: 0, errors: 0 });
  methodStats.get(name)[field] += 1;
}
const errorCounters = {
  byCode: new Map(), // code -> count
  byDomain: new Map(), // domain -> count
  bySymbol: new Map(), // symbol -> count
  total: 0,
};

// Build Prometheus exposition text for current error + method metrics.
// Returns { contentType, body } matching RPC method response expectation.
function buildPromMetrics() {
  const lines = [];
  const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/\n/g, '');
  lines.push('# HELP mcp_errors_total Total application errors captured');
  lines.push('# TYPE mcp_errors_total counter');
  lines.push(`mcp_errors_total ${errorCounters.total}`);
  lines.push('# HELP mcp_errors_by_domain_total Errors partitioned by domain');
  lines.push('# TYPE mcp_errors_by_domain_total counter');
  for (const [dom, count] of errorCounters.byDomain.entries())
    lines.push(`mcp_errors_by_domain_total{domain="${esc(dom)}"} ${count}`);
  lines.push('# HELP mcp_errors_by_symbol_total Errors partitioned by symbol');
  lines.push('# TYPE mcp_errors_by_symbol_total counter');
  for (const [sym, count] of errorCounters.bySymbol.entries())
    lines.push(`mcp_errors_by_symbol_total{symbol="${esc(sym)}"} ${count}`);
  lines.push('# HELP mcp_errors_by_code_total Errors partitioned by code');
  lines.push('# TYPE mcp_errors_by_code_total counter');
  for (const [code, count] of errorCounters.byCode.entries())
    lines.push(`mcp_errors_by_code_total{code="${code}"} ${count}`);
  lines.push('# HELP mcp_method_calls_total Method invocation counts');
  lines.push('# TYPE mcp_method_calls_total counter');
  lines.push('# HELP mcp_method_errors_total Method error counts');
  lines.push('# TYPE mcp_method_errors_total counter');
  for (const [name, stats] of methodStats.entries()) {
    lines.push(`mcp_method_calls_total{method="${esc(name)}"} ${stats.calls}`);
    lines.push(`mcp_method_errors_total{method="${esc(name)}"} ${stats.errors}`);
  }
  return { contentType: 'text/plain; version=0.0.4', body: lines.join('\n') + '\n' };
}

function incCounter(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

// Helper to construct structured application errors with positive codes.
// Usage: throw appError(2100, 'Navigation failed', { domain:'playwright', symbol:'E_PW_NAV', retryable:true, details:'timeout 30s' })
export function appError(code, message, extra = {}) {
  const e = new Error(message);
  e.appCode = code;
  if (extra.symbol) e.symbol = extra.symbol;
  if (extra.domain) e.domain = extra.domain;
  if (typeof extra.retryable === 'boolean') e.retryable = extra.retryable;
  if (extra.details) e.details = extra.details;
  if (extra.data) e.data = extra.data; // allow caller-provided data payload
  return e;
}

export function register(name, handler) {
  if (methods.has(name)) throw new Error(`Method already registered: ${name}`);
  methods.set(name, handler);
}

export function listMethods() {
  return Array.from(methods.keys());
}

function determineErrorCode(err) {
  if (Number.isInteger(err.appCode)) return err.appCode;
  if (Number.isInteger(err.code)) return err.code;
  return -32000;
}

function buildErrorData(err) {
  const data = { ...(err.data || {}) };
  if (err.domain) data.domain = err.domain;
  if (err.symbol) data.symbol = err.symbol;
  if (typeof err.retryable === 'boolean') data.retryable = err.retryable;
  if (err.details) data.details = err.details;
  return data;
}

function processStackTrace(err, data) {
  if (!shouldProcessStackTrace(err)) return;

  const mode = process.env.MCP_ERRORS_VERBOSE;
  const lines = getStackTraceLines(err, mode);
  data.stack = lines.join('\n');
}

function shouldProcessStackTrace(err) {
  return process.env.MCP_ERRORS_VERBOSE && err.stack;
}

function getStackTraceLines(err, mode) {
  if (mode === 'full') {
    return String(err.stack).split('\n');
  }

  const n = parseInt(mode, 10);
  const limit = Number.isFinite(n) ? n : 5;
  return String(err.stack).split('\n').slice(0, limit);
}

function collectErrorMetrics(code, data) {
  if (!errorMetricsEnabled) return;

  errorCounters.total += 1;
  incCounter(errorCounters.byCode, code);
  if (data.domain) incCounter(errorCounters.byDomain, data.domain);
  if (data.symbol) incCounter(errorCounters.bySymbol, data.symbol);
}

export function safeError(err) {
  if (!err) return createBasicError('Unknown error');
  if (typeof err === 'string') return createBasicError(err);

  return processStructuredError(err);
}

function createBasicError(message) {
  return { code: -32000, message };
}

function processStructuredError(err) {
  const code = determineErrorCode(err);
  const data = buildErrorData(err);
  processStackTrace(err, data);
  collectErrorMetrics(code, data);

  return {
    code,
    message: err.message || 'Error',
    data: Object.keys(data).length ? data : undefined,
  };
}

const MAX_LINE_LEN = parseInt(process.env.MCP_MAX_LINE_LEN || '200000', 10); // ~200KB
let buffer = '';

function processLines(chunk) {
  buffer += chunk;
  if (buffer.length > MAX_LINE_LEN) {
    console.error('[mcp:harness] input line too long; resetting');
    buffer = '';
    return;
  }
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      emit({
        jsonrpc: '2.0',
        id: null,
        error: safeError({ message: 'Invalid JSON', code: -32700 }),
      });
      continue;
    }
    handleMessage(msg);
  }
}

function emit(obj) {
  try {
    process.stdout.write(JSON.stringify(obj) + '\n');
  } catch {
    // ignore EPIPE
  }
}

async function handleMessage(msg) {
  const { id, method, params } = msg;
  if (!method || !methods.has(method)) {
    emit({ jsonrpc: '2.0', id, error: safeError({ message: 'Method not found', code: -32601 }) });
    return;
  }
  // Optional rate limiting (coarse global or per-method) gated by MCP_RATE_LIMIT
  if (process.env.MCP_RATE_LIMIT === '1') {
    try {
      const { consume } = await import('./mcp_rate_limit.mjs');
      // Lazy import of error codes to avoid circular if other modules import harness early
      const { rlError } = await import('./mcp_error_codes.mjs');
      const keyMode = process.env.MCP_RATE_LIMIT_MODE || 'global'; // 'global' | 'method'
      const key = keyMode === 'method' ? `method:${method}` : 'global';
      const decision = consume(key, 1);
      if (!decision.allowed) {
        emit({
          jsonrpc: '2.0',
          id,
          error: safeError(rlError('EXCEEDED', { details: 'try later' })),
        });
        return;
      }
    } catch (e) {
      // If rate limit module fails, proceed without blocking but log stderr
      console.error('[mcp:harness] rate limit module error', e.message);
    }
  }
  const handler = methods.get(method);
  incMethod(method, 'calls');
  try {
    const result = await handler(params);
    emit({ jsonrpc: '2.0', id, result });
  } catch (err) {
    incMethod(method, 'errors');
    emit({ jsonrpc: '2.0', id, error: safeError(err) });
  }
}

export async function start() {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', processLines);
  process.stdin.on('error', () => {});
  process.stdin.resume();
  // Keep the event loop alive even if stdin closes (common in detached Docker).
  // Allow tests to disable this behavior so short-lived processes can exit and
  // supervisor tests observing give-up semantics are not delayed.
  if (!process.env.DISABLE_MCP_KEEPALIVE) {
    if (!global.__mcpKeepAlive) {
      global.__mcpKeepAlive = setInterval(() => {}, 60_000);
    }
  }
  const ready = { type: 'ready', methods: listMethods(), schema: { errorCodes: 1 } };
  if (process.env.MCP_SERVER_NAME) ready.server = process.env.MCP_SERVER_NAME;
  emit(ready);
  // Optional lightweight HTTP health endpoint (readiness only) enabled via MCP_HEALTH_PORT.
  // Exposes GET /healthz returning 200 after harness ready. Before ready (not applicable here since ready just emitted) would return 503.
  // Provides minimal JSON body with server name and method count.
  const healthPort = process.env.MCP_HEALTH_PORT && parseInt(process.env.MCP_HEALTH_PORT, 10);
  if (healthPort && Number.isFinite(healthPort)) {
    try {
      const http = await import('node:http');
      const startedAt = Date.now();
      const serverName = process.env.MCP_SERVER_NAME || 'mcp-server';
      const srv = http.createServer((req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          return res.end();
        }
        if (req.url === '/healthz') {
          // Already ready at this point; still keep structure for future liveness differentiation
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'ok',
              server: serverName,
              methods: listMethods().length,
              uptimeMs: Date.now() - startedAt,
            }),
          );
          return;
        }
        if (promMetricsEnabled && req.url === '/metrics') {
          const { contentType, body } = buildPromMetrics();
          res.statusCode = 200;
          res.setHeader('Content-Type', contentType);
          res.end(body);
          return;
        }
        res.statusCode = 404;
        res.end();
      });
      srv.listen(healthPort, '0.0.0.0').on('error', (e) => {
        console.error('[mcp:harness] failed to start health server', e.message);
      });
    } catch {
      // If http import fails, skip health server
    }
  }
}

// Convenience to build a server quickly
export async function createServer(registrar) {
  registrar({ register });
  // Optionally register metrics inspection method
  if (errorMetricsEnabled) {
    register('sys/errorStats', () => {
      const objFromMap = (m) => Object.fromEntries([...m.entries()].sort());
      return {
        total: errorCounters.total,
        byCode: objFromMap(errorCounters.byCode),
        byDomain: objFromMap(errorCounters.byDomain),
        bySymbol: objFromMap(errorCounters.bySymbol),
      };
    });
    register('sys/metrics', () => {
      const perMethod = {};
      for (const [k, v] of methodStats.entries())
        perMethod[k] = { calls: v.calls, errors: v.errors };
      return { methods: perMethod };
    });
  }
  if (promMetricsEnabled) {
    register('sys/promMetrics', () => {
      return buildPromMetrics();
    });
  }
  await start();
}

// Export metrics for potential external inspection (tests) without RPC
export function _getErrorMetrics() {
  return errorMetricsEnabled
    ? {
        total: errorCounters.total,
        byCode: Object.fromEntries(errorCounters.byCode.entries()),
        byDomain: Object.fromEntries(errorCounters.byDomain.entries()),
        bySymbol: Object.fromEntries(errorCounters.bySymbol.entries()),
      }
    : null;
}
