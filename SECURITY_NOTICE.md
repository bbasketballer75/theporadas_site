SECURITY NOTICE

Summary
-------
A history rewrite was performed on this repository to remove sensitive tokens and a large backup bundle. Because a forced push was required, collaborators must re-sync their local clones to avoid working on the rewritten history.

Immediate collaborator actions
-----------------------------
1. Best (recommended): Re-clone the repository:

   git clone git@github.com:bbasketballer75/theporadas_site.git

2. Or, reset your existing local clone to the rewritten main branch (this will discard local commits that are not yet pushed):

   git fetch origin && git reset --hard origin/main

3. If you have local branches with work you'd like to preserve, create patches before resetting:

   git format-patch origin/main..HEAD --stdout > my-unpublished-work.patch

Rotation of exposed secrets (MUST DO)
-------------------------------------
The repository contained sensitive tokens and/or credentials in historical commits. Although those entries were removed from history, you MUST rotate any real credentials that may have been exposed. The steps below describe a recommended rotation checklist.

1. Identify exposed credentials
   - Collect a list of secrets that were present in commits or audit artifacts (commit-mapping-main.txt and report.md were generated during the rewrite). Treat any non-placeholder keys as compromised.

2. Rotate secrets for each provider
   - GitHub (personal access tokens or OAuth apps): Revoke the affected token(s) in GitHub -> Settings -> Developer settings -> Personal access tokens, and create new tokens with minimum required scopes.
   - Database credentials (Postgres, MySQL): Rotate users/passwords from your database admin console and update any connection strings used by servers, CI, and secrets managers.
   - Cloud providers (AWS, GCP, Azure): Revoke and regenerate API keys and service principals. Update CI/CD secrets and any running provisioned services.
   - Third-party APIs (Stripe, SendGrid, Twilio, etc.): Revoke the compromised keys in the vendors' dashboards and generate new ones.
   - SSH keys: If private keys were exposed, remove and re-provision them.

3. Update secrets in centralized stores
   - Update your CI/CD secret stores (GitHub Actions secrets, Azure DevOps variable groups, Travis/Circle secrets) with the newly generated values.
   - Update any vaults / secret managers (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) and rotate references in your infrastructure.

4. Update local development environments
   - Never commit secrets to the repository. Update .env files locally. Consider using a secrets helper or an encrypted secrets workflow for developers.

5. Revoke old keys where possible
   - If a service provides a "revoke all" or session invalidation action, consider invalidating all active sessions to ensure previously leaked tokens cannot be used.

6. Verify and monitor
   - After rotation, run integration tests and smoke tests to confirm services still work.
   - Monitor logs and provider dashboards for suspicious usages of rotated credentials.

How I can help (what I can do for you)
--------------------------------------
- I can prepare a prioritized checklist of credentials to rotate if you provide the list of suspected exposed credentials or the audit artifacts (commit-mapping-main.txt, report.md).
- I can open and manage GitHub Issues that document the rotation tasks and link to the audit artifacts — I will need a short-lived GitHub token with "repo" and "issues" scopes if you'd like me to operate on your repository issues directly.

If you want me to manage Issues/Tasks on GitHub
----------------------------------------------
Provide a GitHub personal access token (PAT) with the following scopes:
- repo (to read/write repository data)
- issues (to list, create, comment, and close issues)

Security guidance when providing a token:
- Use a short-lived token if possible and revoke it as soon as I'm done.
- Do NOT paste long-lived production tokens. Instead create a temporary PAT with the minimum needed scopes and share it via a secure channel.

Optional next steps I recommend now
----------------------------------
- Rotate the most-sensitive credentials immediately (database admin creds, cloud provider keys, GitHub apps) and update all CI secrets.
- Ask all collaborators to re-clone or run the reset command above.
- Run a repository audit (script: scripts/repo-audit.ps1) to locate any other large blobs or suspicious secrets that might remain.

Audit artifacts
---------------
- commit-mapping-main.txt (generated during the history-rewrite)
- report.md (audit summary generated during the history-rewrite)

Contact
-------
If you want me to perform the optional GitHub Issue management or run a repo audit and create issues for leftover TODOs, reply with a short-lived PAT and confirm whether you want me to open issues directly or just produce a list for you to review.
