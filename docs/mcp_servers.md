# MCP Server Stubs

This project includes lightweight MCP-style stub scripts for various external services.
These are NOT full Model Context Protocol servers yet; they provide a simple
CLI/JSON interface you can wrap later.

## Scripts

| Service    | Script                       | Env Vars                                                                 | Description                                                                                                                                     |
| ---------- | ---------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Notion     | `scripts/mcp_notion.mjs`     | `NOTION_API_KEY`                                                         | Validates key and prints placeholder notice. Extend to expose search/query later.                                                               |
| Tavily     | `scripts/mcp_tavily.mjs`     | `TAVILY_API_KEY`                                                         | Runs a search query (POST /search) and returns JSON result. Arg string becomes query.                                                           |
| Mem0       | `scripts/mcp_mem0.mjs`       | `MEM0_API_KEY`                                                           | In-memory mock add/list memory commands (placeholder until real SDK).                                                                           |
| Filesystem | `scripts/mcp_filesystem.mjs` | `MCP_FS_ROOT` (optional), `MCP_FS_MAX_BYTES`, `MCP_FS_ALLOW_WRITE_GLOBS` | Safe scoped list/read/write/mkdir/delete/stat inside root (defaults to repo root). Prevents path escape; supports size limit & write allowlist. |

### Filesystem Server Consolidation

We retain both the custom filesystem server (`scripts/mcp_filesystem.mjs`) and the reference/official implementation for now. Rationale:

- Custom server adds policy enforcement (write allowlist, max bytes), structured error codes (2500–2503) and capability introspection.
- Official server ensures parity with emerging MCP ecosystem clients.
- Plan: monitor client feature adoption. If official server gains equivalent
  policy hooks & error shaping, we will deprecate the custom version; otherwise
  we may upstream selected features.

| SQL Server | `scripts/mcp_sqlserver.mjs` | `SQLSERVER_CONNECTION_STRING` | Executes a single query (default `SELECT 1 AS ok`). Returns recordset JSON. |
| Playwright | `scripts/mcp_playwright.mjs` | `MCP_PW_SESSION_LIMIT` (opt), `MCP_PW_NAV_TIMEOUT_MS` (opt) | Headless browser sessions: launch, goto, extract text, close, list. |
| Puppeteer | `scripts/mcp_puppeteer.mjs` | `MCP_PT_SESSION_LIMIT` (opt), `MCP_PT_NAV_TIMEOUT_MS` (opt) | Alternative headless browser automation (same operations as Playwright). |
| Python Exec | `scripts/mcp_python.mjs` | `MCP_PYTHON_BIN` (opt), `MCP_PY_TIMEOUT_MS` (opt) | Executes short Python snippets with timeout & output truncation. |
| Memory Bank | `scripts/mcp_memory_bank.mjs` | `MCP_MEMORY_BANK_DIR` (opt) | List/read/search markdown knowledge files (capped). |
| KG Memory | `scripts/mcp_kg_memory.mjs` | `MCP_KG_MAX_TRIPLES` (opt) | In-memory triple store add/query/subjects (bounded). |

## Usage Examples

```bash
node scripts/mcp_tavily.mjs "latest web performance budgets"
node scripts/mcp_mem0.mjs add "Remember to review coverage diff thresholds"
node scripts/mcp_mem0.mjs list
node scripts/mcp_filesystem.mjs list src
node scripts/mcp_filesystem.mjs read README.md
node scripts/mcp_filesystem.mjs write tmp/test.txt "hello world"
node scripts/mcp_sqlserver.mjs "SELECT TOP 5 name FROM sys.databases"
# Persistent JSON-RPC examples (echo a request line then newline):
echo '{"jsonrpc":"2.0","id":1,"method":"mb/list"}' | node scripts/mcp_memory_bank.mjs
echo '{"jsonrpc":"2.0","id":1,"method":"kg/add","params":{"subject":"Site","predicate":"has","object":"MCP"}}' | node scripts/mcp_kg_memory.mjs
echo '{"jsonrpc":"2.0","id":2,"method":"kg/query","params":{"subject":"Site"}}' | node scripts/mcp_kg_memory.mjs
echo '{"jsonrpc":"2.0","id":1,"method":"py/exec","params":{"code":"print(1+1)"}}' | node scripts/mcp_python.mjs
echo '{"jsonrpc":"2.0","id":1,"method":"pw/launch"}' | node scripts/mcp_playwright.mjs
echo '{"jsonrpc":"2.0","id":2,"method":"pt/launch"}' | node scripts/mcp_puppeteer.mjs
```

