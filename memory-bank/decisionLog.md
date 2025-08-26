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
- 2025-08-25: Automate coverage report a11y header fix.
  - Rationale: Lightweight post-process script (`scripts/fix_coverage_a11y.mjs`)
    ensures no empty table headers without committing generated artifacts.
- 2025-08-25: Add automated tests for coverage a11y fix.
  - Rationale: New `test/fix_coverage_a11y.test.ts` validates header insertion & idempotency using `COVERAGE_HTML` env override to prevent regressions.
- 2025-08-25: Introduce strict & silent modes for coverage a11y script.
  - Rationale: `COVERAGE_A11Y_STRICT=1` verifies labeled headers post-run; `COVERAGE_A11Y_SILENT=1` suppresses logs for cleaner CI output.
- 2025-08-25: Adopt structured assistant response protocol (Answer → Steps → Alternatives → Action Plan).
  - Rationale: Ensures clarity, educative transparency, and actionable guidance for a learner user while keeping outputs concise and skimmable.

Details:

- Vitest include narrowed to `test/**/*` and coverage include to `src/**` to avoid Istanbul path issues on Windows.
- Added `lighthouse/` and `coverage/` to `tsconfig.json` excludes to suppress implicit any warnings from vendored code.
- Accessibility of generated coverage report improved: empty `<th>` cells now auto-filled post generation (replacing prior decision to ignore).
