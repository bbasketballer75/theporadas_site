# Decision Log

Decisions:

- 2025-08-20: Track user uses VS Code Insiders.
  - Rationale: Experimental Copilot features (chat modes, prompt files) availability affects guidance and settings.
- 2025-08-24: Limit Vitest scope.
  - Rationale: Prevent executing vendored & dependency tests.
- 2025-08-24: Exclude vendor & coverage from TS.
  - Rationale: Reduce noise from non-app code.
- 2025-08-24: Instrument only `src/**` for coverage.
  - Rationale: Avoid path errors; focus metrics.
- 2025-08-25: Automate coverage report a11y header fix.
  - Rationale: Lightweight post-process script (`scripts/fix_coverage_a11y.mjs`)
    ensures no empty table headers without committing generated artifacts.
- 2025-08-25: Add automated tests for coverage a11y fix.
  - Rationale: New `test/fix_coverage_a11y.test.ts` validates header insertion & idempotency using `COVERAGE_HTML` env override to prevent regressions.
- 2025-08-25: Introduce strict & silent modes for coverage a11y script.
  - Rationale: `COVERAGE_A11Y_STRICT=1` verifies labeled headers post-run; `COVERAGE_A11Y_SILENT=1` suppresses logs for cleaner CI output.
- 2025-08-25: Adopt structured assistant response protocol (Answer → Steps → Alternatives → Action Plan).
  - Rationale: Ensures clarity, educative transparency, and actionable guidance for a learner user while keeping outputs concise and skimmable.
- 2025-08-25: Exclude vendored Lighthouse TODO/FIXME markers from tooling.
  - Rationale: Preserve upstream comments (for easier diffing & future syncs)
    while preventing noisy, non-actionable TODO surfacing in editor extensions.
    Implemented via `todo-tree.filtering.excludeGlobs` for `**/lighthouse/**`
    plus documentation in `CONTRIBUTING.md`.
- 2025-08-25: Lighthouse assertions diff V1 scope accepted.
  - Rationale: Initial diff limits to category deltas and audit add/remove/change for simplicity.
  - Backlog: Consider deeper audit field comparisons (numeric regressions, details size changes) once baseline noise evaluated.
- 2025-08-25: Axe best-practice enforcement phased rollout plan recorded.
  - Rationale: Mitigate risk of immediate CI failures; gather baseline before gating.
  - Plan: 3–5 PR observational, then enable thresholds = baseline, then weekly ratchet to 0.
  - Future: Expand rule set (color contrast best-practice variants) after zero state stabilized.
    <<<<<<< HEAD
- 2025-08-25: Automate Lighthouse diff PR commenting.
  - Rationale: Surface performance/accessibility/category regressions inline
    without manual artifact download, encouraging early remediation.
  - Implementation: GitHub Actions step using `actions/github-script@v7`
    updates/creates a single comment marked with
    `<!-- lighthouse-assertions-diff -->` for idempotency; permissions set
    (pull-requests: write).
  - Future: Enhance formatting (emoji indicators for regressions/improvements,
    collapsible sections, link to full HTML report) and optionally summarize
    numeric metric deltas once deeper diff implemented.
- 2025-08-26: Lighthouse snapshot schema v2 (add key metrics + schemaVersion)
  & enriched diff formatting.
  - Rationale: Provide stable contract for downstream tooling and enable
    concise regression detection on core UX metrics (LCP, FCP, CLS, TBT,
    Speed Index) beyond coarse category scores.
- 2025-08-26: MCP error code taxonomy proposed.
  - Rationale: Standardize application-level failure semantics for automation,
    retries, and observability beyond generic -32000 errors.
  - Action: Added `docs/mcp_error_codes.md` with positive code ranges and
    migration plan (harness extension pending implementation).
  - Future: Integrate `appError` helper & extend readiness sentinel with
    schema marker.
