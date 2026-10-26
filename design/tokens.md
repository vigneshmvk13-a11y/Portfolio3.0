# Tokens

Source of truth for the token layer in `src/styles/global.css` (Tailwind v4 `@theme`) and `src/lib/motion.ts`. Change a value here first, then the code. Values marked **(proposed)** aren't in Figma; review them.

## How tokens reach Tailwind

Two tiers:

1. **Primitives** live in `:root` as plain custom properties (`--gray-700`). They have **no utilities**, so components can't use them directly.
2. **Semantic tokens** live in `@theme inline` and reference primitives. Tailwind turns them into utilities (`text-fg-secondary`, `bg-surface-page`, `rounded-card`).

Each Tailwind namespace we use is **reset** first (`--color-*: initial`, etc.), so the default palette, radii and breakpoints don't exist. A stray `text-gray-500` or `rounded-lg` fails to compile instead of drifting the design.

Naming avoids `text-text-*`: text and icon colours are `fg-*`, borders are `line-*`, backgrounds are `surface-*`.

## Colour

### Primitives (Figma variables)

| Token | Figma | Value |
|---|---|---|
| `--gray-white` | `gray/white` | `#FFFFFF` |
| `--gray-25` | `gray/25` (name is ours; set it in Figma) | `#F6F6F6` |
| `--gray-50` | `gray/50` | `#F3F3F3` |
| `--gray-100` | `gray/100` | `#E8E8E8` |
| `--gray-200` | `gray/200` | `#DDDDDD` |
| `--gray-300` | `gray/300` | `#C6C6C6` |
| `--gray-500` | `gray/500` | `#868686` |
| `--gray-600` | `gray/600` | `#6F6F6F` (Figma `#727272`, 4.34:1 on gray/50; nudged to pass 4.5:1) |
| `--gray-700` | `gray/700` | `#5E5E5E` |
| `--gray-900` | `gray/900` | `#282828` |
| `--gray-black` | `gray/black` | `#000000` |
| `--lime-200` | `lime/200` | `#CAE6A0` |
| `--multiply-50` | grey `#545454` at 50%, multiply | `rgb(0 0 0 / 0.335)`: a neutral grey in multiply scales the backdrop by `1 − a + a·84/255`, so it equals black at `1 −` that factor in normal mode (no `mix-blend-mode`) |
| `--multiply-80` | the same grey at 80% | `rgb(0 0 0 / 0.536)` |
| `--multiply-80-boost` | what turns 50% into 80% | `rgb(0 0 0 / 0.302)` |
| `--glass-40` | (not a variable; `gray/500` at 40%) | `rgb(134 134 134 / 0.4)` |
| `--scrim-24` | (not a variable) | `rgb(0 0 0 / 0.24)` **(proposed)** |

### Semantic

