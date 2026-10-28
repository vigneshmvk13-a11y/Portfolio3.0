# Components

One entry per component: Figma node, anatomy, variants, states, tokens, status. Update the entry in the same commit as the code. Utilities below are our token utilities (`design/tokens.md`).

Status: `specced` (from Figma, not built) · `proposed` (not in Figma, needs Vignesh's OK) · `built` · `verified` (matched to Figma at 393 and 1440, Lighthouse and keyboard checked).

Build order: **foundation** (IconButton, Button, Link, LogoPill, Badge, MotionCover) → **home** (Intro, ProjectCard, ProjectWheel, ProjectToc, FooterBar, BottomSheet, TocHandle) → **about** (AboutDrawer, TimelineRow) → **case study** (CaseStudy layout, CaseHero, CaseTabs, the sections, MoreProjects, CaseNav; LensSummary later).

---

## Foundation

### IconButton
**Figma:** `178:1441`, mobile `233:4704`, drawer `234:5306` · **Status:** built

Square button, one Phosphor icon. About (`User`), Resume (`File`), Contact (`ChatCircleDots`), Close (`X`). **Hover** (Figma `286:12974`, `(hover: hover)` only): border `line-strong`, icon `fg-primary` and swapped for its filled twin (`iconFill`, e.g. `UserFill`); `close` has none. `glass` (gallery carets) turns solid white with a filled caret. External links open in a new tab automatically.

| Variant | Box | Padding | Radius | Icon | Border | Where |
|---|---|---|---|---|---|---|
| `sm` | 52 | `p-4` | `rounded-button-sm` | `icon-sm` | action surface (below) | Desktop intro |
| `lg` | 50 | `p-4` | `rounded-button-lg` | `icon-xs` | action surface | Mobile sheet (border added in Figma 246:2317, 2026-10-21) |
| `cta` | 50 → 52 | `p-4` | `rounded-button-lg` → `rounded-button-sm` | `icon-xs` → `icon-sm` | action surface | About: the homepage buttons as one component, `lg` below the desktop breakpoint and `sm` from it (was `lg-outlined`, 60px, as Figma draws it; Vignesh 2026-10-26: same size as the homepage's) |
| `close` | 52 | `p-4` | `rounded-media-sm` | `icon-sm` | action surface | Drawer close |
| `glass` | 48 | `p-3` | `rounded-full` | `icon-lg` | `border-line-default` | Gallery Previous / Next over photos (Figma 280:9431): `bg-surface-glass backdrop-blur-glass`, icon `text-fg-on-media` |

**Action surface** (`sm`, `lg`, `cta`, `close` and Button; icon and label `fg-secondary-on-fill` (gray/700) at rest, `fg-primary` (gray/900) on hover; `src/lib/ui-classes.ts`; Vignesh 2026-10-26, because white buttons vanish on the white page): with a hover (`hoverable` = hover and fine pointer), `surface-subtle` fill and stroke (gray/50) at rest, `surface-raised` fill with a `line-default` stroke (gray/200) on hover; without one (touch), `surface-raised` and `line-default` all the time. Icon `text-fg-secondary`, `fg-primary` on hover. `close` uses it too (Vignesh 2026-10-26), over the banner; `glass` as below.

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

`w-logo-w-sm h-logo-h-sm` (64×24) on mobile, `w-logo-w h-logo-h` (80×30) on desktop, `rounded-card`. In the intro, "@" and "&" are `label-2` on mobile and `label-1` on desktop; the row is `gap-1` (4px) throughout (Figma 246:2310, 233:4527). Raster in Figma; request SVGs, otherwise export 2× and 3× through `astro:assets`. Alt "DNEG", "Kotak Mahindra Bank". **Links** (Vignesh, 2026-10-24): each opens its company site in a new tab (`url` on the `home.affiliations` item, Keystatic → Homepage hero); on hover the brand-colour image (`logoHover`, Figma `286:12974`) fades in over it. Same on mobile (links), hover desktop only.

### Badge
**Figma:** `230:4637` (NDA, with Lock), `230:4652` (Coming soon) · **Status:** built

Pill top-right on the ProjectCard cover, 12px from the card's outer edge below the desktop breakpoint and 16px on desktop (Figma 348:14015, 2026-10-29). The lock is 14px (`icon-badge`). It sits inside the cover, which is inset 4px, so `top-2 right-2` / `desktop:top-3 desktop:right-3`. Compact cards on desktop too; none on the mobile row. `bg-surface-badge rounded-full py-2`, `text-label-3 font-medium text-fg-strong`. Without icon: `px-4`. With icon (16px Phosphor Lock, fill weight): `pl-3 pr-4 gap-1`. Variants come from `status`: `nda` → Lock + "NDA protected"; `coming-soon` → "Coming soon". Other statuses render nothing. It's the one colour in the chrome (confirmed).

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

Content: Keystatic **Homepage hero** (`src/content/home.yaml`): `headline`, `role`, `currently`, `affiliations`.

1. `<h1>`: headline "I'm Vignesh," `text-fg-primary` + role "Design Leader" `text-fg-secondary`. Mobile `text-h5`, one line, centred; desktop `text-h4`, break after the comma.
2. Subline `text-body-3 text-fg-secondary`.
3. Affiliations: "@" (`text-label-1 text-fg-secondary`) + DNEG pill, "&" + Kotak pill; `gap-2` between groups, `gap-1` inside.
4. Desktop only: IconButton row (`sm`), `gap-2`. On mobile the buttons live in BottomSheet.

Gaps: name (`text-h5`, desktop `h4`) ↔ subline (`text-body-3`) `gap-1` mobile / `gap-2` desktop; text↔affiliations `gap-5` / `gap-6`; block↔buttons `gap-12`. Text from `about`/`siteSettings`, not hardcoded.

### ProjectCard
**Figma:** `348:14015` (desktop `348:10056` 553×400, mobile `348:10069` 288×208, More projects row `351:9956`; redesign 2026-10-28/29, replaces `228:4583`) · **Status:** built (trial branch `try/card-redesign`)

A link to `/work/[slug]` for every status (`rules.md → Content states`). The face is `ProjectCardLink`, shared with the case-study More projects grid. A grey frame (`rounded-card p-1`; `bg-surface-card-mobile` (gray/100) below desktop, `bg-surface-card` (gray/50) from it) holds the cover, which fills it (`rounded-card-inner`, 553:400 overall at every width).

1. **Cover** (`overflow-hidden`, `data-vt-cover`): MotionCover (`object-cover`), the Badge, and the caption over it.
2. **Caption** (`data-card-caption`): along the cover's bottom edge, `backdrop-blur-caption` (20px) over `--gradient-caption` (`--multiply-80`, black 53.6%, over the bottom 70%, fading out above). Figma draws a 20% grey in multiply, which darkens by only ~10%: white text measured 1.1–3:1 on the Fyn, Nova and Prime compass covers. The darker wash is the lightest that passes 4.5:1 on all five (title, year and tags, measured over the blurred posters). Mobile: `pt-4 px-5 pb-5`, title `text-label-3 font-medium text-fg-on-media`, two lines then ellipsis. Desktop: `p-6 gap-1`, title `text-label-1`, and a right-aligned column: **Year** (`year`, medium, `fg-on-media-soft` gray/50) over the **Tags** (`cardMeta`, regular, `fg-on-media-muted` gray/100), each one line + ellipsis.
3. **Compact on desktop** (More projects): the cover `h-50` (200px, the old card height; 208 with the frame) with the mobile caption (title only).
4. **Compact on mobile** (More projects, Figma `351:9956`): a row. Frame `rounded-media-sm p-1 bg-surface-card` (gray/50); thumbnail `w-card-thumb rounded-photo` (same 16 / 12 pairing as the About gallery cards), at least 88px (`min-h-22`) and as tall as the text when the title needs three lines; text `pl-5 pr-3 py-2 gap-3`: the whole title (`text-label-2`, never clamped), then **Year • Tags** on one line in `text-label-3 font-regular text-fg-secondary` (gray/600: 4.53:1 on gray/50; the year is regular, Vignesh 2026-10-28, though Figma draws it medium), tags truncating. No badge or overlay caption.

**Page transition:** the cover morphs (`data-vt-cover` on the cover box, inside the link) into the case-study cover; the frame fades with the page. Opening a project, the caption and badge are hidden before the old page is captured; on the way back they fade in as the card lands. Coming back from a case study whose cover is off screen, the whole card settles in place (`card-settle` on the link, scale 0.96 → 1 with a fade).

States: `active` (flat, playing) · neighbour (tilted, `--wheel-fade`, `inert` + `aria-hidden`, video off) · hover on active (cover scales to 1.03 inside its clip) · focus-visible ring with 4px offset · lite (`html[data-quality="lite"]`, slow device): caption without the backdrop blur.

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

One element, so the page has one Intro and one `<h1>`. Mobile: fixed bottom, `bg-surface-raised`, `rounded-t-panel`, `border-line-default` top/left/right, `pt-12 gap-8`; bottom padding `8 + env(safe-area-inset-bottom)`; side padding `--wheel-inset` (52px, Figma 260:6906), lining the text up with the card. Mobile type: name `text-h6`, subline `text-body-4` (desktop `text-h4` / `text-body-3`). Tablet: max `card-w`, centred. Desktop: static left column, `gap-12`, `sm` buttons. Two button rows (`lg` mobile, `sm` desktop) swap by breakpoint. Affiliations: "@ DNEG" 4px apart, "& Kotak" 8px on mobile (Figma 246:2310), 4px on desktop. Mobile surface: an absolute `[data-sheet-bg]` (`bg-surface-raised`, `rounded-t-panel`, `border-line-default`) plus a handle button (40×6 `line-strong` bar, Figma 251:6710). Spacing scales with viewport height (`--sheet-pt/gap/pb/intro-gap`); the buttons are Figma's 50×50 (`lg`, radius 16px). It collapses when the wheel moves and opens only by tap, handle or drag (`sheet.ts`; `layout-and-motion.md → Bottom sheet`). The surface is tall enough (`100dvh − --about-top`) to rise into the About sheet; a `surface-scrim` layer behind it fades in as it does, and the sheet lifts above the TOC handle (`z-40`) while About is open (`layout-and-motion.md → About`). Mobile first run (`layout-and-motion.md → First run`): it collapses by itself after 2.5s untouched, carries the "Swipe to explore" label above its collapsed edge, and a sideways swipe on it turns the wheel. Resume is left out of production until `siteSettings.resume` exists (dev shows a dashed TODO outline).

### FooterBar (desktop)
**Figma:** `233:4558` · **Status:** built

Fixed bottom, `px-gutter py-10`, `text-label-3 font-medium`, three-column grid. Left: "Designed in Figma • Built in Claude" (`footerCredit` from siteSettings), `text-fg-secondary`, with "Figma" and "Claude" in `text-fg-strong`. That keeps Figma's two-tone hierarchy one step darker, because Figma's `gray/500` base fails contrast. Centre: "Scroll" `text-fg-secondary`, fades after the first step. Right: empty (grid keeps the centre centred).

---

## About

### AboutDrawer
**Figma:** section `280:9512`: desktop `280:9404` (scrolled `280:9452`), mobile `280:9285` (scrolled `280:9344`) · **Status:** built (2026-10-24)

Modal `<dialog closedby="any">` (JS light-dismiss fallback), in a scroller (`[data-about-scroll]`) so the mobile handle can sit above the content. Desktop: `w-drawer`, inset 40px top/left/bottom, `rounded-panel bg-surface-raised`, no shadow, over a `surface-scrim` backdrop (Vignesh, 2026-10-24; Figma `234:4968` draws none); the whole panel scrolls, banner included. Mobile: **the bottom sheet grows into it** (`layout-and-motion.md → About`). The dialog sits at `--about-top` (40px) with **no surface of its own**: a transparent 1px border, `rounded-t-panel` clip and `p-1` inset over the sheet's risen surface, which draws the white, border and corners. The scrim is the sheet's (`surface-scrim`), behind its surface. Tablet: the same, at the sheet's width (`card-w`, centred), since it grows out of it.

1. Header: `h-banner` (200px) image, `close` IconButton top-right (`p-4` mobile, `p-6` desktop). On mobile the banner has `rounded-b-panel-inner` (28px; Figma `280:9285`, was square-bottomed) inside a `rounded-t-panel-inner` clip. On desktop it has no radius of its own (Vignesh 2026-10-26); the drawer's `rounded-panel` clips the top corners.
2. Avatar `size-avatar rounded-full`, overlapping the banner by `avatar-overlap` (73px). Centred on mobile, left (`px-5`) on desktop with a 2px `surface-raised` ring.
3. Bio from `about.bio` (inline Markdown: `**…**` → `font-medium text-fg-strong`). Desktop `text-body-2` both paragraphs, `px-6 py-8 gap-5`. Mobile: para 1 `text-label-1` regular, others `text-body-3`, `px-4`.
4. Actions: Resume + Contact (`cta`, the homepage buttons' size), `gap-2` (8px) at every width.
5. Gallery: see Gallery.
6. Journey: heading "Journey so far", `text-body-1` desktop / `text-label-1` mobile, `font-medium text-fg-strong`, `px-4` / `px-6`; desktop 64px above it (gallery `pb-8` + heading `pt-8`). TimelineRow list `gap-3`, `px-5 pb-5` mobile / `px-6 pb-10` desktop.

**Mobile handle** (`280:9342` at rest, `280:9401` scrolled): a 40×6 bar 16px below the top border, in the sheet handle's exact spot, as a 96×40 `<button>` ("Close", out of the tab order: the close button is the keyboard path). Over the banner it's `surface-page` (gray/50); once white content scrolls under it, it turns `line-strong` (gray/300) and a 40px white fade (50% → 0) appears behind it, a `--duration-fast` crossfade. Drag it down or tap it to close. The compact sticky header of `234:34225` is gone: the new scrolled frames don't have one.

**Scrollbar** (Vignesh, 2026-10-24: the native one didn't match): the panel's own scrollbar is hidden, so there's no gutter, and scrolling stays native (wheel, touch, keys). An overlay thumb draws over the right edge (`scrollbar.ts`): 4px wide (`--scrollbar-w`), `line-strong`, `rounded-full`, 6px from the edge (`--scrollbar-inset`), kept `--radius-panel` clear of the top and bottom so it never meets the rounded corners. Its height follows the visible share of the content (at least 40px, `--scrollbar-min`), and it moves by transform. Only the thumb takes the pointer (16px-wide hit area): drag it to scroll, and it darkens to `fg-tertiary` while hovered or dragged. A wheel over it still scrolls the panel. With a mouse it shows whenever there's more to scroll; on touch screens only while scrolling, fading out 0.8s after (`--duration-base`). It fades in with About's content during the mobile morph. Hidden from assistive tech: native scrolling is the accessible path.

Desktop opening: `@starting-style` transitions. `/?about` opens without the entrance (already grown on mobile). Fires `drawer:open` / `drawer:close`. Scripts: `drawer.ts` (with `sheet.ts`, `drag.ts`). All content from the `about` singleton.

### Gallery
**Figma:** `311:68027` (desktop), `311:68093` (mobile), inside About `286:12975` (2026-10-24); buttons `280:9431` · **Status:** built

Horizontal scroll-snap row of **photo cards**, the same at both widths: `gap-2` (8), `px-5` (20), top-aligned (heights follow the text). Each card: `<figure>`, `w-gallery-w` (200), `bg-surface-page` (gray/50, no border), `rounded-media-sm` (16), `p-1`, `gap-3`; the photo full width × `h-gallery-photo-h` (190), `rounded-photo` (12, concentric with the card; Figma has one photo at 16), `object-cover`, 2×/3× sources, real alt; `<figcaption>` `px-3 pb-3 gap-0.5`: title `text-body-3 font-medium fg-primary`, caption ("Place • Year") `text-body-4 font-medium fg-secondary` (Figma: medium on four cards, regular on the first). Title and caption come from `about.gallery` (Keystatic: Card title, Card caption). Labelled region, `tabindex="0"` for keyboard scrolling, hidden scrollbar, `overscroll-behavior-x: contain`.

Previous / Next: `glass` IconButtons (CaretLeft / CaretRight), 48px, inset by the row's side padding and centred on the photos (4px inset + half of 142), not the cards, whose heights vary. Next shows until the row reaches its end; Previous once it has left the start; each fades (`--duration-fast`). A press scrolls by the photos that fully fit and lands on a snap point; near an end it goes all the way. Smooth, instant under reduced motion. A focused button that disappears hands focus to the other one or the row. Both render hidden, so without JS there are no dead buttons. Script: `gallery.ts`.

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

In-page `<nav aria-label="Sections">` of links, not ARIA tabs (each tab scrolls; nothing is hidden). Sticky at the top, but not while resting in the bottom quarter of the screen (`data-unstuck`; iOS 26 Safari, `layout-and-motion.md → Tabs`). Track `bg-surface-track rounded-tabs p-0.5`, tabs `gap-1`, each `px-5 py-3 rounded-button-sm`, `text-label-2` (desktop `text-label-1`) `font-medium`. Inactive `fg-secondary-on-fill` (gray/700, 5.29:1 on the gray/100 track; Figma's gray/500 is 3.0:1); active `fg-primary` on a white pill with a `line-subtle` border. 32px below the tabs (`pb-8`), 48px on desktop (`pb-12`), to the first section (Vignesh, 2026-10-24; was 40 at every width). Sticky at `top-5` (20px; Vignesh, 2026-10-23) from the tabs to the end of Reflection; sections scroll to 100px (`scroll-mt-25`). Mobile: full width, the row scrolls sideways (`touch-action: pan-x`, no scrollbar) and keeps the active tab in view. Order follows the page, not Figma's (Figma lists Outcome before Final designs).

States: active (`aria-current="location"`) · hover → `fg-primary` · focus ring. Without JS the active tab draws its own pill; with JS one pill slides between tabs (`translate` + `width`, `duration-base`, `ease-out`).

### Eyebrow
**Figma:** `234:18795` · **Status:** built

The section name ("OVERVIEW") as the section's `<h2>`, so the outline is Section › heading › subheads and matches the tab. `text-label-3` (desktop `text-label-2`) `font-medium uppercase tracking-eyebrow`, `fg-secondary` (Figma's gray/500 is 3.6:1 on white).

### SectionLead
**Figma:** `234:18796` · **Status:** built

Heading (`<h3>`, `text-h6`, desktop `text-h5`, `fg-primary`) and intro paragraphs (`text-body-3`, desktop `text-body-2`), `gap-4` (desktop `gap-3`). Used by Overview, Outcome and each Solution step.

> **Case-study mobile spacing (Vignesh, 2026-10-24: Figma is the truth, Figma `290:47723`):** sections sit 60px apart (`mt-15`, no top padding); eyebrow → heading 16, heading → text 8 (`SectionLead` `gap-2`, desktop `gap-3`); Overview groups 32 apart; Final designs label → images 16; Outcome cards 16 apart; More projects: heading → cards 24, cards 16 apart, See all 24 above / 48 below.

### ContextSection
**Figma:** `290:57503` / `290:57552` (Fyn desktop / mobile), `290:57591` / `290:57648` (Gyst) · **Status:** built (redrawn 2026-10-24)

For case studies without the full sections: Overview's white card (`bg-surface-raised`, `rounded-panel`, `px-6 py-8`; desktop `rounded-section p-22`) under the cover, 32px below it (desktop 48), eyebrow reading "Overview". The first block is the lead (eyebrow → heading 16 / 24, heading → text 8 / 12, `h6` / `h5`); the other blocks are a subhead (`label-2` / `label-1` medium) over text or a bullet list, 8 / 12 apart. Blocks `gap-8` (desktop `gap-12`). `note` is the lead's last paragraph. `context.facts` (Gyst: Role, Status) become the facts row under the cover when the project has no Role / Timeline / Team (CaseHero), and the card then follows it directly. Gyst's facts row starts at the text edge (89px in, left-aligned, Figma `290:57594`); Data mapping's stays centred. Facts row padding is 32 above / 60 below on mobile (Figma `290:57640`). Figma draws the two lead paragraphs of Fyn without a gap and Gyst's with one; both use the paragraph gap.

### OverviewSection
**Figma:** `234:18793`, mobile `234:5756` · **Status:** built

White card: `bg-surface-raised rounded-panel px-6 py-8`, desktop `rounded-section p-22`. Eyebrow + SectionLead, then The challenge (bullets, `list-disc pl-5`, desktop `pl-6`) and The key insight, stacked on mobile (`gap-6`), two columns on desktop (`gap-5`). Subheads `<h4>` `text-label-2 font-medium` (desktop `text-label-1`). Both labels come from the CMS.

### SolutionSection
**Figma:** `234:18806`, mobile `234:5769` · **Status:** built

Eyebrow, then one step per entry: SectionLead in the text column, then the step's media full width in a MotionCover (`rounded-card`, `aspect-media-sm` on mobile, `aspect-media` 846×476 on desktop). Steps `gap-8` (desktop `gap-15`). A step can carry MP4/WebM later; the most-visible-cover rule keeps one video playing.

### SystemSection
**Figma:** `279:6704` (Prime compass) · **Status:** built

Eyebrow + SectionLead in the text column, then the image and cards across the case column, `gap-8` (desktop `gap-12`, as Outcome). Desktop: image `w-system-media` (521) with the cards stacked beside it (`gap-5`), sharing the image's height (`flex-1`) as drawn. Below desktop (not designed): the image full width, cards stacked under it. Cards are Outcome's (`rounded-tile bg-surface-raised`, `p-6 gap-8`, desktop `gap-12` (Figma 290:56378, 290:52042; Vignesh 2026-10-24), `<h4>` titles). The image is a CaseImage (`rounded-card`, natural ratio 521×566).

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

`<h2>` "More projects" (`text-h5`) and "See all" (→ `/`, `text-label-1 font-medium fg-secondary`, hover `fg-primary`): beside the heading on desktop, under the cards on mobile. The next three projects in homepage order, wrapping, never the current one, as compact ProjectCardLinks (posters only, badge 16px in, title only). Desktop (Figma `307:67837`, 2026-10-24): 3 columns `gap-6` (24) in the text column, each **200px tall** (`h-50`, ~207 wide), `pt-22` above the heading, `below, enough that CaseNav clears the cards by **80px** at the page end (nav top edge 88px up + 80 = 168px); mobile one column `gap-4`, `aspect-card`, clearing CaseNav by **60px** under "See all" (148px + safe area; Vignesh, 2026-10-24; 132px in iPhone Safari 26, where the nav sits 16px up). **All three covers autoplay together** (`autoplay` → `data-autoplay`; the one-at-a-time rule is lifted for this row, AGENTS.md → Media rules); the page's own covers keep one at a time.

### CaseNav
**Figma:** `234:23100`, mobile `234:10068` (the collapsed `234:31771` is retired, 2026-10-24) · **Status:** built. Hides on scroll down, returns on scroll up (`layout-and-motion.md → Floating nav`).

Fixed, centred, 32px above the bottom (plus the safe area); the fixed box is only as wide as the pill (`w-fit`), not the screen (iOS 26 Safari, below). **iPhone Safari 26: 16px up** (`html[data-ios-safari]`, set by an inline check of the browser string in `CaseStudy.astro`): Safari ends the viewport ~18pt above its floating toolbar, so 32 read as ~50; 16 reads as ~34, like Chrome. A pill (`p-1 gap-1 rounded-full`) on `surface-caption` with a `surface-caption-boost` layer over it (together the 80% `surface-caption-strong`) and `backdrop-blur-nav` (40px: what scrolls under it blurs). While a `[data-nav-media]` element (the cover, the More projects cards) is behind the nav, `nav.ts` sets `data-over-media` and the boost fades out over `duration-base`, leaving Figma's 50%: Previous and Next (`w-nav-btn` 97, `px-4 py-3`, `text-label-1 font-medium fg-on-media`) and Home (`p-3`, HouseSimple `icon-lg` 22, `z-10` so the sliding labels pass under it). Each has a `line-default` border, hover `surface-raised` border. Figma's fill (70% grey, white text 2.8:1) is replaced by the 80% over the page (4.6:1). Previous / Next wrap round the homepage order; their accessible names add the project ("Previous: Gyst - Productivity app"). Home goes to `/#slug` (`/` for the first project), so the wheel lands on this project.

States: shown · hidden (sinks below the edge and fades; then `visibility: hidden`, so it isn't focusable or clickable and leaves nothing at the bottom edge for iOS 26 Safari to tint its toolbar from) · any link focused → shown (`:focus-within`) · lite: no blur. Named `case-nav` only during a slide transition, so it stays put; a permanent `view-transition-name` would make it a backdrop root and kill the blur.

### LensSummary
**Figma:** to be designed · **Status:** proposed (structure only)

Three-tab switcher (Recruiter · Designer · Curious) over pre-written summaries from `summaries/<page>`. ARIA tabs pattern, vanilla TS. Default lens: Recruiter. Remembers the choice in `localStorage` (wrapped in try/catch). Renders nothing if the entry is missing or `reviewed` is false. Shows a small "Written with AI, reviewed by Vignesh" note.
