export function appError(code, message, data = {}) {
  const e = new Error(message);
  e.appCode = code;
  e.domain = data.domain || 'filesystem';
  e.symbol = data.symbol;
  e.details = data.details;
  e.retryable = data.retryable ?? false;
  return e;
}

export const FS_ERRORS = {
  PATH_ESCAPE: { code: 2500, symbol: 'E_FS_PATH_ESCAPE', message: 'Path escapes root' },
  DENIED: { code: 2501, symbol: 'E_FS_DENIED', message: 'Operation denied by policy' },
  NOT_FOUND: { code: 2502, symbol: 'E_FS_NOT_FOUND', message: 'File or directory not found' },
  WRITE_TOO_LARGE: { code: 2503, symbol: 'E_FS_WRITE_TOO_LARGE', message: 'Write exceeds size limit' },
  INVALID_PARAMS: { code: 1000, symbol: 'E_INVALID_PARAMS', message: 'Invalid parameters' },
};

export function fsError(kind, extra = {}) {
  const def = FS_ERRORS[kind];
  return appError(def.code, def.message, { ...extra, symbol: def.symbol });
}
