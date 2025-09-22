# Security Headers & CSP Plan

Status: Draft
Owner: TBD

## Objectives

- Maintain strict baseline security headers.
- Transition CSP from report-only to enforced after violation triage.
- Automate integrity hashing for inline scripts (if introduced) to eliminate `'unsafe-inline'` allowances.

## Current Headers (From `vercel.json`)

| Header                     | Value (abridged)                                                 | Notes                                       |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| X-Frame-Options            | DENY                                                             | Prevents clickjacking.                      |
| X-Content-Type-Options     | nosniff                                                          | MIME sniff mitigation.                      |
| Referrer-Policy            | strict-origin-when-cross-origin                                  | Balanced privacy.                           |
| Permissions-Policy         | camera=(), microphone=(), geolocation=(self)                     | Restricts powerful features.                |
| Cross-Origin-Opener-Policy | same-origin                                                      | Isolation for popups.                       |
| Strict-Transport-Security  | 1y + subdomains + preload                                        | Eligible for preload submit.                |
| Content-Security-Policy    | default 'self'; script 'self'; style 'self' 'unsafe-inline'; ... | Needs refinement.                           |
| CSP Report-Only            | default 'self'                                                   | Narrow; used only for additional telemetry. |
| Report-To                  | csp-endpoint                                                     | Endpoint local aggregator.                  |

## Gaps / Improvements

1. Remove `'unsafe-inline'` from `style-src` (introduce nonces or hash pipeline) once all inline styles are migrated.
2. Consolidate duplicate reporting (decide between `Report-To` and `Reporting-Endpoints` long-term; deprecate legacy once browser coverage sufficient).
3. Add `require-trusted-types-for 'script'` after verifying no dynamic script injections (optional defense-in-depth).
4. Ensure no external analytics/scripts load before explicit allowlisting (update `script-src`).
5. Add `frame-src` explicitly (currently inherited from default). Keep locked to `'self'`.
6. Evaluate need for `connect-src` additions (observability vendor etc.).
7. Prepare hardened CSP variant file for staged rollout.

## CSP Hardening Roadmap

| Phase | Action                                          | Criteria                             | Rollback                             |
| ----- | ----------------------------------------------- | ------------------------------------ | ------------------------------------ |
| 1     | Audit violations (report-only)                  | < 5 unique legitimate violations/day | N/A                                  |
| 2     | Remove unused allowances (inline styles)        | Inline count = 0 in build output     | Revert commit                        |
| 3     | Add hashes/nonces for essential inline (if any) | Hash pipeline stable in CI           | Re-add `'unsafe-inline'` temporarily |
| 4     | Enforce hardened CSP                            | Violation rate < 0.01/1k             | Switch back to report-only           |

## Automation Concepts

- Script to scan built `dist` for inline `<style>` / `<script>` and generate SHA256 hashes.
- Validation step in CI failing if inline found without corresponding hash entry.
- Daily job parsing `/api/csp-report` JSONL (to implement) summarizing top violators.

## Open Tasks

- [ ] Implement hash generation script.
- [ ] Build step: fail on new inline style/script without hash.
- [ ] Add storage & rotation for CSP reports (e.g., append to `artifacts/csp_reports/*.jsonl`).
- [ ] Harden style-src (remove `'unsafe-inline'`).
- [ ] Evaluate Trusted Types feasibility (React 19 – likely limited benefit initially).
- [ ] Document rollback procedure (flip header value via PR).

## Rollback Procedure (Draft)

1. Revert commit modifying CSP in `vercel.json` or patch header to add previous allowances.
2. Merge with expedited review (security + on-call).
3. Invalidate CDN cache if required (Vercel deploy triggers new edge config automatically).
4. Post-mortem if rollback executed.

## Notes

Keep this document versioned; reference in launch KPIs doc once enforcement date scheduled.