| Utility stem | → | Use |
|---|---|---|
| `surface-page` | `--gray-white` | Page background on every page and breakpoint: home, About, case studies (was gray/50; Vignesh 2026-10-26, Figma still draws gray/50) |
| `surface-home-mobile` | `--gray-25` | Homepage background below the desktop breakpoint only (phone and tablet), so the white footer sheet doesn't blend into it (Vignesh 2026-10-26). The footer stays `surface-raised`; desktop stays `surface-page` |
| `surface-track` | `--gray-100` | The case-study tab bar: gray/50 blended into the gray/50 cards beside it (Vignesh 2026-10-26) |
| `surface-subtle` | `--gray-50` | What gray/50 is used for now that the page is white: case-study cards (Context, Overview, Outcome, Reflection, System), the tab bar, gallery cards, About handle bar |
| `surface-raised` | `--gray-white` | Buttons, drawer, sheet |
| `surface-selected` | `--gray-50` | Active TOC item, mobile and desktop (was gray/100; Vignesh 2026-10-26). Also the cover's loading placeholder |
| `surface-hover` | `--gray-50` | Hover on TOC items, mobile and desktop (Vignesh 2026-10-26; was gray/100) |
| `surface-caption` | `--multiply-50` | Card caption bar over a cover (Figma: grey, 50%, multiply, background blur; Vignesh 2026-10-26). White text 4.5:1 or better only over covers darker than ~70% grey |
| `surface-caption-strong` | `--multiply-80` | The same fill at 80%, where the backdrop is pale: captions of covers marked **Light cover**, and the floating nav over the page (white text 4.6:1 on white) |
| `surface-caption-boost` | `--multiply-80-boost` | Layer over `surface-caption` that makes it 80%; the floating nav fades it out over a cover |
| `surface-scrim` | `--scrim-24` **(proposed)** | Behind About: the mobile sheet (fades in as the bottom sheet grows into it) and the desktop drawer |
| `surface-badge` | `--lime-200` | Card badge ("NDA protected", "Coming soon"); text `fg-strong` (~11:1) |
| `surface-glass` | `--glass-40` | Gallery Previous / Next buttons over photos (Figma 280:9431), with `backdrop-blur-glass`; white caret `fg-on-media` |
| `fg-primary` | `--gray-900` | Primary text: name, headings, active TOC, hovered TOC rows (Figma 233:4518, 2026-10-22) |
| `fg-strong` | `--gray-900` | Emphasis in About, timeline roles. Same value as `fg-primary` since 2026-10-22 |
| `fg-secondary` | `--gray-600` | Secondary text, icons: 4.53:1 on `surface-page`, 5.02:1 on white. Fails on `surface-hover` (4.10:1), so hovered rows switch to `fg-primary` |
| `fg-secondary-on-fill` | `--gray-700` | Icon and label of the action buttons at rest (gray/700, 6.2:1 on gray/50; `fg-primary` on hover). Also the inactive case-study tabs on `surface-track` (gray/100): 5.29:1 |
| `fg-tertiary` | `--gray-500` | Non-text only (fails 4.5:1 on `surface-page`). Footer credits and case-study eyebrows use `fg-secondary` |
| `fg-on-media` | `--gray-white` | Card captions |
| `line-subtle` | `--gray-100` | Desktop icon buttons |
| `line-default` | `--gray-200` | Drawer buttons, dividers, sheet edge |
| `line-strong` | `--gray-300` **(proposed)** | Button hover border |
| `indicator` | `--gray-900` | TOC active dash |
| `focus` | `--gray-900` **(proposed)** | Focus ring |

