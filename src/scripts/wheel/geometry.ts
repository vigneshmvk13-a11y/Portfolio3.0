/**
 * Pure wheel geometry (no DOM). Mirrors the CSS in ProjectWheel.astro; derivation in
 * design/layout-and-motion.md → Project wheel → Geometry.
 */
import { wheel } from '../../lib/motion';

export interface Metrics {
  /** Card height in px (the unit everything scales with). */
  h: number;
  /** Gap between the active card and a neighbour, px (--wheel-gap). */
  gap: number;
}

export interface CardPose {
  transform: string;
  opacity: number;
  zIndex: number;
  visible: boolean;
}

const RAD = Math.PI / 180;

/** Signed ring distance of card `index` from `position`, wrapped into [-n/2, n/2). */
export function ringOffset(index: number, position: number, n: number): number {
  const raw = (((index - position) % n) + n) % n;
  return raw >= n / 2 ? raw - n : raw;
}

/** Index of the card nearest the front for a (possibly unbounded) position. */
export function activeIndex(position: number, n: number): number {
  return ((Math.round(position) % n) + n) % n;
}

/** Shortest signed number of steps from `from` to `to` around a ring of n. */
export function shortestDelta(from: number, to: number, n: number): number {
  const delta = (((to - from) % n) + n) % n;
  return delta > n / 2 ? delta - n : delta;
}

/** Pixels the finger travels for one step: the distance between neighbouring card centres. */
export function stepDistance({ h, gap }: Metrics): number {
  return wheel.spread * h + gap;
}

/** Opacity by ring distance: 1 at the front, `fade` at ±1, 0 from ±1.5. */
export function opacityAt(d: number): number {
  const a = Math.abs(d);
  if (a <= 1) return 1 - (1 - wheel.fade) * a;
  if (a < 1.5) return wheel.fade * ((1.5 - a) / 0.5);
  return 0;
}

export function poseAt(d: number, { h, gap }: Metrics): CardPose {
  const step = wheel.step * RAD;
  const angle = d * step;
  const y = (Math.sin(angle) / Math.sin(step)) * (wheel.spread * h + gap);
  const z = wheel.depth * h * (Math.cos(angle) - 1);
  const perspective = wheel.perspective * h;
  const opacity = opacityAt(d);
  return {
    transform: `translateY(${y.toFixed(2)}px) perspective(${perspective.toFixed(1)}px) translateZ(${z.toFixed(2)}px) rotateX(${(-d * wheel.step).toFixed(3)}deg)`,
    opacity,
    zIndex: 10 - Math.round(Math.abs(d) * 2),
    visible: opacity > 0,
  };
}
