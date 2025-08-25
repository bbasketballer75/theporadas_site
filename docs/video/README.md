# Video Documentation Index

| Doc                                                 | Purpose                           | Status       |
| --------------------------------------------------- | --------------------------------- | ------------ |
| [Ingestion Overview](./video_ingestion_overview.md) | Strategy, heuristic, phases       | Draft/Active |
| [Encoding Recipes](./encoding_recipes.md)           | ffmpeg command templates & ladder | Draft        |

Last updated: 2025-08-23

Add new docs here (e.g., `lazy_loading.md`, `chapters_captions.md`, `metrics.md`).

## Deprecations

| Deprecated                   | Replacement | First Noted | Removal (Planned)     | Notes                                                       |
| ---------------------------- | ----------- | ----------- | --------------------- | ----------------------------------------------------------- |
| `srclang` track prop (input) | `srcLang`   | 2025-08-23  | >= 2025-10 (earliest) | Legacy prop still accepted (mapped); update before removal. |

## Hero Video Integration

The landing (hero) section now uses a `HeroVideo` wrapper component which embeds
`LazyVideoPlayer` with an adaptive quality ladder. Placeholder encoded filenames expected under
`media/encoded/`:

```text
hero-480.mp4
hero-720.mp4
hero-1080.mp4
```

Provide real assets by replacing those files (or updating the `qualitySources` prop passed to
`HeroVideo`). If a single provisional file exists, pass it via `src` prop while the ladder encodes.

Recommended encoding targets (subject to revision once we analyze actual content complexity):

- 480p: ~1200 kbps (baseline)
- 720p: ~3000 kbps
- 1080p: ~6000 kbps

Add higher tiers (1440p / 2160p) only if we produce a final cinematic cut that benefits; current
heuristic already guards against overserving bandwidth.

Chapters are disabled in the hero usage (`showChapters=false`) to keep initial focal experience minimal.

## Poster & LQIP Strategy

We now accept a `poster` prop on `VideoPlayer`, `LazyVideoPlayer`, and `HeroVideo`. This is intended for:

- Faster first paint of the hero section
- Maintaining aspect ratio before the adaptive source loads
- Conveying brand tone (can include light grading / subtle blur)

Guidelines:

- Provide a poster that matches the selected hero frame (avoid jarring frame switches)
- Encode posters to modern formats (WebP/AVIF) when we introduce a `<picture>` wrapper; for now MP4 `<video poster>` typically uses JPEG/PNG
- Target < 60 KB for the hero poster (optimize aggressively; consider 85% WebP quality baseline later)
- Maintain the same intrinsic dimensions as the 1080p asset (1920x1080) so the browser does not need to rescale pre-play

Future LQIP (Low Quality Image Placeholder) options we can explore:

- Blurhash or Thumbhash embedded as a tiny data URI, swapped once poster loads
- Inline lightweight SVG dominant-color rectangle with subtle gradient
- Using `decoding="async"` for an `<img>` fallback if we add a progressive enhancement path

## Motion Preference Behavior

Autoplay is now suppressed when the document root has `data-motion="reduce"` (set via
`MotionToggle` UI or potentially user profile later). The logic primarily lives in `HeroVideo`:

- Detects motion preference via attribute, falling back to `window.matchMedia('(prefers-reduced-motion: reduce)')`
- If reduced: do not set `autoPlay`; ensure the underlying `<video>` is paused after mount
- If normal: pass `autoPlay` (and `muted` + `playsInline`) through, enabling silent inline playback

Rationale:

- Respects user accessibility / comfort preferences
- Avoids unexpected motion which can trigger vestibular discomfort
- Keeps initial layout stable regardless of autoplay state

Testing Notes:

- JSDOM sometimes reflects `video.muted` as `true` even when attribute serialization differs; tests assert property OR attribute presence
- Coverage for single test files may dip below global thresholds; full suite run restores expected coverage

Future Enhancements:

- Extract motion detection into a shared hook (`useMotionPreference`) for reuse outside hero
- Consider a fade-in transition when autoplay is enabled to reduce perceptual jank
- Add analytics event when autoplay is suppressed to measure preference adoption
