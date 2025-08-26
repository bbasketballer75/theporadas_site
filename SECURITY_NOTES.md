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
