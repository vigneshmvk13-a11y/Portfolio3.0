# Components

One entry per component: Figma node, anatomy, variants, states, tokens, status. Update the entry in the same commit as the code. Utilities below are our token utilities (`design/tokens.md`).

Status: `specced` (from Figma, not built) · `proposed` (not in Figma, needs Vignesh's OK) · `built` · `verified` (matched to Figma at 393 and 1440, Lighthouse and keyboard checked).

Build order: **foundation** (IconButton, Button, Link, LogoPill, Badge, MotionCover) → **home** (Intro, ProjectCard, ProjectWheel, ProjectToc, FooterBar, BottomSheet, TocHandle) → **about** (AboutDrawer, TimelineRow) → **case study** (CaseStudyPlaceholder, DecisionBlock, LensSummary).

---

## Foundation

### IconButton
**Figma:** `178:1441`, mobile `233:4704`, drawer `234:5306` · **Status:** built

Square button, one Phosphor icon. About (`User`), Resume (`File`), Contact (`ChatCircleDots`), Close (`X`).

| Variant | Box | Padding | Radius | Icon | Border | Where |
|---|---|---|---|---|---|---|
| `sm` | 52 | `p-4` | `rounded-button-sm` | `icon-sm` | `border-line-subtle` | Desktop intro |
| `lg` | 60 | `p-5` | `rounded-button-lg` | `icon-md` | none | Mobile sheet |
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

`w-logo-w h-logo-h rounded-card`. Raster in Figma; request SVGs, otherwise export 2× and 3× through `astro:assets`. Alt "DNEG", "Kotak Mahindra Bank".

### Badge
**Figma:** `230:4637` (NDA, with Lock), `230:4652` (Coming soon) · **Status:** built

Pill top-right on ProjectCard, inset `p-6` from the card corner. `bg-surface-badge rounded-full py-2`, `text-label-3 font-medium text-fg-strong`. Without icon: `px-4`. With icon (16px Phosphor Lock, fill weight): `pl-3 pr-4 gap-1`. Variants come from `status`: `nda` → Lock + "NDA protected"; `coming-soon` → "Coming soon". Other statuses render nothing. It's the one colour in the chrome (confirmed).

### MotionCover
**Figma:** card covers · **Status:** built (video playback untested: no cover videos exist yet)

The only component that renders `<video>`. Props: `mp4?`, `webm?`, `poster?` (an `astro:assets` image from `src/assets/covers/<slug>/`), `alt`, `priority?` (eager poster for LCP), `active` (controls play). Without `mp4`/`webm` it renders the poster only. Without a poster it renders a neutral `bg-surface-selected` block (plus `TODO(content)` in dev).

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

A link to `/work/[slug]` for every status (`rules.md → Content states`). `rounded-card overflow-hidden aspect-card`.

1. **MotionCover** fills the card (`object-cover`). The small white square in the Smart Mapping cover is part of the cover image, not UI.
2. **Badge** (by `status`) top-right.
3. **Caption bar**: bottom, `bg-surface-caption backdrop-blur-caption`, `px-8 py-4`, `text-fg-on-media`. Subtitle left (`text-label-2 font-medium`; one line + ellipsis on desktop, two lines on mobile). Meta right (`text-label-2` desktop, `text-label-3` mobile). `gap-5` desktop, `gap-6` mobile.

States: `active` (flat, playing) · neighbour (tilted, `--wheel-fade`, `inert` + `aria-hidden`, video off) · hover on active (cover scales to 1.03, proposed) · focus-visible ring with 4px offset.

### ProjectWheel
**Figma:** `233:4539` (desktop), `233:4582` (mobile) · **Status:** built (interactive; intro in Phase 5)

Replaces ProjectStack. Renders every published card (server-rendered resting state) inside a stage. Client logic lives in `src/scripts/wheel/`:
- `geometry.ts`: pure maths.
- `controller.ts`: holds one `position` number and springs it with Motion.
- `render.ts`: maps position → each card's transform, opacity, z-index, `inert`, `aria-hidden`.
- `input.ts`: wheel, pointer, keyboard.

Emits `wheel:change {index, slug, via}` and `wheel:settle {index}` on the stage element; ProjectToc, BottomSheet, the hash sync and MotionCover listen. Stage: `role="region" aria-roledescription="carousel" aria-label="Projects"` plus a polite live region. Behaviour: `layout-and-motion.md → Project wheel`. Vanilla TS (no React island: the state is one number, and React alone would exceed the 30 KB homepage budget).

### ProjectToc
**Figma:** `233:4545` · **Status:** built

`<nav aria-label="Projects">`, `w-side`, `gap-1`. Items: `p-2 rounded-item text-body-3 font-medium`. Each item is an `<a href="/work/slug">`. JS makes a plain click rotate the wheel; modifier-clicks still open the page.
- Inactive: `text-fg-secondary`. Hover (proposed): `bg-surface-hover`.
- Active: `bg-surface-selected text-fg-primary`, leading dash 12×2 `bg-indicator rounded-item` with `gap-2`. `aria-current="true"`.

### TocHandle (mobile)
**Figma:** `233:4609` (27×80), `233:4714` (193×223) · **Status:** built

Right-edge tab, centre 74px above the viewport centre, one tick per project (active `fill-indicator`, others `fill-fg-secondary`). The Figma shape fits five ticks; more projects need a taller shape. A `<button popovertarget>` opens a native `popover` with the TOC (`variant="popover"`: `gap-0.5`, no dash). The Popover API gives Esc, outside tap and `aria-expanded`; a small script moves focus to the active item. The popover shape is the Figma SVG stretched horizontally (`preserveAspectRatio="none"`, non-scaling 1px stroke), because "Fyn- Wholesale Banking app" doesn't fit the drawn 193px. The 27px tab gets a 44px hit area via `::before`. Closing on selection comes with the wheel (Phase 4).

### BottomSheet (mobile) / left column (desktop)
**Figma:** `233:4586` expanded, `233:4626` collapsed, desktop `233:4520` · **Status:** built

One element, so the page has one Intro and one `<h1>`. Mobile: fixed bottom, `bg-surface-raised`, `rounded-t-panel`, `border-line-default` top/left/right, `pt-12 gap-8`; bottom padding `8 + env(safe-area-inset-bottom)`; side padding keeps Figma's 313px text column (`--sheet-content-w`) and flexes 24–40px. Tablet: max `card-w`, centred. Desktop: static left column, `gap-12`, `sm` buttons. Two button rows (`lg` mobile, `sm` desktop) swap by breakpoint. Collapsed (`data-collapsed`): the intro row animates `grid-template-rows 1fr → 0fr`. Resume is left out of production until `siteSettings.resume` exists (dev shows a dashed TODO outline).

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

### CaseStudyPlaceholder (template)
**Figma:** none · **Status:** built (placeholder)

Until real designs: `bg-surface-page`, column `max-w-prose` centred. Back Button ("All work"), MotionCover full width, title `text-h4`, meta row (role, timeline, tags) `text-label-2 text-fg-secondary`, and `text-body-2`: "This case study is being written." No invented content. `nda` status replaces the line with how to request access (contact from `siteSettings`). Figma has copy for that (`206:18486`): "This project is protected under a non-disclosure agreement (NDA). Detailed screens, workflows, and design decisions are available for discussion during a private portfolio walkthrough."

### DecisionBlock
**Figma:** to be designed with the case studies · **Status:** proposed (structure only)

Renders one `decision`: title, context, options considered (each with its trade-off; the chosen one marked in text, not just colour), what was chosen, why, optional evidence. Must read well when skimmed: a recruiter should get the decision and the reason from the title and the "why" alone. Semantic: `<section aria-labelledby>`; options as a list. Final visual design comes from Figma.

### LensSummary
**Figma:** to be designed · **Status:** proposed (structure only)

Three-tab switcher (Recruiter · Designer · Curious) over pre-written summaries from `summaries/<page>`. ARIA tabs pattern, vanilla TS. Default lens: Recruiter. Remembers the choice in `localStorage` (wrapped in try/catch). Renders nothing if the entry is missing or `reviewed` is false. Shows a small "Written with AI, reviewed by Vignesh" note.
