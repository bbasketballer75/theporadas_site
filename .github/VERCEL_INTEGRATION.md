# Vercel GitHub App integration

Recommended: connect the Vercel GitHub App to this repository for seamless preview deployments.

Steps to enable the GitHub App:

1. In Vercel, open your project and go to Settings -> Git Integrations.
2. Click "Install Vercel for GitHub" and follow the prompts to grant access to this repository (or the organization).
3. In Vercel project settings, ensure the project is linked to the correct GitHub repository and that Preview Branches are enabled.

What this enables:

- Automatic preview deployments for every PR with status checks and preview URLs posted by Vercel directly to the PR.
- Eliminates the need for CI to run Vercel CLI or call deploy hooks for previews; the repository CI now focuses on building artifacts, running tests, lint, and image optimization.

If previews are not appearing:

- Verify the Vercel GitHub App is installed and has permission to this repository.
- Confirm the Vercel project is linked to the correct Git branch and project.
- If necessary, use a Vercel Deploy Hook (VERCEL_DEPLOY_HOOK) or CLI token (VERCEL_TOKEN) for manual or CI-triggered deployments.

Sample vercel.json (optional)

```json
{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/next" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```
