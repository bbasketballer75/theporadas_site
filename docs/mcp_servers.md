# MCP Server Stubs

This project includes lightweight MCP-style stub scripts for various external services.
These are NOT full Model Context Protocol servers yet; they provide a simple
CLI/JSON interface you can wrap later.

## Scripts

| Service    | Script                       | Env Vars                                                                       | Description                                                                                                                                     |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Notion     | `scripts/mcp_notion.mjs`     | `NOTION_API_KEY`                                                               | Validates key and prints placeholder notice. Extend to expose search/query later.                                                               |
| Tavily     | `scripts/mcp_tavily.mjs`     | `TAVILY_API_KEY`, `TAVILY_MOCK_SCENARIO` (tests), `TAVILY_FORCE_CRASH` (tests) | Runs a search query (POST /search) and returns JSON result. Arg string becomes query.                                                           |
| Mem0       | `scripts/mcp_mem0.mjs`       | `MEM0_API_KEY`                                                                 | In-memory mock add/list memory commands (placeholder until real SDK).                                                                           |
| Filesystem | `scripts/mcp_filesystem.mjs` | `MCP_FS_ROOT` (optional), `MCP_FS_MAX_BYTES`, `MCP_FS_ALLOW_WRITE_GLOBS`       | Safe scoped list/read/write/mkdir/delete/stat inside root (defaults to repo root). Prevents path escape; supports size limit & write allowlist. |

### Filesystem Server Consolidation

We retain both the custom filesystem server (`scripts/mcp_filesystem.mjs`) and the reference/official implementation for now. Rationale:

- Custom server adds policy enforcement (write allowlist, max bytes), structured error codes (2500–2503) and capability introspection.
- Official server ensures parity with emerging MCP ecosystem clients.
- Plan: monitor client feature adoption. If official server gains equivalent
  policy hooks & error shaping, we will deprecate the custom version; otherwise
  we may upstream selected features.

| SQL Server | `scripts/mcp_sqlserver.mjs` | `SQLSERVER_CONNECTION_STRING` | Executes a single query (default `SELECT 1 AS ok`).
Returns recordset JSON. |
| Playwright | `scripts/mcp_playwright.mjs` | `MCP_PW_SESSION_LIMIT` (opt),
`MCP_PW_NAV_TIMEOUT_MS` (opt) | Headless browser sessions: launch, goto,
extract text, close, list. |
| Puppeteer | `scripts/mcp_puppeteer.mjs` | `MCP_PT_SESSION_LIMIT` (opt),
`MCP_PT_NAV_TIMEOUT_MS` (opt) | Alternative headless browser automation
(same operations as Playwright). |
| Python Exec | `scripts/mcp_python.mjs` | `MCP_PYTHON_BIN` (opt),
`MCP_PY_TIMEOUT_MS` (opt) | Executes short Python snippets with timeout &
output truncation. |
| Memory Bank | `scripts/mcp_memory_bank.mjs` | `MCP_MEMORY_BANK_DIR` (opt) | List/read/search markdown knowledge files (capped). |
| KG Memory | `scripts/mcp_kg_memory.mjs` | `MCP_KG_MAX_TRIPLES` (opt) | In-memory triple store add/query/subjects (bounded). |
| Pieces | `scripts/mcp_pieces.mjs` | `PIECES_API_KEY` (opt) | Placeholder integration: key presence probe, ping, and key-required method. |

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
MCP_ERROR_METRICS=0
MCP_ERRORS_VERBOSE=
MCP_MAX_LINE_LEN=200000
DISABLE_MCP_KEEPALIVE=
TAVILY_MOCK_SCENARIO=
TAVILY_FORCE_CRASH=
FIREBASE_MCP_CHECK_TIMEOUT_MS=8000
MCP_SERVER_NAME=custom-name # (optional) override health JSON 'server' field
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

### Error Factory Adoption Status

The shared domain error factory (`scripts/mcp_error_codes.mjs`) now provides helpers
for all persistent servers:

- Adopted: Filesystem, Memory Bank, KG Memory, Python Exec, Playwright, Puppeteer
- Pending: SQL Server, Notion, Tavily, Mem0 (light stubs today)

Outcome: Consistent structured errors (code, domain, symbol, details, retryable) across
automation & knowledge domains enabling unified client handling and metrics.

### Firebase MCP Launch (Direct Invocation Fallback)

The Firebase experimental MCP server normally runs via:

```bash
npx -y firebase-tools@latest -- experimental:mcp --dir <project>
```

