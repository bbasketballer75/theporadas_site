# Security Notes

Last updated: 2025-08-26

## Current Vulnerability Posture

After recent remediation:

- High: 0
- Moderate: 0
- Low: 4 (all via transitive deps under `@lhci/cli`)

These low severity findings are in tooling only (Lighthouse CI) and never ship to production runtime code. Risk is constrained to local/CI environments.

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

This file documents deliberate risk acceptance to aid future audits.

---

## Implemented Automation (Posture Update)

Added after initial acceptance to reduce mean-time-to-detection (MTTD):

- Dependabot (`.github/dependabot.yml`): Daily npm, weekly GitHub Actions
  updates, grouped minor/patch. Keeps dev & CI tooling current and narrows
  vulnerable window.
- CodeQL (`codeql` workflow): Static analysis (security + quality queries) on
  push/PR to `main` and weekly schedule; surfaced alerts require triage & fix
  or documented deferral.
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

Status: Implemented conditional skip to avoid noisy failing runs while repository Code Scanning is disabled for this private repo.

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
