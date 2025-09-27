Triage for file: git-secrets

Evidence: Numerous historical entries reference 'git-secrets' configuration lines that include the example token REDACTED_BY_AUDIT_ISSUE_70. These appear to be example entries added by git-secrets or related tooling.

Suggested action:

- Confirm these are example/test entries (likely false positives).
- If benign, add label security/false-positive and close the per-file issue.
- Otherwise, rotate any real tokens and update the master rotation issue #43.

Auto-generated file: .github/triage-issue-bodies/git-secrets.md

## Remediation checklist & rotation evidence

- [ ] Determine if the detection is an example/allowed entry in git-secrets or a real secret.
- [ ] If allowed example: update git-secrets configuration to avoid noisy matches and document why this is safe.
- [ ] If real exposure: remove the secret, rotate it, and update the allow/deny lists.

Rotation evidence:

- Rotated at (UTC):
- Files or commits affected:
- Steps taken to prevent recurrence:

See rotation playbooks: security-scans/rotation-playbooks/general.md and security-scans/rotation-playbooks/github.md
