# Security Notes

Last updated: 2025-08-26

## Current Vulnerability Posture

After recent remediation:

- High: 0
- Moderate: 0
- Low: 4 (all via transitive deps under `@lhci/cli`)

These low severity findings are in tooling only (Lighthouse CI) and never ship to production runtime code. Risk is constrained to local/CI environments.

### 2025-08-27 Audit Recheck

Post upgrade of `@lhci/cli` to latest, residual low severities persist referencing
transitive `tmp` (GHSA-52f5-9888-hmc6) via `external-editor` / `inquirer`.
No high/moderate findings. Advisory scope remains dev/CI tooling.
Will auto-resolve once upstream releases a patched chain (or once `tmp >0.2.3`
is adopted by dependents). No further action required beyond weekly audit
monitoring.

## Rationale For Acceptance

- Scope: Dev/CI only; not bundled into `dist/` build.
- Exploitability: Requires local developer execution or CI compromise.
- Update Status: `@lhci/cli@0.15.1` is current; upstream transitive patches not yet released.
- Cost/Benefit: Forking & patching would add maintenance overhead outweighing marginal risk reduction.

## Compensating Controls

- Husky pre-push runs full test + lint preventing accidental inclusion of tooling code in prod bundle.
- `.gitignore` excludes secrets; runtime secrets loaded only through `.env` (not committed) or CI secret store.
- Principle of least privilege for MCP filesystem sandbox (`MCP_FS_ROOT`).
- Regular coverage & Lighthouse quality gates discourage risky ad-hoc tooling modifications.

## Monitoring Plan

- Re-run `npm audit --production` weekly (script can be added later) to detect any escalation in severity.
- If any low advisory is reclassified (e.g., upgraded to moderate/high) open a remediation issue within 24h.
- Revisit after major `@lhci/cli` release or when transitive deps publish patched versions.

## Future Hardening Opportunities

Tracked in follow-up issue (to be created):

1. Add automated weekly security audit workflow (GitHub Actions).
2. Enable `npm audit signatures` (when broadly available) / consider `oss-review-toolkit` integration.
3. Supply chain: Pin exact versions for build tooling with integrity hashes (npm lockfile v3 already helps).
4. Runtime sandboxing for any future server components (Node `--policy` / container isolation).
5. Add SAST (CodeQL) & dependency scanning (Dependabot) if not already enabled in repo settings.

## Immediate Action Triggers

Open an expedited security task if ANY of:

- New high/critical advisory in direct dependency.
- Public exploit (PoC) affecting a current tool dependency.
- Leakage of `.env` or CI secrets suspected.

---

## CodeQL Enablement Quick Checklist (Actionable)

Use this condensed list when you are ready to turn on Code Scanning / CodeQL
and let the automation append the immutable verification section.

1. Licensing / Visibility: Ensure the repo is public (free CodeQL) OR that
   GitHub Advanced Security (GHAS) is enabled for the org (Settings > Code
   security and analysis should show Advanced Security toggles). If private
   without GHAS, either (a) obtain GHAS entitlement, or (b) make the repo
   public temporarily to capture baseline.
1. Avoid Duplication: In Settings > Code security and analysis > Code scanning,
   either (a) keep ONLY the advanced workflow (`.github/workflows/codeql.yml`)
   or (b) use default setup – do NOT enable both (duplicate scans & noise). If
   "Default setup" was enabled inadvertently, click Disable so the workflow
   remains the single source.
1. Review Workflow: Open `.github/workflows/codeql.yml` – confirm languages
   matrix (`javascript-typescript`) and `queries: +security-and-quality` meet
   expectations. Add additional language entries if future compiled languages
   are introduced.
1. (Optional) Build Step: If / when native build steps become necessary (e.g.,
   multi-language or generated code), insert them between Init and Analyze
   steps (currently Autobuild is a no-op for pure TS).
