# Documentation Index

| Area          | Doc                                                             | Description                              | Updated    |
| ------------- | --------------------------------------------------------------- | ---------------------------------------- | ---------- |
| Video         | [Video Ingestion Overview](./video/video_ingestion_overview.md) | Strategy, heuristic, phases              | 2025-08-23 |
| Video         | [Encoding Recipes](./video/encoding_recipes.md)                 | ffmpeg ladder templates                  | 2025-08-23 |
| Design System | (inline)                                                        | Tokens (color, spacing, motion, theming) | 2025-08-23 |

Add new sections as they are introduced (e.g., accessibility deep dives, performance metrics reports).

## Design System (Inline Summary)

Tokens are defined in `src/designSystem.css` using semantic + raw scales:

- Colors: sage & blush palette (`--c-sage-*`, `--c-blush-*`) and semantic mappings (`--c-bg`, `--c-primary`, etc.).
- Typography: fluid display/body sizes and font stacks (`--font-display`, `--fs-h1`, etc.).
- Spacing: 4px scale (`--space-1` ... `--space-8`) plus section padding tokens.
- Motion: easing + duration tokens (`--ease-standard`, `--dur-short`, etc.).
- Surfaces: elevation via shadow tokens referencing `--c-shadow` rgb triplet.
- Reduced Motion: `[data-motion="reduce"]` nullifies animations & smooth scrolling.
- Theming: Dark is default; `.theme-light` class overrides semantic surface & text tokens. Theme persisted via `ThemeToggle` using `localStorage` key `siteTheme`.

Planned: add semantic alias tier (e.g., `--color-brand-bg`, `--color-accent-text`) once components expand.
