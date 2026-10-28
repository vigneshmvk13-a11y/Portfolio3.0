# AGENTS.md — Portfolio 3.0

Standing instructions for any coding agent (Claude Code) in this repo. `CLAUDE.md` imports this file. Read it, then `DESIGN.md`, before writing code. Keep it current: when a decision changes, update this file in the same commit.

## Who and why

Vignesh is a senior product designer: 7 years in enterprise SaaS, fintech and AI platforms, currently design lead at DNEG on Kotak Mahindra Bank's wholesale banking app. This site replaces vigneshmvk13.framer.website. It has to read as **senior-level and AI-fluent** to recruiters: calm, precise, fast, and showing design rationale rather than only screens.

The design is finished in Figma. **Build to it; don't invent layouts.** Where Figma is silent, follow `DESIGN.md`. If `DESIGN.md` is silent too, propose, wait for approval, then write the decision down.

Vignesh wants to be challenged, not agreed with. If an instruction here is a bad idea, say so with the reason and an alternative before you comply.

## Source of truth

| What | Where |
|---|---|
| Visual design | Figma file `rGKG8uncSDJD3mYYD4UTiB` (Portfolio 3.0) |
| Homepage section | node `233:4731` |
| Design system | `DESIGN.md` → `design/*.md` |
| Content | Keystatic → MDX/YAML in `src/content/` |

| Frame | Node |
|---|---|
| Desktop home (1440) | `233:4518` |
| Desktop + About drawer | `234:4968` (drawer `234:5386`) |
| About section (current) | `280:9512`: desktop `280:9404` / scrolled `280:9452`, mobile `280:9285` / scrolled `280:9344` |
| Mobile home (393) | `233:4581` |
| Mobile TOC open | `233:4686` |
| Mobile on downscroll | `233:4621` |
| Mobile About / on scroll (superseded by `280:9512`) | `234:5489` / `234:5601` |
| Project card | `228:4582` (desktop), `230:4671` (mobile) |
| Icon button | `178:1441` |
| Case study (Data mapping) section | `234:33903` |
| Case study desktop / viewport / on scroll | `234:18762` / `234:23105` / `234:27448` |
| Case study mobile / viewport / on scroll | `234:5721` / `234:10073` / `234:14425` |

The case-study template is built from the Data mapping design; every case study uses it, with sections appearing as their content is filled in.

## Stack (decided; don't substitute without asking)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Astro**, `output: 'static'` | No SSR, no adapter, no server runtime in production |
| Language | **TypeScript strict** (`astro/tsconfigs/strict`) | Pinned to 6.x: `@astrojs/check` 0.9 doesn't support TypeScript 7 yet |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` | Theme is the token set in `design/tokens.md`. Default palette, radii, fonts, shadows and breakpoints are **reset**, so only our tokens exist as utilities |
| Animation | **Motion** (motion.dev) | Vanilla `animate`/`scroll` API in Astro `<script>` blocks; the React API only inside React islands. Never ship it on pages that don't animate |
| Interactivity | **React islands**, sparingly | Only for genuinely stateful UI (case-study prototypes later). Homepage interactions use vanilla TS first; propose an island only if vanilla gets unmaintainable |
| CMS | **Keystatic, local mode** | Admin at `/keystatic` **in dev only** (see Content). Content committed as MDX/YAML |
| Content in Astro | Astro content collections with `glob` loaders over the Keystatic folders | Zod schemas mirror `keystatic.config.ts` |
| Icons | Phosphor (`User`, `File`, `ChatCircleDots`, `X`, arrows), regular weight | Copied into `src/components/icons/` as SVG components. No icon package |
| Font | General Sans (Fontshare), self-hosted `woff2`, 400 + 500 | `font-display: swap`, preload 500, metric-matched fallback to avoid CLS |
| Hosting | Cloudflare Pages, Git integration, deploy on push to `main`, preview per branch | Custom domain `vigneshdesigns.com` (bought and managed in Cloudflare; the `pages.dev` address still works) |
| Package manager | pnpm (via `corepack`; on this machine the shims live in `~/.local/bin`, because `C:\Program Files` isn't writable) | |

### Dependency rule
**No new dependency without asking**, including dev dependencies. The approved set is exactly what the stack implies:

`astro`, `typescript`, `@astrojs/check`, `@astrojs/mdx`, `@astrojs/react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite`, `motion`, `@keystatic/core`, `@keystatic/astro`, `@astrojs/sitemap`.

Anything else (Playwright, Lighthouse CLI, Prettier, ESLint, an OG-image generator) needs a one-line ask with the reason. Prefer a small script in `scripts/` using Node built-ins over a package.

Transitive packages the approved set pulls in are fine: Keystatic's required peers (`react-aria`, `react-stately`, `@keystar/ui`, auto-installed by pnpm, dev admin only), and `sharp` (Astro's image service; one-off asset scripts may use it).

