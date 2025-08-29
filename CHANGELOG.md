# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added (Unreleased)

- Search subsystem foundation: deterministic/local + optional OpenAI embeddings abstraction
  (`src/search/embeddings.ts`) with pluggable provider selection and cosine similarity.
- Markdown content indexer (`src/search/content_index.ts`) with paragraph chunking
  (min 300 / max 600 chars), stable SHA-256 chunk hashing for incremental rebuild reuse,
  and JSON persistence (`search_index/content.json`).
- TypeScript code indexer (`src/search/code_index.ts`) extracting exported symbols,
  associated JSDoc, trimmed snippets, and hashing for incremental updates
  (`search_index/code.json`).
- Unified retrieval module (`src/search/retrieval.ts`) providing ranked mixed (content + code)
  search results with naive synthesis output; exported `synthesize` for downstream
  formatting/tests.
- CLI scripts (package scripts) to build indices individually or together and execute
  ad‑hoc queries.
- Advanced search coverage tests exercising empty-index path, synthesis formatting,
  incremental change reuse, OpenAI provider fallback (missing key), deterministic
  embeddings stability, and diverse symbol kinds.
- Search usage documentation (`docs/search_usage.md`) detailing commands, environment
  configuration, incremental hashing behavior, deterministic embeddings, and test
  coverage scope.
- Targeted tests for OpenAI success path (mocked response) and tie-score / k-slice
  retrieval behavior increasing coverage of ranking & provider branches.

### Changed (Unreleased)

- Removed deprecated standalone CodeQL finalize workflow (file deleted)
  (`codeql-finalize-baseline.yml`); logic consolidated into primary `codeql.yml`
  after resolving baseline insertion.

- Re-enabled markdown line-length rule (MD013) with relaxed 140-char limit; added `.markdownlintignore` to exclude vendored & build artifacts.
- Enforced explicit Vitest coverage thresholds (branches/statements/lines/functions ≥85%) and documented in `CONTRIBUTING.md`.
- Wrapped long documentation lines to satisfy MD013 (general docs) and introduced per-path
  override (`docs/video/.markdownlint.jsonc`) with extended limit (200) for video-specific
  tables and command snippets.
- Added coverage badge aggregation (matrix) and commit step in `ci-test` workflow; planning
  dedicated badge workflow if separation becomes beneficial.
- Decoupled coverage badge generation into standalone `coverage-badge` workflow and simplified
  core `ci-test` workflow.
- Enhanced markdown lint script to apply nested config for `docs/video` directory (separate
  invocation with dedicated config).
- Added coverage-badge workflow status badge to `README.md` alongside local SVG badge.
- Added workflow concurrency (cancel in-progress) for coverage badge runs.
- Added caching of Vitest and Vite build artifacts in coverage badge workflow to speed runs.
- Added PR coverage diff workflow (`coverage-diff`) with threshold enforcement.
- Introduced Lighthouse budgets enforcement workflow (`lighthouse-budgets`) using `lighthouse-budgets.json`.
- Added DevTools bundle size gate workflow (`bundle-size`) commenting size deltas.
- Implemented Playwright visual regression workflow (`visual-regression`) with multi-browser snapshots.
- Added restoration of baseline Playwright snapshots from latest `main` artifact for PR visual tests.
- Introduced readable markdown bundle size table comment (replacing raw JSON) via `bundle_size_table.mjs`.
- Added optional `verify:visual` script to run Playwright outside the core `verify` chain.
- Refactored Lighthouse budgets workflow to use internal composite action
  (`./.github/actions/lighthouse-budgets`) with annotations on budget overages.
- Introduced shared MCP domain error factory (`scripts/mcp_error_codes.mjs`) providing
  `defineDomain` and per-domain helpers (`fsError`, `mbError`, `kgError`) to enforce
  consistent code/symbol/domain semantics across servers.
- Migrated Memory Bank & KG memory servers to new helpers; preserved existing filesystem
  helper for backwards compatibility.
- Added error factory adoption status section to `docs/mcp_servers.md` and extended
  `docs/mcp_error_codes.md` with factory usage, migration guidance, and rationale.
- Normalized long documentation lines and table wrapping to satisfy MD013 after new
  sections were added.
