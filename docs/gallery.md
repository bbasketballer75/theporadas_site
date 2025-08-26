# Gallery Feature

This document describes the site gallery implementation, data schema, and contribution workflow.

## Overview

The gallery displays a responsive grid of media (currently images).
Items lazy-load as they enter the viewport and open in a
keyboard-accessible modal with wrap navigation.

Note: The markdown file `content/gallery.md` is intentionally excluded from being
rendered as its own `<section>` in `App.tsx` (the slug `gallery` is filtered out)
because the interactive Gallery component supplies the unique landmark/heading.
Rendering both created duplicate landmarks (axe `landmark-unique` violation).

## Data Source

Items are defined in `content/gallery.index.json` as an array of objects:

```json
{
  "id": "unique-stable-id",
  "type": "image",
  "src": "/media/encoded/filename.jpg",
  "thumb": "/media/lqip/filename.jpg",
  "caption": "Short description (displayed in modal)",
  "contributorName": "Attribution name",
  "createdAt": "YYYY-MM-DDTHH:MM:SSZ"
}
```

Required fields: `id`, `type`, `src`.

Optional fields gracefully degrade if missing. Items missing required fields are filtered out by the loader.

## Loader

`src/gallery/loader.ts` exports `loadGallery()` which:

- Caches results in-memory after first load.
- Validates minimal schema (`id` & `src` string presence`).
- Returns an empty array on parse or IO failure.

## Component

`src/components/Gallery.tsx`:

- Renders buttons (one per item) containing `<img>` with lazy observer.
- Uses an `IntersectionObserver` to toggle from placeholder to real image source.
- Opens a modal dialog (`role="dialog"` / `aria-modal="true"`) showing current media and caption.
- Supports `ArrowRight`, `ArrowLeft`, and `Escape` keys with cyclic navigation.
- Focus returns to the originating trigger when the modal closes.

## Accessibility Notes

- Each item is a `<button>` enabling keyboard activation without extra tabindex management.
- Dialog exposes semantic role and escape key for close.
- Wrap navigation ensures a bounded set is fully reachable.
- Caption text is visible inside the dialog; future enhancement: associate via `aria-labelledby`.

## Adding New Media

1. Optimize source image into two variants:

- Full/encoded: place under `media/encoded/` (appropriately compressed, web-friendly format).
- (Optional) LQIP/thumbnail: place under `media/lqip/` (small lightweight placeholder).

1. Add an entry to `content/gallery.index.json` respecting chronological ordering (newest last or desired grouping). Maintain stable `id`.
1. Commit media files (avoid excessively large originals; keep under ~300–500 KB where possible unless necessary).
1. (Optional) Generate/update low‑quality placeholders (LQIP) for any new images:

```bash
npm run lqip            # generates missing 32px wide placeholders in media/lqip
npm run lqip -- --force # regenerates all placeholders
```

1. Run:

```bash
npm run lint && npm run test
```

1. Open a PR including details of contributor attribution if applicable.

## Testing

`test/gallery.spec.tsx` covers:

- Rendering
- Modal open/close
- Arrow key navigation + wrap
- Accessibility presence of `role=dialog` & `aria-modal`
- Lazy load observer triggers (basic assertion that final `src` is full image)

Future test ideas:

- Focus trapping inside modal (if implemented)
- Reduced-motion handling
- Video item variant once added

## Performance Guidelines

- Prefer modern formats (WebP / AVIF) when adding new images.
- Use descriptive, cache-friendly filenames.
- Avoid unbounded growth—consider pruning or pagination if list becomes large.

## Roadmap / Future Enhancements

- Video item support (overlay play controls, poster swap)
- Dedicated prefetching strategy for next/prev items while viewing modal
- Keyboard shortcuts for jump to first/last
- Optional tagging & filtering UI
- Generate LQIP automatically in a build script

## Troubleshooting

| Issue                              | Possible Cause                      | Resolution                                       |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------ |
| Image not visible                  | Missing `src` or file not committed | Verify path & commit asset                       |
| Modal arrows not working           | Key events prevented higher in tree | Ensure event not stopped before Gallery listener |
| Items not loading until scroll far | Observer root margin too small      | Adjust observer options in component             |

## Contributing Checklist

The following unchecked items form a reusable template for pull requests
adding or updating gallery media. They are intentionally left unchecked here
(they are not outstanding work in the codebase).

- [ ] Add media assets (optimized)
- [ ] Update `content/gallery.index.json`
- [ ] Run lint & tests
- [ ] Provide attribution info (if needed)
- [ ] Document any non-image types introduced

---

Feel free to extend this doc as the feature evolves.
