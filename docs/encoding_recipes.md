# Encoding Recipes (Draft)

> Phase 1.5 Video Ingestion – this document will solidify ffmpeg command patterns once raw media characteristics are inventoried.

## Target Ladders (Initial Proposal)

| Label | Resolution | Max FPS | Approx Bitrate (Video) | Notes                                             |
| ----- | ---------- | ------- | ---------------------- | ------------------------------------------------- |
| 1080p | 1920x1080  | 30/60   | 5.5 Mbps               | High quality reference (H.264 High, CRF tune alt) |
| 720p  | 1280x720   | 30/60   | 3.0 Mbps               | Main delivery tier                                |
| 480p  | 854x480    | 30      | 1.2 Mbps               | Constrained / data saver                          |
| 360p  | 640x360    | 30      | 0.75 Mbps              | Optional fallback                                 |

(Adjust after empirical Lighthouse & WebPageTest review – aim for visually transparent quality on motion edges.)

## Codec Strategy

1. Baseline: MP4 (H.264, AAC 128k) – universal compatibility.
2. Enhanced: WebM (VP9, Opus) – optional smaller file for capable browsers.
3. Future: AV1 (optional) – revisit after core content stable.

## ffmpeg Command Templates

Export key frames every 2s (GOP=60 at 30fps) to balance seeking vs size.

```bash
# 1080p H.264
ffmpeg -i INPUT.MOV -vf "scale=1920:-2:flags=lanczos" -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 -pix_fmt yuv420p -g 60 -sc_threshold 0 -c:a aac -b:a 128k OUTPUT_1080p.mp4

# 720p
ffmpeg -i INPUT.MOV -vf "scale=1280:-2:flags=lanczos" -c:v libx264 -profile:v high -preset slow -crf 21 -pix_fmt yuv420p -g 60 -sc_threshold 0 -c:a aac -b:a 128k OUTPUT_720p.mp4

# 480p
ffmpeg -i INPUT.MOV -vf "scale=854:-2:flags=lanczos" -c:v libx264 -profile:v main -preset slow -crf 23 -pix_fmt yuv420p -g 60 -sc_threshold 0 -c:a aac -b:a 96k OUTPUT_480p.mp4

# VP9 (example 720p)
ffmpeg -i INPUT.MOV -vf "scale=1280:-2:flags=lanczos" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -pix_fmt yuv420p -deadline good -g 60 -c:a libopus -b:a 96k OUTPUT_720p.webm
```

## Poster & LQIP Generation

```bash
# Poster (single representative frame near mid-point)
ffmpeg -ss 10 -i INPUT.MOV -vframes 1 -vf "scale=1280:-2" poster_1280.jpg
magick poster_1280.jpg -strip -interlace Plane -quality 82 poster_1280_optimized.jpg
cwebp -q 80 poster_1280_optimized.jpg -o poster_1280.webp

# Tiny blurred placeholder (base64)
ffmpeg -ss 10 -i INPUT.MOV -vframes 1 -vf "scale=32:-2" placeholder_32.jpg
cwebp -q 50 placeholder_32.jpg -o placeholder_32.webp
base64 placeholder_32.webp > placeholder_32.b64.txt
```

## To Refine

- Adjust CRF after visual QA (banding, fast motion).
- Evaluate two-pass for constrained bitrates (esp. 480p & below) if quality inconsistent.
- Consider Dolby Vision / HDR tone-mapping impact (if source HDR) to SDR.

## Open Questions

- Exact durations of final cuts? (Impacts poster timestamp selection.)
- Need separate audio normalization pass (loudness target, e.g., -16 LUFS)?
- Multi-language captions required?

---

Status: Draft – will be iterated during implementation of Phase 1.5.