1. Trigger First Run: Dispatch manually (Actions > codeql > Run workflow) or
   push a trivial commit (e.g., docs). Monitor the run for a successful
   `github/codeql-action/analyze@v3` step and absence of SARIF upload errors.
1. Verify Enablement: After run completes, visit Security > Code scanning
   alerts – expect alert list (possibly zero if clean). API check (PowerShell):

```powershell
$env:GITHUB_TOKEN = 'REDACTED_GITHUB_PAT'
gh api repos/bbasketballer75/theporadas_site \
  | jq -r '.security_and_analysis.advanced_security.status'
gh api repos/bbasketballer75/theporadas_site/code-scanning/alerts --paginate \
  | jq length
```

1. Automation Confirmation: The workflow step "Append CodeQL verification
   section" invokes `scripts/codeql_verify_append.mjs`. On the first successful
   alert fetch (HTTP 200), it appends the heading
   `## CodeQL Baseline Verification (First Automated Run YYYY-MM-DD)` to
   `SECURITY_NOTES.md` and commits it. If feature still disabled (403/404), it
   no-ops.
1. Triage Window: Open issues for all High / Medium alerts within 24h. Document
   rationale for any accepted Low in `SECURITY_NOTES.md` (do not edit the
   immutable verification section; add rationale elsewhere under Posture
   Updates).
1. Follow-On Hardening: Keep Dependabot & weekly audit green, and schedule
   monthly drift review (new alerts, fix SLAs, closure metrics).
1. Future Enhancements: (Optional) Extend the script to produce trend deltas or
   enable PR-only variant of default setup if additional languages are added.

If the Trigger, Verify, and Automation Confirmation steps complete successfully,
the remaining baseline tasks are fully automated; no manual edits to the
verification section are necessary or desired.

---

## CodeQL Baseline (Established Manually 2025-08-27)

Baseline established manually pending successful automated SARIF upload
(GitHub Advanced Security / Code Scanning currently not enabled for alerts
retrieval via API with provided token). This snapshot documents the initial
posture at the time the repository transitioned to public for enabling
CodeQL workflows.

Metrics (initial run – counts unavailable due to 403 on alert API; will
refresh automatically once Code Scanning fully enabled):

- Alerts (Total): N/A (API 403)
- Critical: N/A
- High: N/A
- Medium: N/A
- Low: N/A
- Query Suite: security-and-quality (default)

Source: `codeql.yml` workflow executed on commit `d175f8e` (chore(ci): trigger
CodeQL baseline finalize run).

Limitations: SARIF upload / alert enumeration not yet verifiable; numbers
will be updated (in additive historical section, not mutating this baseline)
once Code Scanning is enabled and first successful alert ingestion completes.
This preserves an immutable record of pre-alert visibility state.

Follow-Up Actions:

1. Enable Code Scanning (if private) or confirm public status retains CodeQL.
2. Re-run `codeql` workflow; verify SARIF upload success.
3. Append new section "CodeQL Baseline (Verified YYYY-MM-DD)" with concrete counts.
4. Triage any surfaced High/Medium alerts within 7 days; document accepted Low with rationale.

Rationale: Provides audit trail even when platform feature gating delays full telemetry.

---

## CodeQL Baseline Verification (Pending Enablement)

Status (2025-08-27): Automated CodeQL workflow runs (`codeql.yml`) execute analysis but
SARIF upload / alert enumeration returns HTTP 404 (feature not enabled). This confirms
Code Scanning (GitHub Advanced Security) is still disabled for this repository.

Latest attempt: manually dispatched workflow (see GitHub Actions run list same date).

Next required activation steps (recap):

1. Enable Code Scanning under Settings > Code security and analysis (or make repo public
   if using public coverage temporarily).
2. Re-dispatch workflow (`gh workflow run codeql.yml`) and wait for successful upload.
3. Fetch alerts JSON (gh api .../code-scanning/alerts) and create verification section
   with concrete counts (this section remains immutable; a new one will be appended).

