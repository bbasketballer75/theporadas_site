# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Changed (Unreleased)

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
