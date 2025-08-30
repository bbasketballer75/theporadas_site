# MCP SSE Gateway

Status: Advanced event streaming (heartbeat + ingest forwarding, filtering, resume, metrics, auth).

## Purpose

Provides an HTTP Server-Sent Events (SSE) endpoint so clients (e.g. browsers, monitoring agents,
future dashboards) no longer receive `404` when probing the canonical MCP event stream path:

```text
/model_context_protocol/2024-11-05/sse
```

The gateway now supports:

- Periodic `heartbeat` events (liveness)
- External / internal event ingestion via authenticated POST endpoint
- Topic-based subscription filtering (`?topics=...`)
- Resume using `Last-Event-ID` header with bounded in-memory ring buffer
- Optional bearer token authentication for subscribers & ingestion
- Optional HMAC signature (sha256) integrity line for each forwarded event
- Prometheus-style metrics endpoint (`/metrics/sse`)

Structured events (e.g. log level changes) are emitted by internal helpers (`scripts/mcp_events.mjs`) and forwarded to subscribers.

## Why a Separate Process?

Keeping the gateway isolated avoids coupling HTTP backpressure / connection lifecycle with the
line-oriented stdio JSON-RPC harness. This minimizes risk while iterating. Once stable, a unified
process or shared event bus can replace the interim design.

## Endpoints

| Method | Path                                        | Purpose                                                               |
| ------ | ------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/model_context_protocol/2024-11-05/sse`    | Event stream (SSE). Supports `?topics=a,b` & `Last-Event-ID`.         |
| POST   | `/model_context_protocol/2024-11-05/events` | Ingest a single event `{ topic, data }`. Auth required if configured. |
| GET    | `/metrics/sse`                              | Prometheus metrics (no auth).                                         |

### Event Format

Each event block:

```text
id: <monotonic integer>
event: <topic>
data: {"<JSON-serialized payload>"}
data: {"sig":"<hmac>"}   # only if HMAC enabled
```

Additional first comment line: `: stream start id=<nextId>`

### Ingestion Payload

```http
POST /model_context_protocol/2024-11-05/events
{"topic":"log/level","data":{"previous":"info","current":"debug"}}
```

Returns: `202 {"id": <eventId>}` on success.

### Topic Filtering

Subscribe only to selected topics:

```text
GET /model_context_protocol/2024-11-05/sse?topics=metrics,log/level
```

### Resume Semantics

Client supplies header `Last-Event-ID: <N>`; gateway replays buffered events with id > N before streaming live ones. Buffer size bounded by `MCP_SSE_RING_MAX`.

### Authentication

Optional bearer tokens:

- Subscriber token: `MCP_SSE_AUTH_TOKEN`
- Ingest token: `MCP_SSE_INGEST_TOKEN` (defaults to subscriber token if unset)

If tokens configured and missing/invalid: `401` returned.

### HMAC Integrity

If `MCP_SSE_HMAC_REDACTED_BY_AUDIT_ISSUE_70` set, gateway adds an extra `data:` line containing a sha256 hex
HMAC of a deterministic payload: `{topic,id,ts}` serialized JSON.

### Metrics

`/metrics/sse` (Prometheus exposition):

```text
mcp_sse_clients <gauge>
mcp_sse_total_connections <counter>
mcp_sse_events_ingested <counter>
mcp_sse_events_delivered <counter>
mcp_sse_events_dropped <counter>
mcp_sse_bytes_sent <counter>
```

## Environment Variables

| Variable               | Default          | Description                                     |
| ---------------------- | ---------------- | ----------------------------------------------- |
| `MCP_SSE_PORT`         | `39300`          | Listen port.                                    |
| `MCP_SSE_HEARTBEAT_MS` | `15000`          | Heartbeat interval ms.                          |
| `MCP_SSE_RING_MAX`     | `500`            | Max events retained for resume.                 |
| `MCP_SSE_AUTH_TOKEN`   | _(none)_         | Subscriber bearer token (optional).             |
| `MCP_SSE_INGEST_TOKEN` | (=auth)          | Ingest bearer token (falls back to auth token). |
| `MCP_SSE_HMAC_REDACTED_BY_AUDIT_ISSUE_70`  | _(none)_         | Enables HMAC signature line if set.             |
| `MCP_SSE_INGEST_URL`   | internal default | Used by in-process emit helper to POST events.  |
| `MCP_INCLUDE_SSE`      | _(supervisor)_   | Auto-spawn flag for supervisor.                 |

## Launching Standalone

```bash
node scripts/mcp_sse_gateway.mjs
```

Or with custom port / faster heartbeat for local dev:

```bash
MCP_SSE_PORT=40000 MCP_SSE_HEARTBEAT_MS=2000 node scripts/mcp_sse_gateway.mjs
```

## Via Supervisor

Set `MCP_INCLUDE_SSE=1` when invoking `scripts/mcp_supervisor.mjs`:

```bash
MCP_INCLUDE_SSE=1 node scripts/mcp_supervisor.mjs --only fs,tavily,sse --max-restarts 1
```

Explicit `--only` including `sse` is optional; supervisor will append it automatically when the
env var is present.

## Internal Emit Helper

`scripts/mcp_events.mjs` exposes `emitEvent(topic, data)` which POSTs to the ingest endpoint
(best-effort). Example: `mcp_logging.mjs` emits `log/level` events when runtime log level changes.

## Backpressure & Limits

Simple best-effort: if a client socket becomes non-writable, events for that client are dropped
and counted (`mcp_sse_events_dropped`). Future refinement may include per-client buffering or
disconnect thresholds.

## Future Enhancements (Remaining Ideas)

1. Optional compression (per-message deflate / gzip negotiation).
2. Multi-process event bus (e.g. Redis, NATS) for horizontal scale.
3. Rate limiting & per-topic authorization policies.
4. Structured schema versioning & validation.

## Testing Strategy (Legacy Context)

Original minimal tests validated heartbeat & 404. Expanded tests now cover forwarding, filtering, resume, auth, metrics, and supervisor integration.

## Testing

Automated tests cover:

- Heartbeat delivery & 404 handling
- Event ingestion & forwarding
- Topic filtering logic
- Resume with `Last-Event-ID`
- Auth required paths (401 scenarios) when tokens configured
- Metrics counters after activity
- Supervisor integration readiness (SSE gateway spawned under supervisor)

## Notes

Security posture currently relies on bearer tokens + optional HMAC for integrity. Consider TLS
termination and secret management (vault or environment injection) for production deployments.
