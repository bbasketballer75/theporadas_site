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
