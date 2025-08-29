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

### Commit Message Rules

The repository enforces explicit length limits via commitlint:

- Header (first line / subject) max 100 characters
- Body lines max 100 characters (hard fail if exceeded)

General guidance:

1. Use a Conventional Commit type when it adds clarity: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`, `perf:`, `build:`, `ci:`.
2. Scope (optional) in parentheses for concentrated areas: `feat(search):`, `test(firebase):`.
3. Subject: imperative mood, no trailing period, describe what the change does (not what it did). Example: `fix(auth): handle token refresh race`.
4. Separate subject from body with a blank line.
5. Wrap body at 100 chars hard (match lint). Prefer semantic paragraphs over bullet noise.
6. Body should explain intent + rationale + any trade‑offs or follow‑ups; avoid restating diff.
7. Reference issues using `Closes #NN` (or `Refs #NN`) on a separate line near the end.
8. If change is large, list high‑level sections with prefixed hyphens (still wrapped ≤100 chars).
9. Do not include secrets, tokens, or internal URLs.
10. Use additional commits instead of amending once a review has started unless explicitly requested to squash.

Examples:

```text
feat(search): add incremental index rebuild command

Adds `scripts/reindex_incremental.mjs` which replays recent content changes into the
on-disk search index without a full rebuild. This keeps CI rebuild times under 2 minutes
for typical content edits. Falls back to full rebuild on schema hash mismatch.

Closes #142.
```

```text
test(firebase): add integration test & guard on missing token

Introduces `firebase.integration.test.mjs` validating the always-available `firebase/ping` method.
When `FIREBASE_TOKEN` is present it also exercises `firebase/projects` and `firebase/apps` to
ensure conditional method exposure remains stable. Removes unstable upstream filesystem wrapper
entry from `servers.json` to eliminate recurring smoke failure.
```

Common failure: body line >100 chars. If you encounter `body-max-line-length` errors, reflow the
paragraph rather than inserting arbitrary manual breaks mid‑phrase; keep each logical sentence or
clause <=100 chars. Editors: enable a 100‑column ruler. In VS Code settings JSON:

```json
"editor.rulers": [100]
```

Amending vs squash: For WIP on an unreviewed branch, feel free to amend / force-push to maintain a
clean history. After review comments, prefer additive commits so reviewers can see deltas; squash
only during merge if policy desires a single logical commit.

Changelog impact: Only `feat:` and `fix:` (and occasionally `perf:`) are considered for user-facing
release notes; others are grouped or omitted. Use these types judiciously.

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

> TODO / FIXME Handling: Upstream Lighthouse includes numerous `TODO:` and
> `FIXME:` markers that are intentionally left intact to simplify future syncs
> and avoid diverging from upstream context. Our workspace configuration
> (`.vscode/settings.json`) excludes the entire `lighthouse/` subtree from
> automated TODO scanning so these upstream markers do not surface as
> actionable local debt. Do not remove or reword upstream comments unless
> creating a patch we plan to propose upstream; otherwise the next sync will
> reintroduce them and generate churn.

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

Post-sync validation steps:

1. Review `git diff` for unintended deletions.
2. Confirm `SYNC_METADATA.json` added/updated.
3. Re-apply zlib shim gating if upstream changed build scripts.
4. Run `npm run lh:build` (optionally `lh:build:full`).
5. Run root verification `npm run verify`.

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

### Auto Merge Label Workflow

An `auto-merge` label enables a workflow that:

1. Validates a PR is non-draft, has at least one approval, no outstanding change requests, and is mergeable.
2. Enables GitHub's native auto‑merge (rebase) or merges immediately if all required status checks are already green.

Usage:

1. Obtain required review approvals.
2. Apply the `auto-merge` label (remove it to cancel automatic merging).
3. The workflow re-evaluates on new commits (`synchronize`) or label
   application. If protections (status checks) are still pending, it enables
   native auto‑merge; GitHub completes the merge once all pass.

Notes:

- If a reviewer requests changes, auto-merge pauses until the request is dismissed or a new approving review arrives.
- Rebase strategy keeps a linear history (single squashed commit scenarios stay
  intact). Adjust via `merge-method` in `.github/workflows/auto_merge.yml` if
  policy changes.
