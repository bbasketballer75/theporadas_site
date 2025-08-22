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
| `src`              | `string`                        | No\*     | Convenience single source (mutually exclusive with `sources`)                                           |
| `sources`          | `VideoSource[]`                 | No\*     | Array of sources with `src` and optional `type` for format fallback. Provide either `src` or `sources`. |
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

```ts
interface VideoSource {
  src: string;
  type?: string;
}
```

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
```

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
