# Layout and motion

Written mobile-first, matching how the CSS is authored. All durations, easings, springs and wheel geometry are tokens (`tokens.md → Motion`, `→ Wheel`). In JS, use `src/lib/motion.ts`.

## Mobile home (base, designed at 393×852; check 360 and 412 too)

- `bg-surface-page` (gray/50, as on desktop). One viewport-height composition (`h-dvh`). The document doesn't scroll; vertical swipes step the project wheel.
- Wheel stage: full width. The card is **always full width**, as in Figma: viewport − 2 × `gutter-mobile`, height from `aspect-card` (553:400).
- Its centre (`--wheel-centre-y`, global.css) is Figma's placement, `pt-10 + (spread + reach) × h + gap`: the top neighbour's far edge at 40px and the card at y = 227, at 393×852.
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

1. **Start:** only the wheel: the first project's card in front (server-rendered, the LCP element, never hidden or delayed) and its tilted neighbours. The left column / bottom sheet, the TOC (side list and mobile handle) and the footer are hidden.
2. **Slot-machine spin** (0–1.2s): one full revolution (`position += N`), so every project flips past once. Fast spin, hard deceleration, runs 0.12 of a card past project 1, then settles back like a reel clunking into place.
3. **Reveal** (from the landing, ~0.66s): hero text, TOC and footer fade in, staggered 80ms in DOM order. Desktop columns rise 12px. The mobile bottom sheet slides up from the bottom edge and the TOC handle slides in from the right edge.

The earlier proposal's "grow out" phase (gooey cards emerging from the first one) is **dropped**. The brief starts from the whole wheel, and the goo technique would have needed a lab and a filter layer the 3D cards can't carry.

**Mechanics:**
- An inline `<head>` script in `index.astro` (before first paint) decides whether the intro runs: no `sessionStorage` flag (`intro-seen`, set at that moment), no reduced-motion preference, no deep link (`/#slug`, `/?about`). If so, it sets `html[data-intro="pending"]`, and CSS hides every `[data-intro-reveal]` element (`opacity: 0; visibility: hidden`, so it's also unfocusable and unclickable).
- A pure-CSS failsafe reveals everything after `--intro-failsafe` (3s), so a failed script can never leave the page without its chrome.
- The intro module is **lazy-loaded** (0.7 kB gzipped) only when it will run. The spin uses the wheel controller's `animatePosition` (keyframes through Motion's `animateValue`); the reveal uses the native Web Animations API, so it adds no library code.
- **Prep before the first moving frame** (60fps): decode every card cover (`img.decode()`, capped at `intro.decodeWait`), make hidden cards visible at opacity 0 so their layers are built and painted (`WheelRenderer.prewarm`), wait two frames, then spin. Without it, a cold browser at 4× CPU throttle dropped the spin's first frame (33–61ms); with it, 0 missed frames in 8/8 cold starts.
- Wheel input is disabled while it runs. Any wheel, keydown, pointerdown or touchstart (capture phase) skips straight to the final state, and the same input is then handled normally (a scroll moves the wheel, ↓ steps).
- The landing isn't announced in the live region and doesn't set a hash.
- Reduced motion: no intro; the resting state renders directly. Repeat visits in the session also go straight to rest. `scripts/screenshot.mjs` skips it unless `INTRO=1`; `test-wheel.mjs` skips it except in the intro tests.

## About drawer

- Open: panel from `translateX(-24px)` (desktop) or `translateY(24px)` (mobile/tablet), opacity 0 → rest over `--duration-slow`, `--ease-in-out`, via CSS `@starting-style` (no JS animation). Mobile scrim fades in over `--duration-base`; desktop has no scrim (Figma `234:4968`).
- Close: reverse over `--duration-base`. Esc, outside click (`closedby="any"` plus a JS fallback) and the close button all close it; focus returns to the trigger.
- Background is inert (`<dialog>.showModal()`); the wheel controller disables input while it's open (`drawer:open` / `drawer:close`).
- Mobile compact header (`234:34225`): once the banner block scrolls out of the drawer, an 84px sticky bar (banner strip, 52px avatar left, close right) fades in. It's a **state switch**, not scroll-linked, so reduced motion only loses the fade. The earlier scroll-linked shrink (200 → 64) is dropped: it's more motion for the same information.
- Deep link: `/?about` opens it on load (no entrance animation).

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

**Handle** (Figma 251:6710). A 40×6 `line-strong` (gray/300) bar, 16px below the top border when open and 12px when collapsed. It moves between the two as the sheet slides.
- It's a real `<button>` (`aria-expanded`, "Show / Hide introduction", `aria-controls` the intro). Its 96px-wide hit area reaches 12px above the edge.
- That gives dragging a single-tap and keyboard alternative (WCAG 2.5.7).

**Compact on short screens.** All spacing scales with viewport height (`tokens.md → Mobile sheet spacing`), so the sheet stays near Figma's 35% share:
- 852px tall: 287px, exactly Figma (246:2305).
- 783px (Nothing Phone 1 Chrome): ~273px. The handle, the 50×50 buttons and the tag sizes stay Figma's at every height.
- 660px (iPhone Safari): ~247px (37%). The card above shows 117px instead of 65.

**Collapsed** (Figma 251:6688): the buttons sit `--sheet-handle-gap` (32px) below the handle bar, at every screen height: 133px tall at 852.

**Motion** (Vignesh, 2026-10-22: "blur and fade out slowly … gone by halfway"):
- One openness value (1 open, 0 collapsed) drives every frame (`src/scripts/sheet.ts`). Taps, the handle and scroll animate it with an even ease-in-out over `duration.slow` (0.5s). A drag follows the finger and, on release, a spring (`spring.sheet`) carries the release speed.
- The surface (`[data-sheet-bg]`) and the handle slide by `--shift`. The buttons never move.
- The **intro blurs and fades with the sheet's position**. It's fully visible when open and gone by halfway (`sheet.introGoneAt`), blurring up to 10px as it fades. When opening it comes back only past halfway, sharpening as it arrives.
- The intro slides at half the sheet's speed (`sheet.introFollow`), so it sinks into the sheet. It's gone before the surface's top edge or the buttons could reach it, so it needs no clip.
- The earlier `clip-path` mask could fall a frame behind the surface on iOS (part of the name showing above the edge), so it was dropped.
- Transforms, opacity and a small blur only. Measured at 60fps at 4× CPU. Only the surface, handle and buttons take pointer input, so taps above the collapsed surface reach the wheel.

**Reduced motion:** collapsing and expanding are instant, with no blur in between. A drag still follows the finger (direct manipulation), with the fade.

History: it used to follow direction (2026-10-20), then re-expand 0.25s after every settle (2026-10-21). That re-expansion covered the next card exactly when the user paused to look, so it was dropped.

## Page load

Apart from the homepage intro above, there's no load animation. Content must be visible without JS: animate from a state JS adds, never from a hidden initial CSS state. The intro's `data-intro="pending"` is set by JS, and the CSS failsafe still applies.