- Added new domain error helper definitions for Python, Playwright, and Puppeteer
  (`pyError`, `pwError`, `ptError`) in `scripts/mcp_error_codes.mjs` with allocated code ranges.
- Refactored `mcp_python.mjs`, `mcp_playwright.mjs`, and `mcp_puppeteer.mjs` to use
  domain helpers (standardized structured error responses across all persistent MCP
  servers).
- Implemented direct invocation fallback for Firebase experimental MCP server
  (`scripts/firebase_mcp.ps1`) bypassing broken global `npx`; documented strategy in
  `docs/mcp_servers.md`.
- Added health check script `scripts/check_firebase_mcp.mjs` to validate Firebase MCP readiness (banner detection with timeout).
- Enhanced `scripts/refresh_node_path.ps1` to recreate stable Node junction (mitigates husky path drift) and added guidance comments.

### Security (Unreleased)

- Upgraded `dawidd6/action-download-artifact` from `v3` to `v6` in
  `.github/workflows/auto_merge.yml` and added `allow_forks: false` to all
  artifact download steps to mitigate artifact poisoning risk (commit `52a80b2`).
- Added npm `overrides` forcing `tmp@^0.2.4` to remediate transitive
  symlink traversal advisory (dev/CI tooling only). See
  `SECURITY_NOTES.md` section "2025-08-29 Supply Chain Remediation" for
  rationale & verification details.

---

## [0.1.2] - 2025-08-25

### Added (0.1.2)

- Markdown-driven content system (home, story, schedule highlights, travel info, gallery, party, rings, thanks) with loader abstraction.
- Coverage accessibility post-processor script (`scripts/fix_coverage_a11y.mjs`) recursive labeling of coverage
  summary headers; STRICT & SILENT modes.
- Axe scan workflow for coverage report (`coverage-axe-scan`).
- Skip link focus management utility and associated accessibility tests.
- Issue auto-labeling workflow and structured issue templates (bug, feature, task).

### Changed (0.1.2)

- Coverage workflows enforce STRICT a11y labeling; added warning guard when non-STRICT.
- Coverage diff workflow now emits JSON artifact and richer job summary.
- Bundle size workflow conditional execution & improved comment formatting.
- Enhanced PR template (a11y, performance, bundle, lighthouse sections).
- Improved design system focus ring styles for clarity/contrast.
- `.gitattributes` normalization for consistent line endings.
- Decision log updated documenting a11y coverage approach.

### Quality (0.1.2)

- Maintained ~95% statements / ~86% branches coverage (no regressions).
- All 48 tests passing; axe scan of initial render clean; coverage HTML headers labeled.

### Documentation (0.1.2)

- README expanded with coverage accessibility section, environment variable usage, and local vs CI guidance.
- PR template enhancements to reinforce governance.

### Notes (0.1.2)

- No breaking changes; patch version bump reflects tooling/content system additions without API changes.

---

## [0.1.1] - 2025-08-25

### Added (0.1.1)

- Release automation workflow (`.github/workflows/release.yml`) triggered by tags.
- Changelog generation scripts (`changelog:unreleased`, `changelog:release`, `changelog:print`).
- Lighthouse sync script (`scripts/sync_lighthouse.mjs`) with `--ref`, `--dry-run`, `--preserve` flags and metadata emission.
- Documentation sections: Release & Changelog Workflow, Coverage Targets, Lighthouse Sync usage, Reset-Link fallback.

### Changed (0.1.1)

- Hardened `lighthouse/build/reset-link.js` to auto-detect yarn and optionally fall back to npm link with `USE_NPM_LINK` env var.
- Updated `CONTRIBUTING.md` with coverage gate (≥85% branches), release process, and sync checklist.
- Reformatted tests to satisfy import ordering and formatting rules.

### Quality (0.1.1)

- Maintained >86% branch coverage (no regressions after automation additions).

---

## [0.1.0] - 2025-08-25

### Added

- Initial release tag and baseline test suite.
- Lighthouse vendored build & dual zlib strategy.
- Accessibility tests and motion/theme preference toggles.

### Quality

- Achieved >95% statements and >86% branch coverage.

---

Use `npm run changelog:unreleased` to update this file with unreleased changes.
This regenerates in-place; keep any permanent manual notes above this section.
