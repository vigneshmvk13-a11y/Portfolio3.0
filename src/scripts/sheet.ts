/**
 * Mobile bottom sheet (design/layout-and-motion.md → Bottom sheet). Vignesh, 2026-10-22:
 * - It starts expanded (the first impression is who this is) and collapses as soon as the wheel
 *   moves (any input, either direction, any project) or the TOC is scrubbed. It does not reopen by
 *   itself.
 * - The user opens it: tap the surface or the handle, or drag it up. Drag it down or tap the
 *   handle to close it. The handle is a real button (aria-expanded), so dragging always has a
 *   single-tap and keyboard alternative (WCAG 2.5.7).
 * - One openness value (1 = open, 0 = collapsed) springs (`spring.sheet`) or follows the finger.
 *   Each frame it sets how far the surface, handle and intro have slid (--shift) and the intro's
 *   opacity and blur: fully visible when open, gone by halfway (`sheet.introGoneAt`), blurring as
 *   it fades, and back only past halfway when opening.
 * Desktop (the same element is the static left column) ignores all of this.
 */
import { animateValue, type AnimationPlaybackControlsWithThen as Controls } from 'motion';
import { duration, ease, sheet as look, spring } from '../lib/motion';
import { prefersReducedMotion } from '../lib/reduced-motion';
import type { WheelController, WheelDetail } from './wheel/controller';

const MOBILE = '(width < 75rem)';
/** Pointer travel before a press on the sheet counts as a drag. */
const DRAG_SLOP_PX = 6;
/** How far release speed carries the decision: projected = openness + velocity × this (seconds). */
const FLING_S = 0.15;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function bindSheet(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  const bg = sheet?.querySelector<HTMLElement>('[data-sheet-bg]');
  const grabber = sheet?.querySelector<HTMLButtonElement>('[data-sheet-grabber]');
  const intro = sheet?.querySelector<HTMLElement>('[data-sheet-intro]');
  const actions = sheet?.querySelector<HTMLElement>('[data-sheet-actions]');
  if (!sheet || !bg || !grabber || !intro || !actions) return;
  const bar = grabber.firstElementChild as HTMLElement | null;
  const mobile = window.matchMedia(MOBILE);

  let openness = 1;
  let animation: Controls | null = null;
  /** Distance the surface slides to collapse, px (measured). */
  let collapseShift = 0;
  /** How far the handle rises relative to the surface when collapsed (16px → 12px below the edge). */
  let handleLift = 0;

  const render = () => {
    const shift = (1 - openness) * collapseShift;
    sheet.style.setProperty('--shift', `${shift.toFixed(2)}px`);
    sheet.style.setProperty('--handle-lift', `${((1 - openness) * handleLift).toFixed(2)}px`);
    intro.style.transform = `translateY(${(shift * look.introFollow).toFixed(2)}px)`;
    const shown = clamp01((openness - look.introGoneAt) / (1 - look.introGoneAt));
    intro.style.opacity = String(shown);
    intro.style.filter = shown >= 1 ? '' : `blur(${((1 - shown) * look.introBlur).toFixed(2)}px)`;
  };

  /**
   * Collapsed (Figma 251:6688), the handle bar sits --sheet-handle-top-collapsed below the top border
   * and the buttons --sheet-handle-gap below the bar.
   */
  const measure = () => {
    const style = getComputedStyle(sheet);
    const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    handleLift = px('--sheet-handle-top') - px('--sheet-handle-top-collapsed');
    const barEnd = bar ? bar.offsetTop + bar.offsetHeight - handleLift : 0; // collapsed position
    collapseShift = Math.max(0, actions.offsetTop - barEnd - px('--sheet-handle-gap'));
    render();
  };

  const collapsed = () => sheet.hasAttribute('data-collapsed');

  /**
   * Settle open or collapsed. After a drag, a spring carries the release speed (openness per second);
   * otherwise (tap, handle, scroll) an even ease-in-out over duration.slow, so the intro's fade is slow.
   */
  const settle = (collapse: boolean, velocity?: number) => {
    sheet.toggleAttribute('data-collapsed', collapse);
    grabber.setAttribute('aria-expanded', String(!collapse));
    grabber.setAttribute('aria-label', collapse ? 'Show introduction' : 'Hide introduction');
    animation?.stop();
    animation = null;
    const target = collapse ? 0 : 1;
    if (prefersReducedMotion()) {
      openness = target;
      render();
      return;
    }
    const motion = velocity === undefined ? { duration: duration.slow * 1000, ease: ease.inOut } : { ...spring.sheet, velocity };
    animation = animateValue<number>({
      keyframes: [openness, target],
      ...motion,
      onUpdate: (value) => {
        openness = value;
        render();
      },
    });
  };

  // ---------- Scrolling collapses it ----------
  controller.stage.addEventListener('wheel:start', (event) => {
    const { via } = (event as CustomEvent<WheelDetail>).detail;
    if (via !== 'intro' && via !== 'init' && mobile.matches && !collapsed()) settle(true);
  });
  document.addEventListener('toc:hold', () => {
    if (mobile.matches && !collapsed()) settle(true);
  });

  // ---------- The user opens and closes it ----------
  let pointerId: number | null = null;
  let startY = 0;
  let startOpenness = 1;
  let dragging = false;
  let suppressClick = false;
  const samples: { t: number; y: number }[] = [];

  const press = (event: PointerEvent) => {
    if (!mobile.matches || pointerId !== null || event.button > 0) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    dragging = false;
    samples.length = 0;
    samples.push({ t: event.timeStamp, y: event.clientY });
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || collapseShift <= 0) return;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) < DRAG_SLOP_PX) return;
      dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      animation?.stop(); // grab it mid-motion
      animation = null;
      startOpenness = openness;
      startY = event.clientY;
    }
    samples.push({ t: event.timeStamp, y: event.clientY });
    if (samples.length > 6) samples.shift();
    openness = clamp01(startOpenness - (event.clientY - startY) / collapseShift);
    render();
  };

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) {
      // A tap on the surface opens it (the handle's own click toggles; buttons do their own thing).
      if (event.type === 'pointerup' && event.currentTarget === bg && collapsed()) settle(false);
      return;
    }
    dragging = false;
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last.t - s.t <= 100) ?? samples[0];
    const pxPerS = (last.y - first.y) / (Math.max(1, last.t - first.t) / 1000); // down positive
    const velocity = -pxPerS / collapseShift; // openness per second
    // Settle to the nearer state, counting where the release speed would carry it.
    settle(openness + velocity * FLING_S < 0.5, velocity);
  };

  for (const el of [bg, grabber]) {
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  grabber.addEventListener('click', () => {
    if (suppressClick) return; // the end of a drag, not a tap
    settle(!collapsed());
  });

  // Desktop: the same element is the static left column; clear the mobile-only frame styles.
  const syncBreakpoint = () => {
    if (mobile.matches) return measure();
    animation?.stop();
    sheet.style.removeProperty('--shift');
    sheet.style.removeProperty('--handle-lift');
    intro.style.opacity = '';
    intro.style.filter = '';
    intro.style.transform = '';
  };
  mobile.addEventListener('change', syncBreakpoint);
  new ResizeObserver(() => mobile.matches && measure()).observe(sheet);
  syncBreakpoint();
}
