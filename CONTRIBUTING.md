# Contributing

This repository follows a blueprint-first approach. The canonical guide is
`.github/project_instructions.md`. All issues and PRs must align with it.

## Workflow

1. Open an issue (bug/feature/task) and confirm blueprint alignment.
2. Create a small branch, implement minimal, testable changes.
3. Open a PR using the template; check the Blueprint Alignment checkbox.
4. Include testing steps and evidence (logs/screenshots). Keep diffs focused.

## Quality Gates

- Scripts/tasks idempotent; avoid destructive operations without confirmation.
- Verify locally: builds/tests linters pass.
- Security & privacy reviewed; secrets not in code.
- Accessibility considered for UI changes (WCAG 2.1 AA aim).
- Branch coverage ≥85% (add focused tests with new conditional logic).
- No regression in Lighthouse performance budgets (see `lighthouserc.json`).

### Performance / Lighthouse Section (PR Template)

If the PR changes any perf‑affecting files (detected by `pr-validate.yml`), you
must fill out the `## Performance / Lighthouse` section in the PR body. Include:

1. Summary of changes impacting bundle size or runtime (e.g. new dependency,
   large content addition, algorithm changes).
2. Mitigations applied (code splitting, tree shaking, lazy loading) if relevant.
3. Token delta rationale when the sticky comment shows a soft warning.
4. Confirmation Lighthouse budgets still pass locally (`npm run lighthouse` or
   rely on CI result if deterministic).

Failing to include this section when required causes the workflow to error.

### Token Growth Heuristic

On perf‑affecting PRs the validation workflow counts alphanumeric tokens in
changed JS/TS files vs base branch:

- Warn threshold: `MAX_NET_TOKEN_DELTA` (default 800 net increase)
- Hard fail: `MAX_ABS_TOKEN_ADDED` (default 1600 added tokens irrespective of removals)

Actions when warning triggers:

- Provide rationale (feature module, necessary refactor, etc.)
- Consider splitting feature into smaller PRs
- Ensure dead code / unused exports removed prior to review

Actions when near hard fail (≥75% of limit):

- Explicitly justify necessity or split PR
- Check for opportunity to isolate rarely used logic behind dynamic import

### Coverage Regression

If coverage diff reports drops beyond allowed thresholds, add/adjust tests in
same PR. Do not raise thresholds unless agreed with maintainers.

## Commit & PR

- Conventional style (if possible): feat:, fix:, chore:, docs:, refactor:.
- Small PRs with clear intent and rollback plan.
- Keep commit messages Conventional where it clarifies intent (`feat:`, `fix:`,
  `chore:`, `docs:`, `refactor:`). This feeds automated changelog generation.

## Docs

- Update README or add docs alongside code.
- If scope/architecture changes, propose an update to `.github/project_instructions.md`.
- Update `CHANGELOG.md` with `npm run changelog:unreleased` when a feature set
  accumulates; do not wait until tagging to collect months of changes.

### Content Authoring (Markdown Sections)

Content lives in `content/*.md` with minimal frontmatter. Steps to add/update:

1. Create or edit file with frontmatter fields: `slug`, `title`, `order`, optional `hero`.
2. Keep only supported markdown patterns (`##` headings, blank-line separated paragraphs).
3. Run `npm test` to confirm ordering & accessibility tests.
4. If large textual addition pushes token growth warning, summarize reason in Performance section.
5. Avoid adding images or large inline HTML; propose an extension first if needed.

Ordering rule: The trio `story`, `rings`, `wedding-party` are fixed early
sequence; subsequent sections use ascending numeric `order`.

## MCP & Environment

- Prefer hosted MCP endpoints where available; otherwise use Dockerized servers.
- Use the provided setup tasks and scripts; avoid ad-hoc installers.

## Contact

See `.github/project_instructions.md` for context, success metrics, and next steps.

## Vendored Lighthouse Strategy

We fully vendor the upstream Lighthouse source under `lighthouse/` (embedded git metadata removed) for these reasons:

- Cross-platform patches: Windows-specific path normalization & zlib shim gating not upstreamed yet.
- Reproducible local DevTools bundle builds without relying on external clone/submodule init.
- Simpler contributor onboarding (single clone, no submodule sync steps).

Trade-off: Manual periodic upstream refresh instead of automatic submodule updates.

### Updating Vendored Lighthouse

