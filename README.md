# Project Setup and Tooling

![CI](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-lint.yml/badge.svg)
![TypeScript](https://github.com/bbasketballer75/theporadas_site/actions/workflows/ci-typecheck.yml/badge.svg)
![Coverage](./.github/badges/coverage.svg)

> If the local badge has not yet been generated (first clone or before CI runs), you can view the latest workflow artifacts in **Actions → CI - Tests**. Optionally replace the above with a dynamic Shields.io placeholder:
> `![Coverage (placeholder)](https://img.shields.io/badge/coverage-pending-lightgrey)` until the badge file is committed.

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

- `pwsh -NoProfile -File scripts/fix_profile_uv.ps1` (current host only)
- `pwsh -NoProfile -File scripts/fix_profile_uv.ps1 -AllHosts` (all hosts)
- Reopen terminals after running. The script comments unsafe lines and adds a guarded block that only runs if `uv` is available.

## Beast Mode (Copilot Chat)

- A custom chat mode `Beast Mode` is available in this repo at `.github/chatmodes/Beast.chatmode.md`.
- Select it from the Chat mode dropdown in Copilot Chat.
- Note: VS Code doesn’t expose a setting to force a global default chat mode; it remembers the last used per window. This mode pins model `gpt-5` and applies our aggressive, research-first workflow.

## Run directly from terminal

You can also run the script yourself:

````powershell
# Check only (no installs)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1

```text
# (intentionally left blank placeholder removed)
````

- Use a single package manager per tool: here we standardize on WinGet (and NVM for Node versions, Corepack for pnpm).
- Don’t mix installers (e.g., don’t install Python from both winget and the Microsoft Store).
- Re-run the "Check tools" task before installing to see current versions.

## Uninstall/Upgrade guidance

- Upgrades: prefer `winget upgrade` or re-run installers via WinGet.
- Google Cloud SDK: upgrades sometimes lag in WinGet; you can run `gcloud components update` after initial install.
- pnpm: if installed via Corepack, update with `corepack use pnpm@latest-10`.

## Notes

- If `winget` is missing, install Microsoft "App Installer" (provides WinGet):
  - Store page: [Microsoft Store: App Installer](https://apps.microsoft.com/detail/9NBLGGH4NNS1)

- If PowerShell blocks script execution, we pass `-ExecutionPolicy Bypass` in tasks.
- The script is safe to run repetitively; it checks presence before installing.

## Dev Tooling

- Extensions (auto-suggested via `.vscode/extensions.json`): ESLint, Prettier, EditorConfig, Code Spell Checker, Error Lens, axe Accessibility Linter, Dotenv, Tailwind CSS IntelliSense, Stylelint, Vitest Explorer, GitHub PRs & Issues.

### MCP Strategy (hosted-first)

- Prefer hosted HTTP/SSE MCP servers from the VS Code curated list: `https://code.visualstudio.com/mcp`.
- Use local stdio for trusted CLIs (e.g., Firebase). Docker is fine for local experimentation.
- Keep credentials out of files by using VS Code `inputs` prompts in `mcp.json`.

Helpful docs:

- [VS Code curated MCP servers](https://code.visualstudio.com/mcp)
- [Firebase MCP server (official)](https://firebase.google.com/docs/cli/mcp-server)
- [GitHub MCP server repository](https://github.com/github/github-mcp-server)

Troubleshooting MCP ENOENT / frozen spawns

- If you see `spawn npx ENOENT` or servers fail to start, VS Code’s extension host may not have your shell PATH.

## Permanent PATH (Windows)

If VS Code or external tools can’t find `node`, `npm`, or `npx` consistently across sessions:

- Open: Start → search "Environment Variables" → "Edit the system environment variables" → Environment Variables…
- Under "User variables" → select `Path` → Edit → ensure these entries exist near the top (one per line):
  - `%APPDATA%\npm`
  - `%LOCALAPPDATA%\nodejs`
  - Your NVM-managed Node path (e.g., `C:\nvm4w\nodejs`)

Quick verification (PowerShell):

````powershell
where.exe node
where.exe npm
where.exe npx
```text
# (intentionally left blank placeholder removed)
````

- Start Firebase MCP: run the task "Firebase: Start MCP (stdio)". It should print the resolved `npx.cmd` path and not error with ENOENT.
- In Copilot Chat, open the model selector and confirm `gpt-5` is available (beta access required). If not visible, reload window and try again.

### Example: `.vscode/mcp.json`

Project-scoped configuration for Copilot agent mode. These are examples; tailor to your needs.

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

Stripe (hosted HTTP with input prompt for API key):

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
      "headers": {
        "Authorization": "Bearer ${input:stripe_api_key}"
      }
    }
  }
}
```

## ESLint Migration (Flat Config)

This project migrated from legacy `.eslintrc` + `.eslintignore` to the ESLint 9 flat config (`eslint.config.js`).

Key points:

- Legacy files removed: `.eslintrc.json`, `.eslintignore`.
- Ignore patterns now live in the top `ignores` array inside `eslint.config.js`.
- Config composes: core JS (`@eslint/js`), React, React Hooks, TypeScript (`@typescript-eslint`), and Prettier integration.
- Prettier issues surface as `warn` via `prettier/prettier` rule; run `format` to fix.

### Zero-Warning Policy & Type Checking

The lint script enforces `--max-warnings=0`; any warning fails CI. Resolve warnings locally before pushing. Type safety enforced via strict `tsconfig.json` with a `typecheck` step in CI (Node 18/20/22 matrix).

### Commit Hooks (Husky + lint-staged)

On install (`npm install`), Husky sets up a pre-commit hook that runs:

- ESLint (cached + fixes) then Prettier on staged `*.{js,jsx,ts,tsx}`
- Prettier on staged `*.{json,md,yml,yaml}`

Avoid using `--no-verify` unless absolutely necessary.

### Commands

```powershell
# Lint (fails on any warning)
npm run lint


# Type check (no emit)
npm run typecheck

# Format all files
npm run format

# Check formatting only
npm run format:check
```

### Adding New Ignore Patterns

Edit `eslint.config.js` -> first object `ignores` array. Example:

```js
export default [
  {
    ignores: [
      "**/*.md",
      "**/*.json",
      "**/*.yml",
      "**/*.yaml",
      "**/*.lock",
      "**/dist/**",
      "**/build/**",
      "**/.vscode/**",
      "**/scripts/**",
    ],
  },
  // ...other config objects
];
```

### Adding Stricter Rules

Adjust the final `rules` object (last config entry). Example adding stricter TypeScript and React rules:

```js
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',
  'react/react-in-jsx-scope': 'off',
  // add more here
}
```

Run `npm run lint` after edits (no restart required).

### Testing & Coverage

Commands:

```powershell
# Run tests once
npm test

# Run tests with coverage output
npm run coverage
```

### Dependency Updates (Dependabot)

Automated weekly checks for:

- npm dependencies (root `package.json`)
- GitHub Actions versions

Config: `.github/dependabot.yml`. Limit of 5 open PRs per ecosystem keeps noise under control.

Adjust in the `rules` section (last object). Example:

```js
    rules: {
      // existing spreads
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off'
    }
```

Run `npm run lint` after edits; no restart required.
