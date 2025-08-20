# Project Setup and Tooling

This project includes an idempotent setup script and VS Code tasks to avoid accidental re-installs and tool duplication across terminals.

## Project Blueprint (Source of Truth)
- The canonical project guide is `.github/project_instructions.md`.
- Always consult it for scope, architecture, standards, and success criteria.
- If anything here conflicts with that file, defer to the blueprint and propose an update.

## Terminals: Integrated vs External
- Prefer the VS Code integrated terminal for repeatable commands tied to this workspace.
- Use the external terminal only for system-wide administration; both are fine, but avoid running the same installers in both to prevent duplicates.
- All commands in this README assume PowerShell (`pwsh`).

## One-time Setup (Idempotent)
Use the built-in tasks to check or install required tools. These tasks are safe to run multiple times:

- Check only: opens a terminal and prints tool versions
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Check tools"

- Install missing tools (Admin - recommended): elevated, installs only what you don’t have yet
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Install (Admin)"
    - This opens an elevated PowerShell and runs `scripts/setup.ps1 -Install ...`

- Install missing tools (Non-Admin): only for user-scope installs
  - Terminal: Run
    - Ctrl+Shift+P → "Tasks: Run Task" → "Setup: Install missing tools (Non-Admin)"

Profile fixes (uv completions)
- If your PowerShell profile errors on startup mentioning `uv` completions, run:
  - `pwsh -NoProfile -File scripts/fix_profile_uv.ps1` (current host only)
  - `pwsh -NoProfile -File scripts/fix_profile_uv.ps1 -AllHosts` (all hosts)
  - Reopen terminals after running. The script comments unsafe lines and adds a guarded block that only runs if `uv` is available.

Beast Mode (Copilot Chat)
- A custom chat mode `Beast Mode` is available in this repo at `.github/chatmodes/Beast.chatmode.md`.
- Select it from the Chat mode dropdown in Copilot Chat.
- Note: VS Code doesn’t expose a setting to force a global default chat mode; it remembers the last used per window. This mode pins model `gpt-5` and applies our aggressive, research-first workflow.

What it can manage via WinGet/Corepack:
- Git (`Git.Git`)
- Google Cloud SDK (`Google.CloudSDK`)
- NVM for Windows (`CoreyButler.NVMforWindows`) + optional Node LTS
- Python 3 (`Python.Python.3`)
- pipx (`PyPA.pipx`)
- pnpm via Corepack (or `pnpm.pnpm` as fallback)
- uv (`astral-sh.uv`)
- Docker Desktop (`Docker.DockerDesktop`)

## Run directly from terminal
You can also run the script yourself:

```powershell
# Check only (no installs)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1

# Install the common toolchain
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1 -Install -WithGit -WithGcloud -WithNode -WithPython -WithPnpm -WithUv

# Install Docker Desktop too
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup.ps1 -Install -WithDocker

# After install, ensure Docker CLI is on PATH for this session
$dockerBin = Join-Path $Env:ProgramFiles 'Docker/Docker/resources/bin'
if (Test-Path $dockerBin) { $Env:PATH += ";$dockerBin" }
docker --version
```

## Tips to avoid duplicate installs
- Use a single package manager per tool: here we standardize on WinGet (and NVM for Node versions, Corepack for pnpm).
- Don’t mix installers (e.g., don’t install Python from both winget and the Microsoft Store).
- Re-run the "Check tools" task before installing to see current versions.
- For Node: manage versions with NVM for Windows; avoid separate Node installers.

## Uninstall/Upgrade guidance
- Upgrades: prefer `winget upgrade` or re-run installers via WinGet.
- Google Cloud SDK: upgrades sometimes lag in WinGet; you can run `gcloud components update` after initial install.
- pnpm: if installed via Corepack, update with `corepack use pnpm@latest-10`.

## Notes
- If `winget` is missing, install Microsoft "App Installer" (provides WinGet):
  - Store page: https://apps.microsoft.com/detail/9NBLGGH4NNS1
  - No-Store/offline: https://aka.ms/getwinget (downloads the App Installer MSIX bundle)
  - After install, you can force registration if needed:
    - PowerShell (run once): `Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe`
  - Docs: https://learn.microsoft.com/windows/package-manager/winget/
- If PowerShell blocks script execution, we pass `-ExecutionPolicy Bypass` in tasks.
- The script is safe to run repetitively; it checks presence before installing.

## Dev Tooling
- Extensions (auto-suggested via `.vscode/extensions.json`): ESLint, Prettier, EditorConfig, Code Spell Checker, Error Lens, axe Accessibility Linter, Dotenv, Tailwind CSS IntelliSense, Stylelint, Vitest Explorer, GitHub PRs & Issues.
- Install prompts appear when you open the workspace. You can also run: View → Extensions → `@recommended`.
- Formatting: Prettier on save; linting by ESLint/Stylelint; accessibility by axe linter.

### MCP Strategy (hosted-first)
- Prefer hosted HTTP/SSE MCP servers from the VS Code curated list: `https://code.visualstudio.com/mcp`.
- Use local stdio for trusted CLIs (e.g., Firebase). Docker is fine for local experimentation.
- Keep credentials out of files by using VS Code `inputs` prompts in `mcp.json`.

Helpful docs:
- VS Code curated MCP servers: `https://code.visualstudio.com/mcp`
- Firebase MCP server (official): `https://firebase.google.com/docs/cli/mcp-server`
- GitHub MCP server repo: `https://github.com/github/github-mcp-server`

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
    { "id": "stripe_api_key", "type": "promptString", "description": "Stripe API Key", "password": true }
  ],
  "servers": {
    "stripe": {
      "type": "http",
      "url": "https://mcp.stripe.com/",
      "headers": { "Authorization": "Bearer ${input:stripe_api_key}" }
    }
  }
}
```

Firebase (local stdio via CLI):

```json
{
  "servers": {
    "firebase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "experimental:mcp"]
    }
  }
}
```

Notes for Firebase MCP:
- Authenticate first: `npx -y firebase-tools@latest login --reauth`.
- Optional flags: `--dir` (absolute path to project with `firebase.json`) and `--only` (comma list: `auth,firestore,storage,...`). Example:
  - `... "args": ["-y", "firebase-tools@latest", "experimental:mcp", "--dir", "/abs/path/to/project", "--only", "auth,firestore,storage"]`
- You can also use the VS Code tasks:
  - `Firebase: Login` to authenticate
  - `Firebase: Start MCP (stdio)` to start the server

