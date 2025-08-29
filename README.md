# theporadas.com — Post‑Wedding Narrative & Video Site

Post‑wedding narrative & video experience. Primary hero video followed by curated
story sections in enforced order: Story → Rings → Wedding Party → additional
informational sections. Lightweight markdown-driven content pipeline + hash-based
in‑page navigation (no heavyweight SPA router) chosen for simplicity,
accessibility, and minimal bundle growth. Performance and governance are enforced
through custom token growth heuristic, Lighthouse budgets, bundle size
comparisons, and coverage diff gating.

> Validation PR: This line added to confirm baseline artifacts integration & sticky summary comment operation.

## Project Setup and Tooling

![CI Lint](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-lint.yml/badge.svg)
![CodeQL (gated)](https://github.com/bbasketballer75/theporadas_site/actions/workflows/codeql.yml/badge.svg)
![TypeScript](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-typecheck.yml/badge.svg)
![Tests](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-test.yml/badge.svg)
![Coverage Badge Job](https://github.com/bbasketballer75/theporadas_site/actions/workflows/coverage-badge.yml/badge.svg)
![Coverage](./.github/badges/coverage.svg)
![Coverage Diff](https://github.com/bbasketballer75/theporadas_site/actions/workflows/coverage-diff.yml/badge.svg)
![Lighthouse Budgets](https://github.com/bbasketballer75/theporadas_site/actions/workflows/lighthouse-budgets.yml/badge.svg)
![Bundle Size](https://github.com/bbasketballer75/theporadas_site/actions/workflows/bundle-size.yml/badge.svg)

> If the local badge has not yet been generated (first clone or before CI runs),
> view the latest workflow artifacts in **Actions → CI - Tests**.
> Optionally use a placeholder badge until the generated file exists:
> `![Coverage (placeholder)](https://img.shields.io/badge/coverage-pending-lightgrey)`.

Idempotent setup scripts + VS Code tasks prevent accidental global reinstalls and
tool drift.

### Toolchain Lock (Node / npm)

The repository pins the active Node.js runtime via `.nvmrc` for local + CI parity.

| Component | Version / Range       | Rationale                                                                             |
| --------- | --------------------- | ------------------------------------------------------------------------------------- |
| Node.js   | 22.18.0               | Matches CI matrix latest LTS + validated against tests & coverage                     |
| npm       | >=11 (current 11.5.2) | Resolves prior broken wrapper (missing `npm-prefix.js`); npm 11 doctor recommendation |

Quick usage:

```powershell
# Ensure correct version after cloning
nvm use
node -v   # expect v22.18.0
npm -v    # expect 11.x
```

If npm wrapper corruption recurs (e.g. MODULE_NOT_FOUND for `npm-prefix.js`):

1. Kill stray Node processes:

```powershell
taskkill /IM node.exe /F
```

1. Uninstall & reinstall Node version:

```powershell
nvm uninstall 22.18.0
nvm install 22.18.0
nvm use 22.18.0
```

1. (Optional) Upgrade npm to latest 11.x:

```powershell
npm install -g npm@latest
```

1. Re-verify:

```powershell
node -v
npm -v
npm run lint && npm test
```

Do not manually place files inside the NVM symlink target (`%LOCALAPPDATA%\nodejs`); let `nvm` manage its contents.

### Node PATH Troubleshooting (Windows)

If VS Code reports `Unable to find 'node' executable` even after running the setup tasks:

1. Run task: `Setup: Refresh Node PATH (session)` (adds concrete Node dir).
1. Open a new terminal then verify:

```powershell
where.exe node
node -v
```

1. If placeholders like `%NVM_HOME%` / `%NVM_SYMLINK%` appear in PATH and no concrete
   `C:\Users\<you>\AppData\Local\nodejs` segment is present, prepend it for the session:

```powershell
$env:PATH = "C:\\Users\\$env:USERNAME\\AppData\\Local\\nodejs;" + $env:PATH
```

1. (Optional) Persist: Add that directory to your User PATH via System Environment Variables.
1. Re-run `node -v` then `npx vitest --version` to confirm tooling.

`scripts/preflight.mjs` emits a warning if placeholders remain unexpanded.

#### Refresh Script Dry Run Mode

The helper script `scripts/refresh_node_path.ps1` normalizes PATH entries and, when
not in dry run, may invoke NVM to install / use a configured Node version. For
tests and CI we avoid side effects via the `-DryRun` switch which:

- Skips any `nvm install` / `nvm use` operations
- Still cleans placeholder segments (e.g. `%NVM_HOME%`, `%NVM_SYMLINK%`)
- Emits the same success / warning messages and adjusted PATH for the session

Examples:

```powershell
# Preview & normalize without altering installed Node versions
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/refresh_node_path.ps1 -DryRun

# Integrate into a one-off terminal session before running tests
pwsh -File ./scripts/refresh_node_path.ps1 -DryRun; node scripts/preflight.mjs --no-engines
```

Use DryRun in automated tests to guarantee deterministic behavior without
network or install latency while still validating placeholder cleanup logic.

## Content Model & Loader

Markdown files in `content/` define site sections via simple frontmatter +
limited markdown subset (only `##` headings and paragraphs). This constraint
keeps rendering deterministic and safe without a large markdown parser
dependency.

Frontmatter example:

```md
---
slug: story
title: Our Story
order: 10
hero: true
---

## How We Met

It started with...
```

Fields:

- `slug` (unique id, required)
- `title` (required)
- `order` (numeric ordering after core enforced trio: story, rings, wedding-party)
- `hero` (boolean, optional, only one section should set true)

Loader (`src/content/loader.ts`) pipeline:

1. `import.meta.glob` eager raw import of all `content/*.md`.
2. Regex splits frontmatter, parses `key: value` lines (no nested objects).
3. Escapes HTML and converts allowed markdown patterns (`##` → `<h2>` with injected id, blank-line paragraph grouping).
4. Caches parsed array for subsequent calls.
5. Enforces ordering: predefined required order for the first three narrative sections, then ascending numeric `order`.

APIs:

- `getAllContent()` → full ordered list
- `getContentBySlug(slug)`
- `getNonHeroSections()`

Adding a section:

1. Create `content/<slug>.md` with frontmatter.
2. Choose an `order` not colliding (tests will flag structural regressions).
3. Run `npm test` to confirm ordering + accessibility expectations.
4. If large text increases token counts, include rationale in PR Performance section.

## Hash Navigation & Accessibility

Navigation uses plain hash anchors (e.g. `#story`). The `useHashNavigation`
hook:

1. Detects initial hash and later `hashchange` events.
2. Queries the element, adds temporary `tabIndex="-1"` if needed.
3. Focuses and smooth-scrolls (unless reduced motion preference / toggle).
4. Removes temporary tabindex.

Sections render with `role="region"` and `aria-labelledby` referencing their
injected heading ID, improving assistive tech landmark navigation and
contextual announcements.

Skip link targets the main container and programmatically sets focus for
consistent keyboard user experience.

Reduced motion preference is applied globally via `data-motion` attribute to
suppress non-essential animation and smooth scrolling where appropriate.

## Performance Token Heuristic

Workflow `pr-validate.yml` marks perf-affecting changes when files in `src/`,
Lighthouse configs, or bundle scripts change. On such PRs it:

- Counts alphanumeric tokens pre vs post for changed JS/TS files.
- Outputs `total_added`, `total_removed`, `net_delta`.
- Warns if `net_delta > MAX_NET_TOKEN_DELTA` (default 800).
- Fails if `total_added > MAX_ABS_TOKEN_ADDED` (default 1600).
- Requires `## Performance / Lighthouse` section in PR body (error if omitted).
- Posts sticky summary comment with token delta metrics.

Environment overrides: `MAX_NET_TOKEN_DELTA`, `MAX_ABS_TOKEN_ADDED`.

Rationale: Cheap static signal to spotlight bundle risk early before deeper
Lighthouse / bundle-size workflows run.

## Coverage Diff Environment Variables

`scripts/coverage_diff.mjs` compares current coverage versus base (default
`origin/main`). Adjustable percentages (allowed drop magnitudes):

- `MAX_STATEMENT_DROP` (default 0.5)
- `MAX_BRANCH_DROP` (default 1.0)
- `MAX_FUNCTION_DROP` (default 0.5)
- `MAX_LINE_DROP` (default 0.5)
- `PER_FILE_WARN_DROP` (default 2.0) – warn icon when file statement % drops
  beyond this
- `PER_FILE_FAIL_DROP` (default 9999) – set lower to enforce hard per-file
  guard

Artifacts: `coverage-diff.md` (markdown) and `coverage-diff.json` (machine
readable). Exit codes: 2 for totals regression, 3 for per-file exceeding fail
threshold.

## Project Blueprint (Source of Truth)

See `.github/project_instructions.md` for architecture, scope, standards, and success
criteria. For detailed full-text & facet search design and indexing workflow, consult
`docs/search_architecture.md` (includes data model, tokenizer choices, index update
strategies, and testing patterns). If this README conflicts with the blueprint or
search doc, defer to the blueprint first, then open a PR to reconcile.

---

## Workflow Governance Verifier

Script: `scripts/verify_workflows.mjs` enforces parity & policy between local
`.github/workflows` and the remote repository workflows (GitHub REST).

Features:

- Diff key: `--key path|name|both` (default `path`).
- Required workflows: `--require name1,name2` (names or paths).
- Ignore dynamic remote-only entries: `--ignore pattern1,pattern2` (exact or glob `*` `?`).
- Name differences policy: `--name-diff-severity warn|fail|ignore` (when `path` key used; reports differing display names for same file).
- Fail on path mismatches: `--fail-missing` (otherwise informational).
- Remote list caching: `--cache-remote --cache-ttl 600` (seconds).
- Deterministic offline / test mode: `--remote-json file.json` (bypasses repo & network).
- Artifacts: `workflows-verify.json` + `workflows-verify.md` (default `artifacts/` or `--output dir`).
- Step summary emission inside GitHub Actions if `GITHUB_STEP_SUMMARY` set.

Exit codes:

| Code | Meaning                                           |
| ---- | ------------------------------------------------- |
| 0    | Success (only warnings allowed)                   |
| 2    | Remote access / auth error                        |
| 3    | Required workflows missing                        |
| 4    | Path mismatches with `--fail-missing`             |
| 5    | Name differences with `--name-diff-severity=fail` |

Optional config file: `.github/workflow-verify.json` (fields: `key`, `ignore`,
`require`, `outputDir`, `nameDiffSeverity`, `cacheTTL`). CLI flags override.

Examples:

```powershell
# Governance in CI (warn on name diffs, fail on path mismatches, ignore previews)
node scripts/verify_workflows.mjs --require "CI Pipeline,Security Scan" --ignore "*preview*" --fail-missing --name-diff-severity warn

# Offline test / simulation (uses fixture instead of API)
node scripts/verify_workflows.mjs --remote-json test/fixtures/workflows_remote.json --key path

# Enable remote caching (5 min TTL)
node scripts/verify_workflows.mjs --cache-remote --cache-ttl 300
```

Tip: Add new workflow files both locally and in the remote repo within the same PR to avoid transient failures when `--fail-missing` is active.

---

## Dev Environment

Use VS Code integrated terminal for reproducibility.

### One-time Setup Tasks

Run via Command Palette (Ctrl+Shift+P → "Tasks: Run Task"):

| Task                                     | Purpose                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| Setup: Check tools                       | Prints versions; no installs                                 |
| Setup: Install (Admin)                   | Elevates; installs any missing tools globally or system-wide |
| Setup: Install missing tools (Non-Admin) | User-scope installs only                                     |

### Profile Fix (uv completions)

If startup errors mention `uv` completions:

```powershell
pwsh -NoProfile -File scripts/fix_profile_uv.ps1      # current host only
pwsh -NoProfile -File scripts/fix_profile_uv.ps1 -AllHosts
```

Reopen terminals afterwards.

### Direct Script Invocation

```powershell
# Check only (no installs)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1
```

Guidelines:

- Prefer WinGet for global tooling
- Use Corepack/NVM for Node + pnpm

### PATH Guidance (Windows)

Ensure the following appear (User variables) if Node tooling not found:
`%APPDATA%\npm`, `%LOCALAPPDATA%\nodejs`, or NVM directory (`C:\nvm4w\nodejs`).

Quick check:

```powershell
where.exe node
where.exe npm
where.exe npx
```

---

## ESLint & Tooling

- ESLint 9 flat config (`eslint.config.js`)
- Zero-warnings enforced (`--max-warnings=0`)
- Husky 9 + lint-staged pre-commit (ESLint + Prettier)
- Strict TypeScript; CI typechecks Node 18/20/22

Key scripts:

```powershell
npm run lint
npm run typecheck
npm run format
npm run coverage
npm run lighthouse      # Local desktop Lighthouse run
npm run validate:video  # ffprobe validation
changelog:unreleased    # regenerate unreleased section in CHANGELOG.md
changelog:release       # finalize changelog for current version (run at tag)
changelog:print         # print full conventional log to stdout
test:a11y:best          # Observational axe best-practice subset (writes JSON artifact)
a11y:best:enforce       # Reads artifact; set A11Y_BEST_ENFORCE=1 to fail on thresholds
```

---

## VideoPlayer Component API

Higher-level wrapper over `<video>` adding multi-source logic, chapters, tracks, adaptive heuristic, and instrumentation.

### MCP Basic Usage

```tsx
import { VideoPlayer } from './src/components/VideoPlayer/VideoPlayer';

<VideoPlayer src="/media/sample.mp4" caption="Sample" placeholderLabel="Loading video" />;
```

### Props

| Prop               | Type                            | Req  | Description                                                 |
| ------------------ | ------------------------------- | ---- | ----------------------------------------------------------- |
| `src`              | `string`                        | No\* | Single source (exclusive with `sources` / `qualitySources`) |
| `sources`          | `VideoSource[]`                 | No\* | Format fallback list                                        |
| `qualitySources`   | `QualitySource[]`               | No\* | Tiered sources (height/bitrate); overrides `src`/`sources`  |
| `tracks`           | `VideoTrackDef[]`               | No   | Text tracks (captions/subtitles)                            |
| `chapters`         | `ChapterDef[]`                  | No   | Chapter navigation metadata                                 |
| `showChapters`     | `boolean`                       | No   | Force empty chapter list UI                                 |
| `placeholderLabel` | `string`                        | No   | Accessible label before metadata loads                      |
| `caption`          | `string`                        | No   | Short caption below player                                  |
| `onEvent`          | `(e: VideoPlayerEvent) => void` | No   | Instrumentation callback                                    |

### Event Model

```ts
type VideoPlayerEvent =
  | { type: 'ready'; duration: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeupdate'; currentTime: number; duration: number; chapter?: ChapterDef }
  | { type: 'ended' }
  | { type: 'seeked'; currentTime: number }
  | { type: 'error'; message?: string };
```

### Chapters

```ts
interface ChapterDef {
  start: number;
  end?: number;
  title: string;
}
```

Reopen terminals afterwards.

### Sources & Quality Sources

### Local SQL Server (Development Only)

The project includes optional local SQL Server support for experimentation /
future dynamic features.

Docker service: `docker-compose.yml` defines an `mssql` container (Developer
edition) exposed on host port `14333` (mapped to container `1433`). Data
persists in the named volume `mssql_data`.

Scripts:

```powershell
# Start / stop database
npm run db:up      # docker compose up -d mssql
npm run db:down    # docker compose down -v (removes volume)

# Seed (idempotent) – creates minimal Guest table & sample rows if empty
npm run db:seed
```

Environment:

Set `SQLSERVER_CONNECTION_STRING` in your `.env` (or shell) before seeding /
querying, e.g.:

```bash
SQLSERVER_CONNECTION_STRING=Server=localhost,14333;Database=theporadas;User Id=sa;Password=LocalStrong!Passw0rd;Encrypt=true;TrustServerCertificate=true
```

> The compose file sets only `MSSQL_SA_PASSWORD`. You still need to create the
> target database (`theporadas` above) if it does not yet exist. Extend the seed
> script to auto-create with:
>
> ```sql
> IF DB_ID('theporadas') IS NULL CREATE DATABASE theporadas;
> ```

### Resilient Query Client

`SqlRetryClient` (`src/db/retryClient.ts`) wraps `mssql` with transient error
retry (exponential backoff + jitter). Transient codes covered include: 40613,
40197, 40501, 4060, 49918, 49919, 49920, 11001 plus message heuristics for
timeouts / deadlocks / connection issues.

Usage example:

```ts
import { createClientFromEnv } from './src/db/retryClient.js';

const client = await createClientFromEnv();
const guests = await client.query<{ Id: number; Name: string }>('SELECT Id, Name FROM Guest');
await client.close();
```

Retry Defaults: max 5 attempts, base delay 250ms, factor 2, max delay 8s, full
jitter (half-range distribution). Adjust by constructing:

```ts
new SqlRetryClient(config, { maxRetries: 3, baseDelayMs: 100 });
```

Seed Script: `scripts/db/seed.ts` uses the retry client and is safe to re-run (skips inserting sample rows if already present).

Production Note: For Azure SQL serverless, keep `Encrypt=true` (default) and
consider lowering `maxRetries` once cold start frequency is measured.
Centralize connection string management in deployment secrets, not committed
files.

Security: Do not check real credentials into `.env.example`. Use strong `sa`
password locally; rotate / disable default accounts in any non-dev
environment.

To remove all local SQL artifacts: run `npm run db:down` (this drops the volume) then delete any `.mdf` you created outside the container.

```ts
interface VideoSource {
  src: string;
  type?: string;
}
interface QualitySource extends VideoSource {
  height: number; // 1080, 720 ...
  bitrateKbps?: number; // avg bitrate
  label?: string; // "1080p"
  default?: boolean;
}
```

Adaptive heuristic:

1. Sort by height desc
2. Derive target from `window.innerHeight` (>=900→1080, >=720→720, >=540→540 else 480)
3. Respect `navigator.connection.saveData` (clamp ≤480)
4. Filter sources ≤ target (fallback to smallest if none)
5. If `navigator.connection.downlink` present, prune candidates with `bitrateKbps` above `(downlink * (saveData?0.6:0.85)) Mbps`
6. Select highest remaining

Result: single `<video src>` (avoids redundant `<source>` HEAD requests). Future improvements may explore mid-play adaptive switching.

### Tracks

```ts
interface VideoTrackDef {
  src: string;
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  srclang?: string;
  label?: string;
  default?: boolean;
}
```

### Accessibility

- `placeholderLabel` announces loading state
- Chapters use `aria-current="true"` for active item
- Provide `srclang` + `label` on tracks

### Testing Notes

- Mock `onEvent` and assert ordered events
- Simulate `timeupdate` via `video.currentTime` mutation + dispatch
- Chapter boundary tests ensure correct active chapter

---

## LazyVideoPlayer Wrapper

Mounts underlying `VideoPlayer` lazily using `IntersectionObserver`.

```tsx
import { LazyVideoPlayer } from './src/components/VideoPlayer/LazyVideoPlayer';

<LazyVideoPlayer
  caption="Feature Clip"
  placeholderLabel="Preparing video"
  qualitySources={[
    { src: '/media/encoded/feature-480.mp4', height: 480 },
    { src: '/media/encoded/feature-720.mp4', height: 720 },
    { src: '/media/encoded/feature-1080.mp4', height: 1080 },
  ]}
/>;
```

Additional props:

| Prop          | Type     | Default   | Description                  |
| ------------- | -------- | --------- | ---------------------------- | ------------------------- |
| `rootMargin`  | `string` | `200px`   | Observer margin for prefetch |
| `threshold`   | `number  | number[]` | `0`                          | Intersection threshold(s) |
| `aspectRatio` | `string` | `16/9`    | Placeholder layout stability |

Tests shim `IntersectionObserver` for synchronous render (see `vitest.setup.ts`).

---

## Accessibility & Performance Foundations

- Skip link: First interactive element in `index.html`
  (`<a class="skip-link" href="#appShell">`). It is visually hidden
  (off‑canvas via `transform`) until focused; on focus it slides into view
  with a high‑contrast background per WCAG 2.4.1 (Bypass Blocks) best
  practice. Styles live in `designSystem.css`.
- Focus management: Helper (`src/skipLinkFocus.ts`) listens for `hashchange`
  and skip‑link clicks to programmatically focus `#appShell` (role="main",
  `tabIndex="-1"`) ensuring keyboard / assistive tech users land inside the
  main region even in browsers that only scroll without moving focus.
- Reduced Motion toggle updates `data-motion` on `<html>` and is respected by components & scroll snapping (disabled under reduce preference).
- Automated accessibility test (`axe-core`) in
  `test/accessibility.test.tsx` validates zero violations and includes a
  skip‑link focus visibility assertion.
- Performance budgets (`lighthouserc.json`): LCP < 2000ms, CLS < 0.02, TBT < 200ms, script gz < 90KB, stylesheet < 12KB, hero image < 180KB.
- Lighthouse CI GitHub Action enforces budgets on PRs.

---

## Phase 1.5 – Video Ingestion (Planned)

See `docs/video/video_ingestion_overview.md` & `docs/video/encoding_recipes.md` for ladder, FFmpeg commands, and ingestion strategy.

Success criteria include: budgets hold, captions & chapters accessible, reproducible encoding commands.

---

## Media Validation (ffprobe)

`npm run validate:video` inspects `src/video/registry.ts` entries (matching `/media/*.mp4`) and validates with `ffprobe`:

- Exists on disk (`media/encoded/...`)
- Detectable video stream
- Codec in allowed set (h264, hevc, av01, vp9 by default)
- Dimensions ≤ 3840x2160 and even

Exit codes: `0` pass, `1` failures, `2` missing `ffprobe`.

Install FFmpeg (Windows): `winget install --id=Gyan.FFmpeg --source=winget`

Extend logic in `scripts/validate_video.mjs` (e.g., bitrate ceilings, track requirements).

---

## Lighthouse Subrepo (Windows Internal Build)

The vendored `lighthouse/` source can build DevTools bundle on Windows with applied cross-platform patches:

```powershell
cd lighthouse
yarn build-devtools
```

Convenience root scripts:

```powershell
# Shimmed (default smaller bundle)
npm run lh:build

# Full (disable shims to include original zlib paths for parity testing)
npm run lh:build:full

# Compare sizes (raw + gzip) and emit lighthouse_bundle_sizes.json artifact
npm run lh:compare
```

Adjustments:

- Path normalization for i18n and injected `import.meta.url` (avoids escaped backslash syntax errors)
- Zlib polyfill shims (`__zlib-lib/*`) stub out heavy inflate/deflate code
- Import ignore list for unused Node-specific modules
- Optional: disable shims via `LH_DISABLE_ZLIB_SHIMS=1` to restore original zlib
  code (larger bundle, for upstream parity tests; default when unset is shims
  ENABLED)

Result: build succeeds with only benign `import.meta` IIFE warnings.

---

## Release & Changelog Workflow

Changelog automation uses Conventional Commits parsing (Angular preset).

Typical flow:

```powershell
# 1. Ensure working tree clean and on main
git switch main
git pull --ff-only

# 2. Update unreleased notes (rewrites CHANGELOG.md in-place)
npm run changelog:unreleased

# 3. Review / optionally edit prose (keep style consistent)

# 4. Bump version in package.json if needed (patch/minor)
vim package.json  # or editor UI

# 5. Commit changelog + version bump
git add CHANGELOG.md package.json
git commit -m "chore(release): v0.1.1"

# 6. Create annotated tag (triggers release workflow)
git tag -a v0.1.1 -m "v0.1.1"
git push origin main --follow-tags
git push origin v0.1.1
```

GitHub Action `.github/workflows/release.yml` runs on tag push:

- Re-runs `changelog:release` to ensure final section formatting
- Generates GitHub Release notes
- Publishes the release

If the workflow updates `CHANGELOG.md` (e.g., slight formatting), it commits back to main.

### Unreleased Section Hygiene

Run `npm run changelog:unreleased` frequently to avoid large diffs. Squash commits are acceptable if their message retains the conventional prefix.

---

## Coverage Targets & Badge

Branch coverage target: ≥85% (current >86%). CI enforces no regression by
failing if below threshold (enforced in test assertions; future can add
Vitest threshold config when desired).

Badge generation:

```powershell
npm run coverage         # produces ./coverage/* including coverage-summary.json
npm run coverage:badge   # reads summary -> .github/badges/coverage.svg
```

Accessibility: Upstream Istanbul occasionally emits empty header cells for
auxiliary metric columns. Post-generation script `scripts/fix_coverage_a11y.mjs`
automatically ensures every `<th>` has descriptive text (axe `empty-table-header`
rule). This runs as part of `npm run coverage` (no manual action required).

### Coverage Report Accessibility (Recursive Patch & Enforcement)

The post-processing script now recursively scans every `coverage/**/index.html` summary
table (not just the root) and inserts accessible labels for any empty `<th>` cells with
these `data-col` values:

| data-col         | Injected Label |
| ---------------- | -------------- |
| `pic`            | Coverage Chart |
| `statements_raw` | Statements Raw |
| `branches_raw`   | Branches Raw   |
| `functions_raw`  | Functions Raw  |
| `lines_raw`      | Lines Raw      |

Environment variables controlling behavior:

| Var                    | Effect                                                                    | Default |
| ---------------------- | ------------------------------------------------------------------------- | ------- |
| `COVERAGE_A11Y_STRICT` | When `1/true`, script exits non-zero if any targeted header remains empty | off     |
| `COVERAGE_A11Y_SILENT` | When `1/true`, suppresses informational logs (warnings still on errors)   | off     |
| `COVERAGE_HTML`        | Override single HTML file path (used in tests)                            | unset   |

Idempotent: Re-running makes no further modifications once labels present. STRICT mode is applied
in coverage-related CI jobs to prevent regressions.

Note: If you invoke coverage generation directly via `vitest run --coverage` (bypassing
`npm run coverage`), the post-processing script will not execute and some header cells will appear
empty. Always prefer `npm run coverage` locally to mirror CI behavior and ensure accessible header
labels are applied. You can manually fix an already generated report by running:

```powershell
node scripts/fix_coverage_a11y.mjs
```

### Axe Scan Workflow

Workflow `coverage-axe-scan.yml` generates coverage (with STRICT header enforcement) then runs an
`@axe-core/cli` scan against the root coverage summary table:

```bash
npx axe --exit file://$PWD/coverage/index.html --include 'table.coverage-summary'
```

`--exit` causes a non-zero exit code on violations, failing the job. This independent scan catches
any future structural regressions in the static HTML beyond header text (e.g., landmark or contrast
issues in upstream template updates).

Local on-demand check (optional):

```powershell
npm run coverage
npx @axe-core/cli --exit file://$PWD/coverage/index.html --include 'table.coverage-summary'
```

If adding new Istanbul versions or altering coverage generation, verify headers remain labeled and
axe scan stays green before merging.

Commit the updated badge if numbers change meaningfully. For PRs, ensure new
logic is accompanied by targeted tests (avoid accidental uncovered branches).
Prefer focused tests over broad snapshotting.

### Pull Request Coverage Diff

CI workflow `coverage-diff` runs on PRs, generating a markdown table comparing
base (main) vs current coverage. Allowed drops (env overridable):

| Metric     | Max Drop |
| ---------- | -------- |
| Statements | 0.5%     |
| Branches   | 1.0%     |
| Functions  | 0.5%     |
| Lines      | 0.5%     |

Failing thresholds exit non‑zero and block merge. See script `scripts/coverage_diff.mjs`.

---

## Lighthouse Budgets (PR Enforcement)

Workflow `lighthouse-budgets` builds the production bundle, serves it, and runs
Lighthouse with `lighthouse-budgets.json`. Exceeding any resource size or timing
budget fails the job. Summary metrics (FCP, LCP, TBT, CLS, Speed Index) and any
individual overages (resource or timing) are commented to the PR. Overages also
emit GitHub error annotations for rapid triage. Implementation lives in a
reusable composite action at `./.github/actions/lighthouse-budgets`.

Adjust budgets in `lighthouse-budgets.json` (sizes in KB, timings ms except CLS).

### Lighthouse Snapshot & Diff (Schema v2)

Two helper scripts manage lightweight Lighthouse state for PR review:

| Script                      | Purpose                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| `scripts/lhci_snapshot.mjs` | Generate JSON snapshot of key category scores, selected audits, and core metrics |
| `scripts/lhci_diff.mjs`     | Compare two snapshots; emit markdown with collapsible sections & schema notice   |

Schema v2 shape:

```jsonc
{
  "schemaVersion": 2,
  "categories": { "performance": 0.97, "accessibility": 1, ... },
  "audits": { "unused-css-rules": { "score": 0, "numericValue": 1234 }, ... },
  "metrics": {
    "LCP": { "numericValue": 2123, "score": 0.92 },
    "FCP": { "numericValue": 812, "score": 0.99 },
    "CLS": { "numericValue": 0.01, "score": 1 },
    "TBT": { "numericValue": 55, "score": 1 },
    "SI": { "numericValue": 1350, "score": 0.98 }
  },
  "meta": { /* run metadata (url, fetchTime, etc.) */ }
}
```

Notes:

- Metrics subset focuses on core UX indicators; not all Lighthouse metrics are persisted to keep snapshot diff concise.
- `audits` currently retains selective failing / non-perfect audits (scope may narrow later to reduce churn).
- Adding new fields triggers a schema bump; diff output prints a banner
  when versions differ but remains backward tolerant (only a notice, no
  failure).

Diff Markdown Structure (example headings):

```md
### Lighthouse Assertions Diff

⚠️ Schema changed (1 → 2): new metrics section added

<details open><summary><strong>Category Score Changes</strong></summary>
...table...
</details>
<details open><summary><strong>Key Metrics</strong></summary>
...table with numeric & score deltas + emojis...
</details>
<details><summary><strong>Changed / Added / Removed Audits</strong></summary>
...lists...
</details>
```

Emoji semantics:

| Symbol | Meaning                                                |
| ------ | ------------------------------------------------------ |
| ⬆️     | Improvement (positive delta good or lower time metric) |
| ⬇️     | Regression                                             |
| ➖     | No material change                                     |

Future roadmap (tracked in decision log): threshold-based failure on metric regressions, multi-run variance smoothing, historical sparklines.

---

## Lighthouse DevTools Bundle Size Gate

Workflow `bundle-size` builds the shimmed & full DevTools bundles (vendored
`lighthouse/`) and enforces minimum positive deltas (ensuring shim still
meaningfully reduces size). Artifact `lighthouse_bundle_sizes.json` is uploaded;
PR comment includes a human‑readable markdown table (generated by
`scripts/bundle_size_table.mjs`) summarizing raw & gzip sizes plus deltas.

Threshold env vars (tune in workflow file):

| Var                       | Meaning                           | Default |
| ------------------------- | --------------------------------- | ------- |
| `LH_MIN_GZIP_DELTA_BYTES` | Min gzip byte delta (full - shim) | 1       |
| `LH_MIN_GZIP_DELTA_PCT`   | Min gzip % delta                  | 0.01    |
| `LH_MIN_RAW_DELTA_BYTES`  | Min raw byte delta                | 1       |
| `LH_MIN_RAW_DELTA_PCT`    | Min raw % delta                   | 0.01    |

---

## Visual Regression Testing

Playwright harness (`playwright.config.ts`, tests under `pw-tests/`) performs basic
cross‑browser visual assertions. On first run missing snapshots are generated
locally with:

```powershell
npx playwright test --update-snapshots
```

CI `visual-regression` workflow installs browsers, builds site, starts preview,
and runs tests across Chromium, Firefox, WebKit. Failures upload traces & diffs.

### Baseline Snapshot Restoration (PRs)

For pull requests the workflow attempts to download the latest successful
`playwright-snapshots` artifact from the `main` branch and restore it into
`pw-tests/__snapshots__` before tests run. If no baseline exists yet, snapshots
are generated fresh; once merged to `main` a new baseline artifact is published.

Local ad‑hoc visual test run (excluded from core `verify` for speed):

```powershell
npm run verify:visual
```

This script runs Playwright if available and skips quietly if browsers or deps
are missing, preserving fast local iteration.

To add a new snapshot test:

```ts
import { test, expect } from '@playwright/test';
test('header renders', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header');
  await expect(header).toHaveScreenshot('header.png');
});
```

Use smaller scoping locators to reduce flake risk; prefer deterministic states
(await animations to settle or set `prefers-reduced-motion` if needed).

---

## Lighthouse Sync Script

Script: `scripts/sync_lighthouse.mjs`

Purpose: Refresh selected upstream Lighthouse directories while preserving local patches (Windows build shims, custom reset-link script, etc.).

Usage examples:

```powershell
# Dry run against latest release tag
node scripts/sync_lighthouse.mjs --dry-run

# Sync a specific tag preserving local build script and docs
node scripts/sync_lighthouse.mjs --ref v12.3.0 --preserve build/reset-link.js --preserve 'docs/**'

# Sync a branch (e.g., main) actually writing files
node scripts/sync_lighthouse.mjs --ref main
```

Flags:

- `--ref <git-ref>`: tag / commit / branch. Special value `latest` (default)
  resolves latest release tag via remote refs.
- `--dry-run`: lists copy plan, no writes.
- `--preserve <glob>`: minimatch pattern relative to `lighthouse/` to skip.
  Repeatable.

Writes `lighthouse/SYNC_METADATA.json` with `{ref,date}` on real sync.

Preconditions: git available, clean working tree (warns if dirty), outbound network permitted.

Review the diff after syncing and re-apply any required patch adjustments (especially around zlib shim gating) before committing.

---

## Reset-Link Script Fallback

`lighthouse/build/reset-link.js` now detects yarn. If absent and environment
variable `USE_NPM_LINK` is set (non-empty), it falls back to `npm link`
semantics. Use when contributors lack yarn globally.

Example:

```powershell
SET USE_NPM_LINK=1
node lighthouse/build/reset-link.js
```

Logs are prefixed with `[reset-link]` and clearly show which package manager path was taken.

---

---

## MCP Configuration Examples

GitHub hosted server:

```json
{
  "servers": { "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp/" } }
}
```

Stripe (secure key prompt):

```json
{
  "inputs": [
    {
      "id": "stripe_api_key",
      "type": "promptString",
      "description": "Stripe API Key",
      "password": true
    }
  ],
  "servers": {
    "stripe": {
      "type": "http",
      "url": "https://api.stripe.com/mcp/",
      "headers": { "Authorization": "Bearer ${input:stripe_api_key}" }
    }
  }
}
```

---

## Dockerized MCP Services

The repository provides containerized Model Context Protocol (MCP) servers for
local development and experimentation. All services are defined in
`docker-compose.yml` and built from either `Dockerfile.mcp` (Node-only) or
`Dockerfile.mcp-python` (adds Python runtime).

### MCP Service Inventory

| Service     | Container         | Script                        | Purpose                             | Key Env Vars                        |
| ----------- | ----------------- | ----------------------------- | ----------------------------------- | ----------------------------------- |
| Tavily API  | `mcp-tavily`      | `scripts/mcp_tavily.mjs`      | Web search                          | `TAVILY_API_KEY`                    |
| Notion API  | `mcp-notion`      | `scripts/mcp_notion.mjs`      | Notion content access               | `NOTION_API_KEY`                    |
| Mem0        | `mcp-mem0`        | `scripts/mcp_mem0.mjs`        | External memory API                 | `MEM0_API_KEY`                      |
| SQL Server  | `mcp-sqlserver`   | `scripts/mcp_sqlserver.mjs`   | Query local MSSQL (`mssql` service) | `SQLSERVER_HOST/PORT/USER/PASSWORD` |
| Filesystem  | `mcp-fs`          | `scripts/mcp_filesystem.mjs`  | Read/write sandboxed FS             | `MCP_FS_ROOT` (mapped volume)       |
| Memory Bank | `mcp-memory-bank` | `scripts/mcp_memory_bank.mjs` | Simple file-backed memory           | `MCP_MEMORY_BANK_DIR`               |
| KG Memory   | `mcp-kg`          | `scripts/mcp_kg_memory.mjs`   | In-memory knowledge graph           | `MCP_KG_MAX_TRIPLES`                |
| Python Exec | `mcp-python`      | `scripts/mcp_python.mjs`      | Sandboxed short Python code runs    | `MCP_PY_TIMEOUT_MS`                 |
| Supervisor  | `mcp-supervisor`  | `scripts/mcp_supervisor.mjs`  | Multi-server aggregator (subset)    | `SUPERVISED_SERVERS`                |

### Basic Usage

Build everything:

```powershell
docker compose build
```

Start (detached):

```powershell
docker compose up -d
```

Status & logs:

```powershell
docker compose ps
docker compose logs -f mcp_filesystem
```

Rebuild a single service after code changes:

```powershell
docker compose build mcp_filesystem && docker compose up -d mcp_filesystem
```

### Healthchecks

Local MCP services now use a slightly stronger liveness probe: script file
exists AND PID 1 is the `node` process. For deeper readiness (e.g., initial
warmup) you can later swap to a JSON-RPC ping wrapper.

### Profiles

Compose profile `mcp-local` gates purely local experimental MCP containers
(`mcp_filesystem`, `mcp_memory_bank`, `mcp_kg_memory`, `mcp_python`). Start only
core remote/API backed services:

```powershell
docker compose up -d mcp_tavily mcp_notion mcp_mem0 mcp_sqlserver
```

Start all MCP services including local experimental ones:

```powershell
docker compose --profile mcp-local up -d
```

### Configuration

Place secrets in a `.env` file (not committed) or export inline:

```env
TAVILY_API_KEY=your-key
NOTION_API_KEY=secret
MEM0_API_KEY=secret
```

Optional tuning:

```env
MCP_KG_MAX_TRIPLES=10000
MCP_PY_TIMEOUT_MS=5000
```

### Filesystem Sandbox

`mcp_filesystem` mounts `./mcp_fs_sandbox` to `/data/fs` (`MCP_FS_ROOT`). Editing locally reflects instantly inside the container.

### Supervisor Notes

`mcp_supervisor` currently supervises: `tavily,notion,mem0,sqlserver`.
Local-only experimental services (filesystem, memory bank, kg, python) run
independently for isolation. Extend `SUPERVISED_SERVERS` if you prefer
aggregation.

### Troubleshooting

- Restart loop: check `docker compose logs <service>`; ensure keep-alive code present (already included in images).
- Auth errors: confirm environment variables loaded; re-run `docker compose up -d` after adding `.env`.
- Code not updating: you likely forgot to rebuild (`docker compose build <service>`).

### Future Enhancements (Optional)

- Compose profiles for selective startup
- Active healthchecks (JSON-RPC ping)
- Persistent backing store for knowledge graph

---

## Contributing

1. Branch from `main`
2. Keep PRs focused and small
3. Ensure: lint (0 warnings) + tests + typecheck + coverage unchanged/non-regressive
4. For Windows-specific fixes include rationale and cross-platform notes

## Security & Dependency Automation

Automated supply‑chain & code scanning layers:

- Dependabot: Daily `npm` plus weekly `github-actions` updates (`.github/dependabot.yml`). Grouped minor/patch for npm, max 5 open PRs per ecosystem.
- CodeQL: Static analysis of JS/TS on push/PR + weekly schedule (`codeql` workflow) with security & quality queries.
- Weekly Audit: `weekly-audit` workflow runs `npm audit --json` and
  `scripts/ci_audit_guard.mjs` to fail on new or escalated moderate+
  production vulns compared to `security/audit-baseline.json`.
- Audit Guard Script: Filters dev dependencies (unless `AUDIT_ALLOW_DEV=1`),
  supports threshold override (`AUDIT_FAIL_LEVEL`). Exit code 1 blocks merge
  when violations found.
- Documentation: Accepted residual low tooling-only findings & rationale in `SECURITY_NOTES.md`.

Operational guidance:

- Prefer small, focused upgrade PRs (especially major) for clearer review & rollback.
- If audit guard fails due to newly published advisory, update dependencies or
  (temporarily) add advisory to baseline only with documented rationale in
  `SECURITY_NOTES.md`.
- Treat CodeQL alerts as required triage; open issue linking alert if fix not immediate.

Reference: See `SECURITY_NOTES.md` for current posture, compensating controls, and triggers for expedited remediation.

---

## License

See `LICENSE` (Apache-2.0 for vendored Lighthouse; site code retains existing license choice).

<!-- env-dump-diagnostic-marker:1 -->
