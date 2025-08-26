# Accessibility & Performance Plan

## 1. Principles

- Ship every section perceivable, operable, understandable, robust (WCAG 2.2 AA mindset) from first commit.
- Performance budgets enforced early: fail fast in CI when exceeded.
- Progressive enhancement: base content & navigation work with no JS; enhancements on top.
- Motion sensitivity respected via `prefers-reduced-motion` & user overrides.

## 2. Keyboard & Focus Management

- Maintain natural DOM order for reading & tab sequence (vertical section order).
- Each full-screen section gets a heading (`h1` for hero only, subsequent `h2`).
- Provide a global skip: first interactive element is a visually hidden "Skip to next section" / cycle control.
- Programmatic focusing rules:
  - When user activates an in-page jump (e.g., progress indicator), move focus to the target section wrapper.
  - On modal/lightbox open (gallery), focus first interactive child; on close, restore prior focus.
- Use `tabindex="-1"` on section wrappers to allow focus programmatically without polluting tab order.
- Component focus rings: rely on `:focus-visible`; no custom removal unless replaced with equal or better visibility.

## 3. Section Navigation (Future Progress Indicator)

- Planned unobtrusive progress dots or vertical rail (ARIA `list` with `aria-label="Section navigation"`).
- Each link gets `aria-current="true"` when active (in-view via IntersectionObserver threshold 0.6).
- Ensure minimum 44x44px target size (WCAG target size advisory) through padding.

## 4. Video Accessibility

- Use `<track kind="captions" srclang="en" default>` once captions ready.
- Chapters: render accessible list + allow keyboard arrow navigation (already structured in component spec).
- Provide transcript (collapsible) below feature video for screen reader & search.
- Avoid auto-play with audio; if auto-play muted hero loop added later, supply a clear "Play with sound" button.

## 5. Media & Imagery

- All meaningful images require descriptive `alt`; decorative use empty `alt=""`.
- Provide aspect-ratio boxes to prevent layout shift (set `width/height` or CSS `aspect-ratio`).
- Use `loading="lazy"` for offscreen images (except LCP hero image / poster).
- Gallery: generate multiple responsive sizes (`srcset` + `sizes`) and modern formats (AVIF, WebP) with JPEG fallback.
- Provide reduced-motion alternative for any animated hero background (e.g., static gradient or still frame).

## 6. Color & Contrast

- Tokens must meet contrast: Primary text vs background >= 4.5:1, Large display headings >= 3:1.
- Add automated check script (e.g., `axe-core` via Vitest) for palette usage in critical components.
- Focus outline color distinct (current blush accent) and 3:1 against adjacent colors.

## 7. Typography & Readability

- Line length limit ~70ch (enforced in `.stack p` already ~65ch).
- Minimum font size 14px equivalent; body clamp ensures >= 16px on mobile.
- Avoid justified text; keep ragged-right for predictability.

## 8. Motion & Animations

- All entrance / parallax / scroll-snap transitions disabled when `(prefers-reduced-motion: reduce)`.
- Provide a manual toggle stored in `localStorage` to disable animations beyond OS setting.
- Duration tokens (`--dur-short|med|long`) remain under 700ms for primary flows.
- Avoid flashing more than 3 times per second (no strobe effects planned).

## 9. Forms (Guestbook Future)

- Each input associated with `<label for>`; visually custom labels keep accessible name.
- Validation inline, announced via `aria-live="polite"` region or element with `role="alert"` for errors.
- Submit button disabled only when truly inoperable; otherwise allow submit and return consolidated messages.

## 10. Realtime Map (Future)

- Provide textual fallback list of guests for screen readers if map is dynamic canvas/tiles.
- Interactive pins navigable via keyboard: arrow keys cycle, Enter opens details panel.
- Ensure pointer target spacing adequate (touch).

## 11. Performance Budgets (Initial Targets Desktop/Mid-tier Mobile)

| Metric                                   | Budget                     |
| ---------------------------------------- | -------------------------- |
| LCP (hero heading + optional hero image) | < 2.0s (fast 3G simulated) |
| CLS                                      | < 0.02                     |
| TBT (lab)                                | < 200ms                    |
| INP (field goal)                         | < 150ms                    |
| JS Bundle (initial, gz)                  | < 90KB                     |
| CSS critical (inline)                    | < 12KB                     |
| Hero image (if added, optimized)         | < 180KB (largest variant)  |
| Video poster                             | < 60KB                     |

- Enforce via Lighthouse CI GitHub Action + custom script reading JSON scores; fail PR if over.
- Track bundle size via `rollup-plugin-visualizer` (dev) + CI size snapshot.

## 12. Loading Strategy

- Inline critical CSS for hero & shell (extract subset manually or via tool); rest deferred with `media="print"` swap or dynamic import.
- Code split each major section (dynamic import when within 1 viewport ahead using IntersectionObserver prefetch hook).
- Preload hero font subsets (display + sans) using `rel=preload` + `font-display: swap`.
- Defer non-critical JS (analytics, map SDK) until idle (`requestIdleCallback` fallback setTimeout 2s).

## 13. Caching & Delivery

- Use immutable hashed asset filenames (Vite default) + long-term cache.
- Service Worker (future) for offline shell & gallery prefetch (ensure network-first for guestbook writes to avoid stale collisions).
- For video (HLS): generate multiple resolutions (1080p, 720p, 540p, 360p) and set correct `EXT-X-STREAM-INF` BANDWIDTH; enable GCS CDN caching.

## 14. Image / Video Optimization Pipeline (Planned Scripts)

- `scripts/media/generate_renditions.(js|ts)` to:
  - Take source images -> output AVIF/WebP/JPEG at widths [320, 640, 960, 1280, 1920].
  - Compute blurhash or small base64 placeholder JSON mapping for progressive preview.
- `scripts/video/encode_hls.(mjs)` using `ffmpeg` to output bitrate ladder + VTT thumbnails + sprite.
- Store manifest & metadata JSON consumed by Gallery & Video components.

## 15. Monitoring & Regression Prevention

- Add Vitest with `@axe-core/react` integration snapshotting critical route accessibility (hero, video, gallery component).
- Add Playwright (later) for end-to-end keyboard traversal test.
- Hook Lighthouse CI to PR; store historical trends in `/.lighthouseci` artifact.

## 16. Error States & Skeletons

- Provide skeleton shimmer (respect reduced motion -> static pulse) for gallery thumbnails & guestbook entries.
- Offline / network error toasts announced via `aria-live` polite region.

## 17. Internationalization Readiness (Minimal Now)

- Wrap static strings in a simple lookup function to allow later extraction (English only initially).
- Avoid concatenated dynamic string pieces that impede translation later.

## 18. Security & Privacy (Guest Data)

- Strip EXIF from uploaded images (if user upload ever allowed) in pipeline.
- Rate-limit guestbook submissions via backend function; sanitize HTML (allow basic formatting only) to prevent XSS.

## 19. Open Tasks to Operationalize Plan

1. Add Lighthouse CI workflow (issue #8)
2. Add axe accessibility test harness (issue #9)
3. Add bundle size budget check script (issue #10)
4. Create performance budget doc in README (issue #11)
5. Implement skip link & section focus management (issue #12)
6. Add reduced-motion preference toggle (issue #13)
7. Implement dynamic section prefetch hook (issue #14)
8. Add media pipeline scripts scaffolds (issue #15)

---

Document version: 2025-08-23
