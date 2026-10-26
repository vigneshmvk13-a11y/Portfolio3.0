# Layout and motion

Written mobile-first, matching how the CSS is authored. All durations, easings, springs and wheel geometry are tokens (`tokens.md → Motion`, `→ Wheel`). In JS, use `src/lib/motion.ts`.

## Mobile home (base, designed at 393×852; check 360 and 412 too)

- `bg-surface-page` (gray/50, as on desktop). One viewport-height composition (`h-dvh`). The document doesn't scroll; vertical swipes step the project wheel.
- Wheel stage: full width. The card always fills the width inside `--wheel-inset` (52px each side): viewport − 104px, height from `aspect-card` (553:400). At 393 that's 289 × 209 (Figma 230:4858: 288 × 208). Neighbours sit `--wheel-gap` (52px) from the card.
- Its centre (`--wheel-centre-y`, global.css) is Figma's placement, `pt-10 + (spread + reach) × h + gap`: the top neighbour's far edge at 40px and the card's centre at y ≈ 334, at 393×852.
- On shorter screens the centre **rises** so the card clears the expanded sheet by `--wheel-gap`: `min(figma, 100dvh − --sheet-h − safe-area − gap − h/2)`. The top neighbour then shows as a slice.
  - Why: real phone browsers leave ~660px (iPhone Safari with its bars) to ~790px, not Figma's 852. The old rule shrank the card to fit (about ⅔ size at 660). Vignesh chose a full-size card with a cropped top neighbour (2026-10-21).
  - The height still caps when even the card alone can't fit between `pt-10` and the sheet (landscape phones).
- BottomSheet fixed at the bottom, overlapping the lower neighbour (as drawn). Collapsed, it reveals the lower neighbour (`233:4621`).
- The TOC is fixed to the right edge, centred on the active card (`--wheel-centre-y`).
- Use `dvh`/`svh`, not `vh`, for anything tied to the viewport (mobile browser chrome).
- The stage and the TOC set `touch-action: none` (the TOC so a press-and-drag scrubs instead of panning). The sheet and drawer keep native touch behaviour.

## Tablet (`tablet:` 768–1199): interim, not designed

Mobile structure, card column `max-w-(--spacing-card-w)` centred, BottomSheet constrained to the same width. Revisit when designed; log feedback in the changelog.

## Desktop home (`desktop:` ≥1200, designed at 1440×1024)

One viewport-height composition. The document doesn't scroll; scroll input steps the project wheel.

```
| Left (1fr, ≤265.5)    | Centre (card-w)      | Right (1fr, ≤265.5)   |
|      ←80→ (--home-gap)|                      |(--home-gap) 80→       |
| Intro, v-centred      | wheel, v-centred     | ProjectToc, v-centred |
|_______________________ FooterBar (fixed) _______________________|
```