## Project structure (approved 2026-10-20)

```
/
├── AGENTS.md · CLAUDE.md · DESIGN.md
├── design/                     ← design system docs (tokens, components, layout-and-motion, rules)
├── astro.config.mjs            ← also injects dev-only routes (/_system, /_lab/*, /keystatic) and gives dev its own Vite cache (node_modules/.vite-dev)
├── keystatic.config.ts
├── public/
│   ├── fonts/                  ← General Sans woff2
│   ├── media/<slug>/           ← cover.mp4, cover.webm only (committed, ≤ 5 MB each)
│   └── resume.pdf
├── scripts/
│   ├── check-media.mjs         ← fails on any /public/media file > 5 MB
│   ├── check-tokens.mjs        ← fails on raw hex / arbitrary Tailwind values in src/
│   └── screenshot · test-wheel · test-case-study · perf-motion (.mjs)
└── src/
    ├── assets/                 ← images optimised by astro:assets (AVIF/WebP)
    │   ├── covers/<slug>/      ← posters (the LCP image)
    │   ├── case-studies/<slug>/← section images, in Keystatic's field-path folders
    │   ├── logos/ · about/ · og/
    ├── styles/
    │   ├── global.css          ← @import "tailwindcss"; @theme from design/tokens.md; base layer
    │   └── fonts.css
    ├── lib/
    │   ├── motion.ts           ← durations/easings/springs/wheel geometry as JS constants, mirrors tokens
    │   ├── reduced-motion.ts
    │   └── content.ts          ← getPublishedCaseStudies(), singletons
    ├── scripts/                ← client modules (no DOM in geometry.ts)
    │   ├── wheel/              ← geometry, controller, render, input
    │   ├── intro/              ← load choreography, lazy-loaded
    │   ├── case-study/         ← tabs, floating nav, swipe
    │   ├── page-transition.js  ← plain JS, inlined in every <head> (cross-document view transitions)
    │   └── toc.ts · sheet.ts · drawer.ts · drag.ts · gallery.ts · scrollbar.ts · hash.ts · media.ts
    ├── components/
    │   ├── icons/
    │   ├── ui/                 ← IconButton, Button, Link, LogoPill, Badge
    │   ├── home/               ← Intro, ProjectWheel, ProjectCard, ProjectCardLink, ProjectToc, TocHandle, BottomSheet, FooterBar
    │   ├── about/              ← AboutDrawer, TimelineRow, Gallery
    │   ├── media/              ← MotionCover (video + poster + reduced motion)
    │   ├── summary/            ← LensSummary (recruiter / designer / curious)
    │   └── case-study/         ← CaseHero, CaseTabs, Eyebrow, SectionLead, Context/Overview/Solution/System/Outcome/ReflectionSection,
    │                             FinalDesigns, CaseImage, MoreProjects, CaseNav
    ├── dev/                    ← system.astro, lab-*.astro (routes injected in dev only)
    ├── layouts/
    │   ├── Base.astro          ← <head>, SEO/OG from siteSettings + page overrides
    │   └── CaseStudy.astro
    ├── content/
    │   ├── case-studies/<slug>.yaml
    │   ├── summaries/<page>.yaml
    │   ├── home.yaml
    │   ├── about.yaml
    │   └── site-settings.yaml
    ├── content.config.ts
    └── pages/
        ├── index.astro
        ├── work/[slug].astro
        └── 404.astro
```

Astro ignores page files that start with `_`, so dev-only pages live in `src/dev/` and `astro.config.mjs` injects them with `injectRoute` only under `astro dev`. They never reach the production build or the sitemap.

## Content model (Keystatic; propose exact schema before building)

**`caseStudies`** — collection, `src/content/case-studies/<slug>.yaml` (data only, no MDX body since 2026-10-22). Images live in `src/assets/case-studies/<slug>/<field path>/`, where Keystatic puts them.