1. (Optional) Create a dedicated branch: `git checkout -b chore/lighthouse-sync-<version>`
1. Clone upstream separately (outside repo):

```powershell
git clone https://github.com/GoogleChrome/lighthouse.git lighthouse-upstream
```

1. Identify target tag or commit (e.g. `v12.3.0`).
1. In `lighthouse-upstream`, checkout that ref: `git checkout v12.3.0`.
1. Replace contents of our `lighthouse/` directory EXCEPT any local patch files:
   - Preserve: `build/build-bundle.js` custom zlib shim gating & import.meta path normalization patches.
   - Preserve: any added helper scripts (e.g. reset-link script) if not upstream.
1. Copy over updated upstream files (rsync/robocopy) overwriting existing ones.
1. Reapply local patches if overwritten (compare with git diff; re-add gating logic where necessary).
1. Run: `cd lighthouse && yarn install && yarn build-devtools` (ensure build still succeeds on Windows & \*nix).
1. Run root lint/tests to confirm no regressions.
1. Commit with message: `chore(lighthouse): sync to upstream v12.3.0` summarizing notable upstream changes (link release notes).

### Sync Script (Alternative Fast Path)

Instead of manual rsync, you can use the helper:

```powershell
node scripts/sync_lighthouse.mjs --ref v12.3.0 --preserve build/reset-link.js
```

Flags: `--ref <git-ref>` (default `latest`), `--dry-run`, repeatable
`--preserve <glob>` (minimatch) to skip overwriting local patches.

Post-sync checklist:

- [ ] Review `git diff` for unintended deletions
- [ ] Confirm `SYNC_METADATA.json` added/updated
- [ ] Re-apply zlib shim gating if upstream changed build scripts
- [ ] Run `npm run lh:build` (and optionally `lh:build:full`)
- [ ] Run root verification `npm run verify`

### Zlib Shim Gating Reference

Default build uses lightweight shims to exclude heavy inflate/deflate logic. To build with original zlib code (upstream parity / size comparison):

PowerShell:

```powershell
$env:LH_DISABLE_ZLIB_SHIMS=1; yarn build-devtools
```

Unix shells:

```bash
LH_DISABLE_ZLIB_SHIMS=1 yarn build-devtools
```

Document any bundle size deltas when posting PRs that adjust shim logic.

## Release Process

1. Ensure main is clean and up to date.
2. Run `npm run changelog:unreleased` and edit wording if needed.
3. Bump version in `package.json` (semver; patch unless public API additions).
4. Commit: `chore(release): vX.Y.Z` including updated `CHANGELOG.md`.
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` then push tag & main.
6. GitHub Action `release.yml` finalizes changelog & publishes Release.

If Action updates the changelog formatting, pull those changes locally before next work.

## Coverage Expectations

Coverage thresholds (enforced via Vitest config) are:
branches ≥85%, statements ≥85%, lines ≥85%, functions ≥85%.
When adding conditional branches (if/else, guard clauses), add focused tests
hitting both sides. Prefer unit-level tests over broad integration scope for
precision. If a change causes a dip below any threshold, add or refine tests in
the same PR rather than lowering targets.

To inspect current numbers:

```powershell
npm run coverage
```

If target dips below threshold, prioritize adding tests before feature work.

## Automation & Validation

The repository includes additional automation to keep quality gates enforceable:

- **Issue Forms**: Structured forms for bugs, features, and tasks (adds blueprint alignment, a11y & perf fields). Located in `.github/ISSUE_TEMPLATE/`.
- **PR Template Validation (`pr-validate.yml`)**: Fails the PR if the Blueprint
  Alignment checkbox is not checked. When perf-affecting files change (design
  tokens, Lighthouse configs, core src, bundle scripts) the action also requires
  the `## Performance / Lighthouse` section to be present.
- **Bundle Size Workflow (`bundle-size.yml`)**: Skips execution when no relevant
  files changed; otherwise attaches a JSON artifact and sticky comment
  summarizing DevTools (shim vs full) bundle size deltas.
- **Lighthouse Budgets**: Composite action posts key metrics & fails on defined budget overages (`lighthouse-budgets.yml`).

When adding new performance-impacting areas (e.g. large new asset pipelines),
extend the change detection heuristics in `pr-validate.yml` to ensure the
performance section remains mandatory.
