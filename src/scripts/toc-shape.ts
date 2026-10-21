/**
 * Geometry of the mobile TOC morph (no DOM): Figma component 2, collapsed 233:4609 (27×80 tab with
 * five ticks) and expanded 233:4714 (193×223 panel with 36px rows, 2px apart, inset 8px).
 * The outline is one path at every progress p (0 = tab, 1 = panel): concave "ears" meet the screen
 * edge top and bottom right, a rounded body extends left. At rest the paths match Figma's own.
 */

/** Figma's tab outline (233:4609), smooth corners. Drawn exactly at p = 0. */
export const TAB_PATH =
  'M13.5 8C20.9553 8 27 4.41821 27 0V8V72V80C27 75.5818 20.9553 72 13.5 72C8.3574 72 5.7861 72 3.88718 70.8618C2.75874 70.1855 1.81453 69.2413 1.13817 68.1128C0 66.2139 0 63.6426 0 58.5V21.5C0 16.3574 0 13.7861 1.13817 11.8872C1.81453 10.7587 2.75874 9.81453 3.88718 9.13817C5.7861 8 8.3574 8 13.5 8Z';

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

/** Outline at progress p for a panel `panelW` wide (it widens to fit the longest label). */
export function shapeAt(p: number, panelW: number): Frame {
  if (p <= 0) return { w: TAB.w, h: TAB.h, path: TAB_PATH };
  const w = lerp(TAB.w, panelW, p);
  const h = lerp(TAB.h, PANEL.h, p);
  const ew = lerp(TAB.earW, PANEL.earW, p);
  const eh = lerp(TAB.earH, PANEL.earH, p);
  const r = lerp(TAB.radius, PANEL.radius, p);
  const c = (n: number) => n.toFixed(2);
  const path = [
    `M${c(w)} ${c(eh)}V0`,
    `C${c(w)} ${c(K * eh)} ${c(w - ew * (1 - K))} ${c(eh)} ${c(w - ew)} ${c(eh)}`,
    `H${c(r)}`,
    `C${c(r * (1 - K))} ${c(eh)} 0 ${c(eh + r * (1 - K))} 0 ${c(eh + r)}`,
    `V${c(h - eh - r)}`,
    `C0 ${c(h - eh - r * (1 - K))} ${c(r * (1 - K))} ${c(h - eh)} ${c(r)} ${c(h - eh)}`,
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
