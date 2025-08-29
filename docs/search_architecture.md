# Search & Retrieval Architecture (Tier 1)

## Goals

- Enable local vector indices for site content (markdown) and code symbols.
- Provide semantic code search and doc QA (RAG) via simple retrieval API.
- Integrate with existing CI (lint, tests, lighthouse, a11y) with minimal performance impact.

## Components

- Content Indexer: parses `content/*.md`, extracts frontmatter (future), chunks paragraphs (≈500 char window),
  generates embeddings, stores in lightweight store.
- Code Indexer: walks `src/` collecting exported functions/components; uses TypeScript AST to capture signature +
  leading comments; chunks if large.
- Embedding Provider Abstraction: `src/search/embeddings.ts` exposes `embedBatch(texts: string[]): Promise<number[][]>`
  with pluggable backends (OpenAI, local). Fallback: hashing-based pseudo-embedding for dev if no key.
- Vector Store: initial JSON arrays: `{ id, source, kind, text, embedding }` in `search_index/content.json` &
  `search_index/code.json`. Future: upgrade to SQLite + pgvector (if chosen) or other vector DB.
- Similarity: cosine similarity implemented locally (normalized vectors). Top-k retrieval (default k=5).
- QA Synthesizer: naive concatenation summary (first N sentences) + citation list; placeholder for LLM call optional.
- CLI Tools: `npm run build:content-index`, `npm run build:code-index`, `npm run query:doc -- "question"` (queries both,
  ranks answers).

## Data Flow

1. Index build: read files → chunk → embed → write JSON with metadata.
2. Query: embed question → search each index → merge results → aggregate answer.

## Chunking Strategy

- Content: split on blank lines, merge until ~400–600 chars; store original start line for citation.
- Code: each top-level exported symbol; if body > 500 chars, split by logical blocks / comment separators.

## Extensibility

- Replace JSON with SQLite: table `vectors(id TEXT PRIMARY KEY, kind TEXT, source TEXT, text TEXT, embedding BLOB)`;
  add virtual table / extension later for ANN.
- Multi-embed provider fallback: environment variable `EMBEDDINGS_PROVIDER` selects implementation.

## Environment & Config

- `.env` additions: `EMBEDDINGS_API_KEY`, `EMBEDDINGS_PROVIDER=openai|local`.
- Script `scripts/generate_search_indices.mjs` orchestrates both index builds (future caching in CI).

## CI Integration

- Add test ensuring index build succeeds (no exceptions) and basic query returns ≥1 result for a known keyword.
- Skip network embeddings in CI if API key missing by using local deterministic embedding.

## Performance Considerations

- Cache embeddings via content hash (SHA-256 of text) → reuse if unchanged.
- Limit batch size to avoid rate limits.

## Accessibility & Lighthouse Tie-ins

- Future: surface related internal links using vector similarity (engagement boost).
- Do not block existing lighthouse scripts; index build runs separately.

## Security & Privacy

- Avoid sending code/content externally when provider = local.
- Redact secrets (simple regex for `API_KEY|TOKEN|SECRET`) before external embedding call.

## Initial Milestones

1. Embedding abstraction + local fallback.
2. Content index build + JSON store.
3. Code index build.
4. Query utility combining both with ranking.
5. Minimal tests & docs.

## Out of Scope (Tier 1)

- Non-file persistence (DB) in first pass.
- Advanced LLM generative answer synthesis.
- Incremental watch mode.
