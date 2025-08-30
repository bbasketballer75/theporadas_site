# CSP Re-Hardening Plan

This plan describes moving from the current relaxed Content Security Policy (temporary allowances used to restore styling)
back to a hardened nonce / hash based CSP without breaking functionality or developer velocity.

## Goals

- Remove any broad `unsafe-inline` allowances for `script-src` and `style-src`.
- Eliminate wildcard or overly broad sources (`*`, `data:`, `blob:`) where not strictly required.
- Introduce nonces (preferred) or build-time hashes for all inline critical script/style blocks.
- Maintain zero regressions in rendering, interactivity, and MCP / SSE functionality.
- Provide clear rollout stages plus a verification checklist.

## Current (Assumed) Relaxations

Adjust after running an updated CSP report / audit.

Likely temporary allowances:

- `style-src 'self' 'unsafe-inline'` (inline styles or legacy frameworks)
- `script-src 'self' 'unsafe-inline'` (inline bootstrap scripts)
- Possibly `img-src * data:` or `connect-src *` for rapid development

Action: Confirm actual policy by inspecting `index.html` headers (dev server) and production deployment response headers.

## Threat Model (Summary)

| Vector                                   | Risk                                                | Mitigation Target                                                          |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| DOM XSS / injection                      | Account/session compromise, supply-chain escalation | Remove inline execution; adopt nonces; strict sources                      |
| Style injection (CSS exfil / UI redress) | Info leak via attr selectors, click-jacking visuals | Remove `unsafe-inline`; only hashed critical inline CSS                    |
| Third-party script compromise            | Malicious code execution                            | Restrict to vetted, pinned origins; subresource integrity (SRI) optionally |
| Event stream abuse (SSE)                 | Data exfil / unauthorized subscription              | Keep auth tokens; restrict `connect-src` to explicit host(s)               |

## Strategy Overview

1. Inventory existing inline scripts/styles.
2. Classify each as:
   - (A) trivial (can externalize)
   - (B) needs build-time injection
   - (C) dynamic runtime snippet (replace with DOM API or module import)
3. Implement nonces: Generate a cryptographically random base64 value per response; attach to required inline `<script>` / `<style>`.
4. Replace `unsafe-inline` with a `'nonce-${value}'` pattern in the CSP header (or meta) and remove unused allowances.
5. Restrict other directives: `connect-src`, `img-src`, `font-src`, `frame-ancestors`, `form-action`.
6. Add automated reporting via `report-to` or `report-uri` pointing to `/api/csp-report` (already present as `api/csp-report.js`).
7. Stage rollout: report-only -> dual mode -> enforce.

## Detailed Steps

### 1. Inventory

- Enable temporary Report-Only header capturing violations for at least 24h across typical user journeys.
- Log and aggregate at `/api/csp-report` (extend to produce summarized JSON daily in `artifacts/` similar to other quality data).

### 2. Externalize & Modularize

- Move any small bootstrap inline scripts into external module files under `src/bootstrap/`.
- For config objects injected inline: generate a JSON script tag with `type="application/json"` plus a nonce or embed via `data-*` attributes.
- Inline styles (critical path) → consider critical CSS extraction during build (Vite plugin) or hashed style block.

### 3. Nonce Implementation

- Server (or static generator layer) produces `cspNonce` per request.
- Inject `<script nonce="${cspNonce}">` where inline is unavoidable.
- CSP header: `script-src 'self' 'nonce-${cspNonce}'` (omit `unsafe-inline`). Avoid mixing nonces and hashes unless necessary.
- If SSR absent and site is static: use build step to replace a placeholder (e.g. `__CSP_NONCE__`) inserted at deploy
  time by an edge function / hosting platform (Firebase or Vercel middleware). Document integration choice.

### 4. Directive Tightening (Target Policy)

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<dynamic>';
  style-src 'self' 'nonce-<dynamic>' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://<your-sse-host> https://<analytics-endpoint>;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  report-to default-endpoint;
  report-uri /api/csp-report; # optional legacy
```

Adjust hosts as necessary (remove placeholders after confirmation).

### 5. Reporting Group (RFC 9116 / Reporting API)

Add a `Report-To` header:

```http
Report-To: {"group":"default-endpoint","max_age":10886400,"endpoints":[{"url":"/api/csp-report"}]}
```

(If endpoint must be absolute, provide full origin.)

### 6. Automation & Tooling

- Add script `scripts/csp_audit.mjs` to parse collected reports and produce summarized metrics (top violating
  directives, sources) -> output `artifacts/csp-summary.json`.
- Integrate into CI (pre-deploy quality gate) to assert violation count delta does not increase beyond threshold after enforcement.

### 7. Rollout Phases

| Phase | Header Mode                    | Actions                                                      | Exit Criteria                       |
| ----- | ------------------------------ | ------------------------------------------------------------ | ----------------------------------- |
| R0    | Current Relaxed                | Collect baseline violations                                  | Inventory complete                  |
| R1    | Report-Only (tightened policy) | Add nonce infra; observe new violations                      | No high-severity new violations 48h |
| R2    | Enforce + Report-Only (dual)   | Enforce script/style; keep report-only for delta comparisons | Zero breakage + stable metrics 72h  |
| R3    | Enforce Only                   | Remove legacy allowances and report-only duplicate           | Sustained compliance                |

### 8. Testing

- Add Vitest integration test verifying generated HTML contains nonce attributes and no `unsafe-inline`.
- Run Lighthouse / PSI to ensure no performance regression from externalization.
- Manual XSS probe: attempt `<img src=x onerror=alert(1)>` injection paths; confirm blocked.

### 9. Developer Experience Safeguards

- Provide `DEV_RELAXED_CSP=1` env flag: if set, append `unsafe-inline` for local iterative styling (never in CI). Document clearly.
- Pre-commit hook warns if `unsafe-inline` reintroduced in production config.

### 10. Backlog Items to Create

- [ ] Implement nonce injection mechanism (server or deploy middleware)
- [ ] Externalize remaining inline scripts
- [ ] Build critical CSS extraction (optional optimization)
- [ ] Add CSP audit script plus CI integration
- [ ] Add dev relaxed toggle plus docs update in `docs/csp_plan.md` (this file may supersede or integrate)
- [ ] Create tests for nonce presence and absence of unsafe-inline

## Acceptance Criteria

- Production responses no longer include `unsafe-inline` for scripts/styles.
- All inline executable code either removed or protected by nonce.
- CI gate fails if CSP violations exceed threshold after enforcement phase.
- Documentation updated and onboarding guide references new CSP process.

## Risks & Mitigations

| Risk                                        | Mitigation                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Missed inline snippet causing runtime error | R1 report-only shadow run; Sentry / console monitoring                                                |
| Nonce caching issues with CDN               | Ensure HTML not cached with per-request nonce; or use hash-based approach if static caching mandatory |
| Developer friction adding new inline code   | Provide documented helper pattern / linter rule rejecting inline scripts                              |

## Open Questions

- Do we need hash-based fallback for static hosting paths without dynamic nonce? (If yes, add build plugin to compute
  SHA-256 hashes and embed in policy.)
- Any third-party analytics or fonts requiring additional hosts? Confirm and pin.

---

Generated as part of security hardening roadmap. Update iteratively as inventory clarifies actual current policy.
