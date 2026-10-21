/**
 * Mobile bottom sheet (design/layout-and-motion.md → Bottom sheet). Vignesh, 2026-10-22:
 * - It starts expanded (the first impression is who this is) and collapses as soon as the wheel
 *   moves (any input, either direction, any project) or the TOC is scrubbed. It does not reopen by
 *   itself.
 * - The user opens it: tap the surface or the handle, or drag it up. Drag it down or tap the
 *   handle to close it. The handle is a real button (aria-expanded), so dragging always has a
 *   single-tap and keyboard alternative (WCAG 2.5.7).
 * - A drag follows the finger (compositor-only: the surface translates, the intro is masked by its
 *   top edge) and settles open or closed by position and release speed.
 * Desktop (the same element is the static left column) ignores all of this.
 */
import type { WheelController, WheelDetail } from './wheel/controller';

const MOBILE = '(width < 75rem)';
/** Pointer travel before a press on the sheet counts as a drag. */
const DRAG_SLOP_PX = 6;
/** How far release speed carries the decision: projected = shift + velocity × this (seconds). */
const FLING_S = 0.15;

export function bindSheet(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  const bg = sheet?.querySelector<HTMLElement>('[data-sheet-bg]');
  const grabber = sheet?.querySelector<HTMLButtonElement>('[data-sheet-grabber]');
  const actions = sheet?.querySelector<HTMLElement>('[data-sheet-actions]');
  if (!sheet || !bg || !grabber || !actions) return;
  const mobile = window.matchMedia(MOBILE);

  /**
   * Distance the surface slides to collapse. The buttons end up border + --sheet-pb below its top edge
   * (Figma 246:2333: 32px, as at the bottom), but never closer to the handle bar than the bar is to
   * the edge, so on compact screens (pb 20px) the bar still has room.
   */
  const bar = grabber.firstElementChild as HTMLElement | null;
  let collapseShift = 0;
  const measure = () => {
    const pb = parseFloat(getComputedStyle(sheet).getPropertyValue('--sheet-pb')) || 0;
    const barEnd = bar ? bar.offsetTop + bar.offsetHeight : 0;
    const top = Math.max(pb, barEnd * 2);
    collapseShift = Math.max(0, actions.offsetTop - top - bg.clientTop);
    sheet.style.setProperty('--sheet-collapse', `${collapseShift}px`);
  };

  const collapsed = () => sheet.hasAttribute('data-collapsed');
  const setCollapsed = (next: boolean) => {
    sheet.toggleAttribute('data-collapsed', next);
    grabber.setAttribute('aria-expanded', String(!next));
    grabber.setAttribute('aria-label', next ? 'Show introduction' : 'Hide introduction');
  };

  // ---------- Scrolling collapses it ----------
  controller.stage.addEventListener('wheel:start', (event) => {
    const { via } = (event as CustomEvent<WheelDetail>).detail;
    if (via !== 'intro' && via !== 'init' && mobile.matches) setCollapsed(true);
  });
  document.addEventListener('toc:hold', () => {
    if (mobile.matches) setCollapsed(true);
  });

  // ---------- The user opens and closes it ----------
  let pointerId: number | null = null;
  let startY = 0;
  let startShift = 0;
  let dragging = false;
  let suppressClick = false;
  const samples: { t: number; y: number }[] = [];

  const press = (event: PointerEvent) => {
    if (!mobile.matches || pointerId !== null || event.button > 0) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    startShift = collapsed() ? collapseShift : 0;
    dragging = false;
    samples.length = 0;
    samples.push({ t: event.timeStamp, y: event.clientY });
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) < DRAG_SLOP_PX) return;
      dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      sheet.setAttribute('data-dragging', '');
    }
    samples.push({ t: event.timeStamp, y: event.clientY });
    if (samples.length > 6) samples.shift();
    const shift = Math.min(collapseShift, Math.max(0, startShift + dy));
    sheet.style.setProperty('--shift', `${shift}px`);
  };

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) {
      // A tap on the surface opens it (the handle's own click toggles; buttons do their own thing).
      if (event.type === 'pointerup' && event.currentTarget === bg && collapsed()) setCollapsed(false);
      return;
    }
    dragging = false;
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last.t - s.t <= 100) ?? samples[0];
    const velocity = (last.y - first.y) / (Math.max(1, last.t - first.t) / 1000); // px/s, down positive
    const shift = Math.min(collapseShift, Math.max(0, startShift + (last.y - startY)));
    // Settle to the nearer state, counting where the release speed would carry it.
    setCollapsed(shift + velocity * FLING_S > collapseShift / 2);
    sheet.removeAttribute('data-dragging');
    sheet.style.removeProperty('--shift'); // the transition runs from the dragged position
  };

  for (const el of [bg, grabber]) {
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  grabber.addEventListener('click', () => {
    if (suppressClick) return; // the end of a drag, not a tap
    setCollapsed(!collapsed());
  });

  new ResizeObserver(measure).observe(sheet);
  measure();
}
