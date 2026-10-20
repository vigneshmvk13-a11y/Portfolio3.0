# Layout and motion

Written mobile-first, matching how the CSS is authored. All durations, easings, springs and wheel geometry are tokens (`tokens.md → Motion`, `→ Wheel`). In JS, use `src/lib/motion.ts`.

## Mobile home (base, designed at 393×852; check 360 and 412 too)

- `bg-surface-page-mobile`. One viewport-height composition (`h-dvh`). The document doesn't scroll; vertical swipes step the project wheel.
- Wheel stage: full width. Card width = viewport − 2 × `gutter-mobile`, height from `aspect-card` (553:400), **capped** so the card never slides under the expanded sheet: `h ≤ (100dvh − --sheet-h − safe-area − pt-10 − 2·gap) / 1.6585`. The cap doesn't apply at 393×852 (Figma holds exactly) but does at 360×740. The active card's centre sits at `pt-10` + (spread + reach) × h + gap from the top. That reproduces Figma at 393: the top neighbour's far edge at 40px, the active card at y = 227.
- BottomSheet fixed at the bottom, overlapping the lower neighbour (as drawn). Collapsed, it reveals the lower neighbour (`233:4621`).
- TocHandle fixed to the right edge at ~37% of the viewport height.
- Use `dvh`/`svh`, not `vh`, for anything tied to the viewport (mobile browser chrome).
- The stage sets `touch-action: none`. The sheet, TOC popover and drawer keep native touch behaviour.

## Tablet (`tablet:` 768–1199): interim, not designed

Mobile structure, card column `max-w-(--spacing-card-w)` centred, BottomSheet constrained to the same width. Revisit when designed; log feedback in the changelog.

## Desktop home (`desktop:` ≥1200, designed at 1440×1024)

One viewport-height composition. The document doesn't scroll; scroll input steps the project wheel.

```
| Left (1fr)            | Centre (wheel, 669)  | Right (1fr)           |
| pl-gutter pr-gutter-inner | px-5             | pl-gutter-inner pr-gutter |
| Intro, v-centred      | wheel, v-centred     | ProjectToc, v-centred |
|_______________________ FooterBar (fixed) _______________________|
```

- Grid `grid-cols-[1fr_var(--wheel-column)_1fr]`, centred with `max-w-page`. `--wheel-column = card-w + (669 − 553)`: exactly Figma's 669 at a 400px card, and it shrinks with the card on shorter viewports, so the side columns don't get squeezed (at a fixed 669, 1280×800 wrapped the name onto four lines). Arbitrary values are allowed **only** when every value inside is a token `var()` or a grid keyword; `check-tokens.mjs` whitelists that pattern and the `(--token)` shorthand.
- `h-dvh`, `bg-surface-page`.
- Side content capped at `max-w-side`.
- Card height = `min(400px, 39dvh)` (`--wheel-card-h-desktop`), width from the aspect. At 1024 tall that's Figma's 400; shorter viewports scale the card down so slices of both neighbours stay visible.

## Project wheel

Replaces the old "project stack". The Figma frame is the wheel's resting state: the active card flat and facing the viewer, its neighbours curving away above and below.

### Model: a virtual ring

- State is a single number, `position`. It is unbounded: 2.4 means "between card 2 and 3". The active index is `round(position) mod N`.
- Each card's offset from the front: `d = wrap(i − position)` into [−N/2, N/2). Angle `φ = d × --wheel-step`.
- Each card is positioned **on its own** under one stage. There is no nested `preserve-3d` ring, so the caption's `backdrop-filter` and the `<video>` keep working in Safari. Draw order comes from `z-index` by `|d|`.
- Wrap-around is free. The renderer works modulo N, so moving past the last project continues to the first, for any project count. A full revolution is `position += N`.

### Geometry (fitted to Figma)

Per card, where `h` = card height and `gap` = `--wheel-gap`:

```
transform: translateY(Y) perspective(P) translateZ(Z) rotateX(φ)
Y = (sin φ / sin step) × (0.8695·h + gap)
Z = R × (cos φ − 1)
R = 2.09·h   (--wheel-depth)        P = 2.1·h   (--wheel-perspective)
step = 38.1° (--wheel-step)
```

