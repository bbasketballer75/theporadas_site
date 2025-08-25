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

See `.github/project_instructions.md` for context, success metrics, and next steps.

## Vendored Lighthouse Strategy

We fully vendor the upstream Lighthouse source under `lighthouse/` (embedded git metadata removed) for these reasons:

- Cross-platform patches: Windows-specific path normalization & zlib shim gating not upstreamed yet.
- Reproducible local DevTools bundle builds without relying on external clone/submodule init.
- Simpler contributor onboarding (single clone, no submodule sync steps).

Trade-off: Manual periodic upstream refresh instead of automatic submodule updates.

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
