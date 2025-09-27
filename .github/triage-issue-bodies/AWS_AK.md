# Triage: AWS_AK

**Matches found:** 400


## Samples

# Samples for AWS_AK


- "ff32301ddb6d6ec031befd9a26fd32c0121bee94: 35:f468a36fcbf9a4164d28367c8efaac70f56f9eb9:git-secrets:242:  add_config 'secrets.allowed' 'REDACTED_BY_AUDIT_ISSUE_70'"
- "ff32301ddb6d6ec031befd9a26fd32c0121bee94: 37:b4ac101ebc39306ea448a16e5f243f0c3ae7cd24:git-secrets:242:  add_config 'secrets.allowed' 'REDACTED_BY_AUDIT_ISSUE_70'"
- "ff32301ddb6d6ec031befd9a26fd32c0121bee94: 39:84e45fe02ffcb01895ff07a0f0c4c56ffa615b01:git-secrets:242:  add_config 'secrets.allowed' 'REDACTED_BY_AUDIT_ISSUE_70'"
- "ff32301ddb6d6ec031befd9a26fd32c0121bee94: 41:edfa635eaa90fcf5748437e9dcf69c95b500632d:git-secrets:242:  add_config 'secrets.allowed' 'REDACTED_BY_AUDIT_ISSUE_70'"
- "ff32301ddb6d6ec031befd9a26fd32c0121bee94: 43:dac3cf7a5da15197f525722d1958fca8aded7cae:git-secrets:242:  add_config 'secrets.allowed' 'REDACTED_BY_AUDIT_ISSUE_70'"

## Raw outputs

Raw scans and full outputs are archived in the release: TBD_release_url

## Remediation checklist & rotation evidence

- [ ] Confirm whether this is a false positive (examples or test data).
- [ ] If valid exposure: revoke and rotate the AWS credential immediately.
- [ ] Replace the old key with a new key stored in a secure secrets manager (e.g., AWS Secrets Manager) and update all systems referencing it.
- [ ] Update CI/CD and deployment environments to reference the new secret; avoid committing secrets to the repo.
- [ ] Check access logs for suspicious activity and, if any, treat as a potential compromise.

Please add rotation evidence below when you rotate the credential:

- Rotated at (UTC):
- New secret storage location:
- Rollout verification (systems updated):
- Notes / audit links:

Reference rotation playbooks: security-scans/rotation-playbooks/aws.md