- Direct merge fallback runs only when all checks already succeeded; otherwise it relies on GitHub after enabling auto‑merge.

When adding new performance-impacting areas (e.g. large new asset pipelines),
extend the change detection heuristics in `pr-validate.yml` to ensure the
performance section remains mandatory.

#### Quality Gates (Coverage, Lighthouse, Tokens, Bundles)

When the `auto-merge` label is applied the workflow now executes a fast
verification bundle prior to enabling native auto‑merge:

1. Runs full test suite with coverage (`npm run coverage`).
1. Downloads artifacts (if present): previous coverage summary, Lighthouse assertions & diff, token deltas.
1. Enforces coverage minimums (defaults: statements 95, branches 90, functions 95, lines 95).
1. Optional coverage delta guard: set `GATE_MAX_COVERAGE_DROP_<METRIC>` (percent points) to fail if drop exceeds limit.
1. Enforces Lighthouse category minimums via `GATE_LH_CATEGORY_MIN_<CATEGORY>` (case-insensitive).
1. Optional metric regression guards (requires previous/current metrics in assertions):

- `GATE_LH_METRIC_MAX_LCP_DELTA_MS` (ms increase allowed)
- `GATE_LH_METRIC_MAX_CLS_DELTA` (absolute increase allowed)
- `GATE_LH_METRIC_MAX_TBT_DELTA_MS` (ms increase allowed)

1. Parses diff markdown; category score negative deltas beyond tolerance (`GATE_LH_CATEGORY_TOLERANCE`, default 0.01) fail.
1. Token growth gate (if `token-deltas.json` artifact available): soft warn when
   net > `GATE_TOKEN_MAX_NET` (default 800). Hard fail when added >
   `GATE_TOKEN_MAX_ADDED` ONLY if explicitly set (no default now; added tokens
   produce a warning noting lack of hard limit when unset). This supports data
   gathering before enforcing a ceiling.
1. Bundle size gate (if both `prev-bundle-sizes.json` & current `bundle-sizes.json` exist): optional limits

- `GATE_BUNDLE_MAX_TOTAL_DELTA_KB` (gzip KB increase across all files)
- `GATE_BUNDLE_MAX_FILE_DELTA_KB` (gzip KB increase for any single file)

When unset the script reports a warning (informational) but does not fail.

1. Fails if any error-level gate triggers; warnings are surfaced but non-blocking.

Override thresholds via env vars (examples):

```bash
GATE_MIN_STATEMENTS=96
GATE_MAX_COVERAGE_DROP_STATEMENTS=0.5
GATE_LH_CATEGORY_MIN_PERFORMANCE=0.93
GATE_LH_METRIC_MAX_LCP_DELTA_MS=150
GATE_LH_METRIC_MAX_CLS_DELTA=0.01
GATE_TOKEN_MAX_NET=700
# Uncomment only after baseline established
# GATE_TOKEN_MAX_ADDED=1500
# Bundle size (gzip KB) regression limits
# GATE_BUNDLE_MAX_TOTAL_DELTA_KB=30
# GATE_BUNDLE_MAX_FILE_DELTA_KB=10
# Lighthouse Interaction to Next Paint (INP) regression (ms)
# GATE_LH_METRIC_MAX_INP_DELTA_MS=100
```

Raise minima only after sustained stability; document rationale in PR & `decisionLog.md`.

If artifacts are missing (e.g. first run, skipped upstream job) the script
emits warnings and proceeds for that gate (coverage minima still enforced if
summary exists). Ensure producing workflows publish artifacts with stable
names: `lighthouse-assertions`, `prev-coverage-summary`, `token-deltas`.

##### Summary Comment & Artifact Normalization

Each gated PR receives (or updates) a sticky comment labeled `Quality Gate Summary`.
It consolidates the latest run's key metrics:

- Current & delta coverage (statements, branches, functions, lines)
- Token deltas (net / added / removed)
- Bundle total gzip size & delta plus largest single‑file gzip increase
- Lighthouse category scores and (when available) metric deltas (LCP, CLS, TBT, INP)

