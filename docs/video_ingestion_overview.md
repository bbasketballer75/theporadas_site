# Video Ingestion Overview (Phase 1.5)

This document expands on the Phase 1.5 plan: introducing real wedding video assets while preserving established accessibility and performance baselines.

## Objectives

- Deliver adaptive, accessible video playback.
- Maintain Lighthouse budgets (script, CSS, LCP, TBT, CLS) previously enforced.
- Provide captions & chapter navigation from day one.
- Establish reproducible encoding + optimization pipeline.

## Components Affected

| Area          | Change                                                                |
| ------------- | --------------------------------------------------------------------- |
| `VideoPlayer` | Add quality-aware source selection + optional lazy loading wrapper    |
| Docs          | Add encoding recipes & ingestion overview (this file)                 |
| Tests         | New tests for quality selection logic & presence of captions/chapters |

## Data Model Additions

```ts
interface QualitySource {
  src: string;
  height: number; // vertical resolution, e.g. 1080
  bitrateKbps?: number; // approximate average bitrate
  type?: string; // mime type, e.g. video/mp4
  label?: string; // display label ("1080p")
  default?: boolean; // optional future hook
}
```

## Selection Heuristic (Implemented v1)

Executed inside `VideoPlayer` when `qualitySources` provided:

1. Sort sources descending by `height`.
2. Derive target height from `window.innerHeight` buckets:
   - `>=900` → 1080
   - `>=720` → 720
   - `>=540` → 540
   - else 480
3. If `navigator.connection.saveData` is `true`, clamp target to ≤480.
4. Filter to sources with `height <= target` (fallback to smallest if none).
5. If `navigator.connection.downlink` present, compute Mbps budget: `downlink * (saveData ? 0.6 : 0.85)` and drop candidates whose `bitrateKbps/1000` exceeds budget.
6. Choose highest remaining resolution; render as a single `<video src>` (no multiple `<source>` tags) to avoid redundant network negotiation.

Future enhancements may incorporate dynamic switching / `effectiveType`, but static selection keeps implementation lean while meeting performance goals.

## Accessibility Guarantees

- Always include at least one captions track.
- Chapters accessible via buttons (`aria-current`).
- Respect reduced motion (no autoplay or motion heavy poster transitions).

## Performance Measures

- Defer loading non-visible video via IntersectionObserver (placeholder div until intersecting).
- Use preconnect to CDN only when player near viewport.
- Poster ≤ 60KB (webp) + inline base64 LQIP (~300–800 bytes).

## Implementation Phases

1. Add `qualitySources` prop + selection function (no lazy loading yet).
2. Write tests for selection logic (mock viewport width + saveData).
3. Integrate placeholder + observer for lazy load.
4. Add caption & chapter sample assets (stub .vtt until final transcripts).
5. Measure Lighthouse vs baseline; adjust ladder if regressions.
6. Finalize docs with actual CRF/bitrate outputs.

## Open Work Items

- Decide on poster timestamp & variant sizes.
- Create automation script for encoding (future `scripts/encode_videos.ps1`).
- Evaluate bundling vs runtime fetch of tracks (likely static served assets).

---

Status: Draft – iterate as assets become available.