## Environment Variables

Add to your `.env` (already templated in `.env.example`):

```env
NOTION_API_KEY=
TAVILY_API_KEY=
MEM0_API_KEY=
SQLSERVER_CONNECTION_STRING=
MCP_FS_ROOT=
MCP_PW_SESSION_LIMIT=5
MCP_PW_NAV_TIMEOUT_MS=15000
MCP_PT_SESSION_LIMIT=5
MCP_PT_NAV_TIMEOUT_MS=15000
MCP_PYTHON_BIN=python
MCP_PY_TIMEOUT_MS=3000
MCP_MEMORY_BANK_DIR=memory-bank
MCP_KG_MAX_TRIPLES=5000
```

### Environment Variable Loading & Supervisor

The stub servers do NOT automatically load values from `.env` unless you invoke them
through a wrapper that sources those variables first (e.g. `dotenv -e .env -- node ...` or
your shell exporting them). The added `mcp_supervisor.mjs` intentionally avoids implicit
`.env` parsing to keep side effects explicit.

To run the supervisor with selective servers and ensure `TAVILY_API_KEY` is present:

```pwsh
$env:TAVILY_API_KEY = 'tvly-xxxxxxxx'  # PowerShell session only
node scripts/mcp_supervisor.mjs --only tavily,fs --max-restarts 5 --backoff-ms 500-8000
```

Readiness & lifecycle events are emitted as structured JSON lines, e.g.:

```json
{"type":"supervisor","event":"spawn","server":"tavily","pid":12345}
{"type":"supervisor","event":"ready","server":"tavily","pid":12345}
{"type":"supervisor","event":"exit","server":"tavily","code":1,"restarts":0}
{"type":"supervisor","event":"restart-scheduled","server":"tavily","inMs":742,"attempt":1}
```

Non‑zero exits trigger a randomized backoff within the configured range until the
max restarts threshold is reached (default 3). When `--fail-fast` is supplied, the
supervisor will abort all remaining servers immediately after one server emits a
`give-up` (exhausted restarts) and then emit a consolidated `summary` event. A
fail-fast shutdown returns a non‑zero (1) supervisor process exit code.

Additional events introduced:

```json
{"type":"supervisor","event":"fail-fast-triggered","server":"tavily"}
{"type":"supervisor","event":"summary","startTime":...,"endTime":...,"durationMs":...,"servers":{"tavily":{"spawns":2,"restarts":1,"exits":2,"lastExitCode":1,"ready":false,"readyLatencyMs":null,"totalUptimeMs":178,"gaveUp":true}}}
```

`summary` always appears during shutdown (Ctrl+C, signal, fail-fast, or natural completion when
all short‑lived servers exit). It includes per-server aggregated statistics: spawn counts, restarts,
exits, last exit code, readiness state & latency, total accumulated uptime, and whether the server
ultimately gave up.

### Additional Supervisor Flags

