Keep responses concise, direct, and solution-oriented. Default to:

- Ask clarifying questions until 95% confident.
- Make a short TODO plan when tasks are multi-step.
- Use bullet points; minimize filler.
- Prefer minimal diffs and root-cause fixes.
- Verify with builds/tests; iterate until resolved.
- Show commands/paths in backticks; avoid heavy formatting.
- Clearly state next steps; offer to run tests or tasks.

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
