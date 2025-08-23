# Implementation Roadmap

Phased delivery enabling continuous deployment while preserving accessibility & performance goals.

## Phase 0 – Baseline Hardening (DONE / KEEP CURRENT)

- Tooling: ESLint (zero warnings), Prettier, Vitest, coverage, Husky.
- Core layout: Scroll-snap shell, dark theme tokens.
- VideoPlayer component (baseline, placeholder media).

## Phase 1 – Foundational Accessibility & Budgets

- Add skip link component + section focus management.
- Add Lighthouse CI + initial performance budgets.
- Add axe integration tests for hero + video.
- Implement reduced-motion toggle persistence.
- Outcome: Accessible shell with automated regression gates.

## Phase 2 – Feature Video (HLS Pipeline)

- Write ffmpeg script scaffolds for HLS renditions + poster + VTT thumbnails.
- Integrate dynamic HLS loading (conditional `hls.js`).
- Add captions track & sample chapter list JSON.
- Provide transcript collapsible panel.
- Outcome: Fully accessible, adaptive feature video experience.

## Phase 3 – Story & Parents Sections

- Implement `StorySection` (text + optional supporting image / pull quotes).
- Implement `ParentsSection` profile cards (semantic list, images with alt text).
- Lazy load section code via dynamic import when near viewport.
- Outcome: Core narrative content online.

## Phase 4 – Wedding Party Section

- Implement grid of attendants with roles, photos, tooltips for fun facts.
- Add keyboard navigation (arrow key roving tabindex inside grid).
- Outcome: Rich, accessible wedding party roster.

## Phase 5 – Gallery (Static Assets First)

- Implement image rendition pipeline (AVIF/WebP/JPEG) + blur placeholder data.
- Gallery grid with lazy loading & intersection fade-in.
- Lightbox modal with keyboard trap & arrow navigation.
- Outcome: Performant media gallery ready for incremental population.

## Phase 6 – Guestbook (Firestore Backend)

- Data model: entries { id, name, message, ts, moderated }.
- Cloud Function moderation (basic profanity filter) placeholder.
- Realtime subscription; optimistic add.
- Rate limiting & sanitization.
- Outcome: Interactive guest engagement channel.

## Phase 7 – Guest Map (Realtime Presence)

- Choose map approach (static tile service or vector). Provide textual fallback list.
- Store guest coarse location (manual input or IP-derived with consent notice).
- Websocket/Firestore updates; cluster markers; keyboard accessible list → focus marker.
- Outcome: Live visualization of guest distribution.

## Phase 8 – Timeline & Vendors

- Timeline with sticky year / date markers, accessible list semantics.
- Vendors section with logos (or placeholders) + accessible descriptions / links.
- Outcome: Completion of core informational content.

## Phase 9 – Progressive Polish & Enhancements

- Section progress indicator (dot rail) with `aria-current`.
- Micro-interactions (subtle fade, parallax within motion preference limits).
- Offline support (service worker shell + gallery caching strategy).
- Analytics lightweight (self-hosted or minimal script; respect DNT).
- Outcome: Refined UX with resilience & insight.

## Phase 10 – Launch Hardening

- Final Lighthouse pass (mobile + desktop) meeting budgets.
- Accessibility audit manual sweep (screen reader navigation script).
- Load test HLS manifest (simulate varied bandwidth).
- 404 / error page styling and fallback content.
- Outcome: Production readiness certification.

## Post-Launch Backlog (Optional)

- Monogram final asset integration (replace placeholder absence).
- Theme variants (seasonal accent adjustments).
- Multi-language support scaffolding.
- Guest RSVP management extension.

## Cross-Cutting Tasks Tracking

| Area             | Tooling / Artifacts                                     |
| ---------------- | ------------------------------------------------------- |
| Accessibility    | axe tests, manual SR checklist doc                      |
| Performance      | Lighthouse CI, bundle size script, ffmpeg pipeline logs |
| Security/Privacy | Content sanitization function, rate limit config        |
| Observability    | Basic analytics events (section view, video events)     |

## Acceptance Criteria Per Phase

- Each phase merges only when: lint clean, tests passing, budgets not regressed, docs updated (README + CHANGELOG section or roadmap tick).

## Immediate Next Actions

- Implement Phase 1 tasks: skip link, focus mgmt, Lighthouse CI config, axe tests scaffold.

Document version: 2025-08-23