However, the local environment experienced a broken global `npx` (missing internal
`npx-cli.js` / `npm-prefix.js`), producing `spawn npx ENOENT` or `EUNSUPPORTEDPROTOCOL` errors
when parsing the `experimental:mcp` subcommand.

To ensure reliability the VS Code configuration points the `firebase` MCP server at
`scripts/firebase_mcp.ps1`, which now:

1. Skips all `npx` usage (treating it as unreliable by default).
2. Creates a cached directory at `%LOCALAPPDATA%/firebase-mcp-cache`.
3. Performs a one-time local install: `npm install firebase-tools@latest` (reused on subsequent runs).
4. Invokes the CLI directly: `node <cache>/node_modules/firebase-tools/lib/bin/firebase.js experimental:mcp [--dir <path>]`.

Benefits:

- Deterministic startup independent of global `npm`/`npx` integrity.
- Cached install avoids repeated network fetches.
- Clear place to purge (`firebase-mcp-cache`) if upgrade or reset needed.

If/when the Node toolchain is fully repaired you may optionally restore the leaner `npx` form
by reverting the script to attempt a healthy `npx` first; for now the forced direct path reduces
operational friction.

## Containerization (Docker)

`Dockerfile.mcp` provides a lightweight multi-stage image for general MCP servers and `Dockerfile.mcp-python` adds Python.
`Dockerfile.mcp-browsers` adds browser automation support (installs `playwright`, `puppeteer` and Playwright browsers with system deps).

`docker-compose.yml` now includes service entries: `mcp_tavily`, `mcp_notion`, `mcp_mem0`, `mcp_sqlserver`, `mcp_supervisor`, `mcp_filesystem`,
`mcp_memory_bank`, `mcp_kg_memory`, `mcp_python`, plus new browser automation services `mcp_playwright` and `mcp_puppeteer` (profile `mcp-local`).
`mcp_pieces` has been added (profile `mcp-local`) providing a scaffold for future Pieces API expansion.

### Unified HTTP Health Endpoints

All persistent MCP services now expose an optional lightweight readiness endpoint when `MCP_HEALTH_PORT` is set:

```text
GET /healthz -> 200 { "status":"ok", "server":"mcp-server", "methods": <count>, "uptimeMs": <number> }
```

This is served inside the container only (ports are not published externally by default) and powers Docker healthchecks via `curl`.
Returned `server` will default to `mcp-server` unless `MCP_SERVER_NAME` is supplied (now set per-service in `docker-compose.yml`).

### Health Port Allocation

| Service           | MCP_HEALTH_PORT |
| ----------------- | --------------- |
| mcp_tavily        | 3010            |
| mcp_notion        | 3011            |
| mcp_mem0          | 3012            |
| mcp_sqlserver     | 3013            |
| mcp_supervisor    | 3014            |
| mcp_filesystem\*  | 3015            |
| mcp_memory_bank\* | 3016            |
| mcp_kg_memory\*   | 3017            |
| mcp_python\*      | 3018            |
| mcp_pieces\*      | 3019            |
| mcp_playwright\*  | 3001            |
| mcp_puppeteer\*   | 3001            |

`*` denotes services gated behind the `mcp-local` profile.
The two browser automation services intentionally reuse `3001` in separate
container namespaces (isolation by container network makes this safe).

Build & run (PowerShell):

````pwsh
docker compose build mcp_tavily mcp_notion mcp_mem0 mcp_sqlserver mcp_supervisor mcp_playwright mcp_puppeteer
docker compose up -d mssql
# ensure .env or exported vars contain required API keys before starting API-dependent services
docker compose up -d mcp_tavily mcp_notion mcp_mem0 mcp_sqlserver mcp_playwright mcp_puppeteer

Browser services are gated behind the `mcp-local` profile. To include them:

