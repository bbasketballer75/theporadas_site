# MCP Server Error Code Taxonomy (Proposed)

Purpose: establish consistent, inspectable error semantics across all MCP-style
servers using the shared JSON-RPC harness (`mcp_rpc_base.mjs`). This proposal
extends beyond base JSON-RPC reserved codes without colliding with them.

## JSON-RPC Reserved Codes (Already Used)

- `-32700` Parse error (invalid JSON line)
- `-32601` Method not found
- `-32602` (reserved; may adopt later for invalid params)
- `-32000` Generic server error (current fallback)

We retain these for protocol-level issues. Application errors will use positive
integer codes namespaced by range.

## Global Common Range (1000–1099)

| Code | Symbol              | Message (template)       | Notes                              |
| ---- | ------------------- | ------------------------ | ---------------------------------- |
| 1000 | E_INVALID_PARAMS    | Invalid parameters       | Use instead of -32602 internally   |
| 1001 | E_TIMEOUT           | Operation timed out      | Long-running browser/nav/python    |
| 1002 | E_LIMIT_EXCEEDED    | Limit exceeded           | Session cap, size cap, line length |
| 1003 | E_NOT_INSTALLED     | Dependency not installed | Playwright / Puppeteer missing     |
| 1004 | E_SESSION_NOT_FOUND | Session not found        | Unknown session id                 |
| 1005 | E_INPUT_TOO_LARGE   | Input too large          | Code length, selector length, etc. |
| 1006 | E_UNSUPPORTED       | Unsupported operation    | Future placeholder                 |

## Domain Ranges

| Range     | Domain        | Examples                                 |
| --------- | ------------- | ---------------------------------------- |
| 2000–2099 | Python Exec   | 2000 E_PY_EXEC_FAIL, 2001 E_PY_SECURITY  |
| 2100–2199 | Playwright    | 2100 E_PW_NAV, 2101 E_PW_LAUNCH          |
| 2200–2299 | Puppeteer     | 2200 E_PT_NAV, 2201 E_PT_LAUNCH          |
| 2300–2399 | Memory Bank   | 2300 E_MB_FILE_NOT_FOUND, 2301 E_MB_READ |
| 2400–2499 | KG Memory     | 2400 E_KG_FULL, 2401 E_KG_INVALID_TRIPLE |
| 2500–2599 | Filesystem    | 2500 E_FS_PATH_ESCAPE, 2501 E_FS_DENIED  |
| 2600–2699 | SQL Server    | 2600 E_SQL_CONN, 2601 E_SQL_QUERY        |
| 2700–2799 | Notion        | 2700 E_NOTION_AUTH, 2701 E_NOTION_RATE   |
| 2800–2899 | Tavily        | 2800 E_TAVILY_HTTP, 2801 E_TAVILY_RATE   |
| 2900–2999 | Future / Misc | Reserved                                 |

## Error Object Shape

Augment existing harness `safeError` output with `data` envelope:

```jsonc
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 2100,
    "message": "Navigation failed",
    "data": {
      "domain": "playwright",
      "symbol": "E_PW_NAV",
      "details": "net::ERR_NAME_NOT_RESOLVED",
      "retryable": true,
    },
  },
}
```

Guidelines:

1. Always include `domain` and `symbol` in `data` for positive codes.
2. Use `retryable: true|false` to guide automated client behavior.
3. Do not leak raw stack traces unless `NODE_ENV=development` — provide a
   terse `details` string instead.
4. Wrap original low-level errors (e.g., Playwright TimeoutError) by creating
   a new `Error` and attaching `appCode`, `symbol`, `domain`, `details`.

## Migration Steps (Incremental)

1. Extend harness: detect `err.appCode` & `err.symbol`; if present produce
   positive code else fallback to current logic.
2. Replace thrown generic `Error('invalid selector')` patterns with small
   helper: `throw appError(1000, 'Invalid selector', { domain:'playwright', symbol:'E_INVALID_PARAMS' })`.
3. Update server scripts gradually; maintain backwards compatibility (clients
   rely only on `message` today).
4. Add unit tests asserting error code mapping for a few representative
   failures per domain.
5. Update documentation & decision log when harness change merges.

## Helper (Planned)

`appError(code, message, extra)` returns an `Error` with enumerable fields:

```js
function appError(code, message, extra = {}) {
  const e = new Error(message);
  e.appCode = code;
  e.symbol = extra.symbol;
  e.domain = extra.domain;
  e.details = extra.details;
  e.retryable = extra.retryable;
  return e;
}
```

Harness `safeError` will map these to JSON.

## Backwards Compatibility

Existing negative codes remain for protocol issues. Clients can treat any
positive code >= 1000 as an application-domain failure with optional structured
remediation logic.

## Future Enhancements

- Add metrics logging hook: every emitted error increments a counter labeled by
  `domain` and `symbol` for observability.
- Provide machine-readable schema version in readiness sentinel: `{ type:'ready', schema:{ errorCodes:1 } }`.
- Offer optional verbose mode (`MCP_ERRORS_VERBOSE=1`) to include sanitized
  stack trace snippet in `data.stack`.

## Metrics & Environment Flags (Implemented)

Two opt-in environment variables extend observability & debuggability:

| Variable             | Accepts                | Behavior                                                                                         |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `MCP_ERROR_METRICS`  | any truthy value (`1`) | Enables in-memory counters (total, byCode, byDomain, bySymbol) and exposes RPC `sys/errorStats`. |
| `MCP_ERRORS_VERBOSE` | integer N or `full`    | Includes up to N stack frames (or full stack) in `error.data.stack`; stack omitted when unset.   |

### `sys/errorStats` RPC

Registered only when `MCP_ERROR_METRICS` is truthy. Returns a snapshot (counters reset only on process restart):

```jsonc
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "total": 3,
    "byCode": { "1005": 2, "2300": 1 },
    "byDomain": { "python": 2, "memory-bank": 1 },
    "bySymbol": { "E_INPUT_TOO_LARGE": 2, "E_MB_FILE_NOT_FOUND": 1 },
  },
}
```

### Verbose Stack Control

Set `MCP_ERRORS_VERBOSE=5` to include the first 5 frames (excluding
internal harness lines) or `MCP_ERRORS_VERBOSE=full` for the complete
sanitized stack. Use sparingly in production to avoid noisy logs and
potential minor performance impact.

### Suggested Client Behavior

- Feature-detect metrics by attempting `sys/errorStats`; if method missing, disable polling.
- Treat presence of `data.stack` as best-effort diagnostic (do not parse for control flow).
- Consider sampling or rate-limiting client-side reporting when high-volume identical errors appear (see Future Work).

### Future Work (Planned)

- Add optional rate limiting / sampling (env: `MCP_ERROR_METRICS_SAMPLE=100`
  capture every Nth occurrence, or token bucket per symbol) to bound
  overhead in pathological error storms.
- Persist selected counters for long-running sessions (export on graceful shutdown) if durability becomes necessary.
