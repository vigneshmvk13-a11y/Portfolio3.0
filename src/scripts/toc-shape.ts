/**
 * Geometry of the mobile TOC morph (no DOM): Figma component 2, collapsed 233:4609 (27×80 tab with
 * five ticks) and expanded 233:4714 (193×223 panel with 36px rows, 2px apart, inset 8px).
 * The outline is one path at every progress p (0 = tab, 1 = panel): concave "ears" meet the screen
 * edge top and bottom right, a rounded body extends left. At rest the paths match Figma's own.
 *
 * Corners: the tab's are Figma's smoothed ("squircle") corners, the panel's are circular. Both are
 * written as the same three cubics, so the corner blends from one to the other with p. A path that
 * switched corner shapes at rest made the corners jump at the end of a collapse.
 */

/** Figma's tab corner (233:4609), as three cubics from (1, 0) to (0, 1), in units of the radius. */
const SMOOTH_CORNER: readonly [number, number][] = [
  [1, 0],
  [0.619067, 0], [0.4286, 0], [0.287939, 0.084309],
  [0.204351, 0.13441], [0.13441, 0.204351], [0.084309, 0.287939],
  [0, 0.4286], [0, 0.619067], [0, 1],
];
/** A circular quarter as three 30° cubics, in the same layout (the panel's corner, 233:4714). */
const ROUND_CORNER: readonly [number, number][] = [
  [1, 0],
  [0.824468, 0], [0.652024, 0.046199], [0.5, 0.133975],
  [0.347976, 0.221751], [0.221751, 0.347976], [0.133975, 0.5],
  [0.046199, 0.652024], [0, 0.824468], [0, 1],
];

export const TAB = { w: 27, h: 80, earW: 13.5, earH: 8, radius: 13.5, tick: { inset: 4, w: 19, h: 4, rx: 2, pitch: 10 } };
export const PANEL = { minW: 193, h: 223, earW: 8.5, earH: 8.5, radius: 16, row: { inset: 8, h: 36, rx: 8, pitch: 38 } };

/** Circle-arc control-point factor for cubic Béziers. */
const K = 0.5523;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Frame {
  w: number;
  h: number;
  path: string;
}

/**
 * Outline at progress p for a panel `panelW` wide (it widens to fit the longest label). The spring may
 * undershoot below 0 on close; the outline holds at the tab then (no flicker).
 */
export function shapeAt(p: number, panelW: number): Frame {
  const t = Math.max(0, p);
  const w = lerp(TAB.w, panelW, t);
  const h = lerp(TAB.h, PANEL.h, t);
  const ew = lerp(TAB.earW, PANEL.earW, t);
  const eh = lerp(TAB.earH, PANEL.earH, t);
  const r = lerp(TAB.radius, PANEL.radius, t);
  const blend = Math.min(1, t);
  const corner = SMOOTH_CORNER.map(([x, y], i) => [lerp(x, ROUND_CORNER[i][0], blend), lerp(y, ROUND_CORNER[i][1], blend)]);
  const c = (n: number) => n.toFixed(2);
  const pt = ([x, y]: number[], flip: boolean) => `${c(x * r)} ${c(flip ? h - eh - y * r : eh + y * r)}`;
  // Top-left runs (r, eh) → (0, eh + r); bottom-left mirrors it, run backwards, (0, h − eh − r) → (r, h − eh).
  const topLeft = [1, 4, 7].map((i) => `C${pt(corner[i], false)} ${pt(corner[i + 1], false)} ${pt(corner[i + 2], false)}`);
  const bottomLeft = [8, 5, 2].map((i) => `C${pt(corner[i], true)} ${pt(corner[i - 1], true)} ${pt(corner[i - 2], true)}`);
  const path = [
    `M${c(w)} ${c(eh)}V0`,
    `C${c(w)} ${c(K * eh)} ${c(w - ew * (1 - K))} ${c(eh)} ${c(w - ew)} ${c(eh)}`,
    `H${c(r)}`,
    ...topLeft,
    `V${c(h - eh - r)}`,
    ...bottomLeft,
    `H${c(w - ew)}`,
    `C${c(w - ew * (1 - K))} ${c(h - eh)} ${c(w)} ${c(h - eh * K)} ${c(w)} ${c(h)}`,
    `V${c(h - eh)}V${c(eh)}Z`,
  ].join('');
  return { w, h, path };
}

export interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

/**
 * Tick i (p = 0) growing into row i (p = 1). `index` may be fractional (the highlight sliding
 * between rows). Coordinates are inside a frame `frameW` × `frameH`.
 */
export function barAt(index: number, count: number, p: number, panelW: number, frameW: number, frameH: number): Bar {
  const offset = index - (count - 1) / 2;
  const inset = lerp(TAB.tick.inset, PANEL.row.inset, p);
  const w = lerp(TAB.tick.w, panelW - 2 * PANEL.row.inset, p);
  const h = lerp(TAB.tick.h, PANEL.row.h, p);
  const cy = frameH / 2 + offset * lerp(TAB.tick.pitch, PANEL.row.pitch, p);
  return { x: frameW - inset - w, y: cy - h / 2, w, h, rx: lerp(TAB.tick.rx, PANEL.row.rx, p) };
}

/** Row under a finger `dy` px from the panel's vertical centre (open state), clamped to the list. */
export function rowAt(dy: number, count: number): number {
  const index = Math.round(dy / PANEL.row.pitch + (count - 1) / 2);
  return Math.min(count - 1, Math.max(0, index));
}
