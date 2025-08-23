# Project Setup and Tooling

![CI](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-lint.yml/badge.svg)
![TypeScript](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-typecheck.yml/badge.svg)
![Coverage](./.github/badges/coverage.svg)

> If the local badge has not yet been generated (first clone or before CI runs), you can view the latest workflow artifacts in **Actions → CI - Tests**. Optionally replace the above with a dynamic Shields.io placeholder: `![Coverage (placeholder)](https://img.shields.io/badge/coverage-pending-lightgrey)` until the badge file is committed.

This project includes an idempotent setup script and VS Code tasks to avoid accidental re-installs and tool duplication across terminals.

## Project Blueprint (Source of Truth)

- The canonical project guide is `.github/project_instructions.md`.
- Always consult it for scope, architecture, standards, and success criteria.
- If anything here conflicts with that file, defer to the blueprint and propose an update.

## Terminals: Integrated vs External

- Prefer the VS Code integrated terminal for repeatable commands tied to this workspace.

## One-time Setup (Idempotent)

Use the built-in tasks to check or install required tools. These tasks are safe to run multiple times:

- Check only: opens a terminal and prints tool versions
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Check tools"

- Install missing tools (Admin - recommended): elevated, installs only what you don’t have yet
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Install (Admin)"

- Install missing tools (Non-Admin): only for user-scope installs
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Install missing tools (Non-Admin)"

## Profile fixes (uv completions)

If your PowerShell profile errors on startup mentioning `uv` completions, run:

```powershell
pwsh -NoProfile -File scripts/fix_profile_uv.ps1      # current host only
pwsh -NoProfile -File scripts/fix_profile_uv.ps1 -AllHosts
```

Reopen terminals after running. The script comments unsafe lines and adds a guarded block that only runs if `uv` is available.

## Beast Mode (Copilot Chat)

- Custom chat mode: `.github/chatmodes/Beast.chatmode.md`.
- Select it from the Chat mode dropdown in Copilot Chat.
- Model pinned for aggressive research-first workflow.

## Run directly from terminal

```powershell
# Check only (no installs)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1
```

- Use a single package manager per tool: standardized on WinGet (and NVM/Corepack for Node/pnpm).
- Don’t mix installers (e.g., avoid Store + WinGet duplicates).

## Uninstall/Upgrade guidance

- Upgrades: prefer `winget upgrade` or re-run installers via WinGet.
- Google Cloud SDK: after install you can run `gcloud components update`.
- pnpm (Corepack): `corepack use pnpm@latest-10`.

## Notes

- If `winget` missing: install Microsoft "App Installer".
- Scripts use `-ExecutionPolicy Bypass` for convenience.
- Scripts are idempotent (skip already present tools).

## Dev Tooling

Extensions (suggested in `.vscode/extensions.json`): ESLint, Prettier, EditorConfig, Code Spell Checker, Error Lens, axe Accessibility Linter, Dotenv, Tailwind CSS IntelliSense, Stylelint, Vitest Explorer, GitHub PRs & Issues.

### MCP Strategy (hosted-first)