```pwsh
docker compose --profile mcp-local up -d mcp_playwright mcp_puppeteer
````

Environment knobs for browsers:

| Service    | Env Var                 | Default | Purpose                         |
| ---------- | ----------------------- | ------- | ------------------------------- |
| Playwright | `MCP_PW_SESSION_LIMIT`  | 5       | Max concurrent browser sessions |
| Playwright | `MCP_PW_NAV_TIMEOUT_MS` | 15000   | Navigation timeout (ms)         |
| Puppeteer  | `MCP_PT_SESSION_LIMIT`  | 5       | Max concurrent browser sessions |
| Puppeteer  | `MCP_PT_NAV_TIMEOUT_MS` | 15000   | Navigation timeout (ms)         |

Healthchecks now use the unified HTTP `/healthz` readiness endpoint (see section above).

Each service overrides the container `CMD` with the target script. Keeping them as discrete containers (rather than one
monolithic supervisor container) simplifies per-service scaling and health isolation. The `mcp_supervisor` container is
available for experimentation if process supervision inside a single container is preferred.

### Healthchecks (Planned Enhancements)

Future enhancements may include:

- Distinct liveness vs readiness differentiation (e.g. readiness after initial warm actions, liveness on periodic no-op RPC).
- Optional Prometheus metrics HTTP endpoint (already available via `sys/promMetrics` RPC) exposed on a separate port.
- Per-service custom `server` name override (now supported via `MCP_SERVER_NAME`).

## Secrets & Environment Management

Primary secrets (see `.env.example` for exhaustive template):

| Variable                                                | Needed For     | Notes                                      |
| ------------------------------------------------------- | -------------- | ------------------------------------------ |
| `TAVILY_API_KEY`                                        | Tavily search  | Fails fast with exit code 12 if missing.   |
| `NOTION_API_KEY`                                        | Notion API     | Integration token (starts with `secret_`). |
| `MEM0_API_KEY`                                          | Mem0 memory    | Placeholder until full API integration.    |
| `SQLSERVER_CONNECTION_STRING` or discrete `SQLSERVER_*` | SQL server MCP | Use least-priv privilege user in prod.     |

Local dev: copy `.env.example` → `.env` and populate. Compose auto-loads root `.env`.

Production guidance:

- Inject via orchestrator secret store (Docker/Swarm secrets, Kubernetes Secrets + SealedSecrets, Vault). Avoid baking into images.
- Rotate regularly; segregate per environment.
- For SQL, never ship `sa`; create a scoped login with only required permissions.
- Audit environment on startup (fail fast if critical keys missing, as Tavily already does).

Adding a new secret:

1. Add placeholder + comment to `.env.example`.
2. Reference `process.env.MY_SECRET` in script.
3. Document here.
4. Add to compose service environment block.

### Consolidated Environment Variable Index (Auto-Generated)

The following table is auto-generated. Do not edit between the markers manually; run `npm run env:docs` to refresh.

<!-- ENV_VARS_AUTO_START -->
<!-- (will be populated by scripts/generate_env_docs.mjs) -->
<!-- ENV_VARS_AUTO_END -->

## VS Code Extensions

Recommended extensions for working with these MCP servers:

| Extension           | ID                             | Why                                        |
| ------------------- | ------------------------------ | ------------------------------------------ |
| ESLint              | `dbaeumer.vscode-eslint`       | Enforces repository lint rules.            |
| Docker              | `ms-azuretools.vscode-docker`  | Container build/run management.            |
| SQL Server          | `ms-mssql.mssql`               | Query & manage local `mssql` dev instance. |
| GitHub Actions      | `github.vscode-github-actions` | CI workflow visibility.                    |
| Markdown All in One | `yzhang.markdown-all-in-one`   | Faster docs editing.                       |
| Prettier (optional) | `esbenp.prettier-vscode`       | Formatting consistency if desired.         |

### Connecting the SQL Extension

1. Command Palette → `MS SQL: Connect`.
2. Server: `localhost,14333`
3. Auth: SQL Login; User: `sa` (dev only) / Password: `DevLocalStr0ng!Pass`
4. Encrypt = true; Trust server certificate = true (dev convenience)
5. Test with `SELECT @@VERSION;`

Later: create non-admin dev user and update compose + docs.

## Operational Flags Recap

- `MCP_RATE_LIMIT=1` enables token bucket in harness (codes domain RL 3000+).
- `MCP_PROM_METRICS=1` enables `sys/promMetrics` Prometheus text exposition method.
- `MCP_ERROR_METRICS=1` expands structured error counters.

## Troubleshooting

| Issue                          | Possible Cause                      | Resolution                                                           |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------- |
| Tavily container exits code 12 | Missing `TAVILY_API_KEY`            | Provide key and restart service.                                     |
| SQL MCP cannot connect         | `mssql` not healthy yet             | `docker compose logs -f mssql`; wait for healthcheck pass.           |
| Missing module in container    | Dev dep not installed in prod layer | Move to `dependencies` or adjust Dockerfile to include dev install.  |
| High restart churn             | Script error or missing env         | Inspect `docker compose logs <svc>`; run locally with extra logging. |
| Supervisor container idle      | No child processes defined          | Adjust `SUPERVISED_SERVERS` or compose command.                      |
