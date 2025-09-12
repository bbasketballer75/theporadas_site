Keep responses concise, direct, and solution-oriented. Default to:

- Ask clarifying questions until 95% confident.
- Make a short TODO plan when tasks are multi-step.
- Use bullet points; minimize filler.
- Prefer minimal diffs and root-cause fixes.
- Verify with builds/tests; iterate until resolved.
- Show commands/paths in backticks; avoid heavy formatting.
- Clearly state next steps; offer to run tests or tasks.

Autocomplete & Extensions:

- Enable and leverage Copilot Chat, Inline, and Autocomplete across the workspace.
- Use installed extensions that improve analysis or quality (ESLint, Prettier, Vitest, Playwright, MSW tooling, Markdown linters, AI Toolkit) when relevant.
- Prefer tool categories exposed to the agent (GitHub, Vercel, SonarQube, Notion, Canva, MSSQL, AI Toolkit, VS Code API docs) and activate on demand.

Mode and research defaults:

- Use the project mode at `docs/internal/Extensive Mode.chatmode.md` as the operational workflow when present.
- Follow Context7-first research for any library/framework integration; then use Google as needed.
- Prefer PowerShell 7 (`pwsh`) commands on Windows; ensure commands are copyable.
- Keep `.github/instructions/memory.instruction.md` updated with noteworthy preferences, research, and decisions.

Project blueprint priority:

- Always consult `.github/project_instructions.md` for scope, architecture, and standards.
- If instructions conflict, defer to that file and propose an update.
- Reference the blueprint in plans and PRs; keep it updated as the project evolves.

Operational addenda (agent capabilities & lessons learned):

- Prefer GitHub API tools when `gh` CLI is absent (detected by command not found) instead of retrying CLI.
- When running a single test file for diagnostics, explicitly restore a full test run before committing to preserve coverage thresholds.
- Use `npm run coverage` (already patches headers) in CI contexts needing accessible HTML artifacts; do not commit generated coverage HTML (ignored by design).
- If an accessibility/report post-processing script modifies artifacts, keep script idempotent and avoid adding build outputs to VCS.
- Treat uncommitted changes as deliberate work-in-progress; before merges, confirm no unexpected staged diffs with `git status --short`.
- Always squash-merge docs/tooling-only PRs unless multiple commits carry distinct review value.

Tooling & workflow defaults (project-specific):

- Language/Framework: TypeScript 5, React 19, Vite 7.
- Testing: Vitest 3 (jsdom, V8 coverage), Testing Library, MSW v2; Playwright 1.48 for E2E (excluded from Vitest).
- Lint/Format: ESLint 9 (flat) with @typescript-eslint 8; Prettier 3.
- Commands: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run coverage`, `npm run format:check`.
- Enforce zero ESLint warnings and passing coverage thresholds.
- Prefer `apply_patch` for minimal diffs; keep changes focused and aligned with existing style.