| Field | Type | Notes |
|---|---|---|
| `title` | slug field | Labelled **Project name**. Sets the URL slug only |
| `subtitle` | text | Labelled **Title** in Keystatic. The full title: homepage card (desktop and mobile) and the case-study page heading ("Simplifying data mapping for enterprise integrations") |
| `tocLabel` | text | Labelled **Short title**. TOC on mobile and desktop, and the browser tab / share title ("Data mapping") |
| `cardMeta` | text | Labelled **Tags**. "B2B • SAAS": desktop card and above the case-study title (the only tag field) |
| `year` | text | Labelled **Year**. "2025": desktop card, above the tags |
| `status` | select | `live` · `nda` · `coming-soon` · `placeholder`. Drives the card badge, and the case-study status line when there are no sections |
| `order` | integer | Homepage order; also Previous / Next and More projects |
| `draft` | checkbox | Draft entries never build to production |
| `heroVideo` | object | Labelled **Cover image**. `mp4`, `webm` (paths under `/media/<slug>/`), `poster` (image), `alt`. The homepage card and the case-study cover |
| `ogImage` | image | Exported from Figma, 1200×630 |
| `seoDescription` | text, ≤160 chars | |
| `role`, `timeline` | text | Case-study facts row |
| `team` | array of `{ name, role? }` | Facts row, "Name (Role)" |
| `tools` | array of text | Not shown yet |
| `context` | object | `blocks` (`{ heading, body, items[] }`, items a bullet list), `facts` (`{ label, value }`, "Role: …"), `note` (small closing text). For case studies without the full sections (Fyn, Gyst) |
| `overview` | object | `heading`, `intro`, `challengeLabel` ("The challenge"), `challenge` (bullets), `insightLabel` ("The key insight"), `insight` |
| `solution` | array of steps | `heading`, `body`, `media { image, alt, mp4?, webm? }` |
| `system` | object | `heading`, `intro`, `image`, `alt`, `link` (relationship to another case study; the whole image links to it), `cards` (`{ title, body }`). Prime compass |
| `finalDesigns` | array | `image`, `imageMobile?` (recomposed phone crop), `alt`, `layout` (`full` · `half`) |
| `outcome` | object | `heading`, `intro`, `cards` (`{ title, body }`). Title and text only, no metrics (Vignesh, 2026-10-22) |
| `reflection` | object | `heading`, `body` |

Long text is plain multiline text; a blank line starts a new paragraph. Each section, and its tab, renders only when it has content. The Decision block (options, trade-offs) was dropped on 2026-10-22: the Figma Solution steps carry the decisions in lighter form.

