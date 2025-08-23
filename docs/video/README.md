# Video Documentation Index

| Doc                                                 | Purpose                           | Status       |
| --------------------------------------------------- | --------------------------------- | ------------ |
| [Ingestion Overview](./video_ingestion_overview.md) | Strategy, heuristic, phases       | Draft/Active |
| [Encoding Recipes](./encoding_recipes.md)           | ffmpeg command templates & ladder | Draft        |

Last updated: 2025-08-23

Add new docs here (e.g., `lazy_loading.md`, `chapters_captions.md`, `metrics.md`).

## Deprecations

| Deprecated                   | Replacement | First Noted | Removal (Planned)     | Notes                                                                                                                                           |
| ---------------------------- | ----------- | ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `srclang` track prop (input) | `srcLang`   | 2025-08-23  | >= 2025-10 (earliest) | The component now maps legacy `srclang` to React's camelCase `srcLang` and emits a development warning. Update any usage before removal window. |

## Hero Video Integration

The landing (hero) section now uses a `HeroVideo` wrapper component which embeds `LazyVideoPlayer` with an adaptive quality ladder. Placeholder encoded filenames expected under `media/encoded/`:

```text
hero-480.mp4
hero-720.mp4
hero-1080.mp4
```

Provide real assets by replacing those files (or updating the `qualitySources` prop passed to `HeroVideo`). If a single provisional file exists, pass it via `src` prop while the ladder encodes.

Recommended encoding targets (subject to revision once we analyze actual content complexity):

- 480p: ~1200 kbps (baseline)
- 720p: ~3000 kbps
- 1080p: ~6000 kbps

Add higher tiers (1440p / 2160p) only if we produce a final cinematic cut that benefits from it; current heuristic already guards against overserving bandwidth.

Chapters are disabled in the hero usage (`showChapters=false`) to keep initial focal experience minimal.