Planned follow-up section title after success:
"## CodeQL Baseline Verification (First Automated Run YYYY-MM-DD)".

Until then this pending section records attempted activation and preserves integrity of
the original manual baseline above.

---

## Implemented Automation (Posture Update)

Added after initial acceptance to reduce mean-time-to-detection (MTTD):

- Dependabot (`.github/dependabot.yml`): Daily npm, weekly GitHub Actions
  updates, grouped minor/patch. Keeps dev & CI tooling current and narrows
  vulnerable window.
- CodeQL (`codeql` workflow): Static analysis (security + quality queries) on
  push/PR to `main` and weekly schedule; surfaced alerts require triage & fix
  or documented deferral.
  - Verification append automation: Once Code Scanning enabled, step
    `Append CodeQL verification section (post-enable)` runs
    `scripts/codeql_verify_append.mjs` to add an immutable
    "First Automated Run" section with concrete counts (idempotent; no change if
    already appended or feature still disabled).
- Weekly Audit (`weekly-audit` workflow): Runs `npm audit --json` and
  `scripts/ci_audit_guard.mjs` comparing results to
  `security/audit-baseline.json`. Fails CI on new or escalated moderate+
  production dependency vulnerabilities. Dev-only findings excluded by
  default (override with `AUDIT_ALLOW_DEV=1`). Severity threshold adjustable
  via `AUDIT_FAIL_LEVEL`.
- Audit Guard Script: Tracks only advisory IDs & severities; prevents silent
  regression by enforcing explicit baseline updates (with rationale) for
  tolerated issues.

Process:

1. New alert (Dependabot / CodeQL / audit guard) triggers issue creation
   within 24h.
2. If remediation not immediate, update baseline & document justification
   here (including planned removal date) – discouraged except for low
   severity tooling-only cases.
3. High / critical runtime vulns: immediate patch or mitigating control
   deployment (lockfile pin, temporary removal of feature) prior to merge of
   unrelated work.

Metrics (manual tracking initially): time from advisory publication →
detection (Dependabot PR timestamp), time to merge remediation, count of
baseline exceptions.

Review Cadence: Monthly review of baseline + closed alerts to ensure no lingering accepted risks without renewed justification.

## CodeQL Gating Rationale (Temporary Control)

Status: Original conditional skip was documented here. The gating line has since been
removed from `codeql.yml`; current blocker is feature enablement (Code Scanning itself),
not workflow condition. This historical rationale is retained for audit context.

### What Exists

- Workflow: `.github/workflows/codeql.yml`
- Job condition:

```yaml
if: ${{ !github.event.repository.private || vars.ENABLE_CODEQL == 'true' }}
```

- Result: On a private repo without the repository variable `ENABLE_CODEQL` set to `true`,
  the `analyze` job is skipped (conclusion = `skipped`).

### Why This Gating Was Added

Initial CodeQL run failed uploading SARIF because Code Scanning (GitHub Advanced
Security) is not yet enabled for the private repository. Repeated failures would
create alert noise and reduce signal for genuine security regressions. The gate
provides an explicit activation point once prerequisites are satisfied.

### How to Enable CodeQL Analysis

1. Enable Code Scanning in repository settings (Security & analysis) – requires GHAS
   entitlement for private repos.
2. Add repository variable:

```bash
gh variable set ENABLE_CODEQL -b true
```

1. Manually dispatch or push to `main` to trigger workflow.
2. Confirm run conclusion is `success` and review any CodeQL alerts under
   Security > Code scanning alerts.

### Baseline Triage Checklist

Upon first successful run:

1. Export list of alerts (CSV/UI) and create issues for each High/Medium.
2. Document any accepted Low findings here with justification + sunset date.
3. Add remediation PRs or suppressions (after evaluating true positives) – prefer
   code fixes over suppressions.

### When To Remove Gating Condition

Remove once: (a) Code Scanning reliably enabled, (b) first successful baseline
completed, (c) no policy requiring a manual override. Keeping the condition after
permanent enablement adds unnecessary complexity.

