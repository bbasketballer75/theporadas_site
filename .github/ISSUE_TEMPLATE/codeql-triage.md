---
name: 'CodeQL Alert Triage'
about: 'Triage a new or changed CodeQL alert (High/Medium auto-filed; Low/Note on demand)'
title: 'CodeQL: <rule id> in <path>'
labels: ['security', 'codeql', 'triage']
assignees: []
---

## Alert Overview

- Rule ID: <!-- e.g., js/file-system-race -->
- Severity (tool): <!-- error | warning | note -->
- Security Severity Level: <!-- critical | high | medium | low | null -->
- Query Precision (if known): <!-- high | medium | low -->
- CWE (if provided): <!-- CWE-### -->
- Detected In Branch: <!-- main | feature/... -->
- First Seen (date): <!-- yyyy-mm-dd -->
- Frequency / Count: <!-- number of instances -->

## Affected Locations

| File         | Line(s) | Sample Snippet Intent |
| ------------ | ------- | --------------------- |
| path/to/file | 123     | // describe context   |

(Add rows or collapse if >10 using consolidated description.)

## Risk Analysis

- Impact: <!-- What could happen if exploited / misused? -->
- Likelihood: <!-- High / Medium / Low rationale -->
- Exposure Surface: <!-- internal script, CI only, production path, user input, etc. -->
- Data Sensitivity: <!-- none, config, secrets, PII, etc. -->
- Existing Mitigations: <!-- validations, isolation, privilege boundaries -->

## Proposed Remediation

- Strategy: <!-- patch / refactor / suppress with justification -->
- Key Steps:
  1. <!-- step -->
  2. <!-- step -->
- Test Additions: <!-- new unit/integration to prevent regression -->
- Estimated Effort: <!-- S / M / L -->

## Acceptance Criteria

- [ ] All listed instances resolved OR valid justification documented
- [ ] New/modified tests cover remediation paths
- [ ] No new High/Medium alerts introduced
- [ ] SECURITY_NOTES updated if acceptance/suppression chosen
- [ ] Trend delta reflects reduced or accepted count

## Suppression (If Chosen)

Provide justification meeting policy (precision concerns, false positive, unreachable code). Include:

- Evidence: <!-- logs, code refs -->
- Justification: <!-- why acceptable -->
- Review Date: <!-- yyyy-mm-dd (≤90 days) -->

## Timeline & Ownership

- SLA Target Date: <!-- per severity policy -->
- Owner: <!-- @handle -->
- Secondary Reviewer: <!-- @handle -->

## References

- Query Docs: <!-- link to CodeQL query documentation -->
- Related Issues: <!-- #id, #id -->
- Prior Alerts: <!-- link if regression -->

## Notes / Investigation Log

- <!-- bullet updates as progress occurs -->