**`summaries`** — collection keyed by page id (`home`, `about`, or a case-study slug): `recruiter`, `designer`, `curious` (each short rich text), `generatedWith` (model + date, for honesty), `reviewed` (checkbox; unreviewed summaries don't render). **The site never calls an AI API at build or runtime.** Summaries are written or pre-generated outside the build and committed.

**`home`** — singleton, labelled **Homepage hero**: `headline` ("I'm Vignesh,"), `role` (grey, own line on desktop), `currently` (the line under it), `affiliations` (array of `{ name, logo, logoHover?, url? }`, the "@ DNEG & Kotak" pills).

**`about`** — singleton: bio paragraphs (rich text, allows emphasis spans), avatar, banner, gallery (images + alt), journey (array of `{ role, years, place }`).

**`siteSettings`** — singleton: nav labels, SEO defaults (title template, description, default OG), favicon and home-screen icon (saved to `public/`), social links, contact (email or URL), resume link.

### Keystatic and "static only"
Keystatic's admin UI and its GitHub mode need server routes, which a static build can't serve. So: **local mode, admin in dev only.** Register the Keystatic integration only when `NODE_ENV=development` and keep `output: 'static'`. Editing flow: `pnpm dev` → `/keystatic` → save → commit → push → Cloudflare deploys. If Vignesh later wants to edit from a browser without the repo, that needs GitHub mode plus an adapter for the admin routes. That's a stack change; raise it, don't do it.

## Media rules

- Case studies lead with a looping motion cover: ~30s, no audio, no text.
- Every cover ships **MP4 (H.264) + WebM** and a **poster** (also the LCP image). Markup: `<video autoplay muted loop playsinline preload="none" poster="…">`, WebM source first.
- Videos live in `/public/media/<slug>/`; posters in `src/assets/covers/<slug>/` so `astro:assets` can optimise them. Both committed. `scripts/check-media.mjs` runs in `pnpm check` and **fails on any file over 5 MB**. Report every hit to Vignesh; don't re-encode silently.
- Lazy: below-the-fold videos don't load until near the viewport (`IntersectionObserver` sets `src`).
- **At most one video plays at a time**, and only when it's the active/visible one. Pause and reset the others. **One exception (Vignesh, 2026-10-24):** the three covers in a case study's More projects row all autoplay together (`data-autoplay`) while near the viewport; they're small cards. Every other cover keeps the one-at-a-time rule.
- `prefers-reduced-motion: reduce` or `Save-Data` → poster only, no video element playback.
- All of this lives in one component, `MotionCover`. Nothing else renders `<video>`.

## Motion rules

- Motion explains a change of state. No decorative or ambient animation beyond the active cover video.
- **One exception: the homepage intro choreography** (`design/layout-and-motion.md → Intro choreography`). At most ~2s, once per session, skipped by any input, absent under reduced motion. It never delays the LCP card. No other load or ambient animation.
- Durations, easings and springs come from tokens (`design/tokens.md → Motion`), mirrored in `src/lib/motion.ts`. No magic numbers.
- **Reduced motion:** no scroll-triggered or scroll-linked animation, no parallax, no intro, no page transitions. Other state changes are instant. **One exception, Vignesh's call (2026-10-21):** a homepage wheel step plays as a short turn (`wheel.reducedTurn`, 0.2s ease-out, one project per gesture, no overshoot or momentum). Why: Windows "best performance" mode reports reduced motion too, and the wheel turn is the site's identity. The cost (motion-sensitive visitors see a brief 3D turn; WCAG 2.3.3, AAA) was raised and accepted. Don't extend the exception without asking. The wheel's resting layout (tilted, faded neighbours) is a still image and stays.
- **Slow devices:** keep the motion, drop the extras. `src/scripts/quality.ts` samples frames while the wheel moves; too many slow frames (or Save-Data) switch the page to `html[data-quality="lite"]` (faster intro) for the session.
- Load Motion only in the scripts/islands that animate. Check the bundle: the homepage JS should stay small (target < 30 KB gzipped total).
- **Every motion holds 60fps** (Vignesh, 2026-10-21), including under 4× CPU throttling. Animate `transform` and `opacity`; anything else (layout, filters, `grid-template-rows`) only if `scripts/perf-motion.mjs` shows no missed frames. Prepare before moving, never in the first moving frame (decode images, make layers exist). Add each new motion to `perf-motion.mjs` and report the table.

## Non-negotiables

- **Mobile-first.** Base styles are mobile; `tablet:` and `desktop:` add up. Test every breakpoint, including 360, 393 (iPhone 16), 412 (Nothing Phone 1), 768, 1024, 1280, 1440, 1920.
- **Lighthouse (mobile): performance ≥ 90, accessibility 100**, on the home page and every case study.
- Semantic HTML, full keyboard path, visible focus states, real alt text.
- Per-page `<title>`, description, canonical, OG and Twitter tags; per-case-study OG image.
- **No lorem ipsum, no invented metrics or quotes.** Missing content gets a visible `TODO(content): …` in dev and is excluded from production builds (draft or empty-state).
- **Tokens only.** No raw hex, no arbitrary Tailwind values (`p-[13px]`, `text-[#333]`), no inline styles for design values. `scripts/check-tokens.mjs` enforces it. Missing value? Add it to `design/tokens.md` first, then `global.css`.

## Working with Figma

1. Use the Figma MCP: `get_design_context` on the specific node, `get_screenshot` as the visual target.
2. The MCP returns React + Tailwind with arbitrary values. **Translate** to Astro components using our token utilities. Never paste its classes.
3. Download assets into the repo. Figma asset URLs expire in 7 days; never reference them.
4. The tilted neighbour cards are flattened images in Figma. Rebuild them as real cards with CSS 3D (`design/layout-and-motion.md → Project wheel`). Card source variants for all five projects are in component set `228:4583`.
5. Ignore auto-layout artefacts (spacer frames, `leading-[0]` wrappers).
6. If Figma contradicts itself, add it to `DESIGN.md → Open questions` and ask.

## Design system discipline

- Components use **semantic** tokens only. Primitives (`--gray-700`) exist in `:root` but have no utilities.
- Building or changing a component means updating its entry in `design/components.md` in the same commit.
- Any decision Figma doesn't cover goes in `design/rules.md` or `design/layout-and-motion.md` and the `DESIGN.md` changelog.

## Verification

- After each component/page: compare against the Figma screenshot at 393×852, 412×915 and 1440×1024 with `scripts/screenshot.mjs`. It drives the system Chrome over the DevTools Protocol (plain `--window-size` can't go below ~500px wide in headless Chrome). No dependency; Playwright isn't approved.
- Before marking a page done: Lighthouse mobile run (Chrome DevTools or PageSpeed Insights on the preview URL), keyboard walk-through, reduced-motion pass, `pnpm check` clean.

## Commits and communication

- Small commits, one concern each, conventional prefixes (`feat:`, `fix:`, `style:`, `content:`, `docs:`, `chore:`).
- Before any large change (new pattern, structure change, dependency), post a 3–5 line plan and wait.
- Explain reasoning briefly as you go. When a task ends, report: what was built, decisions Figma didn't cover, open questions.

## Commands

```bash
pnpm dev        # dev server + Keystatic admin at /keystatic
pnpm build      # static build to dist/
pnpm preview    # serve dist/
pnpm check      # astro check + check-media + check-tokens
node scripts/screenshot.mjs <url> <outDir> [393x852 412x915 1440x1024]
                # exact-viewport screenshots via system Chrome + DevTools Protocol
                # env: FULL_PAGE=1, REDUCED_MOTION=1, DELAY=ms, DPR=n, EVAL="js", SUFFIX=name
node scripts/test-wheel.mjs [baseUrl]
                # homepage wheel interaction test (trusted input via DevTools Protocol)
node scripts/test-case-study.mjs [baseUrl]
                # case-study tabs, floating nav, swipe and page transitions (expand, collapse, fade, slide)
node scripts/perf-motion.mjs [baseUrl]
                # fps + missed frames for every homepage motion; env THROTTLE=4 (CPU), HEADFUL=1 (real vsync)
                # run against `pnpm preview`, not dev
```

Headless Chrome reports `prefers-reduced-motion: reduce` by default; the scripts set it explicitly. Chrome skips view transitions in tabs created over CDP (they count as background tabs), so transition checks drive the browser's first tab.

`/_system` (tokens and components) and `/keystatic` exist only under `pnpm dev`.

**New content fields don't show in dev?** The dev server caches parsed content (`.astro/data-store.json`) by each file's digest, so after adding a field to `content.config.ts` an unchanged YAML file keeps its old parse (the new fields come through empty), even across restarts. Delete `.astro/` and restart `pnpm dev`, or make any edit to the YAML file. `pnpm build` is unaffected.

## First tasks, in order

1. **Ask** about anything still ambiguous here or in `DESIGN.md → Open questions`. Batch the questions; don't drip them.
2. **Propose** the final folder structure and the full `keystatic.config.ts` schema (field by field). Wait for approval.
3. **Scaffold** and deploy an empty site to Cloudflare Pages (Git integration on `main`, build `pnpm build`, output `dist`). Vignesh connects the repo in the Cloudflare dashboard; give him the exact settings. Confirm a preview URL works before continuing.
4. **Review `CLAUDE.md`/`AGENTS.md`** against what was actually scaffolded and correct any drift.
5. **Design system layer before any page:** fonts, `@theme` tokens, base styles, focus styles, then `IconButton`, `Button`, `Link`, `LogoPill`, `Badge`, `MotionCover`. Build a dev-only `/_system` page showing every token and component (excluded from the production build and sitemap).
6. Then the homepage (`design/components.md` build order), the About drawer, and `/work/[slug]` placeholders.

## Seed content (confirmed: the desktop list, in this order)

Card copy is from the Figma card variants (`228:4583`).

| order | slug | tocLabel | subtitle (card) | cardMeta | status |
|---|---|---|---|---|---|
| 1 | `data-mapping` | Data mapping | Simplifying data mapping for enterprise integrations | B2B • SAAS | live |
| 2 | `kotak-fyn` | Fyn- Wholesale Banking app | Kotak FYN - Designing Enterprise Banking Experiences | Banking • NDA | nda |
| 3 | `nova-design-system` | Nova Design system | Building an Enterprise Design System for Design-to-Code | Design system • B2B | placeholder |
| 4 | `prime-compass` | Prime compass | Designing an agentic quality intelligence platform | B2B • SAAS | placeholder |
| 5 | `gyst` | Gyst - Productivity app | GYST - Designing Predictions People Can Trust | Personal project | coming-soon |

The mobile Figma TOC ("Workflow builder") is stale.
