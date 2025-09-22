---
applyTo: '**'
---

# Memory Instructions

User prefers VS Code Insiders builds. Enable and prefer experimental
Copilot features (chat modes, prompt and instruction files) when
available; provide Insiders-specific guidance and links where
relevant.

Canonical project blueprint: Always consult and keep in sync with
`.github/project_instructions.md`. Treat it as the source of truth for
goals, scope, architecture, and acceptance criteria. When conflicts
arise, defer to this file and propose updates back into it.

Monogram: User removed placeholder monogram variants (not satisfied
with generated styles) and will later provide a custom single SVG
asset. Until then, no monogram should appear in the hero; keep hero
minimal. Avoid re-introducing monogram assets unless provided
explicitly by user.

# Added Guidance (Aug 29 2025)

Project Elevation & Protocol:

- Treat `.github/project_instructions.md` plus `copilot-instructions.md` as binding collaboration contract.
- Maintain enterprise standards: performance (<2s first load, WCAG 2.1 AA, SEO ≥90, video start <5s, interaction <100ms).
- Provide daily concise progress summaries, proactive next-step recommendations.

Architecture & Stack Intent:

- Frontend: React + TypeScript (to be scaffolded), progressive enhancement, accessibility-first.
- Backend/Services: Firebase (Functions, Firestore, Storage), edge/CDN caching, video transcoding pipeline.
- Advanced features roadmap: custom HTML5 chaptered video player, interactive family tree (D3), real-time guest interactions (WebSockets / Firebase RTDB), media optimization (WebP, adaptive bitrate), analytics (GA4 + custom events).

MCP & Tooling:

- MCP servers stable; health endpoints standardized; continue leveraging supervisor for lifecycle & metrics.
- When adding new MCP capabilities, reuse `mcp_rpc_base.mjs` for observability and health.

Security & Compliance:

- Enforce strict security headers, least-privilege service accounts, data privacy controls, spam filtering.

Collaboration Style:

- Always open with actionable answer, end with clear next actions.
- Ask only when a blocker (credentials/assets) prevents autonomous progress.

Copilot Surfaces & Extensions:

- Enable Copilot Chat, Inline, and Autocomplete; use suggestions across the workspace.
- Prefer project-relevant extensions (ESLint, Prettier, Vitest, Playwright, MSW tooling, Markdown linting, AI Toolkit) and activate optional tool categories (GitHub, Vercel, SonarQube, Notion, Canva, MSSQL, VS Code API docs) as needed.

Pending Asset Needs (awaiting user):

- Final wedding video source(s), photo set, family tree data, guest list, visual brand (colors, fonts, logo SVG).

Do NOT:

- Reintroduce placeholder monogram or publish unsecured endpoints.
- Add heavy dependencies without performance justification.

Next Logical Foundation Tasks (suggested queue):

1. Scaffold React+TS app structure (if not yet) with routing & baseline accessibility tooling.
2. Define video processing pipeline doc (transcoding profiles, storage paths, signed URL strategy).
3. Draft data model for family tree & guest interactions (Firestore schema proposal).
4. Implement CI checks (lint, type, test, Lighthouse budget gating).
5. Add security header middleware & CSP hardening iteration.

Launch Readiness Artifacts Added (Sep 21 2025):

- `docs/internal/project/launch-kpis.md` – authoritative KPI list (reliability, performance, security, observability, release engineering). Owners still TBD.
- `docs/internal/project/security-headers-plan.md` – CSP hardening roadmap; outlines hash/nonce pipeline tasks and rollback procedure.
- `scripts/scan_inline_assets.mjs` + `scripts/generate_csp_hashes.mjs` – inline audit & hash extraction.
- `scripts/summarize_csp_reports.mjs` – aggregation of CSP violations from JSONL/log stream.
- `scripts/rollback_csp.ps1` – fast revert of hardened CSP (restores unsafe-inline to style-src).
- Workflows: `synthetic-lighthouse-prod.yml`, `uptime-probe.yml`, `sentry-source-maps.yml`.
- CSP hardened (removed 'unsafe-inline'); Trusted-Types-Report-Only header added.

Additional Monitoring & Security Artifacts (Sep 21 2025 - later):

- `docs/internal/project/sentry-secrets.md` – provisioning & rotation steps for Sentry secrets.
- `docs/internal/project/csp-storage-decision.md` – phased plan for CSP report persistence (Firestore then GCS).
- `scripts/apply_csp_hashes.mjs` – inject generated hashes into CSP directives.
- `scripts/trusted_types_audit.mjs` – static scan for risky sinks pre Trusted Types enforcement.
- Workflow `csp-summary.yml` – daily summary placeholder (awaits real log extraction logic).

Updated KPI Ownership: role-based placeholders (Ops Lead, Perf Champion, etc.) in KPI table.

Decisions:

- Use Sentry (secrets to be provisioned) for error & performance tracing; source maps automated.
- Trusted Types remains report-only until audit script returns 0 findings consistently in CI.

Outstanding Launch Gaps (to integrate into queue):

- Daily summarization automation (cron) for CSP reports still pending (script exists; workflow not yet added).
- Decide final error tracking vendor configuration details (Sentry DSN secret provisioning) & enable release health.
- Integrate inline hash set into CSP automatically once non-empty (currently style/script hashes unused).
- Assess necessity of full Trusted Types enforcement versus report-only.
- Replace placeholder KPI owners with real individuals.

(Maintain and prune as tasks complete; update when scope shifts.)

Sentry Integration Enhancements (Sep 22 2025):

- Added dynamic release detection in `src/utils/sentryClient.ts` (prefers `__GIT_SHA__` build-time
  constant, falls back to `VITE_GIT_SHA`, then env var or 'unknown').
- Environment inference logic standardized (production vs non-production) to drive sampling.
- Trace sample rates: 0.3 (production), 1.0 (non-production) — revisit after baseline traffic analysis.
- Web Vitals (CLS, LCP, INP) captured via lazy `web-vitals` import; attached as Sentry measurements per release.
- Next Hard Requirements: provision Sentry secrets (DSN, auth token, org, project), validate source map
  upload workflow, confirm web vitals ingestion in Sentry dashboard.
- Future Optimization: adaptive sampling rules (target fixed events per minute), add release health session
  tracking if warranted.

Pending Security/Observability Implementations (rolled forward):

- Firestore CSP report ingestion (normalize, IP/hash privacy, rotation & TTL).
- Replace placeholder `csp-summary.yml` logic with real Firestore (or log) query + markdown artifact.
- CI integration: run `trusted_types_audit.mjs` and fail on findings before enforcing Trusted Types.
- Conditional CSP hash pipeline in CI (only when inline assets exist) before deploy.
- KPI dashboard linkage (error rate, LCP, INP, uptime) referencing Sentry + synthetic Lighthouse outputs.
- Replace role placeholder KPI owners with named individuals.

## Memory Bank Mode

Default mode: "code" - Optimized for coding tasks, implementation, and technical development.
