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
| `--gray-50` | `gray/50` | `#F3F3F3` |
| `--gray-100` | `gray/100` | `#E8E8E8` |
| `--gray-200` | `gray/200` | `#DDDDDD` |
| `--gray-300` | `gray/300` | `#C6C6C6` |
| `--gray-500` | `gray/500` | `#868686` |
| `--gray-700` | `gray/700` | `#5E5E5E` |
| `--gray-900` | `gray/900` | `#282828` |
| `--gray-black` | `gray/black` | `#000000` |
| `--lime-200` | `lime/200` | `#CAE6A0` |
| `--overlay-84` | (not a variable) | `rgb(84 84 84 / 0.8)` |
| `--scrim-24` | (not a variable) | `rgb(0 0 0 / 0.24)` **(proposed)** |

### Semantic

| Utility stem | → | Use |
|---|---|---|
| `surface-page` | `--gray-50` | Desktop page |
| `surface-page-mobile` | `--gray-white` | Mobile page |
| `surface-raised` | `--gray-white` | Buttons, drawer, sheet |
| `surface-selected` | `--gray-100` | Active TOC item |
| `surface-hover` | `--gray-100` **(proposed)** | Hover on TOC items and text buttons |
| `surface-caption` | `--overlay-84` | Card caption bar |
| `surface-scrim` | `--scrim-24` **(proposed)** | Behind the drawer |
| `surface-badge` | `--lime-200` | Card badge ("NDA protected", "Coming soon"); text `fg-strong` (~11:1) |
| `fg-primary` | `--gray-black` | Name, active TOC |
| `fg-strong` | `--gray-900` | Emphasis in About, timeline roles |
| `fg-secondary` | `--gray-700` | Default body/support text, icons |
| `fg-tertiary` | `--gray-500` | Non-text only (fails 4.5:1 on `surface-page`). Footer credits use `fg-secondary` |
| `fg-on-media` | `--gray-white` | Card captions |
| `line-subtle` | `--gray-100` | Desktop icon buttons |
| `line-default` | `--gray-200` | Drawer buttons, dividers, sheet edge |
| `line-strong` | `--gray-300` **(proposed)** | Button hover border |
| `indicator` | `--gray-black` | TOC active dash |
| `focus` | `--gray-900` **(proposed)** | Focus ring |

