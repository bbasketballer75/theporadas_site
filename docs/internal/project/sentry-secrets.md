# Sentry Secrets & Provisioning

Status: Draft

## Required Secrets (GitHub Repository Secrets)

| Secret            | Purpose                        | Notes                                            |
| ----------------- | ------------------------------ | ------------------------------------------------ |
| SENTRY_DSN        | Runtime client DSN             | Used in browser (exposed; treat as public token) |
| SENTRY_AUTH_TOKEN | CLI auth for source map upload | Scoped token: project:releases, org:read         |
| SENTRY_ORG        | Organization slug              | Static string                                    |
| SENTRY_PROJECT    | Project slug                   | Static string                                    |

## Steps

1. Create Sentry project (Platform: Browser / React) -> copy DSN.
2. Generate auth token (Settings > Developer Settings > Auth Tokens) with minimal scopes:
   - project:releases (create/update)
   - org:read
3. Add secrets in GitHub: Settings > Secrets and variables > Actions > New repository secret.
4. (Optional) Add environment variable `VITE_SENTRY_DSN` in Vercel project settings so build injects DSN.
5. Trigger `sentry-source-maps.yml` manually (workflow_dispatch) to validate upload.
6. Verify release appears with source maps under Project > Releases.

### Helper Script (Optional)

From a local shell (with `gh auth status` showing logged in):

```powershell
pwsh scripts/run_sentry_source_maps.ps1 -Wait
```

This dispatches the workflow, prints the run URL, and (with `-Wait`) blocks until completion, failing if the run does not succeed.

### Discovering Org & Project Slugs

If you only have the DSN and token:

```powershell
pwsh scripts/get_sentry_slugs.ps1 -Token $env:SENTRY_AUTH_TOKEN -Dsn $env:SENTRY_DSN
```

Outputs `OrgSlug` and `ProjectSlug` for use as `SENTRY_ORG` and `SENTRY_PROJECT` secrets.

### Automated Secret Setting

You can set all required secrets (deriving slugs if possible) via:

```powershell
pwsh scripts/set_sentry_secrets.ps1 -Dsn $env:SENTRY_DSN -AuthToken $env:SENTRY_AUTH_TOKEN
```

If slug derivation fails, re-run including `-Org <slug> -Project <slug>` explicitly.

Verify existing secrets without modifying:

```powershell
pwsh scripts/set_sentry_secrets.ps1 -Verify
```

### Workflow Auto-Resolution

The `sentry-source-maps` workflow attempts to derive `SENTRY_ORG` / `SENTRY_PROJECT` from the DSN
plus auth token if those secrets are not present (numeric IDs extracted from DSN, mapped via the
Sentry API). If derivation fails, upload is skipped gracefully.

### Strict Mode & Verification

The workflow now:

- Uploads source maps without the prior permissive `|| true`.
- Adds a verification step that queries the Sentry Release API.
- Fails the job if the release or source maps are missing when `SENTRY_STRICT` (Actions variable) is `true` (default).

To disable strict failure temporarily (e.g., during initial setup), add an Actions Variable:

`SENTRY_STRICT = false`

Re-enable by removing or setting to `true`.

## Local Verification

```bash
VITE_SENTRY_DSN=$SENTRY_DSN npm run build
```

Check network panel for `o<number>.ingest.sentry.io` POSTs.

## Rotating Token

- Revoke old token in Sentry UI.
- Create new token; update `SENTRY_AUTH_TOKEN` secret.
- Re-run release workflow to confirm no auth errors.

## Future Enhancements

- Add release health: capture `web-vitals` and send as custom measurements (already helper `setMeasurement`).
- Add performance profiling sampling (adjust `tracesSampleRate`).

## Release & Environment Mapping

`sentryClient.ts` auto-detects:

- `release`: `__GIT_SHA__` (global) fallback to `VITE_GIT_SHA` env.
- `environment`: `MODE` (Vite) fallback `NODE_ENV` else `production`.

### CI Injection Strategy

In GitHub Actions before build:

```bash
echo "VITE_GIT_SHA=$GITHUB_SHA" >> $GITHUB_ENV
```

Optional HTML template injection (if adding global):

```html
<script>
  window.__GIT_SHA__ = '%GIT_SHA%';
</script>
```

### Sampling Policy

- Production trace sample: 0.3 (adjust if volume or cost acceptable).
- Non-prod: 1.0 for richer debugging.

### Web Vitals

CLS, LCP, INP forwarded as measurements via dynamic import of `web-vitals`.

### Enforcing Releases

Add gate in release workflow (optional):

```bash
test -n "$GITHUB_SHA" || { echo 'Missing GIT SHA'; exit 1; }
```
