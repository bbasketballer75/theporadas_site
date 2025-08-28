// Shared error factory for MCP servers.
// Provides consistent creation of structured application errors across domains.
// Domains currently covered: filesystem, memory-bank, kg (knowledge graph)

// Generic helper (kept for backwards compatibility where imported directly)
export function appError(code, message, data = {}) {
  const e = new Error(message);
  e.appCode = code;
  if (data.domain) e.domain = data.domain;
  if (data.symbol) e.symbol = data.symbol;
  if (data.details) e.details = data.details;
  if (typeof data.retryable === 'boolean') e.retryable = data.retryable;
  if (data.data) e.data = data.data;
  return e;
}

function defineDomain(domain, defs) {
  // defs: { KEY: { code, symbol, message } }
  function domainError(kind, extra = {}) {
    const def = defs[kind];
    if (!def) throw new Error(`Unknown ${domain} error kind: ${kind}`);
    return appError(def.code, def.message, { ...extra, domain, symbol: def.symbol });
  }
  return { defs, error: domainError };
}

// Filesystem domain definitions (retain original export names for compatibility)
export const FS_ERRORS = {
  PATH_ESCAPE: { code: 2500, symbol: 'E_FS_PATH_ESCAPE', message: 'Path escapes root' },
  DENIED: { code: 2501, symbol: 'E_FS_DENIED', message: 'Operation denied by policy' },
  NOT_FOUND: { code: 2502, symbol: 'E_FS_NOT_FOUND', message: 'File or directory not found' },
  WRITE_TOO_LARGE: {
    code: 2503,
    symbol: 'E_FS_WRITE_TOO_LARGE',
    message: 'Write exceeds size limit',
  },
  INVALID_PARAMS: { code: 1000, symbol: 'E_INVALID_PARAMS', message: 'Invalid parameters' },
};
const FS_DOMAIN = defineDomain('filesystem', FS_ERRORS);
export function fsError(kind, extra = {}) {
  return FS_DOMAIN.error(kind, extra);
}

// Memory Bank domain (initial subset)
export const MB_ERRORS = {
  FILE_NOT_FOUND: { code: 2300, symbol: 'E_MB_FILE_NOT_FOUND', message: 'invalid file' },
  READ_FAILED: { code: 2301, symbol: 'E_MB_READ', message: 'read failed' },
};
const MB_DOMAIN = defineDomain('memory-bank', MB_ERRORS);
export function mbError(kind, extra = {}) {
  return MB_DOMAIN.error(kind, extra);
}

// Knowledge Graph memory domain (initial subset)
export const KG_ERRORS = {
  FULL: { code: 2400, symbol: 'E_KG_FULL', message: 'triple store full' },
  INVALID_TRIPLE: { code: 2401, symbol: 'E_KG_INVALID_TRIPLE', message: 'invalid triple' },
};
const KG_DOMAIN = defineDomain('kg', KG_ERRORS);
export function kgError(kind, extra = {}) {
  return KG_DOMAIN.error(kind, extra);
}

// Future domains (python, playwright, puppeteer, sql, etc.) can adopt helper via defineDomain.

// Python execution domain (scripts, embeddings, etc.) 2600-2699
export const PY_ERRORS = {
  SCRIPT_NOT_FOUND: {
    code: 2600,
    symbol: 'E_PY_SCRIPT_NOT_FOUND',
    message: 'python script not found',
  },
  EXEC_FAILED: { code: 2601, symbol: 'E_PY_EXEC_FAILED', message: 'python execution failed' },
  TIMEOUT: { code: 2602, symbol: 'E_PY_TIMEOUT', message: 'python execution timeout' },
  INVALID_PARAMS: {
    code: 2603,
    symbol: 'E_PY_INVALID_PARAMS',
    message: 'invalid python parameters',
  },
};
const PY_DOMAIN = defineDomain('python', PY_ERRORS);
export function pyError(kind, extra = {}) {
  return PY_DOMAIN.error(kind, extra);
}

// Playwright automation domain 2700-2799
export const PW_ERRORS = {
  BROWSER_LAUNCH: { code: 2700, symbol: 'E_PW_BROWSER_LAUNCH', message: 'browser launch failed' },
  NAVIGATION: { code: 2701, symbol: 'E_PW_NAVIGATION', message: 'navigation failed' },
  TIMEOUT: { code: 2702, symbol: 'E_PW_TIMEOUT', message: 'operation timed out' },
  INVALID_SELECTOR: { code: 2703, symbol: 'E_PW_INVALID_SELECTOR', message: 'invalid selector' },
};
const PW_DOMAIN = defineDomain('playwright', PW_ERRORS);
export function pwError(kind, extra = {}) {
  return PW_DOMAIN.error(kind, extra);
}

// Puppeteer automation domain 2800-2899
export const PT_ERRORS = {
  BROWSER_LAUNCH: { code: 2800, symbol: 'E_PT_BROWSER_LAUNCH', message: 'browser launch failed' },
  NAVIGATION: { code: 2801, symbol: 'E_PT_NAVIGATION', message: 'navigation failed' },
  TIMEOUT: { code: 2802, symbol: 'E_PT_TIMEOUT', message: 'operation timed out' },
  INVALID_SELECTOR: { code: 2803, symbol: 'E_PT_INVALID_SELECTOR', message: 'invalid selector' },
};
const PT_DOMAIN = defineDomain('puppeteer', PT_ERRORS);
export function ptError(kind, extra = {}) {
  return PT_DOMAIN.error(kind, extra);
}

// External Search (Tavily) domain 2900-2999
// Purpose: standardized errors for external web search API interactions (network, auth, quota, invalid params)
export const TV_ERRORS = {
  AUTH_MISSING: { code: 2900, symbol: 'E_TV_AUTH_MISSING', message: 'tavily api key missing' },
  AUTH_FAILED: { code: 2901, symbol: 'E_TV_AUTH_FAILED', message: 'tavily auth failed' },
  NETWORK: { code: 2902, symbol: 'E_TV_NETWORK', message: 'tavily network error' },
  HTTP_ERROR: { code: 2903, symbol: 'E_TV_HTTP', message: 'tavily http error' },
  INVALID_PARAMS: {
    code: 2904,
    symbol: 'E_TV_INVALID_PARAMS',
    message: 'invalid tavily parameters',
  },
  QUOTA: { code: 2905, symbol: 'E_TV_QUOTA', message: 'tavily quota exceeded' },
  PARSE: { code: 2906, symbol: 'E_TV_PARSE', message: 'tavily response parse error' },
};
const TV_DOMAIN = defineDomain('tavily', TV_ERRORS);
export function tvError(kind, extra = {}) {
  return TV_DOMAIN.error(kind, extra);
}

// Rate Limit domain 3000-3099
// Purpose: standardized errors for rate limiting decisions enforced by harness
export const RL_ERRORS = {
  EXCEEDED: { code: 3000, symbol: 'E_RL_EXCEEDED', message: 'rate limit exceeded' },
};
const RL_DOMAIN = defineDomain('rate-limit', RL_ERRORS);
export function rlError(kind, extra = {}) {
  return RL_DOMAIN.error(kind, extra);
}
