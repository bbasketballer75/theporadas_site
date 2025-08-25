# Pull Request Template

## Summary

Describe what this PR changes and why (problem → solution). Keep concise.

## Linked Issues

- Closes #
- Related #

## Motivation / Context

What user need, performance / accessibility gap, or blueprint objective does this address?

## Changes

- Bullet each notable code / structural change (keep scannable)
- Mention any refactors separated from feature logic

## Screens / Media (optional)

| Before | After |
| ------ | ----- |
| (img)  | (img) |

## Testing Matrix

Local verification steps:

```bash
# key commands you ran (lint, build, coverage, story/dev server, lighthouse)
npm test
npm run coverage
```

| Area                  | Evidence / Notes                                   |
| --------------------- | -------------------------------------------------- |
| Unit tests            | ✅ added / n/a / updated                           |
| Accessibility (axe)   | ✅ passes (include new rule if added)              |
| Keyboard / Focus      | ✅ tab order / skip link / focus ring checked      |
| Motion preference     | ✅ reduce-motion path verified                     |
| Performance (LH)      | Scores within budgets (attach diff if perf-impact) |
| Cross-browser (if UI) | Chrome / Firefox / Safari (list any caveats)       |

## Accessibility Impact

- Landmarks / headings: (any changes?)
- Color contrast: (new tokens audited?)
- Focus management: (describe if custom logic)
- Media (video/animation): (autoplay, captions, reduced motion)

## Performance / Lighthouse

- Affected bundles? (yes/no) If yes: size delta table.
- Budgets status: (pass / attach `lighthouse-report.report.html` diff)
- Notable perf trade-offs & rationale.

## Breaking Changes

- Does this introduce a breaking change? If yes: describe migration.

## Risk & Rollout

- Risk: Low / Medium / High (justify)
- Rollout plan: (merge → deploy steps, feature flag?)
- Rollback plan: (revert commit hash, disable flag)

## Changelog Entry (proposed)

`feat|fix|chore(scope): short description`

## Checklist

- [ ] Blueprint alignment (`.github/project_instructions.md`)
- [ ] Conventional commits style in title (if meaningful)
- [ ] Tests added / updated & coverage meets thresholds
- [ ] Accessibility reviewed (axe + manual focus / keyboard)
- [ ] Performance budgets respected (no regressions)
- [ ] Security & privacy reviewed (no secrets, safe inputs)
- [ ] Docs / README / relevant md updated
- [ ] Scripts remain idempotent
- [ ] Changelog entry prepared (if user-visible change)

### Blueprint Deviations (if any)

Explain rationale for any divergence from the project blueprint.
