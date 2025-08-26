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
const errorCounters = {
  byCode: new Map(), // code -> count
  byDomain: new Map(), // domain -> count
  bySymbol: new Map(), // symbol -> count
  total: 0,
};

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

export function safeError(err) {
  if (!err) return { code: -32000, message: 'Unknown error' };
  if (typeof err === 'string') return { code: -32000, message: err };
  // Prefer explicit appCode if provided (positive domain-specific codes per taxonomy)
  const code = Number.isInteger(err.appCode)
    ? err.appCode
    : Number.isInteger(err.code)
      ? err.code
      : -32000;
  const data = Object.assign({}, err.data || {});
  if (err.domain) data.domain = err.domain;
  if (err.symbol) data.symbol = err.symbol;
  if (typeof err.retryable === 'boolean') data.retryable = err.retryable;
  if (err.details) data.details = err.details;
  if (process.env.MCP_ERRORS_VERBOSE && err.stack) {
    let mode = process.env.MCP_ERRORS_VERBOSE;
    let lines;
    if (mode === 'full') {
      lines = String(err.stack).split('\n');
    } else {
      const n = parseInt(mode, 10);
      lines = String(err.stack)
        .split('\n')
        .slice(0, Number.isFinite(n) ? n : 5);
    }
    data.stack = lines.join('\n');
  }
  // Metrics collection
  if (errorMetricsEnabled) {
    errorCounters.total += 1;
    incCounter(errorCounters.byCode, code);
    if (data.domain) incCounter(errorCounters.byDomain, data.domain);
    if (data.symbol) incCounter(errorCounters.bySymbol, data.symbol);
  }
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
    } catch (e) {
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
  } catch (e) {
    // ignore EPIPE
  }
}

async function handleMessage(msg) {
  const { id, method, params } = msg;
  if (!method || !methods.has(method)) {
    emit({ jsonrpc: '2.0', id, error: safeError({ message: 'Method not found', code: -32601 }) });
    return;
  }
  const handler = methods.get(method);
  try {
    const result = await handler(params);
    emit({ jsonrpc: '2.0', id, result });
  } catch (err) {
    emit({ jsonrpc: '2.0', id, error: safeError(err) });
  }
}

export function start() {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', processLines);
  process.stdin.on('error', () => {});
  process.stdin.resume();
  emit({ type: 'ready', methods: listMethods(), schema: { errorCodes: 1 } });
}

// Convenience to build a server quickly
export function createServer(registrar) {
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
  }
  start();
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