`perspective()` sits inside each card's transform, so every card has **its own vanishing point at its own centre**. That's what the Figma art shows.

**Derivation.** Measured top neighbour in `233:4518`: projected height 263.4px, near edge ≈519px, far edge ≈407px (ratio 0.78), 60px gap below it to the active card (400px tall).

- A cylinder seen from one shared vantage point can't reproduce this. Its foreshortening forces the far/near ratio to at least 0.79, and the least-squares fit runs to the edges of the search range.
- With the per-card vanishing point, solving for (step, R, P) against height, near width and far width gives step 38.1°, R 835px, P 840px. That model reproduces 263.6 / 519.3 / 407.0 (residual 0.15px²).
- The near edge sits 0.3695·h from the neighbour's centre, so `Y(±1) = 0.5h + gap + 0.3695h`.
- Desktop (h = 400, gap 60): Y = 407.8, far edge at 523.6. Figma has 523.4.
- Mobile (h = 254.4, gap 20): far edge at 314.7. Figma has 314.6.
- The same constants hold at both sizes. Only `h` and `gap` change.

### Visibility

| `|d|` | Opacity | Interactive |
|---|---|---|
| 0 | 1 | yes: link, video plays |
| 1 | `--wheel-fade` (0.2) | no: `inert` + `aria-hidden` |
| ≥ 1.5 | 0, `visibility: hidden` | no |

Opacity is linear between those stops. `backface-visibility: hidden` on every card. Transforms and opacity only; `z-index` changes only when the rounded index changes.

### Server render

The resting state (active, previous, next, rest hidden) is rendered as static CSS from the same tokens, so the page matches Figma with no JS and at first paint. Once the controller boots, it writes transforms each frame.

### Input