| Flag                           | Description                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--fail-fast`                  | Abort all servers immediately after any server gives up; exit code 1.                                                                                   |
| `--heartbeat-ms <n>`           | Emit a periodic `heartbeat` event every `n` milliseconds containing a lightweight server state snapshot.                                                |
| `--config <path>`              | Load server definitions from a JSON file instead of (or in addition to) built-ins. JSON must be an array of objects. Supports per-server `maxRestarts`. |
| `--exit-code-on-giveup <code>` | When any server ultimately gives up (exhausts restarts) and `--fail-fast` is NOT set, use this exit code for the supervisor (default 0).                |
| `--log-file <path>`            | Write duplicate structured JSON event lines to the specified file (append mode; JSONL).                                                                 |
| `--max-uptime-ms <n>`          | Force a shutdown after `n` milliseconds total supervisor uptime, emitting `max-uptime-reached` before `summary`.                                        |

Example heartbeat excerpt:

```json
{
  "type": "supervisor",
  "event": "heartbeat",
  "timestamp": 1730000000000,
  "servers": {
    "tavily": {
      "spawns": 1,
      "restarts": 0,
      "exits": 0,
      "ready": true,
      "gaveUp": false,
      "lastExitCode": null
    }
  }
}
```

Example config file (`servers.json`) with per-server restart overrides:

```json
[
  { "name": "fs", "cmd": "node", "args": ["scripts/mcp_filesystem.mjs"], "maxRestarts": 0 },
  { "name": "tavily", "cmd": "node", "args": ["scripts/mcp_tavily.mjs"], "maxRestarts": 5 }
]
```

Run with custom config + heartbeat + log file + max uptime guard:

```pwsh
node scripts/mcp_supervisor.mjs --config servers.json --heartbeat-ms 5000 --log-file mcp_supervisor.log --max-uptime-ms 600000
```

Example fail‑fast run (PowerShell with intentionally missing key):

```pwsh
$env:TAVILY_API_KEY = ''
node scripts/mcp_supervisor.mjs --only tavily --max-restarts 1 --backoff-ms 50-100 --fail-fast
```

You will see events ending with `fail-fast-triggered`, `shutdown`, and `summary`.

Example give‑up exit code override (no fail‑fast, forcing exit code 7):

```pwsh
node scripts/mcp_supervisor.mjs --only tavily --max-restarts 1 --exit-code-on-giveup 7 --log-file mcp_supervisor.log
```

You'll observe an `exiting` event with `code":7` after `summary`.

Example max uptime guard (forces shutdown even if processes still running):

```pwsh
node scripts/mcp_supervisor.mjs --config servers.json --max-uptime-ms 300000
```

Emits `max-uptime-reached` just before normal shutdown sequence.

## VS Code (Future MCP Integration)

When you upgrade these into real MCP servers, you can add entries similar to:

```jsonc
{
  "mcpServers": {
    "tavily": { "command": "node", "args": ["scripts/mcp_tavily.mjs"] },
    "notion": { "command": "node", "args": ["scripts/mcp_notion.mjs"] },
    "mem0": { "command": "node", "args": ["scripts/mcp_mem0.mjs"] },
    "fs": { "command": "node", "args": ["scripts/mcp_filesystem.mjs"] },
    "sqlserver": { "command": "node", "args": ["scripts/mcp_sqlserver.mjs"] },
    "memoryBank": { "command": "node", "args": ["scripts/mcp_memory_bank.mjs"] },
    "kgMemory": { "command": "node", "args": ["scripts/mcp_kg_memory.mjs"] },
    "pythonExec": { "command": "node", "args": ["scripts/mcp_python.mjs"] },
    "playwright": { "command": "node", "args": ["scripts/mcp_playwright.mjs"] },
    "puppeteer": { "command": "node", "args": ["scripts/mcp_puppeteer.mjs"] },
  },
}
```

These stubs currently just emit one-off JSON and exit; a production MCP server
should implement the full JSON-RPC interface and persistent bidirectional
stream.

## Method Details (Persistent Servers)

### Playwright (`mcp_playwright.mjs`)

| Method      | Params                            | Result             | Notes                                                |
| ----------- | --------------------------------- | ------------------ | ---------------------------------------------------- |
| `pw/launch` | `{browser?}` (`chromium` default) | `{sessionId}`      | Enforces session cap.                                |
| `pw/goto`   | `{sessionId,url}`                 | `{url}`            | Validates http(s) URL; nav timeout env-configurable. |
| `pw/text`   | `{sessionId,selector}`            | `{text}`           | Selector length capped.                              |
| `pw/close`  | `{sessionId}`                     | `{closed:true}`    | Closes browser.                                      |
| `pw/list`   | `-`                               | `{sessions:[...]}` | Active session IDs.                                  |

### Puppeteer (`mcp_puppeteer.mjs`)

Same shape with `pt/*` method prefix.

### Python Exec (`mcp_python.mjs`)

| Method    | Params   | Result                             | Notes                          |
| --------- | -------- | ---------------------------------- | ------------------------------ |
| `py/exec` | `{code}` | `{stdout,stderr,exitCode,timeout}` | Code length & runtime bounded. |

### Memory Bank (`mcp_memory_bank.mjs`)

| Method      | Params   | Result                         | Notes                    |
| ----------- | -------- | ------------------------------ | ------------------------ |
| `mb/list`   | -        | `{files:[...]}`                | `.md` only, filtered.    |
| `mb/read`   | `{file}` | `{content}`                    | Length truncated.        |
| `mb/search` | `{q}`    | `{matches:[{file,line,text}]}` | Query & line truncation. |