**Contrast:** `fg-tertiary` (#868686) on `surface-page` (#F3F3F3) is ~3.3:1, below 4.5:1. Figma used it for the footer credits; they use `fg-secondary` (~6:1) instead (decided 2026-10-20).

## Typography

Family `--font-sans: "General Sans", "General Sans Fallback", ui-sans-serif, system-ui, sans-serif`. Weights 400 and 500 only.

Tailwind v4 text tokens carry line height, tracking and default weight, so `text-h4` alone sets all four. Sizes are in rem (respects user font size), with px in the table for reference.

| Utility | Size / line (px) | Tracking | Default weight | Use |
|---|---|---|---|---|
| `text-h4` | 32 / 38 | -0.2px | 500 | Desktop intro name |
| `text-h5` | 24 / 30 | -0.15px | 500 | Mobile intro name |
| `text-body-1` | 18 / 28 | 0 | 400 | "Journey so far" (500) |
| `text-body-2` | 16 / 24 | 0 | 400 | About paragraphs |
| `text-body-3` | 14 / 20 | 0 | 400 | Intro subline, TOC (500) |
| `text-label-1` | 16 / 22 | -0.18px | 500 | "@" / "&" |
| `text-label-2` | 14 / 20 | -0.16px | 400 | Captions, timeline |
| `text-label-3` | 12 / 16 | -0.12px | 400 | Footer, mobile meta, roles (500) |

Override weight with `font-medium` / `font-regular`. Nothing below 12px. Case-study headings (H1–H3) aren't designed yet; add them here when they are.

## Spacing

Tailwind's `--spacing: 4px` base matches Figma's 4px grid, so `p-4` = 16px, `gap-15` = 60px. Use only these steps (values seen in Figma): **0.5, 1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20** (= 2, 4, 8, 10, 12, 16, 20, 24, 32, 40, 48, 60, 80px). 2.5 is the Figma button's icon-label gap. `check-tokens.mjs` flags other steps.

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
| `--container-drawer` | 576px | About drawer |
| `--container-prose` | 720px | Placeholder page column **(proposed)** |
| `--spacing-card-w` / `--spacing-card-h` | 553px / 400px | Active desktop card (Figma size) |
| `--aspect-card` | 553 / 400 | Every card. Mobile Figma (352×254.4) is the same ratio, so one token |
| `--spacing-logo-w` / `--spacing-logo-h` | 80px / 30px | Logo pills |
| `--spacing-avatar` | 140px | About avatar |
| `--spacing-icon-sm` / `--spacing-icon-md` | 18px / 20px | Icon glyphs |
| `--spacing-icon-badge` | 16px | Lock icon in the NDA badge |
| `--spacing-avatar-sm` | 52px | Avatar in the mobile drawer's compact header |
| `--spacing-avatar-overlap` | 73px | How far the avatar overlaps the banner (140 − 67) |
| `--spacing-banner` | 200px | About banner height |
| `--spacing-gallery-w` / `-h` | 170px / 200px | Gallery photo, desktop |
| `--spacing-gallery-w-sm` / `-h-sm` | 150px / 176px | Gallery photo, mobile |
| `--sheet-h` | 297px | Expanded bottom sheet height (Figma 233:4586); reserves room under the wheel |
| `--sheet-content-w` | 313px | Sheet text column; side padding flexes 24–40px around it |
| `--card-h`, `--card-w`, `--wheel-column` | derived | Card size and desktop centre column, per breakpoint, in `global.css` (see `layout-and-motion.md`) |

## Radius

| Utility | Value | Use |
|---|---|---|
| `rounded-item` | 8px | TOC items, dash |
| `rounded-button-sm` | 12px | Desktop icon button |
| `rounded-media-sm` | 16px | Gallery photos, close button |
| `rounded-button-lg` | 20px | Mobile/drawer icon buttons |
| `rounded-card` | 24px | Project card, logo pills |
| `rounded-panel` | 32px | Drawer, sheet top |
| `rounded-panel-inner` | 28px | Inside a `p-1` panel (32 − 4): mobile drawer banner |
| `rounded-full` | 9999px | Avatar |

## Effects

| Token | Value | Use |
|---|---|---|
| `--blur-caption` | 12.5px | `backdrop-blur-caption` on the card caption |
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

Motion takes seconds and arrays, CSS takes ms and `cubic-bezier()`; keep both in sync by hand and test both.

### Springs (proposed; tuned in Phases 4–5)

Motion's `visualDuration` + `bounce` form, so the values read like durations. Springs run in JS only (Motion), so they live in `motion.ts`, not in CSS.

| `motion.ts` | Value | Use |
|---|---|---|
| `spring.wheel` | `{ visualDuration: 0.4, bounce: 0.12 }` | Wheel step (mouse notch, key, TOC), trackpad snap, drag release. Starts at the wheel's current speed when retargeted |

### Intro timing (built; tune by eye)

The spin is keyframed rather than sprung, so its length is fixed: `[0 → turns·N + overshoot → turns·N]`. Motion's `animateValue` takes **ms** for `duration` (`animate()` takes seconds), so the intro multiplies by 1000.

| `motion.ts` | Value | Use |
|---|---|---|
| `intro.total` | `2.0` s (ceiling) | Whole sequence (spin 1.2 + last reveal ends ~0.66 later) |
| `intro.spinTurns` | `1` | Whole revolutions, so it lands on the first project |
| `intro.spinDuration` | `1.2` s | Spin, overshoot and settle back |
| `intro.spinEase` | `[0.3, 0.1, 0.15, 1]` | Fast spin, hard deceleration into the landing |
| `intro.spinOvershoot` | `0.12` positions | How far past the landing card the reel runs before settling ("clunk") |
| `intro.spinOvershootAt` | `0.82` | Fraction of the spin spent reaching the overshoot; the rest settles back on `ease.inOut` |
| `intro.revealDuration` | `0.5` s | Hero text, TOC, footer appear (`ease.out`) |
| `intro.revealStagger` | `0.08` s | Between revealed elements, in DOM order |
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
| `--wheel-gap` | `20px` mobile / `60px` desktop | read from CSS | Gap between active card and neighbour (`gap-5` / `gap-15`) |
| `--wheel-card-h-desktop` | `min(400px, 39dvh)` | — | Desktop card height |
| — | — | `wheel.stepThreshold = 80` | One wheel event this big is a mouse notch (steps at once); a trackpad gesture must travel this far to commit (reduced motion: per step) |
| — | — | `wheel.inputQuiet = 0.15` | s of wheel silence that ends a gesture (snap; reduced motion: unlock) |
| — | — | `wheel.follow = 0.07` | s, time constant of the wheel chasing scroll input (smooths mouse notches) |

## Breakpoints (mobile-first)

| Prefix | Min width | Layout |
|---|---|---|
| (none) | 0 | Mobile, designed at 393 |
| `tablet:` | 48rem (768px) | Not designed; interim rule in `layout-and-motion.md` |
| `desktop:` | 75rem (1200px) | Desktop, designed at 1440, content max 1736 |

## Implementation

The tables above are the spec; `src/styles/global.css` is the implementation (Tailwind v4: primitives in `:root`, reset namespaces, semantic tokens in `@theme static` / `@theme inline`). `static` makes Tailwind emit every theme variable even when no utility uses it, because the wheel geometry reads them from CSS. The CSS isn't duplicated here, so the two can't drift. Change a table first, then `global.css` and `motion.ts`.
