# Future Enhancements Roadmap

## 1. Media / Upload Backend

Goals:

- Support authenticated upload & management of gallery/video assets without committing large binaries.

Approach:

- Lightweight upload API (Node + signed URL to object storage e.g. Cloudflare R2 / S3) – keep vendor‑agnostic via thin storage adapter.
- Auth: PAT-based for admin CLI; optional temporary upload tokens for one-off contributors.
- Storage layout: `/original/{id}/{basename}` + derivative folders (`/encoded`, `/lqip`, `/poster`).
- CI hook: On PR, verify metadata JSON references only stored object keys that exist; block merge if missing.
- Integrity: Record SHA256 of original file in metadata to detect accidental corruption.

Phases:

1. Define `media_manifest.json` schema (id, original_sha256, variants[], width/height, duration for video).
2. Implement adapter interface + local filesystem implementation for dev.
3. Add S3/R2 adapter (env-driven selection).
4. Provide `scripts/upload_media.mjs` to push originals + auto-generate LQIP & posters.
5. Integrate validation into quality regression script.

## 2. Extended Video Support

Goals:

- Multiple quality ladders + adaptive selection; optional captions.

Schema Additions:

- `captions`: [{ lang, label, src }]
- `qualities`: [{ label: '360p', width, height, bitrateKbps, src }]
- `posterLqip`: base64 inline for ultra-fast first paint.

Player Enhancements:

- Detect user data-saver / reduced motion to prefer lower bitrate.
- Expose a quality selector (keyboard accessible) with current selection persisted in localStorage.
- Lazy-load caption tracks only when enabled.

Testing:

- Add snapshot of quality menu a11y tree.
- Simulate bandwidth via mocked `navigator.connection` (where supported) fallback heuristic.

## 3. Analyzer JSON Artifact Publication

Current:

- Markdown diff + JSON lines history.

Planned:

- Emit consolidated `artifacts/quality-latest.json` summarizing: bundle size deltas, token deltas,
  Lighthouse scores, a11y violation counts, coverage summary.
- CI uploads artifact for external dashboards (e.g. shields.io endpoint or GitHub Pages badge service).
- Add script `scripts/publish_quality_badges.mjs` to transform JSON to SVG shields if desired (kept out of repo, published as artifact only).

## 4. Progressive Gate Ratcheting

Purpose:

- Prevent quality regressions while automatically tightening budgets.

Mechanism:

- On successful main branch build, if actual (e.g. bundle size, a11y violations, token growth) beats threshold by margin,
  decrement threshold slightly (configurable min step & floor).
- Store ratchet metadata in `artifacts/quality-history.jsonl` (existing) plus a derived `artifacts/gate_state.json`.
- Env Controls (already scaffolded in `.env.example`):
  - `GATE_RATCHET_ENABLED=1`
  - `GATE_RATCHET_MIN_MARGIN=2` (percent)
  - `GATE_RATCHET_STEP=1` (percent or absolute units depending metric)
- Ensure ratcheting never increases strictness if recent build is flaky (require N consecutive passes).

## 5. Secret & Env Hygiene Automation

- Script to diff `.env.example` vs actual `.env` warning on missing/extra variables.
- Optional CI job that redacts secrets and logs only counts of differences.
- Provide `scripts/check_env_cohesion.mjs` with exit code on mismatch when `CI_STRICT_ENV=1`.

## 6. Optional Dependency Health Pipeline

- Nightly job: `npm outdated --json` -> parse & open aggregated issue with categorized updates (security/bug/feature).
- Auto-close superseded dependency issues when newer PR merges.

## 7. MCP Server Hardening

- Add structured schema validation (e.g. zod) for server config JSON before spawning.
- Introduce per-server health pings & exponential backoff strategy tuning via env.
- Expose metrics endpoint (JSON) summarizing restart counts, uptime, last error.

## 8. Performance Budget Visualization

- Generate waterfall-style chart (using Lighthouse trace) for largest pages and commit PNG/SVG summary to `artifacts/` (CI only, not versioned).
- Track TTFB, FCP, LCP trend lines appended to history file for regression detection beyond raw scores.

## 9. Accessibility Deep Dives

- Weekly CI job runs axe best-practices with extended rules (already gated by env flags) across top-level routes.
- Aggregate categories; store as `artifacts/a11y-trend.jsonl`.
- Automate opening issue if new violation type appears.

## 10. Security / Supply Chain

- Add `npm audit --omit=dev` gating for production subset (today all dev). Fail only on >= moderate severity unless `GATE_SECURITY_STRICT=1`.
- Integrate license scanning (e.g. `license-checker`) to produce `artifacts/licenses.json` for review.

---

Document generated as part of hardening session (env + dependency updates + LQIP enforcement). Update iteratively as features land.
