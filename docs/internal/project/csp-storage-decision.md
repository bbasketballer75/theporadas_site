# CSP Report Storage Decision

Status: Draft

## Goal

Persist CSP violation reports for trend analysis & hardening iterations beyond ephemeral logs.

## Constraints

- Edge runtime (current endpoint) cannot write durable filesystem.
- Desire minimal latency impact; ingestion should be non-blocking.
- Keep PII exposure minimal (currently only IP & UA captured).

## Options

| Option                                      | Pros                               | Cons                                         | Effort | Recommendation           |
| ------------------------------------------- | ---------------------------------- | -------------------------------------------- | ------ | ------------------------ |
| Keep only function logs (status quo)        | Zero new infra                     | Hard to query; retention limited             | Low    | No                       |
| Push to Firestore collection                | Easy query, existing firebase deps | Higher write cost if volume spikes; need TTL | Medium | Consider (if volume low) |
| Push to GCS bucket (append JSONL objects)   | Cheap + lifecycle policies         | Need batching; edge write via signed URL     | Medium | Future                   |
| Use BigQuery via streaming inserts          | Powerful analytics                 | Higher cost, schema mgmt                     | High   | No (overkill)            |
| External log pipeline (Datadog/Sentry Perf) | Rich dashboards                    | Cost & vendor lock                           | High   | Optional                 |

## Recommended Phased Approach

1. Phase 0 (Now): Summarize daily logs via existing workflow placeholder (issue updates).
2. Phase 1: Add Firestore sink (collection `cspReports_{YYYYMMDD}`) in serverful function (NOT edge) invoked asynchronously from edge endpoint (fire-and-forget fetch to region function).
3. Phase 2: Introduce retention TTL (e.g., delete collections > 30 days via scheduled function).
4. Phase 3 (If needed): Migrate to GCS bucket for cheaper long-term raw retention; keep Firestore only for last 7 days hot queries.

## Data Model (Firestore Phase)

```
{
  ts: ISO string,
  ipHash: sha256(ip + salt),
  ua: string,
  blockedURI: string | null,
  effectiveDirective: string | null,
  violatedDirective: string | null,
  sourceFile: string | null,
  line: number | null,
  col: number | null
}
```

Exclude raw IP (store hash) once pipeline added.

## Security / Privacy

- Salt rotate annually; store in secret manager.
- Do not store raw policy text after baseline stabilized (optional).

## Open Tasks

- [ ] Implement Firestore ingestion cloud function & call pattern.
- [ ] Add summarizer workflow actual log extraction (integration with chosen sink).
- [ ] Hash IP before storage.
- [ ] Add retention cleanup job.
