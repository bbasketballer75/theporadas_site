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

## Rotation checklist (detailed)

- [ ] Immediately revoke the exposed access key (remove or disable in IAM).
- [ ] Create a new access key with least privileges required and store it in a secure secret store (AWS Secrets Manager, Parameter Store, or equivalent).
- [ ] Update all systems (CI, deploy keys, servers) to use the new secret; prefer referencing the secret via environment variables or a secrets manager integration.
- [ ] Validate rollout by running smoke tests and verifying that services use the updated credential.
- [ ] Search other branches and forks for the exposed key and remove occurrences.
- [ ] Document the rotation event: rotation timestamp (UTC), new secret identifier (ARN or key name), and verification evidence (CI run id, logs, or ticket link).

### Rotation evidence comment format

When you rotate the secret, please post a comment on this issue using the following format so the automated check can detect it:

```text
rotation-evidence: Rotated at 2025-09-26T12:34:56Z; New secret stored in AWS Secrets Manager at arn:aws:secretsmanager:...; Rollout verified by job id: 12345
```

The `rotation-evidence` detector in the repository will add a `rotation-evidence-provided` label and remove `needs-rotation` when it sees a comment matching that pattern. Maintainers will still verify rollout before closing the issue.

## Archived raw outputs

If you need access to the fuller raw scan outputs for deeper analysis, they are intentionally stored only in curated releases. See the release link in the `Raw outputs` section above (TBD_release_url) or run the curated-triage workflow with the manual dispatch to create a release.
