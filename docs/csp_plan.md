# Content Security Policy Plan

## Current State (Enforced)

The CSP is now enforced (not only report-only) via `vercel.json` with reporting enabled:

```text
Content-Security-Policy: \
  default-src 'self'; \
  script-src 'self'; \
  style-src 'self'; \
  img-src 'self' data:; \
  font-src 'self' data:; \
  connect-src 'self'; \
  frame-ancestors 'none'; \
  base-uri 'self'; \
  form-action 'self'; \
  object-src 'none'; \
  upgrade-insecure-requests; \
  report-uri /api/csp-report
```

Key changes since initial baseline:

- Removed `'unsafe-inline'` from `style-src` after eliminating inline styles.
- Added explicit `object-src 'none'`.
- Added `upgrade-insecure-requests` to guard against mixed content.
- Added `report-uri /api/csp-report` wired to a lightweight Edge function for telemetry.
- No inline `<script>` blocks are present in production HTML; a hash auditor confirms.

## Phased Tightening (Historic & Forward)

Completed phases:

1. Inventory & remove inline `<style>` / style attributes (none remaining).
2. Remove `'unsafe-inline'` from `style-src` (now strict).
3. Add explicit `object-src 'none'`.
4. Introduce `upgrade-insecure-requests`.
5. Implement reporting endpoint (`/api/csp-report`) and wire via `report-uri`.

Remaining / future considerations:

1. (In progress) Introduce `report-to` (Reporting API) structure alongside legacy
   `report-uri` for richer grouping. Initial `Report-To` and `Reporting-Endpoints`
   headers added; evaluate client support telemetry before relying solely on them.
1. Consider adding `script-src` nonces / hashes only if inline scripts ever required (avoidance remains strategy).
   Potential future `strict-dynamic` if adopting nonces.
1. Evaluate need for additional directives if external domains are added:
   `media-src`, `prefetch-src`, `font-src` refinements, `img-src` CDN allowances.
1. Automate fail-fast CI step that diffs CSP between branches & blocks loosening
   without explicit override rationale.

## External Domains Review

Current code does not load third-party runtime resources for the main app.
Lighthouse tooling references (e.g., GitHub gists) occur only within dev tooling
directories, not the production bundle.

## Hash / Nonce Strategy

Current approach: enforce no inline scripts or styles.

A build audit script (`scripts/audit_csp_inlines.mjs`) scans the built `dist/` HTML for `<style>` and `<script>` blocks. It:

- Emits SHA-256 hashes for any discovered blocks.
- Writes structured JSON artifact (`csp_hashes.json`) with `{ style: [], script: [] }` arrays.
- Planned: optional automatic injection of matching hashes into a generated header fragment if inline blocks remain intentionally.

If a deliberate inline script becomes necessary (e.g., micro bootstrap for FCP), process would be:

1. Add the minimal inline script.
2. Run audit to capture its hash.
3. Insert hash into `script-src` (avoid adding `'unsafe-inline'`).
4. Justify inclusion in documentation & set a lifecycle review date.

## Monitoring & Reporting

- Implemented: `report-uri /api/csp-report` calls an Edge function
  (`api/csp-report.js`) logging violation payloads (timestamp, best-effort IP,
  user agent).
- In-progress (conceptual): Transition to `Report-To` / `Reporting-Endpoints` once browser support baseline is adequate.
- Operational Practice: Keep enforced plus (optionally) a mirrored
  `Content-Security-Policy-Report-Only` header during any future tightening for a
  7-day observation window.

## Action Items (Live Tracking)

- [x] Script to detect inline styles/scripts in `dist/` post-build.
- [x] Remove inline styles (none remain) & eliminate `'unsafe-inline'`.
- [x] Add explicit `object-src 'none'`.
- [x] Add `upgrade-insecure-requests`.
- [x] Add reporting endpoint + `report-uri`.
- [x] Add `report-to` / `Reporting-Endpoints` headers (monitor adoption; keep legacy `report-uri`).
- [x] Add automated CSP diff guard script (`scripts/verify_csp_diff.mjs`) + baseline snapshot (`security/csp_baseline.json`).
- [ ] Formalize hash injection path if intentional inline needed.

## Rollback / Safety Plan

Process for future tightening:

1. Add new directives first in `Content-Security-Policy-Report-Only` header.
2. Monitor `/api/csp-report` logs & aggregate (future: structured storage & dashboard).
3. After 7 days of zero breakage-critical violations, promote directive(s) to enforced header.
4. Maintain a one-line revert commit path (documented in PR) to quickly relax to previous version if unexpected breakage emerges.

If emergency rollback required: remove the most recent directive additions (or
reinstate a known-good header block from history) and redeploy; telemetry
endpoint remains to confirm resolution.
