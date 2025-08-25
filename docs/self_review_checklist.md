# PR Self-Review Checklist

Use this before merging any pull request. Adapt / strike out items that do not apply.

## 1. Scope & Intent

- [ ] Title follows Conventional Commits (feat|fix|docs|refactor|chore etc.)
- [ ] PR description explains WHY, not just WHAT
- [ ] Non-functional changes (docs, config) clearly separated from code changes where practical

## 2. Change Surface

- [ ] Only necessary files changed (no stray `coverage/`, build outputs, log files)
- [ ] No unintended secrets, API keys, or tokens committed
- [ ] Large binary/media additions justified (optimize or move to external storage if large)

## 3. Code Quality

- [ ] Lint passes locally (`npm run lint`)
- [ ] Typecheck clean (`npm run typecheck`)
- [ ] No TODO/FIXME left without an issue link
- [ ] Naming is intentional and clear
- [ ] Dead or commented-out code removed

## 4. Tests & Coverage

- [ ] `npm run test` fully green
- [ ] New logic has test coverage (branches & edge cases)
- [ ] Coverage % has not regressed beyond configured thresholds
- [ ] Flaky tests avoided or quarantined with explanation

## 5. Performance & Budgets

- [ ] Lighthouse / bundle-size budgets still passing (see README badges)
- [ ] Token growth heuristic not tripped OR rationale documented in PR description
- [ ] Any added heavy dependency evaluated for necessity & impact

## 6. Accessibility

- [ ] Axe / accessibility tests pass
- [ ] New interactive elements have proper roles, labels, focus handling
- [ ] Motion / reduced-motion behavior preserved for animations or media

## 7. Security & Robustness

- [ ] External input validated / sanitized where needed
- [ ] No elevation of trust boundaries without justification
- [ ] Error paths handled (no silent failures)

## 8. DX / Maintainability

- [ ] Functions/components not exceeding reasonable cognitive complexity
- [ ] Repeated patterns extracted or intentionally duplicated (with justification)
- [ ] Internal utilities documented where non-obvious

## 9. Documentation

- [ ] README or docs updated if surface area or workflows changed
- [ ] Inline doc comments added for tricky logic (sparing but sufficient)
- [ ] Migration / usage notes added if breaking change (version bump plan if applicable)

## 10. CI & Automation

- [ ] All workflow badges green (or failing one explained)
- [ ] New / modified workflows tested (dry-run or local equivalent) if feasible
- [ ] Coverage diff + performance summary posted (if applicable)

## 11. Post-Merge Considerations

- [ ] Rollback plan clear (single revert or feature flag)
- [ ] Any follow-up issues created and linked
- [ ] Monitoring / logging in place for new critical paths

---

**Tip:** If more than 3 unchecked items remain after initial pass, pause and address them before requesting review.