### Patch To Remove Gating

Apply the following diff (or equivalent) to delete only the conditional line
(retain the rest of the workflow):

```diff
--- a/.github/workflows/codeql.yml
+++ b/.github/workflows/codeql.yml
@@
 jobs:
   analyze:
-    if: ${{ !github.event.repository.private || vars.ENABLE_CODEQL == 'true' }}
     permissions:
       contents: read
       security-events: write
```

After removal also delete the repository variable `ENABLE_CODEQL` (optional cleanup):

```bash
gh variable delete ENABLE_CODEQL
```

### Risk Assessment

Risk of leaving gating indefinitely: potential for forgetting to ever enable SAST
coverage. Mitigation: this section plus a calendar reminder / monthly review item.

### Removal Tracking

- Target date to enable & remove gate: <set once GHAS entitlement confirmed>.
- Owner: Security/Dev Lead.

### 2025-08-27 Baseline Attempt Status

An initial manual dispatch of `codeql.yml` (run id recorded in Actions) executed analysis successfully locally but FAILED on SARIF upload with:

```text
Code scanning is not enabled for this repository. Please enable code scanning in the repository settings.
```

Indicators:

- Workflow concluded `failure` only at the SARIF upload step.
- Repository REST metadata response lacks `security_and_analysis` field (typical when Advanced Security is not available / not enabled for a
  private repo on the current plan).
- API PATCH with `security_and_analysis.advanced_security.status="enabled"` returned HTTP 422 (Invalid security_and_analysis payload),
  confirming plan / entitlement limitation (not syntax).

Implication: Baseline cannot be established until GitHub Advanced Security (Code Scanning) is enabled for this private repository (allocate GHAS
seat or make repo public temporarily).

Next Actions Required (manual):

1. Upgrade plan or allocate GHAS seat(s) that include Code Scanning for private repositories.
2. In repository Settings > Code security and analysis, enable Code scanning (Default / CodeQL) and confirm toggle shows enabled.
3. (Optional) Temporarily make repository public, re-run baseline, then revert to private after licensing obtained.
4. Re-dispatch `codeql.yml` (workflow_dispatch) and confirm SARIF upload success (run conclusion success; alerts visible under Security > Code
   scanning alerts).
5. Resume the Baseline Triage Checklist above, then remove gating line and delete `ENABLE_CODEQL` variable.

Contingency (if GHAS enablement delayed):

- Keep gating condition to avoid recurrent failing runs (prevents CI noise).
- Optionally run local CodeQL CLI for preliminary insight (results remain local) and manually document any high severity findings.

Status Flag: Gating retained pending successful SARIF upload.

## Secret Rotation Cadence & Procedure

Scope: All long‑lived credentials used in CI, automation scripts, and external
integrations (e.g., `GITHUB_APP_PRIVATE_KEY`, cloud API keys, third‑party
service tokens) — excluding ephemeral OIDC exchanges (rotated per run) and
short‑lived installation tokens.

Rotation Cadence (Baseline Targets):

- High sensitivity (privileged cloud deploy keys, GitHub App private key): 90 days.
- Medium sensitivity (read‑only analytics / monitoring tokens): 180 days.
- Low sensitivity (sandbox / non‑prod service tokens): 365 days (or sooner if provider offers automated rotation hooks).
- Immediate (out‑of‑band): Upon suspected compromise, personnel departure, scope change reducing least privilege, provider breach notification.

Process (Two‑Phase Overlap to Avoid Outage):

1. Preparation:
   - Identify secret in inventory; confirm usage points (workflows, scripts, env vars, deployment configs).
   - Verify least privilege; if over‑scoped, reduce before rotating (principle of reducing blast radius first).
2. Generate New Secret:
   - Create new credential with identical or narrower permissions.
   - Label with creation date (if provider supports descriptions / tags).
