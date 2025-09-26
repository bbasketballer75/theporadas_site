Triage for file: mcp.js

Evidence extracted from security-scans: references to this script in historical commits may contain noisy tokens or examples.

Suggested action:
- Inspect the referenced lines and tag as false-positive or exposure as appropriate.

Auto-generated file: .github/triage-issue-bodies/mcp.js.md

## Remediation checklist & rotation evidence

- [ ] Confirm false positive status.
- [ ] If real, rotate the token/secret and update the code to read from a secret manager.
- [ ] Update documentation and add integration test coverage to avoid accidental checkins.

Rotation evidence:

- Rotated at (UTC):
- New secret store:
- Validation steps:

Playbooks: security-scans/rotation-playbooks/general.md