**Contrast:** `fg-tertiary` (#868686) on `surface-page` (#F3F3F3) is ~3.3:1, below 4.5:1. Figma used it for the footer credits; they use `fg-secondary` (4.53:1) instead (decided 2026-10-20). `gray/600` is `#6F6F6F`, not Figma's `#727272` (4.34:1 fails on the page background; decided 2026-10-22).

## Typography

Family `--font-sans: "General Sans", "General Sans Fallback", ui-sans-serif, system-ui, sans-serif`. Weights 400 and 500 only.

Tailwind v4 text tokens carry line height, tracking and default weight, so `text-h4` alone sets all four. Sizes are in rem (respects user font size), with px in the table for reference.

| Utility | Size / line (px) | Tracking | Default weight | Use |
|---|---|---|---|---|
| `text-h4` | 32 / 38 | -1% (-0.01em) | 500 | Desktop intro name |
| `text-h5` | 24 / 30 | -0.5% (-0.005em) | 500 | Mobile intro name, mobile case-study title |
| `text-h6` | 20 / 24 | 0 | 500 | Case-study section headings (mobile) |
| `text-body-1` | 18 / 28 | 0 | 400 | "Journey so far" (500) |
| `text-body-2` | 16 / 24 | 0 | 400 | About paragraphs |
| `text-body-3` | 14 / 20 | 0 | 400 | Intro subline (mobile and desktop), TOC (500) |
| `text-body-4` | 12 / 16 | 0 | 400 | Mobile footer subline text |
| `text-label-1` | 16 / 22 | -0.18px | 500 | "@" / "&" |
| `text-label-2` | 14 / 20 | -0.16px | 400 | Captions, timeline |
| `text-label-3` | 12 / 16 | -0.12px | 400 | Footer, mobile meta, roles (500) |

Override weight with `font-medium` / `font-regular`. Nothing below 12px.

Case study (Figma `234:33903`), mobile → desktop: title (`<h1>`) `h5` → `h4`; section heading `h6` → `h5`; body `body-3` → `body-2`; subheads, card titles and fact labels `label-2` → `label-1` (500); tags `label-2` → `label-1` (400); tabs `label-2` → `label-1` (500); "More projects" `h5`.

| Utility | Value | Use |
|---|---|---|
| `tracking-eyebrow` | 2px | Section eyebrows ("OVERVIEW"): `text-label-3` (desktop `text-label-2`) `font-medium uppercase tracking-eyebrow` |

## Spacing

Tailwind's `--spacing: 4px` base matches Figma's 4px grid, so `p-4` = 16px, `gap-15` = 60px. Use only these steps (values seen in Figma): **0.5, 1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 22, 25, 30, 40, 50** (= 2, 4, 8, 10, 12, 16, 20, 24, 32, 40, 48, 60, 80, 88, 100, 120, 160, 200px). 22 is the case study's section padding (Figma 89); 25 is the case-study sections' scroll margin (tabs stuck at 20 + their ~50 height + ~30 clear); 30 and 40 were its bottom padding above the floating nav (the page end now sets that itself, MoreProjects.astro); 50 is the More projects card height (Figma 307:67837). 2.5 is the Figma button's icon-label gap. `check-tokens.mjs` flags other steps.

Named spacing:

| Utility stem | Value | Use |
|---|---|---|
| `gutter` | 80px | Outer padding, desktop side columns |
| `gutter-inner` | 40px | Side columns' inner padding |
| `gutter-mobile` | 20px | Mobile side padding |

## Sizes

| Token | Value | Use |
|---|---|---|
| `--container-page` | 1736px | Desktop content max width |
| `--container-stack` | 669px | Desktop centre column |
| `--container-side` | 265.5px | Intro and TOC width cap |
| `--home-gap`, `--home-w`, `--home-max`, `--home-cols` | 80px, derived | Desktop home: gap between intro, card and TOC; the group's width; its capped width; its grid columns (`global.css`) |
| `--container-drawer` | 576px | About drawer |
| `--container-prose` | 720px | Placeholder page column **(proposed)** |
| `--container-case` | 846px | Case-study column (Figma `234:18763`) |
| `--container-case-text` | 668px | Case-study text column inside it (846 − 2 × 89) |
| `--aspect-cover` | 846 / 556 | Desktop case-study cover (mobile uses `aspect-card`) |
| `--aspect-media` / `--aspect-media-sm` | 846 / 476 · 354 / 219 | Solution step media, desktop / mobile |
| `--spacing-meta-col` | 176px | Desktop Role / Timeline / Team columns |
| `--spacing-nav-btn` | 97px | Previous / Next in the floating case-study nav |
| `--spacing-system-media` | 521px | The System section image on desktop (Figma 279:6711); the cards take the rest of the 846 column |
| `--spacing-icon-lg` | 22px | Home icon in the floating nav |
| `--spacing-card-w` / `--spacing-card-h` | 553px / 400px | Active desktop card (Figma size) |
| `--aspect-card` | 553 / 400 | Every card. Mobile Figma (352×254.4) is the same ratio, so one token |
| `--spacing-logo-w` / `--spacing-logo-h` | 80px / 30px | Logo pills (desktop) |
| `--spacing-logo-w-sm` / `--spacing-logo-h-sm` | 64px / 24px | Logo pills (mobile, Figma 246:2313) |
| `--spacing-avatar` | 140px | About avatar |
| `--spacing-icon-xs` / `--spacing-icon-sm` / `--spacing-icon-md` | 16px / 18px / 20px | Icon glyphs (xs: mobile sheet buttons) |
| `--spacing-icon-badge` | 16px | Lock icon in the NDA badge |
| `--spacing-avatar-overlap` | 73px | How far the avatar overlaps the banner (140 − 67) |
| `--spacing-banner` | 200px | About banner height |
| `--spacing-gallery-w` | 200px | About gallery card, mobile and desktop (Figma `311:68027` / `311:68093`) |
| `--spacing-gallery-photo-h` | 190px | About gallery card photo (card width minus the 4px inset) |
| `--scrollbar-w` / `--scrollbar-inset` / `--scrollbar-hit` / `--scrollbar-min` | 4px / 6px / 16px / 40px | Overlay scrollbar thumb in the About panel: width, gap from the edge, pointer hit width, shortest thumb (`components.md → AboutDrawer`) |
| `--about-top` | 40px | Mobile/tablet: the bottom sheet grown into About stops this far below the top (Vignesh, 2026-10-24). Registered with `@property` so JS reads it in px |
| `--sheet-h` | 237–265px | Expanded bottom sheet height, scaled with viewport height (see Mobile sheet spacing below); reserves room under the wheel |
| `--card-h`, `--card-w` | derived | Card size and desktop centre column, per breakpoint, in `global.css` (see `layout-and-motion.md`) |

## Radius

| Utility | Value | Use |
|---|---|---|
| `rounded-item` | 8px | TOC items, dash |
| `rounded-button-sm` | 12px | Desktop icon button, case-study tab |
| `rounded-photo` | 12px | A photo inset 4px inside a 16px card (About gallery), so the corners stay concentric |
| `rounded-tabs` | 14px | Case-study tab track (12 + its 2px padding) |
| `rounded-tile` | 20px | Case-study Outcome cards |
| `rounded-media-sm` | 16px | Gallery photos, close button |
| `rounded-button-lg` | 16px | Mobile sheet and drawer icon buttons (Vignesh, 2026-10-22: 16px, plain circular corners; Figma drew 20) |
| `rounded-card` | 24px | Project card, logo pills |
| `rounded-panel` | 32px | Drawer, sheet top |
| `rounded-panel-inner` | 28px | Inside a `p-1` panel (32 − 4): mobile drawer banner |
| `rounded-section` | 48px | Desktop case-study Overview and Reflection cards (mobile: `rounded-panel`) |
| `rounded-full` | 9999px | Avatar |

## Effects

| Token | Value | Use |
|---|---|---|
| `--blur-caption` | 12.5px | `backdrop-blur-caption` on the card caption |
| `--blur-nav` | 40px | `backdrop-blur-nav` on the floating case-study nav (Vignesh, 2026-10-23; Figma drew 20) |
| `--blur-glass` | 20px | `backdrop-blur-glass` on the gallery buttons (Figma 280:9431) |
| `--wheel-fade` | 0.2 | Neighbour card opacity (see Wheel) |
| `--shadow-panel` | `0 24px 64px rgb(0 0 0 / 0.12)` **(proposed)** | Drawer on the grey page |

## Motion (proposed; not in Figma)

| Token | CSS | `motion.ts` | Use |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | `[0.22, 1, 0.36, 1]` | Entrances, card settle |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | `[0.65, 0, 0.35, 1]` | Drawer, sheet |
| `--duration-fast` | 150ms | `0.15` | Hover, focus |
| `--duration-base` | 300ms | `0.3` | TOC, sheet |
| `--duration-slow` | 500ms | `0.5` | Drawer |
| `--scale-settle` | 0.96 | (CSS only) | The homepage card settling in after a fade back from a case study (`layout-and-motion.md → Page transitions`) |
| `--ease-spring` + `--duration-spring` | `linear(…)` over 600ms | `spring.css = { visualDuration: 0.4, bounce: 0.2 }` | CSS transitions that should move like a spring: the card ⇄ cover transition (the floating nav dropped it on 2026-10-23: no bounce). Motion's spring sampled into 33 `linear()` stops; 1.5% overshoot. Regenerate both together |

Motion takes seconds and arrays, CSS takes ms and `cubic-bezier()`; keep both in sync by hand and test both.

### Springs (proposed; tuned in Phases 4–5)

Motion's `visualDuration` + `bounce` form, so the values read like durations. Springs run in JS only (Motion), so they live in `motion.ts`, not in CSS.

| `motion.ts` | Value | Use |
|---|---|---|
| `spring.wheel` | `{ visualDuration: 0.4, bounce: 0.12 }` | Wheel step (mouse notch, key, TOC), trackpad snap, drag release. Starts at the wheel's current speed when retargeted |
| `spring.sheet` | `{ visualDuration: 0.5, bounce: 0 }` | Mobile sheet settling after a drag (carries the release speed). 0.5s is the slowest settle: the settle takes as long as the release speed needs to cover the rest of the way, down to `sheet.flickMin` (0.25s) for a quick swipe. Taps, the handle and scroll use `duration.slow` + `ease.inOut` so the intro fades slowly |
| `spring.toc` | `{ visualDuration: 0.35, bounce: 0.15 }` | Mobile TOC: tab ⇄ panel morph, and the row highlight following the finger |

### Mobile TOC and sheet

JS only (`motion.ts`); behaviour in `layout-and-motion.md → TOC handle / Bottom sheet`. Shape geometry (tab 27×80, panel 193×223, rows 36 on a 38 pitch) is Figma's, kept in `src/scripts/toc-shape.ts`.

| `motion.ts` | Value | Meaning |
|---|---|---|
| `toc.tapMax` | `0.3` s | A press released within this, without dragging, is a tap (the panel stays open) |
| `toc.scrubSlop` | `6` px | Travel before a press scrubs |
| `toc.labelFadeFrom` | `0.4` | Morph progress where labels start fading in |
| `sheet.introGoneAt` | `0.5` | Sheet openness (1 open, 0 collapsed) where the intro is fully faded; it blurs as it fades |
| `sheet.introBlur` | `10` px | Intro blur at that point |
| `sheet.introFollow` | `0.5` | The intro slides at half the sheet's speed, sinking into it as it fades |
| `sheet.aboutSwap` | `0.5` | Sheet → About (0 footer, 1 About): the footer's intro and buttons are gone by here, About's content appears only past it. Both blur by `sheet.introBlur` |

### Mobile sheet spacing (CSS, `global.css`)

Figma 246:2305 is designed at 852px tall; phone browsers leave ~660–790px. The open spacing used to scale linearly with the viewport height (compact at 660px, Figma's at 852px). Since 2026-10-26 it is fixed at 16 / 24 / 32 at every height (Figma's 24 / 32 / 48 felt too loose on his phone); on short screens the wheel card shrinks to clear the sheet instead (Vignesh).

| Token | 660px tall → 852px | Meaning |
|---|---|---|
| `--sheet-handle-top` | 16px (open) / `--sheet-handle-top-collapsed` 12px | Handle bar (40×6, `line-strong`) below the 1px top border (Figma 260:6906 / 260:6936) |
| `--sheet-top-gap` | 24px (not scaled) | Handle bar → intro (open) (Figma 260:6906) |
| `--sheet-pt` | derived | 1 + handle-top + 6 + top-gap: where the intro starts |
| `--sheet-intro-gap` | 16px (not scaled) | Name/role block → logos (name → subline is a fixed 4px on mobile, 8px on desktop) |
| `--sheet-gap` | 24px (not scaled) | Logos → buttons |
| `--sheet-pb` | 32px (not scaled) | Bottom padding, open and collapsed (the buttons never move; plus the safe-area inset) |
| `--sheet-handle-gap` | 24px (not scaled) | Collapsed: handle bar → buttons. With the 1px border, 12px above the bar and the 6px bar, the buttons sit 43px below the top edge (Vignesh, 2026-10-26; was 32 below the bar, sheet 137px, now 125px). Registered with `@property` so JS reads it in px |
| `--sheet-btn` | 50px | Sheet buttons 50×50: 16px padding, 16px icon (`icon-xs`), radius `button-lg` 16px (Figma 246:2317) |
| `--sheet-h` | 237 → 265px | Expanded height, derived from the above (lays out the wheel) |

### Case study (built; tune by eye)

JS only (`motion.ts → caseStudy`); behaviour in `layout-and-motion.md → Case study`. In CSS: the nav collapse runs on `duration-slow` + `ease-in-out`, no overshoot (labels fade on `duration-fast` first); the tab pill `duration-base` + `ease-out`; the card ⇄ cover morph `ease-spring`; the slide `duration-slow` + `ease-in-out`.

| `motion.ts` | Value | Meaning |
|---|---|---|
| `caseStudy.navScrollSlop` | `8` px | Scroll in one direction before the floating nav hides (down) or comes back (up) |
| `caseStudy.navEndZone` | `160` px | Within this of the page end the nav always shows |
| `caseStudy.swipeSlop` | `10` px | Horizontal travel before a touch drag is a swipe |
| `caseStudy.swipeEdge` | `24` px | No swipe starts this close to the screen edges (the browser's back/forward) |
| `caseStudy.swipeCommit` | `0.25` | Share of the screen width past which a release changes project |
| `caseStudy.swipeVelocity` | `0.5` px/ms | A flick this fast changes project at any distance |
| `caseStudy.swipeFollow` | `0.6` | The page follows the finger at this fraction of its travel |

### Intro timing (built; tune by eye)

The spin is keyframed rather than sprung, so its length is fixed: `[0 → turns·N + overshoot → turns·N]`. Motion's `animateValue` takes **ms** for `duration` (`animate()` takes seconds), so the intro multiplies by 1000.

| `motion.ts` | Value | Use |
|---|---|---|
| `intro.total` | `2.0` s (ceiling) | Whole sequence (≤0.3 prep + spin 1.2 + last reveal ends ~0.66 later; the prep is usually ~0.1) |
| `intro.trailIn` | `0.6` positions | The other cards fade in over this much of the first turn |
| `intro.spinTurns` | `1` | Whole revolutions, so it lands on the first project |
| `intro.spinDuration` | `1.2` s | Spin, overshoot and settle back |
| `intro.spinEase` | `[0.3, 0.1, 0.15, 1]` | Fast spin, hard deceleration into the landing |
| `intro.spinOvershoot` | `0.12` positions | How far past the landing card the reel runs before settling ("clunk") |
| `intro.spinOvershootAt` | `0.82` | Fraction of the spin spent reaching the overshoot; the rest settles back on `ease.inOut` |
| `intro.revealDuration` | `0.5` s | Hero text, TOC, footer appear (`ease.out`) |
| `firstRun.*` | see `motion.ts` | Mobile first run: `autoCollapse` 2.5s, `nudge` 0.12 positions over 0.8s, `tocPeek` 6px over 0.9s |
| `intro.revealRise` | `12` px | Desktop columns rise while fading in (mobile sheet slides up 100%, TOC handle in from the edge) |
| `intro.failsafe` | `3` s | CSS reveal if the script never runs (`--intro-failsafe: 3s`) |

## Wheel

Geometry derived in `layout-and-motion.md → Project wheel`. `h` is the measured card height at runtime, so the geometry is unitless and works at every breakpoint.

| Token | CSS | `motion.ts` | Meaning |
|---|---|---|---|
| `--wheel-step` | `38.1deg` | `wheel.step = 38.1` | Angle between neighbouring cards |
| `--wheel-depth` | `2.09` | `wheel.depth = 2.09` | Ring radius R, × card height |
| `--wheel-perspective` | `2.1` | `wheel.perspective = 2.1` | Per-card perspective P, × card height |
| `--wheel-spread` | `0.8695` | `wheel.spread = 0.8695` | Y(±1) = spread × h + gap |
| `--wheel-reach` | `0.289` | `wheel.reach = 0.289` | Far edge of a ±1 neighbour beyond its centre, × h (positions the mobile stage) |
| `--wheel-fade` | `0.2` | `wheel.fade = 0.2` | Opacity at ±1 step; 0 by ±1.5 |
| `--wheel-gap` | `52px` mobile / `60px` desktop | read from CSS | Gap between the active card and a neighbour's near edge; on short screens also the card's clearance above the expanded sheet (Figma 230:4858 / 233:4518) |
| `--wheel-inset` | `52px` | — | Mobile card's side inset (card width = viewport − 2 × inset, Figma 230:4858). Not `gutter-mobile`, which stays the 20px page padding elsewhere |
| `--sheet-inset` | `48px` | — | Mobile bottom sheet's side padding (was `--wheel-inset`, 52px; Vignesh 2026-10-26) |
| `--wheel-card-h-desktop` | `min(400px, 39dvh)` | — | Desktop card height |
| — | — | `wheel.stepThreshold = 80` | One wheel event this big is a mouse notch (steps at once); a trackpad gesture must travel this far to commit (reduced motion: per step) |
| — | — | `wheel.inputQuiet = 0.15` | s of wheel silence that ends a gesture (snap; reduced motion: unlock) |
| — | — | `wheel.follow = 0.07` | s, time constant of the wheel chasing scroll input (smooths mouse notches) |
| — | — | `wheel.reducedTurn = 0.2` | s, reduced motion: one `ease.out` turn per step (no overshoot or momentum) |

### Adaptive quality

JS only (`motion.ts → quality`); behaviour in `layout-and-motion.md → Adaptive quality`.

| `motion.ts` | Value | Meaning |
|---|---|---|
| `quality.sampleFrames` | `40` | Rolling window of motion frames judged at each settle |
| `quality.slowFrameMs` | `20` | A frame slower than this counts as slow (below ~50fps) |
| `quality.slowShare` | `0.2` | Share of slow frames that switches to lite |
| `quality.introSpeed` | `2` | Intro playback rate in lite |

## Breakpoints (mobile-first)

| Prefix | Min width | Layout |
|---|---|---|
| (none) | 0 | Mobile, designed at 393 |
| `tablet:` | 48rem (768px) | Not designed; interim rule in `layout-and-motion.md` |
| `desktop:` | 75rem (1200px) | Desktop, designed at 1440, content max 1736 |

## Implementation

The tables above are the spec; `src/styles/global.css` is the implementation (Tailwind v4: primitives in `:root`, reset namespaces, semantic tokens in `@theme static` / `@theme inline`). `static` makes Tailwind emit every theme variable even when no utility uses it, because the wheel geometry reads them from CSS. The CSS isn't duplicated here, so the two can't drift. Change a table first, then `global.css` and `motion.ts`.