3. Dual Deployment Window:
   - Add new secret alongside old (e.g., `SERVICE_TOKEN_NEW`) in CI secrets store.
   - Update workflows / scripts to attempt `*_NEW` first, fallback to old, OR
     deploy in feature branch referencing new name only if zero‑downtime
     assured.
4. Validation:
   - Run targeted dry‑run workflow (workflow_dispatch) referencing new secret.
   - Check logs for successful auth; ensure no references to deprecated token remain (search repo & Actions logs).
5. Cutover:
   - Replace original secret value with new credential (or rename `*_NEW` back to canonical name once validated).
   - Remove temporary dual secret variable to prevent drift.
6. Revoke Old Secret:
   - In provider console revoke/delete old credential. Confirm revocation (attempt auth should fail or provider shows invalidated status).
7. Record & Audit:
   - Append rotation entry to internal rotation log (future: dedicated
     `security/secret-rotation-log.json`). Include: secret name (abstracted if
     sensitive), date, operator, reason (scheduled/unscheduled), verification
     run id.
8. Monitor:
   - For 24h after cutover, monitor error rates & auth failure logs; rollback path (re‑issue new token) if elevated failures detected.

Emergency Rotation Shortcut:

- Skip dual deployment; immediately revoke suspected compromised secret,
  generate replacement, update CI, run validation workflow. Accept brief
  disruption risk in favor of containment.

Tooling / Automation Roadmap:

- Add `scripts/secret_rotation_audit.mjs` (future) to enumerate last rotation
  timestamps and fail CI if exceeding threshold (except whitelisted
  ephemeral classes).
- Adopt provider native automated rotation (e.g., GitHub Actions OIDC for cloud deploys) to reduce manual secrets surface.

Evidence of Compliance:

- Until automation exists, manual attest: run `gh secret list` (or provider
  equivalent) monthly and compare against rotation schedule; document
  exceptions here with justification & next rotation date.

Risk if Deferred:

- Prolonged window for credential misuse (esp. GitHub App private key leak enabling unauthorized installations tokens issuance).
- Harder incident forensics (unclear which credential active when anomaly occurred) and larger impacted time span.

KPIs (to iterate): Mean Rotation Latency (MRL), % Secrets Overdue, Number of Emergency Rotations per Quarter.

## Fine-Grained PAT Checks / Annotations Limitation

