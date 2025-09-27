Vercel GitHub App - Quick Install Checklist

1. In Vercel, click "Import Project" and choose the GitHub repository (or install the Vercel GitHub App and allow access to this repository).
2. Link the new Vercel Project to this repository and configure the Production Branch (usually `main`).
3. In Vercel Project Settings, enable Preview Deployments for Pull Requests.
4. Optionally create a Deploy Hook (Settings → Git → Deploy Hooks) and add the hook URL to this repo's secrets as `VERCEL_DEPLOY_HOOK`.
5. If you want CI-triggered deploys (CLI fallback), create a Project Token and add `VERCEL_TOKEN` and `VERCEL_ORG_ID` secrets to the repository.
6. Run `./scripts/check-vercel-integration.ps1` (or run in CI with `VERCEL_TOKEN` set) to verify project linking.

Notes:

- The recommended approach is the GitHub App: it posts preview URLs directly to PRs and manages the build lifecycle. Use deploy hooks only if you cannot install the GitHub App.
