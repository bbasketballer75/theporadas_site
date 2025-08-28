// Minimal rate limiting scaffold (no-op by default) to enable future policy injection.
// Provides token bucket style interface with in-memory counters per key.
// NOT production ready (no persistence / eviction). Disabled unless MCP_RATE_LIMIT=1.

const enabled = process.env.MCP_RATE_LIMIT === '1';
const limits = new Map(); // key -> { tokens, lastRefill }

const DEFAULT_CAPACITY = parseInt(process.env.MCP_RATE_LIMIT_CAPACITY || '30', 10); // tokens
const REFILL_INTERVAL_MS = parseInt(process.env.MCP_RATE_LIMIT_REFILL_MS || '60000', 10); // 1m

export function consume(key = 'global', cost = 1) {
  if (!enabled) return { allowed: true, remaining: Infinity };
  let entry = limits.get(key);
  const now = Date.now();
  if (!entry) {
    entry = { tokens: DEFAULT_CAPACITY, lastRefill: now };
    limits.set(key, entry);
  }
  if (now - entry.lastRefill >= REFILL_INTERVAL_MS) {
    entry.tokens = DEFAULT_CAPACITY;
    entry.lastRefill = now;
  }
  if (entry.tokens < cost) return { allowed: false, remaining: entry.tokens };
  entry.tokens -= cost;
  return { allowed: true, remaining: entry.tokens };
}

export function _inspectLimits() {
  const out = {};
  for (const [k, v] of limits.entries()) out[k] = { tokens: v.tokens, lastRefill: v.lastRefill };
  return enabled ? out : null;
}
