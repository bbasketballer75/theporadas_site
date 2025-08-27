# CodeQL Suppression / Acceptance Policy (Template)

Last reviewed: <YYYY-MM-DD>

## Purpose

Define a consistent, auditable process for handling CodeQL alerts that are _not_ immediately fixed.
The default action for any valid alert is to remediate in code. Suppression / acceptance is an
exception requiring documented rationale, a sunset / re-review date, and risk owner sign-off.

## Principles

1. Prefer code fixes over suppressions (`// codeql` comments / dismissal in UI) to avoid technical debt.
2. Minimize long-lived suppressions; each accepted finding must have a re-validation date.
3. Never suppress High / Critical true positives that affect production runtime without an actively
   implemented compensating control (and open remediation issue).
4. Keep the immutable baseline counts unchanged; track drift and remediation progress via separate
   reports (e.g., monthly drift delta script output).
5. Centralize rationale text in `SECURITY_NOTES.md` (Posture Updates section) – do not modify the
   baseline verification section appended by automation.

## Severity Handling Matrix

| Severity | Default Action                | Allow Temporary Suppression?                                | Max Suppression Window | Notes                                  |
| -------- | ----------------------------- | ----------------------------------------------------------- | ---------------------- | -------------------------------------- |
| Critical | Immediate fix                 | Only with CTO/Security Lead approval + compensating control | 7 days                 | Root cause analysis required.          |
| High     | Fix within SLA (<=7 days)     | With Security Lead approval                                 | 14 days                | Track via issue with due date.         |
| Medium   | Fix within sprint (<=14 days) | Yes, team lead approval                                     | 30 days                | Re-evaluate each sprint.               |
| Low      | Fix or accept (document)      | Yes, eng lead approval                                      | 90 days                | Tooling-only low risk may be accepted. |

## Required Suppression Record Fields

Each suppression (dismissal / ignore comment) MUST include these fields (in issue / SECURITY_NOTES):

- Finding ID / rule ID: (e.g., `js/sql-injection`, alert URL)
- Severity: (Low/Medium/High/Critical)
- Location: `path/to/file:line`
- Decision Type: Temporary suppression | Accepted (permanent) | False positive | Mitigated by control
- Rationale: Concise justification (why cannot fix immediately, or why accepted risk is negligible)
- Compensating Controls: (N/A if not applicable) – describe control and how effectiveness is validated
- Owner: (GitHub handle or team)
- Created Date:
- Re-review Date: (<= window allowed by severity table) – NA only for false positives once validated
- Linked Issue: (#123) tracking fix if temporary
- Sunset / Auto-expire Plan: (Describe triggers for removal or timeframe)

## Workflow

1. Alert surfaces (CodeQL run). High/Medium automatically generate issues.
2. Engineer evaluates alert: true positive, false positive, or uncertain.
3. If false positive: Document justification, dismiss in GitHub UI with `false positive` reason. Add
   entry under Posture Updates (False Positives subsection) including reasoning.
4. If true positive & fix feasible within SLA: Implement patch → close alert.
5. If not feasible: Draft suppression record (fields above). Obtain approval (PR comment or issue
   review from Security Lead). Then dismiss alert or add localized suppression comment.
6. Update drift report (next scheduled run) will reflect static or reduced counts. If count remains
   elevated past re-review date, escalate.

## Localized Code Suppressions

Preferred only when discrete and near the finding for clarity. Use CodeQL standardized pragma form:

```js
// codeql[<rule-id>] Reason: <short justification> (Review: <YYYY-MM-DD>)
```

Guidelines:

- Keep justification <= 120 chars.
- Include a target review date.
- Do not blanket-disable multiple rules in a single comment unless strongly related.

## Central Dismissal (UI) vs Inline Comment

| Aspect               | UI Dismissal                                 | Inline Suppression                      |
| -------------------- | -------------------------------------------- | --------------------------------------- |
| Visibility           | Listed in alert history                      | Visible in code diff / PRs              |
| Refactoring Impact   | Survives file moves (ID-based)               | Might lose context if code is rewritten |
| Justification Length | Limited to small text box                    | Full comment flexibility                |
| Risk of Stale        | Lower (alert may re-open if pattern changes) | Higher (comment may remain silently)    |

Choose UI dismissal for broader patterns or when the code area is volatile; inline when pinpointing a
single harmless line.

## False Positives

Definition: Analyzer reports a theoretical issue that is not practically exploitable given invariant
application constraints. Must document which invariants prevent exploitation (e.g., upstream input
sanitization, constant value, framework guarantee).

Do NOT mark as false positive if exploitability hinges on assumptions that are not enforced by tests
or static guarantees.

## Compensating Controls Examples

- Runtime input validation library ensuring pattern constraints before vulnerable sink.
- Feature flag disabling risky code path in production until patch.
- WAF rule blocking specific injection vector during remediation window.

## Metrics & Reporting

Track monthly:

- Open High / Medium alert count vs baseline
- Mean time to remediate (MTTR) per severity bucket
- Number of active suppressions by severity & days outstanding
- Suppression SLA breaches (count past re-review date)

## Escalation Path

1. Suppression at risk of expiring in 3 days → automated reminder comment.
2. Past due date → escalation to team lead & Security Lead.
3. > 2 past-due High suppressions → add to engineering leadership weekly review.

## Review Cadence

- Weekly: High/Medium open alert review
- Monthly: Suppression & false positive audit (rotate reviewer)
- Quarterly: Policy effectiveness retrospective; adjust severity SLAs as needed

## Template Entry Example

```markdown
- Finding: js/path-traversal (https://github.com/org/repo/code-scanning/123)
  Severity: High
  Location: src/server/download.ts:88
  Decision: Temporary suppression
  Rationale: Legacy endpoint scheduled for deprecation next sprint; patch would duplicate refactor work.
  Compensating Controls: Endpoint behind auth + input whitelist ensures sanitized filenames.
  Owner: @security-champion
  Created: 2025-09-02
  Re-review: 2025-09-16
  Issue: #456
  Sunset Plan: Remove endpoint in refactor PR #789; suppression removed when file deleted.
```

---

Replace placeholders and integrate relevant sections into `SECURITY_NOTES.md` (do not copy entire
template verbatim). Keep this file as reference rather than a live policy ledger.