- **Wheel/trackpad:** accumulate `deltaY` (normalised for `deltaMode`). Past `--wheel-step-threshold` (80px), step once and lock input. Unlock only when the wheel has settled **and** wheel events have been quiet for `--wheel-input-quiet` (150ms), so one trackpad flick with its inertia tail can't step twice.
- **Touch / pen drag** on the stage (pointer events; mouse uses the wheel, keys and clicks, so dragging never fights link clicks): past a 6px slop, `position` follows the finger, with one step = `Y(±1)` pixels. On release, velocity from the last ~100ms projects 0.2s ahead; the wheel rounds to the nearest card and springs there (`spring.wheel`), carrying the velocity. A drag suppresses the click on the card under the finger.
- **Keyboard** (focus on body, stage or TOC): ↑/PageUp = previous, ↓/PageDown = next, Home = first, End = last. Enter on the active card follows its link (it's a real `<a>`); Enter with focus on body opens the active card.
- **TOC:** a plain click rotates the shortest way, `delta = ((i − cur + N/2) mod N) − N/2`; modifier-clicks open the case study. With 5 projects that's at most 2 steps, so one intermediate card passes. That's intended (it's a wheel). The mobile popover closes on selection and focus returns to the handle.
- **Hash:** on settle, `history.replaceState` to `#<slug>`, or no hash for the first project, so `/` stays canonical. On load, a hash selects the start project: an inline head script hides the wheel until it's placed (3s CSS failsafe), and the intro is skipped. `hashchange` rotates too.
- Clicking a neighbour is handled on the stage and steps toward it.
- **Focus:** if focus is on the outgoing card when it turns inert, it moves to the incoming card's link. The live region announces "Name, i of N" on settle (not on load).
- **Drawer open:** all wheel input is ignored (`drawer:open` / `drawer:close`).
- **Implementation:** `src/scripts/wheel/*` + `src/scripts/home.ts`. Motion's `animateValue` springs the single number. It's about 11 kB gzipped against about 25 kB for the full `animate`, because the wheel never animates elements directly.

### Video

Only the settled active card plays its cover. All others are paused and reset. While the wheel moves, every video is paused (posters show) until settle. `MotionCover`'s controller (`setActiveCover`) enforces one playing video.

### Reduced motion

The resting layout stays (a still image, not motion). Steps are instant: no spring, no momentum (the card follows the finger, which is direct manipulation, then snaps on release), and no intro.

### Verified (Phase 4)

An automated CDP test drives trusted input in Chrome against dev and the production build and checks:
- mouse-wheel step;
- one step per trackpad flick with an inertia tail;
- ↑/↓, PageUp/PageDown, Home/End and wrap-around;
- TOC shortest path (0 → 3 passes through 4);
- neighbour click and focus hand-off;
- the drawer blocking input;
- deep link `/#nova`;
- swipe up/down and the sheet collapse/expand;
- a fast flick carrying momentum (2+ steps);
- popover pick (closes, ticks and label update);
- reduced motion (instant);
- no JS errors.

4× CPU throttle at 412px: median and p95 frame 16.7ms, no frame over 20ms (headless Chrome; real devices still to test).

## Intro choreography

**Proposed values; tuned in the `/_lab/intro` page (Phase 5).** Runs on the first homepage visit per session only.

1. **Start:** only the first project's card, flat, centred, poster showing. It is server-rendered and is the LCP element; it is never hidden or delayed.
2. **Grow out** (~0–700ms): the other cards emerge from it and travel to their wheel slots with a gooey, liquid feel. Blobs stretch, stay joined by a membrane for a moment, pinch off, then settle with a soft spring overshoot. The technique comes from the lab (A goo-filter membrane, B morphing blob clip, C springs only). Filters can't sit on the 3D cards themselves (they flatten 3D and blur media).
3. **Slot-machine spin** (~700–1600ms): about one revolution (`position += N`): fast start, strong deceleration, small overshoot, landing back on project 1.
4. **Settle** (~1500–1900ms): the TOC and left column fade in; the "Scroll" hint appears (desktop only; mobile has no hint, the spin does that job).

**Mechanics:**
- An inline `<head>` script (before first paint) decides whether the intro will run. It runs when there's no `sessionStorage` flag, no reduced-motion preference and no hash. If so, the script sets `html[data-intro="pending"]`, and CSS then hides everything except the first card.
- A pure-CSS failsafe reveals everything after 3s, so a failed script can never leave the page blank.
- The intro module is **lazy-loaded** only when it will run.
- Any wheel, keydown, pointerdown or touchstart skips straight to the final state.
- Reduced motion: no intro; the resting state renders directly. Repeat visits in the session also go straight to rest.

## About drawer

- Open: panel from `translateX(-24px)` (desktop) or `translateY(24px)` (mobile/tablet), opacity 0 → rest over `--duration-slow`, `--ease-in-out`, via CSS `@starting-style` (no JS animation). Mobile scrim fades in over `--duration-base`; desktop has no scrim (Figma `234:4968`).
- Close: reverse over `--duration-base`. Esc, outside click (`closedby="any"` plus a JS fallback) and the close button all close it; focus returns to the trigger.
- Background is inert (`<dialog>.showModal()`); the wheel controller disables input while it's open (`drawer:open` / `drawer:close`).
- Mobile compact header (`234:34225`): once the banner block scrolls out of the drawer, an 84px sticky bar (banner strip, 52px avatar left, close right) fades in. It's a **state switch**, not scroll-linked, so reduced motion only loses the fade. The earlier scroll-linked shrink (200 → 64) is dropped: it's more motion for the same information.
- Deep link: `/?about` opens it on load (no entrance animation).

## TOC handle (mobile)

Native `popover`, anchored to the right edge at the handle's height. It opens over the wheel and closes on Esc, outside tap or (Phase 4) selection. Focus moves to the active item on open.

## Bottom sheet (mobile)

Driven by wheel direction, mirroring the old scroll rule: a **forward** step (next project) collapses it, a **backward** step or returning to project 1 expands it. Intro fades (`--duration-fast`), then rows animate `grid-template-rows: 1fr → 0fr` (`--duration-base`, `--ease-in-out`). Under reduced motion it still collapses, instantly.

## Page load

Apart from the homepage intro above, there's no load animation. Content must be visible without JS: animate from a state JS adds, never from a hidden initial CSS state. The intro's `data-intro="pending"` is set by JS, and the CSS failsafe still applies.
