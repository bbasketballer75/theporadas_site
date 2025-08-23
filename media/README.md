# Media Asset Layout

```text
media/
  raw/                # gitignored large originals (ProRes, high bitrate)
  encoded/            # optimized distribution files (mp4/webm/av1)
  posters/            # poster frames (webp) ≤60KB target
  lqip/               # tiny blurred placeholders (base64 inline candidates)
```

Guidelines:

- Keep original uncompressed / mezzanine assets only locally or in cloud storage.
- Only commit _representative_ small clips (≤200KB) if needed for tests.
- Derive final delivery ladder via `docs/encoding_recipes.md` commands.

Place a `.gitkeep` in empty folders to preserve structure.