- 2025-08-26: KG & Memory Bank persistence plan drafted.
  - Rationale: Ensure KG data durability across sessions; prepare for future
    writable Memory Bank operations.
  - Decision: Adopt snapshot + WAL strategy (Option B) for KG; defer Memory
    Bank write RPCs until concrete use case.
  - Artifacts: `docs/mcp_persistence_plan.md` outlines env vars & migration.

  - Changes: `scripts/lhci_snapshot.mjs` now emits `{ schemaVersion: 2,
categories, audits, metrics, meta }`; metrics map includes both
    `numericValue` & `score` for each selected audit id.
  - Diff Enhancements: Added `diffMetrics` (numeric + score delta), schema
    version change notice, emoji deltas (⬆️/⬇️/➖), and collapsible
    `<details>` sections for categories, metrics, and audits to reduce PR
    comment noise.
  - Testing: New `test/lhci_diff.test.ts` covers category diff, audit
    classification, metrics diff, and markdown structure presence (schema
    notice & section headers).
  - Migration: Schema mismatch currently only annotates comment
    (non-breaking). Future v3 may remove deprecated fields or add thresholds;
    decision deferred until sufficient history gathered.
  - Future: Add configurable regression guards (env-based thresholds), track
    percentile variability (run multiple samples), and optionally store
    historical trend data for sparkline rendering in diff.

- 2025-08-26: MCP structured error implementation completed.
  - Rationale: Move from unstructured '-32000' generic errors to positive,
    domain-scoped codes enabling deterministic client handling, retry
    heuristics, and observability.
  - Implementation: Added `appError()` helper & extended `safeError` in
    `scripts/mcp_rpc_base.mjs` to surface
    `{ code, message, data:{ domain, symbol, retryable, details } }` plus
    readiness sentinel schema marker `{ schema:{ errorCodes:1 } }`.
  - Migration: Updated Python, Playwright, Puppeteer, Memory Bank, KG server
    scripts to replace generic throws with `appError` (codes: 1000–1006
    global, 2000/2300/2400 domain examples). Removed stray undefined call,
    normalized error details.
  - Testing: New `test/mcp_errors.test.js` asserts three representative
    failures (oversize input 1005, missing file 2300, KG full 2400). Legacy
    TS duplicate test neutralized (skipped placeholder) to avoid symbol
    collisions.
  - Backwards Compatibility: Protocol (-32700, -32601, -32602 reserved,
    -32000 fallback) unchanged; clients can feature-detect via readiness
    schema.
  - Future: Add metrics instrumentation (error counters by domain/symbol),
    expand filesystem & upcoming service domains, optional verbose stack
    inclusion via env flag, and persist KG/MB errors post-persistence
    implementation.

- 2025-08-26: MCP error metrics & verbose stack flags implemented.
  - Rationale: Provide lightweight, opt-in observability (frequency &
    classification) and controlled diagnostic depth without always exposing
    full stacks.
  - Implementation: Added in-memory counters (total, byCode, byDomain,
    bySymbol) gated by `MCP_ERROR_METRICS`; conditional RPC
    `sys/errorStats` returns snapshot. Added `MCP_ERRORS_VERBOSE` env (N or
    `full`) to include truncated or full sanitized stack in `error.data.stack`.
    Harness increments counters inside `safeError` only for positive
    application codes.
  - Testing: New `test/mcp_error_metrics.test.js` spawns Python server with
    both env vars set, triggers oversize input (1005) then queries
    `sys/errorStats`; asserts counters & stack presence.
  - Documentation: `docs/mcp_error_codes.md` expanded with Metrics & Env
    Flags section (variables table, RPC example, future rate limiting plan).
  - Future: Add sampling / rate limiting (`MCP_ERROR_METRICS_SAMPLE` or
    token bucket) to bound overhead under error storms; consider durable
    export on graceful shutdown if longitudinal analytics needed.

- 2025-08-26: Introduce `auto-merge` label workflow.
  - Rationale: Reduce manual merge toil after approvals while preserving required review & status check protections.
  - Implementation: `.github/workflows/auto_merge.yml` evaluates approvals and
    change requests, then enables native auto‑merge (rebase) or merges
    immediately when all checks succeed.
  - Future: Extend gating (coverage delta, Lighthouse diff guard) before enabling; add chatops command `/auto-merge`.

