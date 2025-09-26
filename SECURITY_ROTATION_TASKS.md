# Security credential rotation checklist

This file was created automatically to help coordinate credential rotation after the forced history rewrite.

What to do now (high level)

1. Inventory: find any credentials that may have been exposed in the repository's history.

   - Use `scripts/repo-audit.ps1` to find likely secret patterns and note locations.
   - Check cloud provider consoles (AWS, GCP, Azure), CI secrets, and any third-party services.

2. Rotate secrets (general guidance)

   - AWS: rotate access keys in IAM -> Create new key pair, update apps, then delete old key.
   - GitHub: rotate any personal access tokens and remove them from any GitHub Actions/workflows.
   - Database credentials: create a new user/password or rotate password and update service configs.
   - SSL/TLS keys and certificates: re-issue if private keys were exposed.

3. Update deployments and config

   - Replace old credentials in environment variable stores, secret managers, or vaults.
   - Re-deploy services that use rotated credentials.

4. Verify

   - Confirm services work after rotation and there are no authentication failures.
   - Re-run `scripts/repo-audit.ps1` to ensure no new leaks were introduced.

5. Track progress

   - Create issues or a secure checklist in your issue tracker for each credential that needs rotation.
   - Assign owners and due dates.

Suggested Slack/email text (copy/paste)

Hi team — we completed a forced history rewrite to remove sensitive data. Please rotate any credentials you may have used in the repo historically. See the repo root `SECURITY_ROTATION_TASKS.md` for detailed steps. If you need a hand, ping the maintainers.

Notes and caveats

- Rotation must be done in provider consoles or key stores — this script cannot rotate provider secrets automatically without provider credentials and explicit permission.
- Keep any new keys out of the repo. Use environment variables, secret managers, or vaults.

If you'd like, I can create GitHub issues for each credential listed in `audit-report.txt` once you provide a short-lived GitHub token with `repo` + `issues` scopes.
