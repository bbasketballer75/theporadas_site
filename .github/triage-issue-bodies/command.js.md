Triage for file: command.js

Evidence extracted from security-scans: potential references to tokens or patterns.

Suggested action:
- Review the referenced lines in security-scans/* to determine if these are false positives.
- If confirmed, add a comment to the per-commit triage issues referencing the file.

Auto-generated file: .github/triage-issue-bodies/command.js.md

## Remediation checklist & rotation evidence

- [ ] Validate whether the matched token/line is a false positive.
- [ ] If confirmed sensitive: identify impacted systems and rotate secrets.
- [ ] Remove secrets from repo/CI and replace usage with a secret manager reference.
- [ ] File rotation evidence below and close the issue when complete.

- Rotated at (UTC):
- New secret storage location:
- Systems updated:
- Notes / audit links:

Reference playbooks: security-scans/rotation-playbooks/general.md

