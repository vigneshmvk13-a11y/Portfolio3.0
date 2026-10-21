/**
 * Motion tokens for JS. Mirrors design/tokens.md → Motion / Springs / Intro / Wheel
 * and the CSS custom properties in src/styles/global.css. Keep all three in sync.
 * Motion takes seconds and arrays; CSS takes ms and cubic-bezier().
 */

export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.5,
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Motion springs in `visualDuration` (s) + `bounce` form. */
export const spring = {
  wheel: { type: 'spring', visualDuration: 0.4, bounce: 0.12 },
} as const;

/**
 * Intro choreography (design/layout-and-motion.md → Intro choreography), seconds.
 * Slot-machine spin: whole turns, a small overshoot past the first card, settle back; then reveal.
 */
export const intro = {
  /** Ceiling for the whole sequence. */
  total: 2.0,
  /** Longest wait for card covers to decode before spinning, so none paints for the first time mid-spin. */
  decodeWait: 0.3,
  /** Full revolutions; whole numbers, so it lands back on the first project. */
  spinTurns: 1,
  spinDuration: 1.2,
  /** Fast spin decelerating hard into the landing. */
  spinEase: [0.3, 0.1, 0.15, 1],
  /** Positions past the landing card before settling back (the reel's "clunk"). */
  spinOvershoot: 0.12,
  /** Fraction of the spin spent reaching the overshoot. */
  spinOvershootAt: 0.82,
  /** Hero text, TOC and footer appear after the landing. */
  revealDuration: 0.5,
  revealStagger: 0.08,
  /** px the desktop columns rise while fading in. */
  revealRise: 12,
  failsafe: 3,
} as const;

/**
 * Project wheel geometry, unitless (multiplied by the measured card height at runtime).
 * Derivation: design/layout-and-motion.md → Project wheel → Geometry.
 */
export const wheel = {
  /** Degrees between neighbouring cards. */
  step: 38.1,
  /** Ring radius R, × card height. */
  depth: 2.09,
  /** Per-card perspective P, × card height. */
  perspective: 2.1,
  /** Y(±1) = spread × h + gap. */
  spread: 0.8695,
  /** Far edge of a ±1 neighbour beyond its centre, × card height (mobile stage offset). */
  reach: 0.289,
  /** Opacity at ±1 step; reaches 0 at ±1.5. */
  fade: 0.2,
  /** Wheel deltaY (px) a gesture must travel to commit to the next card. */
  stepThreshold: 80,
  /** Seconds of wheel silence that end a gesture (snap; under reduced motion, unlock). */
  inputQuiet: 0.15,
  /** Time constant (s) of the wheel chasing scroll input; smooths mouse-wheel notches. */
  follow: 0.07,
  /** Reduced motion: one short ease-out turn per step (s); no overshoot, momentum or scroll-linking. */
  reducedTurn: 0.2,
} as const;

/**
 * Adaptive quality (design/rules.md → Performance). While the wheel moves, frame intervals are
 * sampled; if too many are slow, the page switches to html[data-quality="lite"].
 */
export const quality = {
  /** Motion frames to sample before deciding. */
  sampleFrames: 40,
  /** A frame slower than this (ms) counts as slow (below ~50fps). */
  slowFrameMs: 20,
  /** Share of slow frames that switches to lite. */
  slowShare: 0.2,
  /** Intro playback rate in lite mode. */
  introSpeed: 2,
} as const;