### KG Memory (`mcp_kg_memory.mjs`)

| Method        | Params                          | Result             | Notes                 |
| ------------- | ------------------------------- | ------------------ | --------------------- |
| `kg/add`      | `{subject,predicate,object}`    | `{added:1,size}`   | Bounded triple store. |
| `kg/query`    | `{subject?,predicate?,object?}` | `{triples:[...]}`  | Exact match filters.  |
| `kg/subjects` | -                               | `{subjects:[...]}` | Unique subjects.      |

=======

> > > > > > > cdfb4d9 (feat(a11y): add resilient keyboard nav test and axe helper early-return)

## Hardening Notes

- Do not commit real API keys.
- Rate-limit and sanitize inputs before promoting stubs to full servers.
- For SQL: restrict to read-only or a limited schema in production contexts.
- Filesystem script enforces root scoping; keep `MCP_FS_ROOT` narrow (e.g. a subfolder) if exposing to untrusted agents.
  <<<<<<< HEAD
- Browser servers cap sessions & navigation time; validate URLs & selectors.
- Python server truncates output, enforces code size & runtime limit (no stdin, kills after timeout).
- Memory Bank restricts file/query sizes; KG store bounded & string length capped.

## Shared JSON-RPC Harness

All persistent MCP-style scripts now use a shared lightweight JSON-RPC 2.0 line-delimited harness: `scripts/mcp_rpc_base.mjs`.

Key features:

- Method registration via `register(name, handler)` before `start()`.
- Line buffering & max line length guard (`MCP_MAX_LINE_LEN`, default 100k) to avoid unbounded memory usage.
- Strict JSON parse with proper error responses: `-32700` (parse), `-32601` (method not found), `-32000` (generic handler error) shaped as `{jsonrpc:"2.0",id,error:{code,message,data?}}`.
- Emission of a one-time readiness sentinel line:
  `{ "type": "ready", "methods": [ ... ] }` (non-RPC; used by tooling
  to detect availability) before processing requests.
- Defensive error shaping: hides internal stack traces unless `NODE_ENV=development` (only `message` + optional minimal `data`).

Example interactive usage:

```bash
node scripts/mcp_memory_bank.mjs &
pid=$!
# Wait for ready line
while read -r line; do echo "${line}"; [[ "$line" == *'"type":"ready"'* ]] && break; done < /proc/$!/fd/1
echo '{"jsonrpc":"2.0","id":1,"method":"mb/list"}' >&2 # (example pipe strategy varies per shell/os)
```

Simpler (one-off) example using a here-string on Windows PowerShell:

```pwsh
$p = Start-Process node -PassThru -RedirectStandardInput pipe -RedirectStandardOutput pipe -NoNewWindow -ArgumentList 'scripts/mcp_python.mjs'
[void]$p.StandardOutput.ReadLine() # ready line
$p.StandardInput.WriteLine('{"jsonrpc":"2.0","id":1,"method":"py/exec","params":{"code":"print(6*7)"}}')
$p.StandardInput.Flush()
while(-not $p.HasExited -and -not $p.StandardOutput.EndOfStream){
  $out = $p.StandardOutput.ReadLine(); if($out){ $out }
  if($out -match '"id":1'){ break }
}
```

Adding a new server now typically only requires:

```js
import { register, start } from './mcp_rpc_base.mjs';
register('foo/echo', async ({ text }) => ({ text }));
start();
```

Environment Variables (harness-specific):

- `MCP_MAX_LINE_LEN` – maximum accepted JSON line length (characters) before rejecting with parse error.

Migration Rationale: Eliminates duplicated per-script parsing loops,
standardizes error responses, and reduces surface area for subtle parsing
or framing bugs.

## Next Steps

1. Expand Notion script with search + page hydration.
2. Integrate real Mem0 API & persistence layer.
3. Add param controls (depth, limit) to Tavily queries.
4. Implement proposed structured error codes (see `docs/mcp_error_codes.md`).
5. Add graceful shutdown & idle session reaper for browser servers.
6. Sandboxed Python (pyodide / WASM) option for untrusted code.
7. Implement KG persistence (snapshot + WAL) per `docs/mcp_persistence_plan.md`.
8. Telemetry hooks & metrics for error/domain counts.
