GitHub token rotation playbook

Steps to rotate GitHub tokens (Personal Access Tokens, Oauth tokens, App tokens):

1. Identify the token type and where it is used (CI, local dev, integration).
2. Generate a new token with the minimal required scopes.
3. Update CI secrets, workflows, and documentation to use the new token stored in your secrets store (GitHub repo secrets or organization secrets where appropriate).
4. Revoke the old token from the GitHub settings page or via API.
5. Verify CI runs and integrations succeed with the new token and check audit logs for usage of the old token.
6. Document the rotation in the triage issue with evidence and timestamps.