Previous artifacts may not exist early in adoption. The workflow normalizes by
copying the current bundle sizes to `prev-bundle-sizes.json` (report‑only) when
no explicit previous artifact is found—allowing deltas to surface as `0.00KB`
instead of omitting data. The gating script also searches multiple candidate
paths for previous coverage and bundle artifacts so naming drift or initial
bootstrap gaps do not cause hard failures; missing history results in warnings
only. This supports a data‑collection phase before enabling stricter delta
thresholds (coverage drop, bundle growth, INP regression, hard token added).

##### ChatOps Command

Comment `/auto-merge` on a pull request to apply the `auto-merge` label via
ChatOps workflow (`chatops_auto_merge.yml`). Remove the label to cancel. Gates
re-run on new commits or label events.

## Collaboration & Assistant Workflow

This project encodes an assistant collaboration model so automated agents can
operate safely:

- Structured Responses: Assistant replies follow stable sections (Answer, Steps, Alternatives, Action Plan) unless brevity warranted.
- Memory Bank: Architectural context & decisions live in `memory-bank/`.
  Update `decisionLog.md` for notable trade-offs; add durable patterns to
  `systemPatterns.md`.
- Accessibility Enforcement: Coverage HTML a11y fixes are applied
  post-generation by `scripts/fix_coverage_a11y.mjs`. Do not manually edit
  generated coverage output; rely on STRICT mode (`COVERAGE_A11Y_STRICT=1`).
- Coverage Guardrails: Thresholds and per-PR diff budget configured via env
  vars in `.env.example`. Add focused tests for each new conditional path;
  prefer narrow unit tests to broad integration for precision.
- Performance Budgets: Lighthouse budgets + bundle size delta comments gate
  regressions. Provide rationale when token growth warnings fire.
- Environment Variables: See `.env.example` for tunables. Never commit real
  tokens; populate locally or via CI secrets.
- Deterministic Tests: Avoid time/flaky sources. For intersection observers,
  use virtual timers & explicit observer callbacks. For scroll/focus, polyfill
  cautiously without mutating readonly DOM properties.
- Release Notes: Changelog sections generated & trimmed to current version by
  release workflow; keep Conventional Commit prefixes for clarity.
- Autonomy Loop: When assistants add capabilities (scripts, tests, governance
  rules) they must (1) document rationale in `decisionLog.md`, (2) codify
  reusable pattern in `systemPatterns.md`, (3) provide minimal diff & tests.

### Adding New Automation

1. Propose intent and success criteria in an issue referencing blueprint goals.
2. Ship a script or workflow that is idempotent and opt-in via env flags when possible.
3. Add docs snippet to this section or a dedicated README, plus decision entry.
4. Provide rollback instructions in PR description.

### Phase-Based Coverage Uplift Strategy

Coverage improvements proceed in small waves targeting highest uncovered branch clusters first (see `coverage/coverage-summary.json`). Each phase:

1. Identify top 2-3 files by uncovered branch percentage.
2. List specific logical branches (guard clause, fallback, deprecated path) still untested.
3. Add isolated tests; avoid broad snapshot coupling.
4. Re-run coverage; if < +0.5% branch delta, regroup before adding more.

Document start/end metrics in PR body for traceability.

## PR Self-Review Checklist

Before marking a pull request ready for review (or merging if self-approved),
walk through `docs/self_review_checklist.md` and ensure each applicable item is
checked off locally. This reduces reviewer churn and catches:

- Missing performance / Lighthouse section when token heuristic warns
- Coverage drops (add tests before requesting review)
- Accessibility regressions (skip link, focus management, motion preference)
- Oversized diffs that should be split into smaller PRs

If three or more items remain unchecked after first pass, pause and resolve
them rather than relying on reviewers to flag them. Document conscious
exceptions (with rationale) in the PR description under an `## Deviations`
section so reviewers can acknowledge and proceed.

> Note: Repository tooling excludes this file, the PR template, issue
> templates, and `project_instructions.md` from automated TODO/checkbox
> scanning (configured in `.vscode/settings.json`) to prevent process
> checklists from surfacing as unresolved development TODOs. Do not convert
> these procedural checklists to plain lists; they are intentionally
> interactive.
