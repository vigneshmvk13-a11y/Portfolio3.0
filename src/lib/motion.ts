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
  wheel: { type: 'spring', visualDuration: 0.5, bounce: 0.12 },
  emerge: { type: 'spring', visualDuration: 0.6, bounce: 0.35 },
  squash: { type: 'spring', visualDuration: 0.35, bounce: 0.5 },
  spinLand: { type: 'spring', visualDuration: 0.4, bounce: 0.25 },
} as const;

/** Intro choreography timeline, in seconds from start. */
export const intro = {
  total: 2.0,
  emerge: [0, 0.7],
  emergeStagger: 0.06,
  spin: [0.7, 1.6],
  spinEase: [0.12, 0.8, 0.2, 1],
  settle: [1.5, 1.9],
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
  /** Opacity at ±1 step; reaches 0 at ±1.5. */
  fade: 0.2,
  /** Accumulated wheel deltaY (px) per step. */
  stepThreshold: 80,
  /** Seconds of wheel silence before input unlocks after a step. */
  inputQuiet: 0.15,
} as const;
