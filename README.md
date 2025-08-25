# Project Setup and Tooling

![CI](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-lint.yml/badge.svg)
![TypeScript](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-typecheck.yml/badge.svg)
![Coverage Workflow](https://github.com/bbasketballer75/theporadas_site/actions/workflows/coverage-badge.yml/badge.svg)
![Coverage](./.github/badges/coverage.svg)

> If the local badge has not yet been generated (first clone or before CI runs),
> view the latest workflow artifacts in **Actions → CI - Tests**.
> Optionally use a placeholder badge until the generated file exists:
> `![Coverage (placeholder)](https://img.shields.io/badge/coverage-pending-lightgrey)`.

Idempotent setup scripts + VS Code tasks prevent accidental global reinstalls and tool drift.

## Project Blueprint (Source of Truth)

See `.github/project_instructions.md` for architecture, scope, standards, and success
criteria. If this README conflicts with it, defer to the blueprint and open a PR
to reconcile.

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
```

---

## VideoPlayer Component API

Higher-level wrapper over `<video>` adding multi-source logic, chapters, tracks, adaptive heuristic, and instrumentation.

### Basic Usage

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

### Sources & Quality Sources

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

| Prop          | Type                 | Default | Description                  |
| ------------- | -------------------- | ------- | ---------------------------- |
| `rootMargin`  | `string`             | `200px` | Observer margin for prefetch |
| `threshold`   | `number \| number[]` | `0`     | Intersection threshold(s)    |
| `aspectRatio` | `string`             | `16/9`  | Placeholder layout stability |

Tests shim `IntersectionObserver` for synchronous render (see `vitest.setup.ts`).

---

## Accessibility & Performance Foundations

- Skip link in `index.html` → `#appShell`
- Reduced Motion toggle updates `data-motion`
- Automated accessibility test (`axe-core`) in `test/accessibility.test.tsx`
- Performance budgets (`lighthouserc.json`): LCP < 2000ms, CLS < 0.02, TBT < 200ms, script gz < 90KB, stylesheet < 12KB, hero image < 180KB
- Lighthouse CI GitHub Action enforces budgets

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

## Contributing

1. Branch from `main`
2. Keep PRs focused and small
3. Ensure: lint (0 warnings) + tests + typecheck + coverage unchanged/non-regressive
4. For Windows-specific fixes include rationale and cross-platform notes

---

## Dependency & Update Strategy

- Weekly Dependabot for npm + GitHub Actions (max 5 open PRs per ecosystem)
- Prefer minor upgrades individually for easier regression isolation

---

## License

See `LICENSE` (Apache-2.0 for vendored Lighthouse; site code retains existing license choice).
