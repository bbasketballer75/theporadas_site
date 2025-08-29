# MCP Deployment Guide

This guide explains how the MCP servers in this repository are structured,
how they are started locally vs. in container environments, and how to
differentiate persistent servers from ephemeral tooling.

## Server Classes

| Type                                     | Servers                                                                                                                                                           | Characteristics                                                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent (JSON-RPC)                    | fs, filesystem (upstream), tavily, notion, mem0, sqlserver, memoryBank, kgMemory, pythonExec, playwright, puppeteer, pieces, github, vectordb, scheduler, secrets | Emit a `{ "type": "ready" }` JSON line then remain running, accepting JSON-RPC requests over stdio.                                                   |
| Ephemeral / External (currently skipped) | firebase (experimental)                                                                                                                                           | Launches external CLI (`firebase experimental:mcp`), presently exits with code 1 or lacks consistent readiness. Will remain skipped until stabilized. |

## Starting Servers

The orchestration file `servers.json` enumerates server definitions consumed by tooling like the smoke runner or an MCP supervisor.

Example entry:

```json
{ "name": "github", "cmd": "node", "args": ["scripts/mcp_github.mjs"], "maxRestarts": 2 }
```

All persistent servers now emit a standardized readiness envelope:

```json
{ "type": "ready", "methods": [ "gh/repo", "gh/issues", ... ], "schema": { "service": "github", "version": 1 } }
```

The custom filesystem server also emits a legacy event:

```json
{ "jsonrpc": "2.0", "method": "fs/ready", "params": { "root": "..." } }
```

Followed by the standard envelope for compatibility.

## Smoke Runner Behavior

`scripts/mcp_smoke_runner.mjs`:

- Skips servers listed in `SMOKE_SKIP` env (default once included
  `notion,mem0,sqlserver,firebase`; now only `firebase` must remain if you
  wish to test the others).
- Detects readiness via `type==='ready'` or legacy `method==='fs/ready'`.
- Sends a post-ready listMethods probe if a method ending with
  `listMethods` exists.
- Outputs both a table and JSON summary for CI parsing.

To include all refactored servers (notion, mem0, sqlserver) remove them
from the skip list:

```powershell
$env:SMOKE_SKIP='firebase'
node scripts/mcp_smoke_runner.mjs
```

## Integration Tests

Vitest integration tests
(`test/integration/servers.integration.test.mjs`) spawn selected
servers (github, vectordb, scheduler, secrets) and perform round‑trip
JSON-RPC calls to validate core functionality. Extend this file to add
more scenarios.

Run tests:

```powershell
npm test -- --run
```

## Environment Variables

| Variable                      | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `NOTION_API_KEY`              | Auth for Notion server.                                        |
| `MEM0_API_KEY`                | Enables Mem0 stub (will still run with key but minimal logic). |
| `SQLSERVER_CONNECTION_STRING` | Connection string for SQL Server queries.                      |
| `GITHUB_TOKEN`                | (Optional) Increases GitHub rate limits when set.              |
| `MCP_FS_ROOT`                 | Root path for custom filesystem server.                        |
| `MCP_FS_ALLOW_WRITE_GLOBS`    | Comma/newline separated globs permitting write ops.            |
| `FIREBASE_TOKEN`              | Enables firebase project/app methods (otherwise ping only).    |

Create a `.env` file (not committed) if needed:

```env
NOTION_API_KEY=xxx
MEM0_API_KEY=xxx
SQLSERVER_CONNECTION_STRING=Server=localhost;Database=master;User Id=sa;Password=Your_password123;Encrypt=false;
GITHUB_TOKEN=ghp_...
FIREBASE_TOKEN=ya29....
```

### Obtaining & Using `FIREBASE_TOKEN`

To enable full firebase method exposure (beyond `firebase/ping`):

1. Install the Firebase CLI if not already present:

```powershell
npm i -g firebase-tools
```

1. Authenticate (interactive):

```powershell
firebase login
```

1. Generate a CI token (non-interactive use):

```powershell
firebase login:ci
```

Copy the emitted token and set it as `FIREBASE_TOKEN` in your environment or CI secret store.

1. Re-run the smoke runner ensuring firebase is not skipped:

```powershell
$env:FIREBASE_TOKEN="<token>"
$env:SMOKE_SKIP=''
node scripts/mcp_smoke_runner.mjs
```

Expected firebase methods with token set (may expand over time):

```json
["firebase/ping", "firebase/projects", "firebase/apps"]
```

Without the token only `firebase/ping` appears and the smoke summary will show firebase either as
`ready` (minimal) or `skipped` if explicitly excluded via `SMOKE_SKIP`.

Integration test behavior: `firebase.integration.test.mjs` always asserts `firebase/ping`. Additional
assertions for `projects` / `apps` execute only when `FIREBASE_TOKEN` is detected to avoid credential
dependence in local environments.

## Docker vs Local

When containerizing, ensure the container image:

- Installs Node + dependencies (`npm ci`).
- Provides any required native binaries for Playwright/Puppeteer if those
  servers are enabled.
- Supplies environment variables through secrets or build args.

Mount or bake in the workspace directory so relative paths (e.g., for filesystem server) remain consistent.

## Firebase Experimental Server

Originally the Firebase entry used a PowerShell script invoking
`firebase experimental:mcp` which exited before emitting a readiness
event. A custom wrapper `scripts/mcp_firebase.mjs` now provides a
minimal persistent MCP server:

- Emits `{ "type": "ready", methods: [ "firebase/ping", ... ] }`.
- Adds project/app listing methods when `FIREBASE_TOKEN` is present.
- Falls back to a stub exposing only `firebase/ping` without a token.

Environment requirements:

- Install the Firebase CLI (`npm i -g firebase-tools` or local dev dep).
- Set `FIREBASE_TOKEN` (CI) or run `firebase login:ci` to obtain one.

Methods:

| Method              | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `firebase/ping`     | Health / auth presence check.                           |
| `firebase/projects` | Returns `firebase projects:list` JSON (requires token). |
| `firebase/apps`     | Lists apps for a project (param `projectId`).           |

Errors return JSON-RPC error objects with code `-32000` and message.

If the richer experimental MCP mode stabilizes, this wrapper can proxy
its stdio while preserving the standardized readiness contract.

## Adding a New Server

1. Create `scripts/mcp_<name>.mjs` emitting a standard ready envelope.
2. Register JSON-RPC method handlers; include a `listMethods` responder or rely on harness enumeration.
3. Add to `servers.json` with reasonable `maxRestarts`.
4. Add an integration test covering at least one successful method invocation.
5. Update documentation if new environment variables are required.

## Troubleshooting

| Symptom     | Likely Cause                                | Resolution                               |
| ----------- | ------------------------------------------- | ---------------------------------------- |
| spawn-error | Command not found (`npx` missing, env PATH) | Refresh PATH or install dependency.      |
| timeout     | Server never emitted readiness              | Verify it outputs `{ "type":"ready" }`.  |
| exit-<code> | Process crashed before readiness            | Inspect stderr (enable verbose logging). |

## Roadmap

- Wrap Firebase experimental server with a persistent readiness proxy.
- Add method enumeration support for all servers (standard `listMethods`).
- Expand integration tests to include error taxonomy validation.

---

Maintained as of current development cycle.