Context (2025-06+): Fine-grained personal access tokens (PATs) cannot currently
be granted the `Checks` permission despite the REST docs listing it. Attempts
to query Checks or PR annotations endpoints with a fine-grained PAT yield 403
("Resource not accessible by personal access token"). GitHub support (community
discussion #129512) confirmed the permission was disabled and only GitHub Apps
(or the default `GITHUB_TOKEN` within Actions) can access those APIs. Classic
PATs still work but are discouraged; prefer a GitHub App for any external
polling or automation needing Checks or annotations details.

Reference: [GitHub community discussion #129512](https://github.com/orgs/community/discussions/129512)

Implications for this repository:

- All workflow-generated annotations (CodeQL, linters) rely on the built-in
  `GITHUB_TOKEN` — no additional change required.
- External tooling should authenticate as a GitHub App (installation token)
  rather than a fine-grained PAT when needing Checks / annotations.
- If GitHub restores the fine-grained PAT Checks permission, re-evaluate and
  potentially retire the App-based polling script.

Added Script: `scripts/code_scanning_app_fetch.mjs` demonstrates retrieving
Code Scanning alerts via a GitHub App installation token.

## GitHub App Setup (Code Scanning Alert Polling)

Purpose: Provide least-privilege external access (outside Actions) to read Code Scanning
alerts and (optionally) Checks/annotations without relying on classic PATs.

### Minimal Permissions

Repository permissions (choose only what is needed):

- Code scanning alerts: Read (REQUIRED for alert polling)
- Metadata: Read (implicit / always granted)

Optional (only if future automation requires them – DO NOT over-grant now):

- Checks: Read (to list check runs / annotations) – currently satisfied by `GITHUB_TOKEN` inside workflows; external polling may add later.
- Contents: Read (if needing to resolve file blobs beyond alert metadata)

Do NOT grant write scopes (Code scanning alerts: Write, Contents: Write, etc.) unless a specific, reviewed use case (e.g., programmatic dismissal
with rationale) is approved.

### Creation Steps

- Navigate: GitHub (web) > Settings (user or org) > Developer settings > GitHub Apps > New GitHub App.
- Basic Info:
  - Name: `theporadas-security-reader` (or org-wide variant)
  - Homepage URL: Repository URL.
  - Webhook: Disabled (not needed for pull-only polling). Leave secret blank.
- Permissions (Repository): Set only:
  - Code scanning alerts: Read
- Skip all other permissions; GitHub auto-adds Metadata.
- Where can this GitHub App be installed? Choose: Only on this account (default) or organization as appropriate.
- Create App.
- Generate Private Key (PEM). Store securely (password manager / secret vault). You can regenerate later; old key invalidates immediately.
- Install App: Click Install App, select the target repository (`bbasketballer75/theporadas_site`). Record Installation ID from the URL or via
  API.

### Mapping To Environment Variables

The polling script (`scripts/code_scanning_app_fetch.mjs`) expects:

| Variable                 | Value Source                                                        |
| ------------------------ | ------------------------------------------------------------------- |
| `GITHUB_APP_ID`          | Numeric App ID (shown on App page)                                  |
| `GITHUB_APP_PRIVATE_KEY` | Entire PEM contents (use `\n` escapes in single-line secret stores) |
| `GITHUB_INSTALLATION_ID` | Numeric Installation ID (URL segment after `/installation/`)        |
| `GITHUB_REPOSITORY`      | `bbasketballer75/theporadas_site`                                   |

Example (PowerShell, local dev):

```powershell
$env:GITHUB_APP_ID = '123456'
$env:GITHUB_INSTALLATION_ID = '987654321'
$env:GITHUB_REPOSITORY = 'bbasketballer75/theporadas_site'
$env:GITHUB_APP_PRIVATE_KEY = (Get-Content .\.keys\app_private_key.pem -Raw)
node scripts/code_scanning_app_fetch.mjs OUTPUT=json > codeql_alerts.json
```

In GitHub Actions, store each as an Actions Secret (except repository which is implicit) – then export into the job environment only for
the step invoking the script:

```yaml
   - name: Fetch Code Scanning alerts via App
    env:
      GITHUB_APP_ID: ${{ secrets.APP_ID }}
      GITHUB_APP_PRIVATE_KEY: ${{ secrets.APP_PRIVATE_KEY }}
      GITHUB_INSTALLATION_ID: ${{ secrets.APP_INSTALLATION_ID }}
      GITHUB_REPOSITORY: ${{ github.repository }}
    run: node scripts/code_scanning_app_fetch.mjs OUTPUT=json > codeql_alerts.json
```

### Rotating The Private Key

1. Generate new key on the App page.
2. Update the secret (`APP_PRIVATE_KEY`) promptly.
3. Remove the old key file locally. Keys are JWT-signed per request; rotation does not invalidate existing installation access tokens immediately
   (they naturally expire ~1 hour), but future token creation requires the new key.

### Security Considerations

- Principle of least privilege: keep only read access.
- No webhook reduces external attack surface (script uses pull model).
- Store private key encrypted at rest; avoid committing any PEM artifacts.
- Consider a periodic script (CI) to compare live permissions with an expected manifest to detect drift.

### Future Enhancements (Optional)

- Add minimal Checks: Read permission if future external dashboard needs per-alert annotations.
- Add automation to parse severity counts and push a short markdown summary into `SECURITY_NOTES.md` during monthly review.
- Integrate with a security dashboard (e.g., lightweight status badge generated from the JSON summary).

---
