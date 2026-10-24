# Assets: covers, loops, share image, favicon

Where each asset goes, what size, what format. Limits are enforced by `pnpm check` (`scripts/check-media.mjs`: any file in `public/media` over 4 MB fails).

## Cover video (homepage card and case-study cover)

- **Files:** `public/media/<slug>/cover.mp4` (H.264) and `cover.webm`. Slugs: `smart-mapping`, `fyn`, `nova`, `prime-compass`, `gyst`.
- **Poster (also the LCP image):** `src/assets/covers/<slug>/poster.jpg` (or `.png`/`.webp`). Export the cover's first good frame at **1106×800** (553×400 at 2×). Astro makes the AVIF/WebP.
- **Video size:** 1106×800 (same 553 / 400 ratio as the card). 24–30 fps, no audio, no text.
- **Length (Vignesh, 2026-10-24):** trade length for quality: **8–12s seamless loops** at full 1106×800 rather than 30s at lower quality.
- **Hook up:** in Keystatic (`pnpm dev` → `/keystatic` → Case studies → the project → Cover image) set mp4, webm, poster and alt. Commit and push.

## Case-study solution loops

- Same rules as covers, in `public/media/<slug>/`, any file name; reference them from the solution step's `media` fields (`mp4`, `webm`, `image` as poster).
- Width: the case column is 846px, so export **1692×(height)** (2×). For the Prime compass / Nova half-width images, 837 (2×: 1674).
- ≤ 4 MB per file. If a loop doesn't fit: shorten, then lower fps to 24, then raise the CRF; resolution last.

### Encoding (ffmpeg, not a dependency; run it yourself)

```bash
# MP4 (H.264), no audio, web-optimised
ffmpeg -i in.mov -an -vf "scale=1106:-2,fps=30" -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart cover.mp4
# WebM (VP9)
ffmpeg -i in.mov -an -vf "scale=1106:-2,fps=30" -c:v libvpx-vp9 -crf 34 -b:v 0 cover.webm
```

Raise `-crf` (24 → 28, 34 → 38) until each file is under 4 MB. HandBrake works too.

## Share image (link previews)

- **1200×630 px**, JPG or PNG (JPG for photos), under ~300 KB, text inside the central safe area (keep 60px from the edges; WhatsApp and LinkedIn crop to ~1.91:1, iMessage shows a centre crop).
- **Site default:** put it in `src/assets/og/` and choose it in Keystatic → Site settings → Default OG image.
- **Per case study:** Keystatic → the project → OG image (same size). Without one, the site default is used.
- The build resizes to exactly 1200×630 and writes `og:image` and `twitter:image` (`summary_large_image`).
- Test after deploying: LinkedIn Post Inspector, and `https://www.opengraph.xyz/`. Platforms cache old previews.

## Favicon

Already present: `public/favicon.svg` (placeholder dot). Add any of these to `public/`; the build links the ones that exist:

| File | Size | Use |
|---|---|---|
| `favicon.svg` | vector, square viewBox | Modern browsers (already linked) |
| `favicon.ico` | 32×32 (or 16/32/48 in one file) | Older browsers, some crawlers |
| `apple-touch-icon.png` | **180×180**, opaque background, no transparency | iOS home screen |
| `icon-192.png`, `icon-512.png` | 192×192, 512×512 | Android / PWA, only if a manifest is added later (not wired) |

Design it for 16px: one simple shape, no thin lines. The SVG can use `prefers-color-scheme` in an inline `<style>` for a dark tab bar.