Prefer hosted HTTP/SSE MCP servers (see [VS Code MCP directory](https://code.visualstudio.com/mcp)). Use local stdio only for trusted CLIs (e.g., Firebase). Keep credentials out of files via `inputs` prompts in `mcp.json`.

Troubleshooting ENOENT for `npx`: ensure PATH includes Node/NPM as documented below.

## Permanent PATH (Windows)

If VS Code or external tools can’t find `node`, `npm`, or `npx` consistently:

1. Open Environment Variables dialog.
2. Ensure (User variables) entries near top:
   - `%APPDATA%\npm`
   - `%LOCALAPPDATA%\nodejs`
   - NVM-managed path (e.g., `C:\nvm4w\nodejs`)

Quick verification:

```powershell
where.exe node
where.exe npm
where.exe npx
```

Start Firebase MCP: task "Firebase: Start MCP (stdio)". Confirm model availability after window reload if needed.

### Example: `.vscode/mcp.json`

GitHub (hosted HTTP):

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

Stripe (hosted HTTP with secure key input):

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

## ESLint Migration (Flat Config)

- Migrated to ESLint 9 flat config (`eslint.config.js`).
- Ignore patterns live in top-level `ignores` array.
- Config merges: `@eslint/js`, React, React Hooks, `@typescript-eslint`, Prettier, import ordering, Vitest.

### Zero-Warning Policy & Type Checking

- Lint script uses `--max-warnings=0`.
- Type safety via strict TS config; CI typechecks Node 18/20/22.

### Commit Hooks (Husky + lint-staged)

- Pre-commit: ESLint (with cache + fixes) then Prettier on staged code; Prettier for JSON/MD/YAML.
- Avoid `--no-verify` unless blocking emergency.

### Commands

```powershell
npm run lint        # Lint (fail on warning)
npm run typecheck   # TS type checking (no emit)
npm run format      # Format all files
npm run format:check
npm test            # Run tests once
npm run coverage    # Tests with coverage report
```

### Adding New Ignore Patterns

Edit `eslint.config.js` -> first object `ignores` array.

### Adding Stricter Rules

Adjust final `rules` object (last config entry) and run `npm run lint`.

### Dependency Updates (Dependabot)

Weekly checks for npm and GitHub Actions versions (limit 5 open PRs per ecosystem).

## VideoPlayer Component API

The `VideoPlayer` component wraps the native HTML5 `<video>` element adding multi-source fallback, text tracks, chapter navigation, and a unified instrumentation callback.

### Basic Usage

```tsx
import { VideoPlayer } from "./src/components/VideoPlayer/VideoPlayer";

<VideoPlayer
  src="/media/sample.mp4"
  caption="Sample"
  placeholderLabel="Loading video"
/>;
```

### Props

| Prop               | Type                            | Required | Description                                                                                             |
| ------------------ | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `src`              | `string`                        | No\*     | Convenience single source (mutually exclusive with `sources` / `qualitySources`)                        |
| `sources`          | `VideoSource[]`                 | No\*     | Array of sources with `src` and optional `type` for format fallback. Provide either `src` or `sources`. |
| `qualitySources`   | `QualitySource[]`               | No\*     | Tiered sources (height/bitrate). If provided, heuristic selects ONE best; overrides `src` / `sources`.  |
| `tracks`           | `VideoTrackDef[]`               | No       | Text tracks (captions/subtitles). Rendered as `<track>` elements.                                       |
| `chapters`         | `ChapterDef[]`                  | No       | Chapters with `start`, optional `end`, and `title` used for navigation & active highlighting.           |
| `showChapters`     | `boolean`                       | No       | Force chapter list rendering even if no chapters (fallback UI).                                         |
| `placeholderLabel` | `string`                        | No       | Accessible label shown before metadata loads (when no poster).                                          |
| `caption`          | `string`                        | No       | Short caption below the video (not a track).                                                            |
| `onEvent`          | `(e: VideoPlayerEvent) => void` | No       | Instrumentation callback fired on key media events.                                                     |

### Event Model

```ts
type VideoPlayerEvent =
  | { type: "ready"; duration: number }
  | { type: "play" }
  | { type: "pause" }
  | {
      type: "timeupdate";
      currentTime: number;
      duration: number;
      chapter?: ChapterDef;
    }
  | { type: "ended" }
  | { type: "seeked"; currentTime: number }
  | { type: "error"; message?: string };
```

Chapters active when `currentTime >= start` and `< end` (if defined). Active chapter recomputed on each `timeupdate`.

### Chapters

```ts
interface ChapterDef {
  start: number;
  end?: number;
  title: string;
}
```

If `end` omitted it runs until next chapter start (or video end).

### Sources

````ts
interface VideoSource {
  src: string;
  type?: string;
}

### Quality Sources (Adaptive Heuristic)

```ts
interface QualitySource extends VideoSource {
  height: number;        // e.g., 1080, 720
  bitrateKbps?: number;  // approximate average bitrate
  label?: string;        // "1080p", etc.
  default?: boolean;
}
````

Heuristic (initial simple pass):

1. Sort descending by `height`.
2. Derive target height from `window.innerHeight` (>=900→1080, >=720→720, >=540→540 else 480).
3. Respect `navigator.connection.saveData` by clamping target ≤480.
4. Filter sources <= target height (fallback to smallest if none).
5. If `navigator.connection.downlink` present, drop candidates whose `bitrateKbps` exceeds `(downlink * (saveData?0.6:0.85)) Mbps`.
6. Pick highest remaining resolution.

Result: only a single `<video src>` is used (no multi `<source>` tags) to avoid needless HEAD requests. Future iterations may add mid-play adaptive switching once metrics justify complexity.

````

Order sources by preference (`video/webm` then `video/mp4`, etc.).

### Tracks

```ts
interface VideoTrackDef {
  src: string;
  kind: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
  srclang?: string;
  label?: string;
  default?: boolean;
}
````

### Accessibility Notes

- `placeholderLabel` provides an accessible label before metadata loads.
- Chapter buttons use `aria-current="true"` for the active chapter.
- Provide `srclang` + `label` on text tracks.

### Testing Guidance

- Mock `onEvent` and assert sequence.
- Simulate `timeupdate` by setting `video.currentTime` then dispatching the event.
- Validate chapter selection by clicking chapter buttons and checking current time.

### Future Enhancements (Planned)

- Keyboard shortcuts for chapter navigation.
- Debounced analytics for `timeupdate`.
- Poster/thumbnail preview support.

## LazyVideoPlayer Wrapper

`LazyVideoPlayer` defers mounting of the heavy `VideoPlayer` (and thus network requests) until the component is near or within the viewport using `IntersectionObserver`.

### Usage

```tsx
import { LazyVideoPlayer } from "./src/components/VideoPlayer/LazyVideoPlayer";

<LazyVideoPlayer
  caption="Feature Clip"
  placeholderLabel="Preparing video"
  qualitySources={[
    { src: "/media/encoded/feature-480.mp4", height: 480 },
    { src: "/media/encoded/feature-720.mp4", height: 720 },
    { src: "/media/encoded/feature-1080.mp4", height: 1080 },
  ]}
/>;
```

### Behavior

- Renders an accessible region with `aria-busy` until intersection.
- Uses a `rootMargin` (default `200px`) to prefetch slightly before entering viewport.
- Falls back to immediate render if `IntersectionObserver` not supported.
- Accepts the same `VideoPlayer` props relevant to source/track/chapter configuration.

### Props (Additions)

| Prop          | Type                 | Default | Description                                                      |
| ------------- | -------------------- | ------- | ---------------------------------------------------------------- |
| `rootMargin`  | `string`             | `200px` | Margin passed to observer for early load.                        |
| `threshold`   | `number \| number[]` | `0`     | Intersection threshold(s).                                       |
| `aspectRatio` | `string`             | `16/9`  | Optional CSS `aspect-ratio` placeholder to prevent layout shift. |

### Testing Note

In tests we shim `IntersectionObserver` to trigger callbacks immediately (see `vitest.setup.ts`) so the inner `VideoPlayer` renders synchronously, simplifying assertions.

## Phase 1 Foundations (Accessibility & Performance)

Implemented baseline accessibility and performance guardrails before adding heavy media content.

### Skip Link

- First focusable element in `index.html`: `<a class="skip-link" href="#appShell">`.
- Targets the main scroll container (`#appShell`) which has `role="main"` and `tabIndex="-1"` to receive programmatic focus.

### Reduced Motion Toggle

- `MotionToggle` component sets `document.documentElement.dataset.motion` to `reduce` or `no-preference`.
- Global CSS disables animations/transitions when `[data-motion="reduce"]` present; respects user system setting + manual override persisted in `localStorage`.

### Automated Accessibility Test

- Vitest + `axe-core` integration (`test/accessibility.test.tsx`) fails if any violations detected on initial app render.
- Provides detailed violation report (rule id, help text, impacted node targets) to speed remediation.

### Performance Budgets & Lighthouse CI

- `lighthouserc.json` defines budgets: LCP < 2000ms, CLS < 0.02, TBT < 200ms, script (initial gz) < 90KB, stylesheet < 12KB, largest hero image < 180KB.
- GitHub Action `.github/workflows/lighthouse.yml` builds site, serves locally, runs `lhci autorun` with assertions; will surface regressions in PRs.

### Rationale

- Establishing guardrails early prevents silent regressions when integrating the real feature video and future interactive sections.
- Budgets are intentionally strict to encourage lean incremental development.

### Next (Phase 1.5: Video Ingestion)

- Add transcoded multi-source video variants (AV1 / H.264), captions (WebVTT), chapters, poster & blurred placeholder. See [`video_ingestion_overview.md`](./docs/video_ingestion_overview.md) for objectives & data model.
- Lazy mount / intersection-based preloading to preserve initial LCP dominated by hero heading. Encoding ladder & ffmpeg commands captured in [`encoding_recipes.md`](./docs/encoding_recipes.md).

## Phase 1.5 – Video Ingestion (Planned Detailed Tasks)

Reference docs:

- Overview / strategy: [`docs/video/video_ingestion_overview.md`](./docs/video/video_ingestion_overview.md)
- Encoding ladder & ffmpeg commands: [`docs/video/encoding_recipes.md`](./docs/video/encoding_recipes.md)

Goals: Ingest wedding feature + ancillary clips with an accessible, performant delivery pipeline while preserving existing budgets.

Planned Tasks Checklist:

1. Inventory Raw Media: document source resolutions, frame rates, durations.
2. Define Encoding Ladder: e.g. 1080p ~5-6Mbps, 720p ~3Mbps, 480p ~1.2Mbps (tune after sample Lighthouse runs).
3. Codec/Container Strategy: MP4/H.264 (baseline), optional WebM/VP9 (quality), evaluate AV1 feasibility (size vs encoding cost).
4. ffmpeg Command Library: add `docs/encoding_recipes.md` with reproducible commands & two-pass guidance.
5. Poster & LQIP: generate high-quality poster (≤60KB webp) + ultra low-res blurred placeholder (base64 inline) for immediate paint.
6. Text Tracks: author `captions.vtt` (accurate timing), `chapters.vtt` (semantic titles) – validate with testing harness.
7. Extend `VideoPlayer`: accept `qualitySources` prop; auto-pick best based on `navigator.connection` (save-data, downlink) and viewport size.
8. Lazy Loading: wrap player in IntersectionObserver; defer loading until near viewport; preconnect / preload only first required source.
9. Metrics Validation: run Lighthouse & WebPageTest on video page variant; confirm no budget breaches (script/style unaffected, media excluded by design but watch LCP).
10. Accessibility QA: keyboard nav for chapter list, captions toggle visibility, contrast & focus states, reduced motion respects user preference (no autoplay scroll jank).
11. Analytics Hook (Optional): extend `onEvent` to emit structured payload to future telemetry endpoint.
12. Documentation: update README + `docs/accessibility_performance_plan.md` with video strategy & trade-offs.

Success Criteria:

- All lint/tests pass post-integration.
- Budgets remain green; LCP increase < 200ms versus placeholder baseline.
- Captions & chapters fully operable and discoverable.
- Encoding ladder & commands reproducible (checked into `docs/`).
