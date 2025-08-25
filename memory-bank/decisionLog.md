# Decision Log

Decisions:

- 2025-08-20: Track user uses VS Code Insiders.
  - Rationale: Experimental Copilot features (chat modes, prompt files) availability affects guidance and settings.
- 2025-08-24: Limit Vitest scope.
  - Rationale: Prevent executing vendored & dependency tests.
- 2025-08-24: Exclude vendor & coverage from TS.
  - Rationale: Reduce noise from non-app code.
- 2025-08-24: Instrument only `src/**` for coverage.
  - Rationale: Avoid path errors; focus metrics.
- 2025-08-24: Ignore coverage report a11y issues.
  - Rationale: Generated tooling HTML accepted (not user-facing).

Details:

- Vitest include narrowed to `test/**/*` and coverage include to `src/**` to avoid Istanbul path issues on Windows.
- Added `lighthouse/` and `coverage/` to `tsconfig.json` excludes to suppress implicit any warnings from vendored code.
- Accessibility linter errors in generated coverage report (empty headers for charts) intentionally ignored—documented rationale.
