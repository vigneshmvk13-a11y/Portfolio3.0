# Components

One entry per component: Figma node, anatomy, variants, states, tokens, status. Update the entry in the same commit as the code. Utilities below are our token utilities (`design/tokens.md`).

Status: `specced` (from Figma, not built) · `proposed` (not in Figma, needs Vignesh's OK) · `built` · `verified` (matched to Figma at 393 and 1440, Lighthouse and keyboard checked).

Build order: **foundation** (IconButton, Button, Link, LogoPill, Badge, MotionCover) → **home** (Intro, ProjectCard, ProjectWheel, ProjectToc, FooterBar, BottomSheet, TocHandle) → **about** (AboutDrawer, TimelineRow) → **case study** (CaseStudy layout, CaseHero, CaseTabs, the sections, MoreProjects, CaseNav; LensSummary later).

---

## Foundation

### IconButton
**Figma:** `178:1441`, mobile `233:4704`, drawer `234:5306` · **Status:** built

Square button, one Phosphor icon. About (`User`), Resume (`File`), Contact (`ChatCircleDots`), Close (`X`).

| Variant | Box | Padding | Radius | Icon | Border | Where |
|---|---|---|---|---|---|---|
| `sm` | 52 | `p-4` | `rounded-button-sm` | `icon-sm` | `border-line-subtle` | Desktop intro |
| `lg` | 50 | `p-4` | `rounded-button-lg` | `icon-xs` | `border-line-default` (hover `line-strong`) | Mobile sheet (border added in Figma 246:2317, 2026-10-21) |
| `lg-outlined` | 60 | `p-5` | `rounded-button-lg` | `icon-sm` | `border-line-default` | About drawer |
| `close` | 52 | `p-4` | `rounded-media-sm` | `icon-sm` | `border-line-default` | Drawer close |

`bg-surface-raised`, icon `text-fg-secondary`.

States (proposed): hover → `border-line-strong`, icon `text-fg-primary` (`--duration-fast`); active → `scale-96`; focus-visible → focus ring (`rules.md`); disabled → not used.

Props: `icon`, `label` (required, becomes `aria-label`), `variant`, `href?` (renders `<a>`), `external?` (adds `target="_blank" rel="noopener"` and "opens in new tab" to the label).

### Button
**Figma:** `178:1441` has label/leading/trailing options · **Status:** built (proposed design)

Text button for case studies and the placeholder ("All work", "Request access"). Same surface, border and radius as IconButton `sm`; `text-label-1 font-medium text-fg-secondary`; optional leading/trailing icon, gap `gap-2.5` (10px, add to the step list if used). One variant until a design needs more.

### Link
**Figma:** none · **Status:** built (proposed design)

Inline text link inside prose. `text-fg-strong`, underline `decoration-line-strong underline-offset-4`, hover → `decoration-fg-strong`. External links get a trailing ↗ icon and "opens in new tab" in visually hidden text. Never colour-only.

### LogoPill
**Figma:** `144:52` (DNEG), `144:49` (Kotak) · **Status:** built

`w-logo-w-sm h-logo-h-sm` (64×24) on mobile, `w-logo-w h-logo-h` (80×30) on desktop, `rounded-card`. In the intro, "@" and "&" are `label-2` on mobile and `label-1` on desktop; the row is `gap-1` (4px) throughout (Figma 246:2310, 233:4527). Raster in Figma; request SVGs, otherwise export 2× and 3× through `astro:assets`. Alt "DNEG", "Kotak Mahindra Bank".

### Badge
**Figma:** `230:4637` (NDA, with Lock), `230:4652` (Coming soon) · **Status:** built

Pill top-right on ProjectCard, inset from the card corner by 16px (`top-4 right-4`) on mobile and tablet (Figma 256:6791) and 24px (`top-6 right-6`) on desktop. `bg-surface-badge rounded-full py-2`, `text-label-3 font-medium text-fg-strong`. Without icon: `px-4`. With icon (16px Phosphor Lock, fill weight): `pl-3 pr-4 gap-1`. Variants come from `status`: `nda` → Lock + "NDA protected"; `coming-soon` → "Coming soon". Other statuses render nothing. It's the one colour in the chrome (confirmed).

### MotionCover
**Figma:** card covers · **Status:** built (video playback untested: no cover videos exist yet)

The only component that renders `<video>`. Props: `mp4?`, `webm?`, `poster?` (an `astro:assets` image from `src/assets/covers/<slug>/`), `alt`, `priority?` (eager poster for LCP), `active` (controls play), `transitionCover?` (marks a project cover for the card ⇄ cover page transition). Without `mp4`/`webm` it renders the poster only. Without a poster it renders a neutral `bg-surface-selected` block (plus `TODO(content)` in dev).

- Posters decode asynchronously (`decoding="async"`, also the eager LCP one): a synchronous decode landing mid page transition dropped frames.
- Renders the poster as `<img>` underneath (LCP, alt text) and the `<video>` on top with `aria-hidden="true"`, `muted loop playsinline preload="none"`.
- Sources attach only when near the viewport. Plays only while `active`; pauses and resets otherwise. A global controller ensures one playing video.
- Reduced motion or `Save-Data`: the video is never attached; poster only.

---

## Home

### Intro
**Figma:** `233:4522` (desktop), `233:4587` (mobile) · **Status:** built

1. `<h1>`: "I'm Vignesh" `text-fg-primary` + ", Design Leader" `text-fg-secondary`. Mobile `text-h5`, one line, centred; desktop `text-h4`, break after the comma.
2. Subline `text-body-3 text-fg-secondary`.
3. Affiliations: "@" (`text-label-1 text-fg-secondary`) + DNEG pill, "&" + Kotak pill; `gap-2` between groups, `gap-1` inside.
4. Desktop only: IconButton row (`sm`), `gap-2`. On mobile the buttons live in BottomSheet.

Gaps: name↔subline `gap-1` mobile / `gap-2` desktop; text↔affiliations `gap-5` / `gap-6`; block↔buttons `gap-12`. Text from `about`/`siteSettings`, not hardcoded.

### ProjectCard
**Figma:** component set `228:4583` (desktop variants 553×400, mobile 362×262), e.g. `228:4582` · **Status:** built

A link to `/work/[slug]` for every status (`rules.md → Content states`). `rounded-card overflow-hidden aspect-card`. The face (link, cover, badge, caption) is `ProjectCardLink`, shared with the case-study More projects grid; its `compact` variant is title-only at every width with the badge 16px in. The page transition morphs the whole link (`data-vt-cover`): cover, badge and caption as one clipped card, so the hover zoom (1.03) stays inside and the caption never shows up behind the cover on the way back. Opening a project, the caption (`data-card-caption`) and badge (`data-card-badge`) are hidden before the old page is captured, so they neither grow with the card nor float over the growing cover. Coming back from a case study whose cover is off screen, the card doesn't morph; it settles in place (`card-settle`, scale 0.96 → 1 with a fade).

1. **MotionCover** fills the card (`object-cover`). The small white square in the Smart Mapping cover is part of the cover image, not UI.
2. **Badge** (by `status`) top-right.
3. **Caption bar**: bottom, `bg-surface-caption backdrop-blur-caption`, `text-fg-on-media`. Subtitle left (`text-label-2 font-medium`; one line + ellipsis on desktop, two lines on mobile). Meta right (`text-label-2`), **desktop only**: the mobile caption is the title alone (Figma 260:6971–260:6975). Mobile and tablet: `p-4` (Figma 256:6791, 2026-10-22). Desktop: `px-8 py-4`, `gap-5`.

States: `active` (flat, playing) · neighbour (tilted, `--wheel-fade`, `inert` + `aria-hidden`, video off) · hover on active (cover scales to 1.03, proposed) · focus-visible ring with 4px offset. · lite (`html[data-quality="lite"]`, slow device): caption `[data-card-caption]` without the backdrop blur.

### ProjectWheel
**Figma:** `233:4539` (desktop), `233:4582` (mobile) · **Status:** built (interactive, scroll-linked, with the intro)

Replaces ProjectStack. Renders every published card (server-rendered resting state) inside a stage. Client logic lives in `src/scripts/wheel/`:
- `geometry.ts`: pure maths.
- `controller.ts`: holds one `position` number; springs it with Motion, chases scroll input (`follow`), or plays keyframes (`animatePosition`, the intro).
- `render.ts`: maps position → each card's transform, opacity, z-index, `inert`, `aria-hidden`.
- `input.ts`: wheel (scroll-linked, snaps when quiet), pointer, keyboard.
- `src/scripts/intro/intro.ts`: the slot-machine intro, lazy-loaded. Chrome it reveals is marked `data-intro-reveal="sheet|rise|edge|fade"` (BottomSheet, desktop TOC column, TocHandle, FooterBar).
- `src/scripts/quality.ts`: adaptive quality; samples frames during motion and switches the page to lite on a slow device (`layout-and-motion.md → Adaptive quality`).

Emits `wheel:start {index, slug, via}` (motion began; covers pause), `wheel:change {index, slug, from, via}` and `wheel:settle {index}` on the stage element; ProjectToc, BottomSheet, the hash sync and MotionCover listen. Stage: `role="region" aria-roledescription="carousel" aria-label="Projects"` plus a polite live region. Behaviour: `layout-and-motion.md → Project wheel`. Vanilla TS (no React island: the state is one number, and React alone would exceed the 30 KB homepage budget).

### ProjectToc
**Figma:** `233:4545` · **Status:** built

`<nav aria-label="Projects">`, `w-side`, `gap-1`. Items: `p-2 rounded-item text-body-3 font-medium`. Each item is an `<a href="/work/slug">`. JS makes a plain click rotate the wheel; modifier-clicks still open the page.
- Inactive: `text-fg-secondary`. Hover (proposed): `bg-surface-hover` with `text-fg-primary` (secondary fails contrast on the hover grey).
- Active: `bg-surface-selected text-fg-strong` (gray/900, Figma 261:7057), leading dash 12×2 `bg-indicator rounded-item` with `gap-2`. `aria-current="true"`.

### TocHandle (mobile)
**Figma:** `233:4609` (27×80), `233:4714` (193×223) · **Status:** built

One shape that **morphs** from the right-edge tab into the TOC panel and back (no popover).

Anatomy, inside `[data-toc-morph]`, which is fixed right and centred on `--wheel-centre-y`:
1. A clip element (`bg-surface-raised`, `clip-path` = the outline path). It holds the bars SVG (five ticks plus the `surface-selected` highlight) and the `<nav>` with `ProjectToc variant="panel"` (`gap-0.5`, no dash; the row background is off, and text colour follows `data-hl`).
2. The outline SVG (1px `stroke-line-strong`).
3. A transparent `<button>` over the tab: `aria-expanded`, `aria-controls`, and a 44px hit area via `::before`.

The tab is server-rendered from Figma's path, so it matches with no JS. Ticks: active `fill-fg-strong` (gray/900), others `fill-line-strong` (gray/300). Open panel: highlighted row text `fg-strong`, others `fg-secondary`, highlight `surface-selected` (Figma 261:7057). The tab fits five ticks; more projects need a taller tab.

Behaviour (press, scrub, release, tap, keyboard) and the morph spec: `layout-and-motion.md → TOC handle`. Scripts: `toc-morph.ts`, `toc-shape.ts`; `toc.ts` keeps ticks, labels and `aria-current` in sync.

### BottomSheet (mobile) / left column (desktop)
**Figma:** `233:4586` expanded, `233:4626` collapsed, desktop `233:4520` · **Status:** built

One element, so the page has one Intro and one `<h1>`. Mobile: fixed bottom, `bg-surface-raised`, `rounded-t-panel`, `border-line-default` top/left/right, `pt-12 gap-8`; bottom padding `8 + env(safe-area-inset-bottom)`; side padding `--wheel-inset` (52px, Figma 260:6906), lining the text up with the card. Mobile type: name `text-h6`, subline `text-body-4` (desktop `text-h4` / `text-body-3`). Tablet: max `card-w`, centred. Desktop: static left column, `gap-12`, `sm` buttons. Two button rows (`lg` mobile, `sm` desktop) swap by breakpoint. Affiliations: "@ DNEG" 4px apart, "& Kotak" 8px on mobile (Figma 246:2310), 4px on desktop. Mobile surface: an absolute `[data-sheet-bg]` (`bg-surface-raised`, `rounded-t-panel`, `border-line-default`) plus a handle button (40×6 `line-strong` bar, Figma 251:6710). Spacing scales with viewport height (`--sheet-pt/gap/pb/intro-gap`); the buttons are Figma's 50×50 (`lg`, radius 16px). It collapses when the wheel moves and opens only by tap, handle or drag (`sheet.ts`; `layout-and-motion.md → Bottom sheet`). Resume is left out of production until `siteSettings.resume` exists (dev shows a dashed TODO outline).

### FooterBar (desktop)
**Figma:** `233:4558` · **Status:** built

Fixed bottom, `px-gutter py-10`, `text-label-3 font-medium`, three-column grid. Left: "Designed in Figma • Built in Claude" (`footerCredit` from siteSettings), `text-fg-secondary`, with "Figma" and "Claude" in `text-fg-strong`. That keeps Figma's two-tone hierarchy one step darker, because Figma's `gray/500` base fails contrast. Centre: "Scroll" `text-fg-secondary`, fades after the first step. Right: empty (grid keeps the centre centred).

---

## About

### AboutDrawer
**Figma:** `234:5386`, mobile `234:5545` / `234:34225` · **Status:** built

Modal `<dialog closedby="any">` (JS light-dismiss fallback). Desktop: `w-drawer`, inset 40px top/left/bottom, `rounded-panel bg-surface-raised`, **no scrim, no shadow** (as drawn in `234:4968`). Mobile: bottom sheet 32px from the top, `rounded-t-panel`, `border-line-default`, `p-1` inset, `surface-scrim` backdrop (proposed: the page behind would otherwise compete). Tablet: same sheet, centred, `max-w-drawer`.

1. Header: `h-banner` (200px) image, `close` IconButton top-right (`p-5`). Mobile: banner `rounded-b-media-sm` inside a `rounded-t-panel-inner` (28px) clip.
2. Avatar `size-avatar rounded-full`, overlapping the banner by `avatar-overlap` (73px). Centred on mobile, left (`px-5`) on desktop.
3. Bio from `about.bio` (inline Markdown: `**…**` → `font-medium text-fg-strong`). Desktop `text-body-2` both paragraphs, `px-5 py-8 gap-5`. Mobile: para 1 `text-label-1` regular, others `text-body-3`, `px-4`.
4. Actions: Resume + Contact (`lg-outlined`), `gap-2`.
5. Gallery: see Gallery.
6. Journey: heading "Journey so far", `text-body-1` desktop / `text-label-1` mobile, `font-medium text-fg-strong`; TimelineRow list `gap-3 px-5`.

Mobile compact header (`234:34225`): an 84px sticky bar (banner strip, `avatar-sm` 52px avatar left, close right) fades in when the banner block leaves the drawer's scrollport (IntersectionObserver). It's a state switch rather than scroll-linked, so reduced motion only loses the fade. Opening: `@starting-style` transitions (no JS animation). `/?about` opens without the entrance. Fires `drawer:open` / `drawer:close`. All content from the `about` singleton.

### Gallery
**Figma:** `234:5312` (desktop 170×200), `234:34033` (mobile 150×176) · **Status:** built

Horizontal scroll-snap row, `gap-2`, `rounded-media-sm` images (`object-cover`, 2×/3× sources). Labelled region, `tabindex="0"` for keyboard scrolling, hidden scrollbar, `overscroll-behavior-x: contain`.

### TimelineRow
**Figma:** `234:5322` · **Status:** built

Role (`text-label-3 font-medium text-fg-strong`, flex 1) · years (`text-label-2 text-fg-secondary`) · place (`text-label-2 text-fg-secondary`, flex 1, right). `pb-3`, `border-b border-line-default` except last. Mobile: role, then "years • place" below (`234:5601`). Render as a `<dl>` or list, not a table.

---

## Case study

Figma section `234:33903` (Data mapping): desktop `234:18762`, mobile `234:5721`, on-scroll frames `234:27448` / `234:14425`. The other four case studies (section `279:8667`, desktop only) use the same components, plus Context (Fyn, Gyst) and System (Prime compass). Page layout and behaviour: `layout-and-motion.md → Case study`. Every component reads the `caseStudies` entry (`AGENTS.md → Content model`); nothing is hardcoded but the section names.

### CaseStudy (layout)
**Figma:** `234:18762`, `234:5721` · **Status:** built

`src/layouts/CaseStudy.astro`. CaseHero → CaseTabs (two or more sections) → the filled sections in page order → MoreProjects, with CaseNav fixed on top. Column `max-w-case` (846) centred; mobile `px-6` (24px, Figma's mobile gutter). Without sections a status line replaces the tabs: `nda` gets Figma's NDA copy (`206:18486`) and the Contact button; the others "This case study is being written." Fyn (NDA) and Gyst now have a Context section, so neither shows a status line (and Fyn has no Contact button, as drawn in `279:7507`). Browser tab title is `tocLabel`.

### CaseHero
**Figma:** `234:18764`–`234:18769`, mobile `234:5723` · **Status:** built

1. Tags (`cardMeta`): `text-label-2`, desktop `text-label-1 font-regular`, `fg-secondary`.
2. Title (`subtitle`) as the page `<h1>`: `text-h5`, desktop `text-h4`, `fg-primary`.
3. Cover: MotionCover, `rounded-card`, `aspect-card` on mobile (Figma 354×256, the card's ratio) and `aspect-cover` on desktop (846×556). Eager, high priority (the LCP image). Same poster as the homepage card, so the page transition morphs one image. `id="case-cover"`.
4. Facts `<dl>`: Role, Timeline, Team ("Name (Role)" per line). Label `text-label-2 font-medium fg-primary` (desktop `text-label-1`); value `text-body-3` (desktop `text-label-2`). Mobile: Role and Timeline side by side (`gap-x-4`), Team below, `pt-6 pb-8`. Desktop: three `w-meta-col` (176) columns centred, `gap-6`, `py-22`. Empty facts are left out.

Tags start 40px from the top at every width (`pt-10`; Vignesh, 2026-10-23, was 80). Desktop text sits in `max-w-case-text` (668) inside the 846 column; Figma's 89px insets are 88 (`22`).

### CaseTabs
**Figma:** `234:18780`, mobile `234:5742` · **Status:** built

In-page `<nav aria-label="Sections">` of links, not ARIA tabs (each tab scrolls; nothing is hidden). Track `bg-surface-selected rounded-tabs p-0.5`, tabs `gap-1`, each `px-5 py-3 rounded-button-sm`, `text-label-2` (desktop `text-label-1`) `font-medium`. Inactive `fg-secondary-on-fill` (Figma's gray/500 is 3.0:1 on the track); active `fg-primary` on a white pill with a `line-subtle` border. 40px below the tabs (`pb-10`) to the first section at every width (Vignesh, 2026-10-23). Sticky at `top-5` (20px; Vignesh, 2026-10-23) from the tabs to the end of Reflection; sections scroll to 100px (`scroll-mt-25`). Mobile: full width, the row scrolls sideways (`touch-action: pan-x`, no scrollbar) and keeps the active tab in view. Order follows the page, not Figma's (Figma lists Outcome before Final designs).

States: active (`aria-current="location"`) · hover → `fg-primary` · focus ring. Without JS the active tab draws its own pill; with JS one pill slides between tabs (`translate` + `width`, `duration-base`, `ease-out`).

### Eyebrow
**Figma:** `234:18795` · **Status:** built

The section name ("OVERVIEW") as the section's `<h2>`, so the outline is Section › heading › subheads and matches the tab. `text-label-3` (desktop `text-label-2`) `font-medium uppercase tracking-eyebrow`, `fg-secondary` (Figma's gray/500 is 3.6:1 on white).

### SectionLead
**Figma:** `234:18796` · **Status:** built

Heading (`<h3>`, `text-h6`, desktop `text-h5`, `fg-primary`) and intro paragraphs (`text-body-3`, desktop `text-body-2`), `gap-4` (desktop `gap-3`). Used by Overview, Outcome and each Solution step.

### ContextSection
**Figma:** `279:7530` (Fyn), `279:7574` (Gyst) · **Status:** built

For case studies without the full sections. No card: the text column (`max-w-case-text`), `pt-8` (desktop `pt-22`, Figma's 89 under the cover). Eyebrow, then blocks `gap-8` (desktop `gap-10`, Figma's 40): each a SectionLead plus an optional bullet list (Overview's `list-disc` style). `facts` render right under the last block as "**Label:** value" lines (`<dl>`, label `font-medium fg-primary`); `note` closes it in `text-body-4`. Heading → text uses SectionLead's gap (12 on desktop; Figma draws 20 here, as in other sections the template already sets at 12).

### OverviewSection
**Figma:** `234:18793`, mobile `234:5756` · **Status:** built

White card: `bg-surface-raised rounded-panel px-6 py-8`, desktop `rounded-section p-22`. Eyebrow + SectionLead, then The challenge (bullets, `list-disc pl-5`, desktop `pl-6`) and The key insight, stacked on mobile (`gap-6`), two columns on desktop (`gap-5`). Subheads `<h4>` `text-label-2 font-medium` (desktop `text-label-1`). Both labels come from the CMS.

### SolutionSection
**Figma:** `234:18806`, mobile `234:5769` · **Status:** built

Eyebrow, then one step per entry: SectionLead in the text column, then the step's media full width in a MotionCover (`rounded-card`, `aspect-media-sm` on mobile, `aspect-media` 846×476 on desktop). Steps `gap-8` (desktop `gap-15`). A step can carry MP4/WebM later; the most-visible-cover rule keeps one video playing.

### SystemSection
**Figma:** `279:6704` (Prime compass) · **Status:** built

Eyebrow + SectionLead in the text column, then the image and cards across the case column, `gap-8` (desktop `gap-12`, as Outcome). Desktop: image `w-system-media` (521) with the cards stacked beside it (`gap-5`), sharing the image's height (`flex-1`) as drawn. Below desktop (not designed): the image full width, cards stacked under it. Cards are Outcome's (`rounded-tile bg-surface-raised`, `p-6 gap-2`, desktop `p-5 gap-10`, `<h4>` titles). The image is a CaseImage (`rounded-card`, natural ratio 521×566).

With `link` (a published case study), the whole image is one link to it (`data-system-link`): accessible name "{tocLabel} case study" (the image's alt is empty inside the link; `alt` is used when there's no link). Its cue is Figma's arrow button, rebuilt as the floating nav's Home pill (`border-line-default`, `p-3`, `icon-lg` ArrowUpRight, white), 16px in from the top right (Figma's 14 / 18 on our grid). Hover: the image zooms to 1.03 like the project cards and the pill's border turns white. The page fades across to the linked case study (`layout-and-motion.md → Page transitions`). The exported image has Figma's baked arrow painted out.

### FinalDesigns · CaseImage
**Figma:** `234:18819` + `234:18821`, mobile `234:5782` · **Status:** built

Eyebrow (it's the only heading here), then the images. Desktop: a 2-column grid, `gap-6`; `full` spans both, two `half`s sit side by side (411 each; Figma draws 413, which overflows the column). Mobile: one column, `gap-4`. CaseImage renders a `<picture>`: with `imageMobile`, phones and tablets get that crop (Figma recomposes them at 354×256) and desktop the main image, each source with its own width/height so nothing shifts; AVIF/WebP, lazy, `rounded-card`, natural ratio.

### OutcomeSection
**Figma:** `234:23062`, mobile `234:10028` · **Status:** built

Eyebrow + SectionLead, then one card per result: `bg-surface-raised rounded-tile`, `p-6 gap-2` mobile, `p-5 gap-10` desktop (3 columns, `gap-6`, in the text column). Title `<h4>` `text-label-2 font-medium` (desktop `text-label-1`), text `text-body-3` (desktop `text-body-2`). Title and text only: no metric (Vignesh, 2026-10-22).

### ReflectionSection
**Figma:** `234:23078`, mobile `234:10044` · **Status:** built

White card like Overview. Eyebrow, heading, paragraphs (no gap between them, as drawn on mobile). Mobile keeps Overview's 24px inset; Figma draws it edge to edge (`DESIGN.md → Open questions`).

### MoreProjects
**Figma:** `234:23083`, mobile `234:10050` · **Status:** built

`<h2>` "More projects" (`text-h5`) and "See all" (→ `/`, `text-label-1 font-medium fg-secondary`, hover `fg-primary`): beside the heading on desktop, under the cards on mobile. The next three projects in homepage order, wrapping, never the current one, as compact ProjectCardLinks (posters only, badge 16px in, title only). Desktop 3 columns `gap-5` in the text column; mobile one column `gap-5`. `pb-30` (desktop `pb-40`) leaves room for CaseNav.

### CaseNav
**Figma:** `234:23100` (expanded), `234:31771` (collapsed), mobile `234:10068` · **Status:** built

Fixed, centred, 32px above the bottom (plus the safe area). A pill (`p-1 gap-1 rounded-full`) on `surface-caption` with `backdrop-blur-nav` (40px: what scrolls under it blurs): Previous and Next (`w-nav-btn` 97, `px-4 py-3`, `text-label-1 font-medium fg-on-media`) and Home (`p-3`, HouseSimple `icon-lg` 22, `z-10` so the sliding labels pass under it). Each has a `line-default` border, hover `surface-raised` border. Figma's fill (70% grey, white text 2.8:1) is replaced by `surface-caption` (4.5–4.7:1). Previous / Next wrap round the homepage order; their accessible names add the project ("Previous: Gyst - Productivity app"). Home goes to `/#slug` (`/` for the first project), so the wheel lands on this project.

States: expanded · collapsed (Previous / Next fade out first, `duration-fast`; then the surface narrows to Home (its `left` / `right`, not a clip-path) and they slide under it on `duration-slow` + `ease-in-out`, no bounce; expanding runs it backwards, the labels fading in only after the surface has opened and they've slid clear of Home) · any link focused → expanded (`:focus-within`) · lite: no blur. Named `case-nav` only during a slide transition, so it stays put; a permanent `view-transition-name` would make it a backdrop root and kill the blur.

### LensSummary
**Figma:** to be designed · **Status:** proposed (structure only)

Three-tab switcher (Recruiter · Designer · Curious) over pre-written summaries from `summaries/<page>`. ARIA tabs pattern, vanilla TS. Default lens: Recruiter. Remembers the choice in `localStorage` (wrapped in try/catch). Renders nothing if the entry is missing or `reviewed` is false. Shows a small "Written with AI, reviewed by Vignesh" note.