- 2025-08-26: Add coverage & Lighthouse quality gates to auto-merge workflow.
  - Rationale: Prevent silent performance or quality regressions sneaking in via automatic merges once label applied.
  - Implementation: Extended `.github/workflows/auto_merge.yml` with steps to
    run coverage (`npm run coverage`), download Lighthouse assertions artifact,
    compute diff when prior snapshot present, and execute
    `scripts/enforce_gating.mjs` for:
    - Coverage minima (statements 95, branches 90, functions 95, lines 95).
    - Lighthouse category minima (perf 0.90, a11y 1.00, best_practices 1.00, seo 1.00).
    - Diff regression detection: negative category deltas beyond 0.01 tolerance fail gate.
  - Script: New `scripts/enforce_gating.mjs` parses
    `coverage/coverage-summary.json`, optional `artifacts/lighthouse-assertions.json`
    and diff markdown.
  - Future: Incorporate bundle size/token growth enforcement, configurable
    thresholds via repository secrets/ENV, and per-metric (LCP/FCP/CLS)
    guardrails using schema v2 metrics map.

Details:

- Vitest include narrowed to `test/**/*` and coverage include to `src/**` to avoid Istanbul path issues on Windows.
- Added `lighthouse/` and `coverage/` to `tsconfig.json` excludes to suppress implicit any warnings from vendored code.
- Accessibility of generated coverage report improved: empty `<th>` cells now auto-filled post generation (replacing prior decision to ignore).

- 2025-08-26: Expand quality gating (coverage delta, metric regressions, token
  growth) & ChatOps `/auto-merge` command.
  - Rationale: Strengthen automated safeguards against silent regressions
    (performance UX metrics, widening code footprint, declining coverage) while
    offering low-friction activation via comment trigger.
  - Implementation:
    - `scripts/enforce_gating.mjs` extended with:
      - Coverage delta guard via `GATE_MAX_COVERAGE_DROP_<METRIC>` (pp decrease limit per statements|branches|functions|lines).
      - Lighthouse key metric regression guards: `GATE_LH_METRIC_MAX_LCP_DELTA_MS`, `GATE_LH_METRIC_MAX_CLS_DELTA`, `GATE_LH_METRIC_MAX_TBT_DELTA_MS`.
      - Token growth gate parsing `artifacts/token-deltas.json` (soft warn: `GATE_TOKEN_MAX_NET`, hard fail: `GATE_TOKEN_MAX_ADDED`).
      - Multi-path Lighthouse assertions artifact fallback enabling resilient consumption despite naming variations.
    - `.github/workflows/auto_merge.yml` now downloads optional artifacts
      (`prev-coverage-summary.json`, `token-deltas.json`) and exports env
      placeholders for new thresholds.
    - New `.github/workflows/chatops_auto_merge.yml` watches issue comments for `/auto-merge` to apply `auto-merge` label (idempotent) & acknowledge.
  - Defaults / Rollout:
    - New gates default to passive (warn if missing artifacts) to avoid blocking until historical baselines collected.
    - Maintainers can tighten by setting env values / repository secrets
      progressively (ratchet strategy documented in CONTRIBUTING Quality Gates
      section).
  - Future:
    - Automate generation of `prev-coverage-summary` & `token-deltas` in producing workflows (currently consumer-side only).
    - Extend metric guard set (INP once stable in Lighthouse JSON), add
      variability smoothing (median over N runs), and incorporate bundle size
      delta gating.
    - Persist historical gating results for trend dashboards & adaptive threshold suggestions.
  - Risks / Mitigations:
    - Missing artifacts: handled as non-fatal with explicit warning channel.
    - Flaky performance metrics: guarded by requiring explicit env to enforce; future median sampling planned.
    - Token false positives from generated code: consider path-based exclusion or weighting in future iteration.
