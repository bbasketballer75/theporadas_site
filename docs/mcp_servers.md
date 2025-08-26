# MCP Server Stubs

This project includes lightweight MCP-style stub scripts for various external services.
These are NOT full Model Context Protocol servers yet; they provide a simple
CLI/JSON interface you can wrap later.

## Scripts

| Service     | Script                        | Env Vars                                                    | Description                                                                            |
| ----------- | ----------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Notion      | `scripts/mcp_notion.mjs`      | `NOTION_API_KEY`                                            | Validates key and prints placeholder notice. Extend to expose search/query later.      |
| Tavily      | `scripts/mcp_tavily.mjs`      | `TAVILY_API_KEY`                                            | Runs a search query (POST /search) and returns JSON result. Arg string becomes query.  |
| Mem0        | `scripts/mcp_mem0.mjs`        | `MEM0_API_KEY`                                              | In-memory mock add/list memory commands (placeholder until real SDK).                  |
| Filesystem  | `scripts/mcp_filesystem.mjs`  | `MCP_FS_ROOT` (optional)                                    | Safe scoped list/read/write inside root (defaults to repo root). Prevents path escape. |
| SQL Server  | `scripts/mcp_sqlserver.mjs`   | `SQLSERVER_CONNECTION_STRING`                               | Executes a single query (default `SELECT 1 AS ok`). Returns recordset JSON.            |
| Playwright  | `scripts/mcp_playwright.mjs`  | `MCP_PW_SESSION_LIMIT` (opt), `MCP_PW_NAV_TIMEOUT_MS` (opt) | Headless browser sessions: launch, goto, extract text, close, list.                    |
| Puppeteer   | `scripts/mcp_puppeteer.mjs`   | `MCP_PT_SESSION_LIMIT` (opt), `MCP_PT_NAV_TIMEOUT_MS` (opt) | Alternative headless browser automation (same operations as Playwright).               |
| Python Exec | `scripts/mcp_python.mjs`      | `MCP_PYTHON_BIN` (opt), `MCP_PY_TIMEOUT_MS` (opt)           | Executes short Python snippets with timeout & output truncation.                       |
| Memory Bank | `scripts/mcp_memory_bank.mjs` | `MCP_MEMORY_BANK_DIR` (opt)                                 | Lists / reads / searches local markdown knowledge files (capped lengths).              |
| KG Memory   | `scripts/mcp_kg_memory.mjs`   | `MCP_KG_MAX_TRIPLES` (opt)                                  | Simple in-memory triple store add/query/subjects (bounded).                            |

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