- **Fixed 80px gaps (Vignesh, 2026-10-24):** intro → card and card → TOC are `--home-gap` (80px) at every width. Grid `grid-cols-(--home-cols)` = `minmax(0,1fr) card-w minmax(0,1fr)`, `gap-x-(--home-gap)`, `px-gutter-inner`, centred and capped at `--home-max` (card-w + 2 × (265.5 + 80) + 2 × 40). A wider screen adds margin, never gap; a narrower one (1200–1400) shrinks the side columns, as before. The intro is right-aligned in its column and the TOC left-aligned, so the gap stays exact. The footer uses the same width, so the credit lines up with the intro. Figma's 1920 frame measures 98px (58px card margin + 40px column padding); Vignesh chose 80. Arbitrary values are allowed **only** when every value inside is a token `var()` or a grid keyword; `check-tokens.mjs` whitelists that pattern and the `(--token)` shorthand.
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
- Mobile (h = 254.4, gap 20): far edge at 314.7. Figma 233:4584 has 314.6. (Mobile is now h ≈ 209, gap 52, Figma 230:4858; its neighbours are still the old flattened images, so the constants weren't refitted.)
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

- **Mouse wheel:** a single wheel event of at least `wheel.stepThreshold` (80px; Chrome/Edge on Windows send 100 per notch) or in line/page units is a **notch**. It springs straight to the next card (`spring.wheel`) with no follow-then-wait, so the next project is in focus within ~150ms. Rapid notches retarget the spring from where it's heading and keep its current speed: spinning the mouse wheel flows through projects, one per notch. (The first build followed a notch a quarter-card, waited 150ms for quiet, then sprang; Vignesh felt that pause.) Mac mice send small deltas and behave like a trackpad.
- **Trackpad (scroll-linked):** the wheel moves *with* the scroll, like a page. Small `deltaY` events (normalised for `deltaMode`) move a target by `deltaY / Y(±1)` positions, so one card height plus gap of scroll is one project. The wheel chases that target with exponential smoothing (`wheel.follow`, 70ms), so input tracks the fingers. Cards pass continuously through the tilted, faded neighbour pose; there's no canned step animation. Large events inside a running trackpad gesture (inertia) stay scroll-linked. When wheel events go quiet for `wheel.inputQuiet` (150ms, including any inertia tail), the gesture **snaps** with `spring.wheel`, carrying the current speed:
  - travelled < `wheel.stepThreshold` (80px): spring back to the starting card;
  - otherwise: move `max(1, round(travelled))` cards in the scroll direction. A long flick can travel several.
  - Scrolling again during a snap starts the new gesture from where the snap is heading, so quick notches add up instead of fighting the spring.
  - Direction: scrolling down moves the focused card up and brings the next one in from below; scrolling up does the reverse.
  - Reduced motion: no scroll-linked movement. Accumulate past 80px, step once (a short turn), lock until quiet.
- **Touch / pen drag** on the stage (pointer events; mouse uses the wheel, keys and clicks, so dragging never fights link clicks): past a 6px slop, `position` follows the finger, with one step = `Y(±1)` pixels. On release, velocity from the last ~100ms projects 0.2s ahead; the wheel rounds to the nearest card and springs there (`spring.wheel`), carrying the velocity. A drag suppresses the click on the card under the finger.
- **Keyboard** (focus on body, stage or TOC): ↑/PageUp = previous, ↓/PageDown = next, Home = first, End = last. Enter on the active card follows its link (it's a real `<a>`); Enter with focus on body opens the active card.
- **TOC:** a plain click rotates the shortest way, `delta = ((i − cur + N/2) mod N) − N/2`; modifier-clicks open the case study. With 5 projects that's at most 2 steps, so one intermediate card passes. That's intended (it's a wheel). On mobile, picking a row in the open TOC closes it, and focus returns to the tab when it was picked by keyboard. Scrubbing: see TOC handle below.
- **Hash:** on settle, `history.replaceState` to `#<slug>`, or no hash for the first project, so `/` stays canonical. On load, a hash selects the start project: an inline head script hides the wheel until it's placed (3s CSS failsafe), and the intro is skipped. `hashchange` rotates too.
- Clicking a neighbour is handled on the stage and steps toward it.
- **Focus:** if focus is on the outgoing card when it turns inert, it moves to the incoming card's link. The live region announces "Name, i of N" on settle (not on load).
- **Drawer open:** all wheel input is ignored (`drawer:open` / `drawer:close`).
- **Implementation:** `src/scripts/wheel/*` + `src/scripts/home.ts`. Motion's `animateValue` springs the single number. It's about 11 kB gzipped against about 25 kB for the full `animate`, because the wheel never animates elements directly.

### Video

Only the settled active card plays its cover. All others are paused and reset. From the moment the wheel starts moving (`wheel:start`, including a scroll that tilts the card and springs back), every video is paused (posters show) until settle. `MotionCover`'s controller (`setActiveCover`) enforces one playing video.

### Reduced motion

The resting layout stays (a still image, not motion). Each step is a **short turn**: `wheel.reducedTurn` (0.2s) on `ease.out`, through the same 3D poses, one project per gesture. There's no spring overshoot, no carried momentum, no scroll-linked following (the card follows the finger on touch, which is direct manipulation, then turns to the nearest card on release), and no intro.

Why a turn and not instant (Vignesh, 2026-10-21): Windows "Adjust for best performance" turns off "Animate controls and elements inside windows", which Chrome reports as `prefers-reduced-motion: reduce`. With instant steps, those visitors never saw the wheel move, and the wheel is the site's identity. Alternatives considered:
- a crossfade with a 12px nudge (no 3D movement): recommended for motion-sensitive visitors, not chosen;
- a site motion switch: not chosen;
- instant: the old rule.

### Adaptive quality (slow devices)

Separate from reduced motion: the setting is normal, but the device can't hold 60fps. The motion stays; the expensive extras go.

- `src/scripts/quality.ts` samples frame intervals **only while the wheel moves** (`wheel:start` → `wheel:settle`), over a rolling window of the last 40 motion frames (`quality.sampleFrames`), judged at each settle. If ≥ 20% (`quality.slowShare`) are slower than 20ms (`quality.slowFrameMs`, below ~50fps), it sets `html[data-quality="lite"]`. It's rolling, so a device that slows down later (heat, battery saver) still switches.
- Save-Data starts in lite.
- Lite: the card caption drops its `backdrop-filter` blur (it re-renders every frame a card moves) and keeps its translucent `surface-caption` fill. A running or later intro plays at `quality.introSpeed` (2×).
- The verdict is kept for the session (`sessionStorage` `quality-lite`); the head script in `index.astro` applies it before first paint on the next load.
- Verified in `test-wheel.mjs`: a normal device stays full; a main thread burning ~25ms per frame switches to lite while the wheel keeps stepping; lite is applied before paint on reload.

### Verified (Phase 4)

An automated CDP test (`scripts/test-wheel.mjs`) drives trusted input in Chrome against dev and the production build and checks:
- the wheel follows a slow trackpad scroll mid-gesture, then commits; a 30px nudge springs back;
- a mouse notch glides (no jump) and steps once; a second notch during the snap continues forward;
- a 765px trackpad flick with inertia travels two cards;
- intro: only the wheel while spinning, lands on project 1 unannounced, then reveals; not repeated in the session; skipped by input (and the input still acts), by a deep link and under reduced motion;
- ↑/↓, PageUp/PageDown, Home/End and wrap-around;
- TOC shortest path (0 → 3 passes through 4);
- neighbour click and focus hand-off;
- the drawer blocking input;
- deep link `/#nova`;
- swipe up/down and the sheet collapse/expand;
- a fast flick carrying momentum (2+ steps);
- mobile TOC:
  - press morphs it open;
  - scrubbing highlights the row under the finger and spins the wheel while the finger is still down;
  - release collapses it; scrubbing past the ends clamps;
  - a quick tap keeps it open, a row tap picks and closes, an outside tap only dismisses;
  - a held-still release closes it;
- mobile sheet: collapses during any swipe (either direction), expands after settle;
- short phone (393×660): the card is full size and clear of the sheet;
- reduced motion: a short turn, no scroll-linked movement (instant before 2026-10-21);
- adaptive quality (see above);
- no JS errors.

4× CPU throttle at 412px: median and p95 frame 16.7ms, no frame over 20ms (headless Chrome; real devices still to test).

**60fps (2026-10-21, `scripts/perf-motion.mjs` on the production build):** 0 missed frames for a mouse notch, rapid notches, trackpad scroll, About drawer, intro (desktop and mobile), and swipe with sheet collapse/expand. That holds at 4× CPU throttle (headless) and unthrottled in a real window. The renderer only writes styles that changed and skips hidden cards. The sheet's `grid-template-rows` transition is a layout animation but measured clean, so it stays. Real phones are still to test.

## Intro choreography

**Built** (`src/scripts/intro/intro.ts`, values in `tokens.md → Intro timing`). Runs on the first homepage visit per session only. Vignesh's brief (2026-10-21): only the wheel appears first, spins like a slot machine and lands on the first project, then the hero text and TOC appear.

1. **Start (Vignesh, 2026-10-24):** only the first project's card (server-rendered, the LCP element, never hidden or delayed). Its neighbours are hidden in the first frame too. The left column / bottom sheet, the TOC (side list and mobile handle) and the footer are hidden.
2. **Slot-machine spin** (0–1.2s), **starting at once** (one frame after the module loads, no decode wait): one full revolution (`position += N`), so every project flips past once. The other cards fade in behind the lead card over its first `intro.trailIn` (0.6) positions (`WheelRenderer.setIntro`), then follow it round. Fast spin, hard deceleration, runs 0.12 of a card past project 1, then settles back like a reel clunking into place.
3. **Reveal** (from the landing, ~0.66s): hero text, TOC and footer fade in **together** (no stagger; Vignesh, 2026-10-24). Desktop columns rise 12px. The mobile bottom sheet slides up from the bottom edge and the TOC handle slides in from the right edge.

The earlier proposal's "grow out" phase (gooey cards emerging from the first one) is **dropped**. The brief starts from the whole wheel, and the goo technique would have needed a lab and a filter layer the 3D cards can't carry.

**Mechanics:**
- An inline `<head>` script in `index.astro` (before first paint) decides whether the intro runs: no `sessionStorage` flag (`intro-seen`, set at that moment), no reduced-motion preference, no deep link (`/#slug`, `/?about`). If so, it sets `html[data-intro="pending"]`, and CSS hides every `[data-intro-reveal]` element (`opacity: 0; visibility: hidden`, so it's also unfocusable and unclickable) and every card but the first (until the spin starts and `data-intro-spinning` is set; from then on the renderer owns their opacity).
- A pure-CSS failsafe reveals everything after `--intro-failsafe` (3s), so a failed script can never leave the page without its chrome.
- The intro module is **lazy-loaded** (0.7 kB gzipped) only when it will run. The spin uses the wheel controller's `animatePosition` (keyframes through Motion's `animateValue`); the reveal uses the native Web Animations API, so it adds no library code.
- **Prep without waiting** (60fps): all covers start loading and decoding at once (`img.loading = eager`, `img.decode()`, not awaited), hidden cards are made visible at opacity 0 so their layers are built (`WheelRenderer.prewarm`), one frame later the spin starts. (Until 2026-10-24 it waited up to 0.3s for the decodes and two frames; that wait was the pause before the spin. Measured after removing it: 0 missed frames in the desktop and mobile intro at 4× CPU.)
- Wheel input is disabled while it runs. Any wheel, keydown, pointerdown or touchstart (capture phase) skips straight to the final state, and the same input is then handled normally (a scroll moves the wheel, ↓ steps).
- The landing isn't announced in the live region and doesn't set a hash.
- Reduced motion: no intro; the resting state renders directly. Repeat visits in the session also go straight to rest. `scripts/screenshot.mjs` skips it unless `INTRO=1`; `test-wheel.mjs` skips it except in the intro tests.

### First run (mobile; Vignesh, 2026-10-24)

User tests: the wheel sits above the thumb's reach, behind the sheet, so people didn't find out it moves. `src/scripts/first-run.ts`, tokens `firstRun.*`:

1. **Auto-collapse.** Once the intro has landed (or the page is ready), the sheet collapses by itself after 2.5s, unless the visitor has already touched, scrolled or typed. Nothing is taken from someone reading it; the handle brings it back. Every visit to the homepage, reduced motion included (it's a state change).
2. **Nudge.** 0.2s into that collapse, the centre card turns 0.12 of a step towards the next project and settles back (0.8s, `ease-out` then `ease-in-out`). Wheel motion `via: 'hint'`: not announced, doesn't collapse or dismiss anything.
3. **"Swipe to explore"**, `text-label-3` medium `fg-secondary` (the desktop "Scroll" hint's style), 12px above the collapsed sheet's edge, riding with it. Shown only while the sheet is collapsed, until the visitor first moves the wheel (any input: `data-swiped`, remembered for the session); never over About. `aria-hidden`: the wheel has its own semantics.
4. **A sideways swipe on the sheet turns the wheel** (left = next project), with the same follow, momentum and snap as a drag on the wheel itself (`sheet.ts`). The direction is decided at the 6px slop: mostly sideways turns the wheel, mostly vertical stays the sheet's (collapse / open).
5. **TOC peek.** After the nudge, the right-edge tab slides out 6px and back, twice (0.9s), pointing at the scrubber in thumb reach.

The nudge and the peek run once per session and never with reduced motion. 60fps at 4× CPU (`perf-motion.mjs`: first run, sideways swipe).

### Phone held sideways (Vignesh, 2026-10-24)

In landscape under 520px tall (and narrower than 75rem) the expanded sheet would fill the screen and the cards shrank to slivers. The sheet now **starts collapsed** (`sheet.ts`), `--sheet-h` is its collapsed height (125px) and `--wheel-gap` 16px, so the card is ~210px tall above it (global.css). Tap or drag the handle for the intro.

## About

Figma section `280:9512`. A side drawer on desktop; on mobile and tablet the bottom sheet grows into it.

**Both:**
- Background is inert (`<dialog>.showModal()`); the wheel controller disables input while it's open (`drawer:open` / `drawer:close`). Focus moves to the close button and returns to the trigger.
- Esc, a click outside (`closedby="any"` plus a JS fallback) and the close button close it.
- Deep link: `/?about` opens it on load (no entrance; already grown on mobile).

**Desktop drawer:** from `translateX(-24px)`, opacity 0 → rest over `--duration-slow`, `--ease-in-out`, via CSS `@starting-style`; closes in reverse over `--duration-base`. The `surface-scrim` backdrop fades with it, as on mobile (Vignesh, 2026-10-24; Figma `234:4968` has none). The whole panel scrolls, banner included (`280:9452`).

**Mobile and tablet: the footer becomes About** (Vignesh, 2026-10-24: "the same footer expands to fill the screen with a top spacing of 40px … one seamless morph"):
- **One surface.** The bottom sheet's own surface (`[data-sheet-bg]`, already tall enough) rises until its top edge is `--about-top` (40px) below the screen's top. The About `<dialog>` has no surface of its own: it rides exactly on that edge (transform), so the white, the border and the rounded top are always the sheet's. Its handle sits in the sheet handle's spot and takes over from it.
- **One value**, `progress` (0 = footer, 1 = About), drives every frame (`drawer.ts` → `sheet.ts`): the surface's lift, the dialog's position, the scrim (`surface-scrim`, behind the surface, 0 → 24% black), and both sets of content.
- **Content swap at halfway** (`sheet.aboutSwap`): the footer's intro and buttons blur (to 10px) and fade out by halfway, rising at half the surface's speed. About's content appears only past halfway, sharpening as the sheet settles. Closing plays this back: About blurs out by halfway closed, then the footer's content returns.
- It starts wherever the footer is (expanded or collapsed) and goes back there.
- **Timing:** open, the close button, Esc and taps use `duration.slow` + `ease.inOut` (0.5s). Drag release uses the bottom sheet's rule: a spring carrying the release speed, `sheet.flickMin`–0.5s (`drag.ts`, shared with `sheet.ts`).
- **Closing:** the close button; dragging the handle down (it follows the finger and settles to the nearer state, counting a 0.15s projection of the release speed); a tap on the handle (WCAG 2.5.7: dragging has a single-tap alternative, and the close button scrolls away with the banner); Esc and a tap in the 40px above the sheet (their `cancel` is intercepted, so they play the morph back too). A browser that won't let Esc be cancelled closes the dialog at once, and the sheet still glides back.
- **Handle colour:** light (`surface-page`) over the banner, `line-strong` with a 40px white fade (50% → 0) once white content is under it (`280:9401`). A state switch with a `--duration-fast` crossfade, from scroll position. While the sheet grows, the light bar fades in with the banner, so the handle starts the footer's grey.
- **Stacking:** while it's open the sheet lifts to `z-40`, above the TOC handle, which would otherwise show through the transparent dialog.
- **Tablet:** the sheet's width (`card-w`, centred), not `w-drawer`, so it's still one surface. Tablet isn't designed.
- **Reduced motion:** opening and closing are instant. A drag still follows the finger (direct manipulation).
- **60fps:** transforms, opacity and a blur that is only on during the morph. 0 missed frames at 4× CPU for open, close, the handle drag and the gallery scroll (`perf-motion.mjs`, 2026-10-24).
- The compact sticky header (`234:34225`) is gone: the new scrolled frame (`280:9344`) has none.

## TOC handle (mobile)

Figma component 2: collapsed tab `233:4609` (27×80, five 19×4 ticks 10px apart), expanded panel `233:4714` (193×223, rows 36px tall and 2px apart, inset 8, `rounded-item`; the active row is `surface-selected`). Brief and choices: Vignesh, 2026-10-21.

**Morph.** One progress number `p` (0 = tab, 1 = panel) springs with `spring.toc` (0.35s, bounce 0.15). It's drawn each frame by `src/scripts/toc-morph.ts`; the geometry lives in `toc-shape.ts`.
- **Outline:** one path at every `p`.
  - The right-edge "ears" (13.5×8 → 8.5×8.5) meet the screen edge.
  - The rounded body (radius 13.5 → 16) grows leftwards and taller, symmetric about the tab's centre.
  - Corners blend continuously from Figma's smoothed tab corner (p = 0, within 0.005px of 233:4609) to the panel's circular 16px corner (p = 1), both written as the same three cubics. The first build swapped corner shapes only at rest, so the corners jumped at the end of a collapse; the spring's undershoot past 0 could flip it more than once. Below 0 the outline now holds at the tab.
- **Ticks → rows:** each tick stretches into its own row: inset 4 → 8, 19×4 → (panel − 16)×36, radius 2 → 8, spacing 10 → 38. Grey ticks fade as they grow; the active (dark) tick becomes the `surface-selected` highlight.
- **Labels ride their bars:** the list follows the bars' left edge, and each row follows its bar's spacing. They fade in over `p` 0.4–1 (`toc.labelFadeFrom`).
- **One clip:** the fill, bars and labels sit in one element clipped to the outline path (`clip-path: path()`, written each frame), so text never shows outside the rounded shape. When the fill was a separate SVG, it could land a frame behind the clip. The 1px outline stroke is a separate SVG on top.
- **Width:** the panel widens to its longest label ("Fyn- Wholesale Banking app"; open question 15). Rows keep that width while the frame grows, so text never reflows.
- **Anchor:** the active card's centre (`--wheel-centre-y`). In Figma the tab sits 3px lower and the open panel ~10px lower; centring keeps the tick under the finger growing into the row under the finger.

**Interaction:**
- **Press** the tab: it opens. Nothing else changes until the finger moves `toc.scrubSlop` (6px).
- **Drag (scrub):**
  - The row under the finger gets the highlight, which slides there (`spring.toc`). Only height counts, and past either end it clamps to the first or last project.
  - The wheel spins to that row (`goTo`, the shortest way) while the finger is still down.
  - The bottom sheet stays collapsed (`toc:hold`).
- **Release after dragging:** it collapses and the wheel stays on the last row. The click under the finger is suppressed.
- **Quick tap** (under `toc.tapMax` 0.3s, no drag): it opens and stays open.
  - A row tap picks that project and closes it.
  - A tab tap closes it.
  - An outside tap only dismisses: that tap doesn't also step the wheel or open a card.
- **Held still, then released:** it collapses and nothing else changes.
- **Keyboard:** Enter/Space on the tab toggles it. Opening moves focus to the active row; Esc closes it and returns focus; focus leaving the panel closes it. The tab carries `aria-expanded` and `aria-controls`, and the panel is `inert` while closed.
- **Drawer open:** it closes; input is ignored while the wheel is disabled.
- **Reduced motion:** the morph and the highlight are instant; the wheel still turns (its own rule).

## Bottom sheet (mobile)

Decided by Vignesh, 2026-10-22, after checking it against UX principles: content first, user control, signifiers, and WCAG 2.5.7.

**States.** It starts **expanded**, so the first impression is who this is. It **collapses** as soon as the wheel moves (any input, either direction, any project) or the TOC is scrubbed. It **never reopens by itself**: the user opens it.
- **Open:** tap the collapsed surface, tap the handle, or drag it up.
- **Close:** drag it down or tap the handle. Scrolling the wheel also closes it.
- **Taps on the three buttons** only do their own action; they never also open the sheet.
- **A swipe that starts on the sheet** moves the sheet, never the wheel.
- **Release:** a drag follows the finger, then settles to the nearer state, counting where the release speed would carry it (0.15s projection).

**Handle** (Figma 260:6908). A 40×6 `line-strong` (gray/300) bar, 16px below the top border, open and collapsed.
- It's a real `<button>` (`aria-expanded`, "Show / Hide introduction", `aria-controls` the intro). Its 96px-wide hit area reaches 12px above the edge.
- That gives dragging a single-tap and keyboard alternative (WCAG 2.5.7).

**Fixed spacing (Vignesh, 2026-10-26).** The open sheet no longer compacts on short screens: hero → tags 16, tags → buttons 24, below the buttons 48 (`tokens.md → Mobile sheet spacing`). It used to scale down with viewport height, which was too tight on an iPhone 16. The sheet is ~283px plus the safe-area inset at every height; on short screens the wheel card shrinks to clear it.

**Collapsed** (Figma 260:6936): the buttons sit `--sheet-handle-gap` (32px) below the handle bar, at every screen height: 137px tall at 852. Open, the intro sits 24px below the bar (`--sheet-top-gap`).

**Motion** (Vignesh, 2026-10-22: "blur and fade out slowly … gone by halfway"):
- One openness value (1 open, 0 collapsed) drives every frame (`src/scripts/sheet.ts`). Taps, the handle and scroll animate it with an even ease-in-out over `duration.slow` (0.5s). A drag follows the finger and, on release, a spring (`spring.sheet`) carries the release speed. The settle takes as long as that speed needs to cover the rest of the way, between 0.25s (`sheet.flickMin`, a quick swipe) and 0.5s (a slow drag), so a flick doesn't drag on (Vignesh, 2026-10-22).
- The surface (`[data-sheet-bg]`) and the handle slide by `--shift`. The buttons never move.
- The **intro blurs and fades with the sheet's position**. It's fully visible when open and gone by halfway (`sheet.introGoneAt`), blurring up to 10px as it fades. When opening it comes back only past halfway, sharpening as it arrives.
- The intro slides at half the sheet's speed (`sheet.introFollow`), so it sinks into the sheet. It's gone before the surface's top edge or the buttons could reach it, so it needs no clip.
- The earlier `clip-path` mask could fall a frame behind the surface on iOS (part of the name showing above the edge), so it was dropped.
- Transforms, opacity and a small blur only. Measured at 60fps at 4× CPU. Only the surface, handle and buttons take pointer input, so taps above the collapsed surface reach the wheel.

**Reduced motion:** collapsing and expanding are instant, with no blur in between. A drag still follows the finger (direct manipulation), with the fade.

History: it used to follow direction (2026-10-20), then re-expand 0.25s after every settle (2026-10-21). That re-expansion covered the next card exactly when the user paused to look, so it was dropped.

## Case study (`/work/[slug]`)

Figma section `234:33903` (Data mapping): desktop `234:18762` (1440), mobile `234:5721` (402; built at 393 and checked at 360 and 412). The other four (section `279:8667`) are desktop only and follow the same layout; their two new sections, Context and System, use the template's mobile rules. Components: `components.md → Case study`.

### Layout

| | Mobile (base) | Desktop (`desktop:`) |
|---|---|---|
| Column | full width, `px-6` | `max-w-case` 846, centred; text in `max-w-case-text` 668 |
| Top | `pt-10` (40) to the tags | `pt-10` (40) to the tags (Vignesh, 2026-10-23; was 80) |
| Cover | `aspect-card` | `aspect-cover` (846×556) |
| Facts | `pt-6 pb-8`, 2 + 1 | `py-22`, three 176 columns |
| Tabs → first section | `pb-10` (40) | `pb-10` (40) |
| Section rhythm | 32 between blocks, 32 inside (`mt-8`, `pt-8`) | 88 (`22`) inside each section (Figma's 89) |
| Cards (Overview, Reflection) | `rounded-panel`, `px-6 py-8`, inset 24 | `rounded-section` 48, `p-22` |
| More projects bottom | `pb-30` (120) | `pb-40` (160): room for the nav |

Tablet (768–1199, not designed): the mobile layout in the 846 column.

### Tabs

- Built from the sections that have content; no tabs with fewer than two. Order = page order: Overview, Solution, Final designs, Outcome, Reflection.
- Sticky 20px from the top (`top-5`; Vignesh, 2026-10-23, Figma `234:27448` draws 40) from where they sit until the end of Reflection; then they scroll away with it, before More projects.
- **Active follows the scroll:** the last section whose top has passed 35% of the viewport height.
- **Tap:** smooth-scrolls the section to 100px below the top (`scroll-mt-25`, ~30px clear of the stuck tabs), holds that tab active until the scroll ends (`scrollend`, 1.2s fallback), and puts `#section` in the URL (`replaceState`). Reduced motion: instant scroll.
- The pill slides to the active tab (`translate` + `width`, `duration-base`, `ease-out`). Mobile: the row scrolls sideways to keep the active tab in view.

### Floating nav

- Previous · Home · Next, fixed 32px above the bottom. Wraps round the homepage order (Next from Gyst is Data mapping).
- **Always in full; no collapsed state** (Vignesh, 2026-10-24). Shown on load. **Scrolling down hides it**: the bar sinks below the screen edge and fades out (`duration-base`, `ease-in-out`). **Scrolling up brings it back** (8px either way, `caseStudy.navScrollSlop`): it rises and fades in (`duration-base`, `ease-out`). It also shows at the very top, within 160px of the end (`caseStudy.navEndZone`, so it's always there when there's nowhere further down to go), and while any of its links has keyboard focus. Hidden, it isn't clickable.
- **No opacity on the bar**: an ancestor with opacity < 1 is a backdrop root, so the blur saw nothing during the fade and popped back at the end (the colour flicker Vignesh saw). The surface, which carries the blur, and each link fade on their own; the bar only moves (`translate`). 60fps at 4× CPU.
- The surface blurs what scrolls under it (`backdrop-blur-nav`, 40px). It must not carry a `view-transition-name` at rest (that makes it a backdrop root, so the blur sees nothing); it's named only during a slide.
- History: until 2026-10-24 it collapsed to Home on scroll down and expanded on scroll up (Figma `234:31771`); that state is gone.

### Swipe (touch only)

- A horizontal touch drag moves the page with the finger at 60% (`caseStudy.swipeFollow`). Release past 25% of the screen width (`swipeCommit`) or faster than 0.5 px/ms (`swipeVelocity`) goes to the previous (swipe right) or next (swipe left) project with the slide transition. Anything less springs back (`duration-base`, `ease-out`, WAAPI).
- Recognised after 10px (`swipeSlop`) of mostly horizontal travel; a mostly vertical start is a scroll and the browser keeps it. The page is `touch-action: pan-y pinch-zoom`, so vertical scrolling and zoom stay native.
- Never starts on the tab row (`[data-no-swipe]`, it scrolls sideways) or within 24px of the screen edges (`swipeEdge`, the browser's back/forward). No trackpad or mouse swipe: two-finger horizontal swipe is the browser's back gesture.
- Reduced motion: the drag still follows the finger (direct manipulation); the page change is instant.
- The page never stays pushed aside: a committed swipe starts the next page and springs this one back at once. A prefetched or prerendered page takes over within a frame or two and slides on from about where the finger left it; a slow one (a cold load, the dev server) no longer leaves this page frozen shifted (once a navigation starts, Chrome throttles the old page's frames and shows its last one). The browser taking the gesture over (`pointercancel`, `lostpointercapture`) springs it back too, and any return to the page (`pageshow`) resets it. Fix for Vignesh's report (2026-10-23) of a case study shown shifted to the side.

## Page transitions

Cross-document View Transitions (no dependency; the site stays static). `src/scripts/page-transition.js`, inlined in every page's `<head>` with the opt-in (`@view-transition { navigation: auto }` under `prefers-reduced-motion: no-preference`). The opt-in must be inline: in an external stylesheet the incoming page could render before it loaded, and the transition was dropped. Chrome, Edge and Safari 18.2+; other browsers navigate normally.

The page being left picks the type (`pageswap`) from what was tapped (Safari doesn't expose the destination) or the destination URL (back/forward), and hands it over in `sessionStorage`; the new page applies it (`pagereveal`). Only the two morphing covers get `view-transition-name: case-cover`, and only for that navigation.

| Type | When | What moves |
|---|---|---|
| `expand` | A project card (homepage wheel, More projects) | The card's cover grows into the case-study cover (ratio change via `object-fit: cover`, corners `radius-card`); everything else crossfades ("dissolves") |
| `collapse` | Home, or back to the homepage | The cover shrinks into the homepage card |
| `next` / `prev` | Previous / Next, swipe, back/forward between neighbours | The pages slide like a carousel (old out, new in, full width); the nav (`case-nav`) stays put |

**Card ⇄ cover** (expand, collapse) moves on the CSS spring (`ease-spring`, 0.6s). The outgoing image stays fully opaque for the whole morph (no see-through midpoint); the incoming one fades in over it in the second half. If its image hasn't loaded yet (`html[data-vt-cover-wait]`), it never does: the outgoing image carries the whole morph and the page takes over at the end. The rest of each page fades (`duration-base`; the new page starts `duration-fast` later). On the homepage the whole card link morphs (cover, badge, caption, clipped; the hover zoom stays inside). Going back, the card snapshot (with its caption and badge) fades in over the shrinking cover in the second half, so they arrive in place on top. Opening a project, the caption and badge are hidden in `pageswap`, before the old page is captured, so only the image grows, even when the new cover isn't loaded and the old snapshot carries the morph. (Captured on their own names they stayed where the card was, since nothing on the new page matches them, and the frosted caption bar floated over the growing cover.) Every `pagereveal` first clears names and hidden labels left from leaving the page (bfcache).

**The System image's link** (Prime compass → Nova) is a `fade` too: plain page dissolve, nothing morphs (the image isn't Nova's cover). Without its own trigger it would have slid, since Nova is Prime compass's previous project.

**Home from further down a case study** (Home or browser back, with less than half the cover on screen) doesn't morph: the cover is off screen, and morphing from there made the card fall in from above (Vignesh, 2026-10-24). It's a `fade`: the pages dissolve as in expand / collapse, and the card the wheel rests on settles in place (`card-settle`, no old counterpart, so it doesn't travel), from `--scale-settle` (0.96) and transparent to full, `duration-base` + `ease-out`, in step with the new page. If the card's image isn't ready it just fades in with the page. A short page (Fyn, NDA) keeps its cover on screen at the end and still zooms.

**Slides** take `duration-slow` (0.5s) `ease-in-out`. The page doesn't take input during a transition.

**Any project back to the wheel:** the homepage is reached as `/#slug`. An inline script right after the wheel markup (ProjectWheel.astro) places the wheel on that project while the page parses, and the first frame waits for it (`<link rel="expect" href="#wheel-placed" blocking="render">`), so the cover shrinks straight into that card.

**Speed:** the homepage prerenders a case study on hover or press (speculation rules, `moderate`), so its cover is painted before the tap; case pages prerender Previous / Next on hover and prefetch them and home. Chrome disables prerendering while DevTools is attached, so the automated tests run on prefetched pages.

Measured (4× CPU, headless): 0 missed frames through card → cover, the slide, and Fyn → home.

## Page load

Apart from the homepage intro and the page transitions above, there's no load animation. Content must be visible without JS: animate from a state JS adds, never from a hidden initial CSS state. The intro's `data-intro="pending"` is set by JS, and the CSS failsafe still applies.
