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

(Maintain and prune as tasks complete; update when scope shifts.)
