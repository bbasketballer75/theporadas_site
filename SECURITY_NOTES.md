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
