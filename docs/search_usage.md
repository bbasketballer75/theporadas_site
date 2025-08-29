# Search Subsystem Usage

This document explains how to build and query the local search indices
(markdown content + exported TypeScript symbols), configure embedding
providers, and understand incremental / deterministic behavior.

## Overview

The search feature combines two JSON indices stored under `search_index/`:

- `content.json` – Paragraph chunks (≈300–600 chars) derived from markdown files in `content/`.
- `code.json` – Exported TypeScript symbol snippets (functions, interfaces, enums, etc.) with trimmed text and associated JSDoc.

Queries embed both the query string and stored vectors, rank by cosine
similarity, then return the top _k_ mixed results. A synthesis formatter
renders a concise ranked list.

## Commands

Build indices (content then code):

```sh
npm run search:build:all
```

Individual builds:

````sh
npm run search:build:content
npm run search:build:code
```text

Run an ad‑hoc query (pass any terms after the script name):

```sh
npm run search:query -- video player component
````

The output lists ranked entries, e.g.:

```
(1) [content] content/home.md#p3 score=0.8123
Video player component enables ...

(2) [code] src/components/VideoPlayer.tsx#VideoPlayer score=0.7011
export function VideoPlayer(...) { ... }
```

## Environment Variables

| Variable                | Purpose                     | Values / Notes                                                                         |
| ----------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `EMBEDDINGS_PROVIDER`   | Select embedding backend    | `local` (default) or `openai`                                                          |
| `EMBEDDINGS_API_KEY`    | API key for OpenAI provider | Required when provider = `openai`; if missing, auto‑falls back to local with a warning |
| `EMBEDDINGS_MODEL`      | Override OpenAI model       | Defaults to `text-embedding-3-small`                                                   |
| `EMBEDDINGS_DIMENSIONS` | Override local vector size  | Default 256 (smaller = faster)                                                         |

Examples:

```sh
# Force OpenAI (will fallback if key absent)
set EMBEDDINGS_PROVIDER=openai
set EMBEDDINGS_API_KEY=sk-...redacted...

npm run search:build:all
npm run search:query -- incremental content hashing
```

(Use `export` instead of `set` on POSIX shells.)

## Incremental Rebuild Behavior

Content chunks and code symbol snippets are hashed (SHA‑256 of text +
source path) so repeated builds reuse existing embeddings unless the
underlying text changes. A modified paragraph or symbol produces a new
hash entry while unchanged items retain their previous IDs, enabling
future optimization (e.g., caching embeddings) without redundant
recomputation.

Current implementation rebuilds all embeddings each run, but ID stability is preserved for future incremental vector caching.

## Deterministic Local Embeddings

The `local` provider uses a seeded pseudo‑random projection derived from
SHA‑256 of the input text to yield a unit‑norm vector. For identical
inputs, vectors are bit‑stable across processes (facilitates
deterministic tests). Vector dimensionality is configurable via
`EMBEDDINGS_DIMENSIONS` but must match across stored indices and
queries—ensure you rebuild indices after changing it.

## OpenAI Provider

When `EMBEDDINGS_PROVIDER=openai` and a valid `EMBEDDINGS_API_KEY` is
present, the system posts batched text to
`https://api.openai.com/v1/embeddings`. Failures (HTTP !2xx) throw an
error. If the key is absent, a warning logs and the local deterministic
provider is used automatically.

## Retrieval API (Programmatic)

Primary functions (see `src/search/retrieval.ts`):

- `search(query: string, k = 8)` → Promise of ranked results `{ id, kind, source, text, embedding, score }`.
- `synthesize(results)` → Human‑readable multi‑block string for console output or logging.

Example (Node REPL or script):

```ts
import { search, synthesize } from './src/search/retrieval.js';

const results = await search('markdown chunk hashing', 5);
console.log(synthesize(results));
```

## Testing Summary

Relevant test files:

- `test/search_basic.test.ts` – Embedding similarity & baseline queries.
- `test/search_indices.test.ts` – Content/code indexing, chunking, hash reuse, ranking ordering.
- `test/search_advanced.test.ts` – Empty index path, synthesis
  formatting, incremental content modification, OpenAI fallback (missing
  key), deterministic local embeddings, symbol diversity.
- (Planned) Additional tests to cover OpenAI success path (mocked) and tie‑score ordering / k‑slice behavior.

To run all tests with coverage:

```sh
npm test
# or
npm run coverage
```

## Failure Modes & Troubleshooting

| Symptom                                  | Likely Cause                          | Resolution                                                   |
| ---------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Query returns empty list                 | Indices missing                       | Run `npm run search:build:all`                               |
| Warning about missing API key            | OpenAI provider selected without key  | Set `EMBEDDINGS_API_KEY` or switch to local                  |
| Inconsistent ranking across runs (local) | Changed dimensionality between builds | Rebuild both indices after adjusting `EMBEDDINGS_DIMENSIONS` |
| OpenAI HTTP error                        | Invalid key / rate limit / network    | Verify key, retry later, or revert to local                  |

## Future Enhancements

Potential roadmap items (see `docs/search_architecture.md`):

- Cached per‑ID embedding persistence to avoid recomputing unchanged vectors.
- Semantic re‑ranking / hybrid BM25 + vector scoring.
- Section aware markdown chunk merging (heading hierarchy context).
- UI integration with highlighting and facet filters (content vs code).

---

For architectural rationale and deeper design notes, consult `docs/search_architecture.md`.
