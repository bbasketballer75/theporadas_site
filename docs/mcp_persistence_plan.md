# MCP Persistence Plan (Memory Bank & KG Memory)

Goal: durable storage & recovery for currently in-memory or read-only data sets
while preserving simplicity and safety.

## Current State

- Memory Bank: reads markdown files from `memory-bank/` directory; effectively
  already persistent (FS). No write RPC methods yet (list/read/search only).
- KG Memory: in-memory array of triples lost on process exit; bounded by
  `MCP_KG_MAX_TRIPLES`.

## Requirements

| Requirement     | Memory Bank                    | KG Memory                 |
| --------------- | ------------------------------ | ------------------------- |
| Persistence     | Already FS                     | Needed                    |
| Concurrency     | Low (single process)           | Low                       |
| Query Pattern   | Exact match + potential regex? | Exact match filters       |
| Write Frequency | None (future add?)             | Moderate (adds)           |
| Size Bound      | Directory size / file count    | `MAX_TRIPLES` enforced    |
| Startup Time    | Fast                           | Should load within <100ms |
| Portability     | High                           | High                      |

## Options for KG Persistence

### Option A: JSON Lines (Append-Only)

- File: `memory-bank/kg_triples.log` (one JSON object per line).
- On startup: stream file, parse lines into array (respect size limit).
- On add: append line; fsync optional (configurable) for durability vs speed.
- Compaction: if file lines >> in-memory length (due to future deletes), write
  a snapshot file occasionally.
- Pros: simplest, human-readable, zero extra dependency.
- Cons: slower random access (need memory index anyway), potential large file.

### Option B: Snapshot JSON + WAL

- Two files: `kg_triples.snapshot.json` (array), `kg_triples.wal` (recent adds).
- Startup: load snapshot then apply WAL; if WAL size > threshold, compact.
- Pros: bounded startup cost; small WAL.
- Cons: Slightly more code.

### Option C: SQLite (Embedded)

- Table `triples(subject TEXT, predicate TEXT, object TEXT, ts INTEGER)` with
  index on `(subject, predicate, object)`.
- Pros: Scales to larger datasets, richer query (future partial matches).
- Cons: Adds dependency & platform considerations.

### Recommendation

Adopt Option B (Snapshot + WAL). It offers predictable startup and avoids a new
binary dependency. Reserve SQLite for future advanced query needs.

## Data Integrity & Limits

- Enforce `MAX_TRIPLES` before persisting; reject writes exceeding limit with
  `E_KG_FULL` (code 2400).
- Validate triple strings length (<=200 chars already) before write; discard or
  reject invalid lines on WAL replay.
- Use simple checksum (e.g., SHA-256 of snapshot content) stored alongside for
  corruption detection.

## Memory Bank Write Capability (Future)

If write operations are added (e.g., `mb/add`):

1. Restrict to a safe subdirectory, require `.md` extension.
2. Enforce size limit per file (e.g., 32KB) and total file count cap.
3. Maintain in-memory index of file metadata (size, mtime) for faster list.
4. Optionally add `mb/reindex` method to rebuild index (rarely needed).

## Migration Steps (KG)

1. Introduce persistence module (`scripts/persistence/kg_store.mjs`).
2. On server startup: load snapshot if exists, then replay WAL; enforce limits.
3. Replace in-memory push with: append to WAL, update memory, maybe rotate WAL.
4. Add `kg/save` (optional) admin method to force compaction/snapshot.
5. Add tests: startup with empty files, with existing snapshot+wal, with corrupt
   WAL (skip bad lines), size limit enforcement, compaction logic.
6. Document env vars (e.g., `MCP_KG_WAL_PATH`, `MCP_KG_SNAPSHOT_PATH`,
   `MCP_KG_FSYNC=0|1`).

## Env Variables (Planned)

| Variable             | Default                        | Description                        |
| -------------------- | ------------------------------ | ---------------------------------- |
| `MCP_KG_SNAPSHOT`    | `memory-bank/kg_snapshot.json` | Snapshot file path                 |
| `MCP_KG_WAL`         | `memory-bank/kg_wal.log`       | Write-ahead log path               |
| `MCP_KG_FSYNC`       | `0`                            | Force fsync per append (1 enables) |
| `MCP_KG_MAX_TRIPLES` | `5000`                         | Existing size cap                  |

## Testing Focus

- Ensure idempotent reload: two consecutive starts produce identical in-memory
  triple list.
- Corruption resilience: inject malformed JSON line; verify skip & log.
- Performance: measure load time for 5k triples (<50ms target typical disk).

## Future Enhancements

- Incremental indexes (subject → list indices) persisted separately.
- TTL / eviction strategy (LRU by timestamp) beyond static cap.
- Optional export/import RPC methods for backup automation.
