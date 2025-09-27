General secret rotation playbook

1. Confirm the secret type and impact (API key, database password, TLS key).
2. Create a replacement secret using your secret manager of choice.
3. Update applications, CI, and deployment environments to use the new secret.
4. Revoke the old secret and verify no failing systems remain.
5. Rotate any dependent credentials (e.g., service account tokens) as needed.
6. Document rotation with timestamps and evidence in the triage issue.
