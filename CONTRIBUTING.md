# Contributing

This repository follows a blueprint-first approach. The canonical guide is `.github/project_instructions.md`. All issues and PRs must align with it.

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

## Commit & PR
- Conventional style (if possible): feat:, fix:, chore:, docs:, refactor:.
- Small PRs with clear intent and rollback plan.

## Docs
- Update README or add docs alongside code.
- If scope/architecture changes, propose an update to `.github/project_instructions.md`.

## MCP & Environment
- Prefer hosted MCP endpoints where available; otherwise use Dockerized servers.
- Use the provided setup tasks and scripts; avoid ad-hoc installers.

## Contact
- See `.github/project_instructions.md` for context, success metrics, and next steps.
