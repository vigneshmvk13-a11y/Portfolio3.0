# Rules

Principles and decisions Figma doesn't draw. Log every change in the `DESIGN.md` changelog.

## Principles

1. **The work carries the colour.** UI chrome stays grey scale. Colour comes from covers, photos and logos. The Badge (`surface-badge`, pale green) is the only exception (confirmed).
2. **One idea per screen.** The homepage shows one project at a time. No stats strips, testimonials, marquees or extra sections.
3. **Rationale over screens.** Case studies are built around decisions (context → options → choice → why). A screen without the reasoning behind it is weaker than the reasoning without the screen.
4. **Quiet motion.** Motion explains a change of state. Nothing moves without input except the active cover video and **one exception**: the homepage intro choreography. It runs once per session, takes at most ~2s, any input skips it, and it never runs under reduced motion. It earns its place by teaching that the wheel scrolls. Don't add a second exception without asking.
5. **Figma first.** If it's designed, match it. If not, reuse tokens and components, write the decision down, and flag it.
6. **Honest content.** No lorem ipsum, no invented metrics, quotes or outcomes. AI-written summaries are labelled and reviewed before they render.

## Do / don't

| Do | Don't |
|---|---|
| Use semantic token utilities (`text-fg-secondary`) | Use raw hex, primitives or arbitrary values (`text-[#5e5e5e]`, `p-[13px]`) |
| Write mobile styles first, then `tablet:` / `desktop:` | Write desktop styles and patch mobile with `max-*` variants |
| Use 500 for names, labels, active states | Use 600/700 or any weight besides 400/500 |
| Reuse IconButton / Button variants | Create a one-off button for one screen |
| Render video only through `MotionCover` | Drop a `<video>` tag into a page |
| Build tilted cards with CSS 3D | Use Figma's flattened "3D Rotated" images |
| Self-host fonts, media and icons | Load from Figma URLs or runtime CDNs |
| Leave `TODO(content): …` when content is missing | Fill gaps with plausible-sounding copy |

## Accessibility (target: Lighthouse 100)

- **Focus ring:** `outline-2 outline-offset-2 outline-focus` on `:focus-visible` for every interactive element; offset 4px on cards. Never `outline-none` without a replacement.
- **Contrast:** text ≥ 4.5:1, large text and UI boundaries ≥ 3:1. The Figma footer credits used `fg-tertiary` (~3.3:1); they use `fg-secondary` (~6:1) instead. Don't use `fg-tertiary` for text.
- Caption bar: white on `surface-caption` is ~7:1 over dark covers but drops toward ~4.5:1 over very light ones. Check each cover; raise the overlay opacity for light covers rather than accepting low contrast.
- Faded neighbour cards are `inert` + `aria-hidden` (they're decorative previews; the TOC is the accessible route). A polite live region announces the active project ("Fyn, 2 of 5") when the wheel settles.
- Icon buttons always have `aria-label`; decorative SVGs are `aria-hidden="true" focusable="false"`.
- Drawer and TOC popover: focus moves in on open, Esc closes, focus returns to the trigger.
- Every interaction in `layout-and-motion.md` has a keyboard path. Skip link to main content on every page.
- Touch targets ≥ 44×44. TOC items are 36px tall, so extend their hit area on touch.
- `lang="en"`, one `<h1>` per page, landmark regions (`header`, `nav`, `main`, `footer`).

## Performance (target: Lighthouse mobile ≥ 90)

- LCP is the active card's **poster** image: eager, `fetchpriority="high"`, sized, AVIF/WebP via `astro:assets`. Never the video.
- Fonts: two `woff2` files, preload the 500 weight, metric-matched fallback (`size-adjust`) to keep CLS at 0.
- JS: Astro scripts and islands only where needed; Motion only where it animates. Check the homepage bundle after each feature.
- **Motion at 60fps, always**, including at 4× CPU throttle: `transform`/`opacity` first, prepare before the first moving frame, prove it with `scripts/perf-motion.mjs` (0 missed frames). Details in AGENTS.md → Motion rules.
- No third-party scripts. (Analytics, if wanted later: Cloudflare Web Analytics, which needs no dependency. Ask first.)

## Media

- Covers: MP4 (H.264) + WebM + poster, ~30s loop, no audio, no text, ≤ 4 MB per file (`check-media.mjs`).
- Encoding guidance for staying under 4 MB at 30s: 720p (1280×720, or the card's 553×400 at 2× ≈ 1106×800), 24–30fps, ~1 Mbps target. Abstract motion compresses well; busy UI captures don't. If a cover can't fit, shorten the loop before dropping resolution.
- Every image has real alt text describing the content, not the file ("Smart Mapping table showing source fields mapped to target fields"). Purely decorative images get `alt=""`.

## Copy

- Sentence case, except proper nouns and product names (FYN, GYST, DNEG).
- Meta separator: " • " ("B2B • SAAS").
- Card subtitle = the outcome ("Simplifying data mapping for enterprise integrations"); TOC label = the short name ("Data mapping"). Both come from content, never components.
- Footer: "Designed in Figma • Built in Claude".

## Content states

| `status` | Card | Link |
|---|---|---|
| `live` | No badge | `/work/[slug]`, full case study |
| `nda` | "NDA protected" badge | `/work/[slug]`, placeholder with how to request access |
| `coming-soon` | "Coming soon" badge | `/work/[slug]`, placeholder |
| `placeholder` | No badge | `/work/[slug]`, placeholder |
| `draft: true` | Not rendered in production | Route not built |

## SEO

- Every page: unique `<title>` (template from `siteSettings`), description ≤ 160 chars, canonical, OG + Twitter tags, `og:image` (per case study; default otherwise).
- `sitemap.xml` via `@astrojs/sitemap`, excluding `/_system` and drafts. `robots.txt` allows all in production; preview deployments send `noindex`.
