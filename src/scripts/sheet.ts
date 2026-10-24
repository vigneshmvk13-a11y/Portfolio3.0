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
 * - About (Vignesh, 2026-10-24): the same sheet grows into the About sheet. A second value, `about`
 *   (0 = footer, 1 = About), lifts the surface to --about-top, blurs the intro and buttons out by
 *   halfway (`sheet.aboutSwap`) and fades a scrim in behind. drawer.ts drives it through
 *   getSheetSurface() and draws About's content over the surface.
 * - A sideways swipe on the sheet turns the wheel (Vignesh, 2026-10-24: the thumb rests on the sheet, not on
 *   the wheel above it). Left = next project. Vertical drags stay the sheet's own.
 * Desktop (the same element is the static left column) ignores all of this.
 */
import { animateValue, type AnimationPlaybackControlsWithThen as Controls } from 'motion';
import { sheet as look } from '../lib/motion';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { clamp01, DragSamples, DRAG_SLOP_PX, FLING_S, settleMotion } from './drag';
import { MOMENTUM_S } from './wheel/input';
import type { WheelController, WheelDetail } from './wheel/controller';

const MOBILE = '(width < 75rem)';

/** What drawer.ts needs to grow About out of the sheet. */
export interface SheetSurface {
  /** px from where the surface's top edge rests now up to --about-top. */
  travel(): number;
  /** 0 = the footer, 1 = grown into About. */
  setAbout(progress: number): void;
  /** Collapse it, as a scroll would (first-run.ts). False if it was already collapsed. */
  collapse(): boolean;
}

let surface: SheetSurface | null = null;

/** The bound sheet, or null before bindSheet() (or on pages without one). */
export const getSheetSurface = (): SheetSurface | null => surface;

const blur = (amount: number) => (amount <= 0 ? '' : `blur(${(amount * look.introBlur).toFixed(2)}px)`);

export function bindSheet(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  const bg = sheet?.querySelector<HTMLElement>('[data-sheet-bg]');
  const grabber = sheet?.querySelector<HTMLButtonElement>('[data-sheet-grabber]');
  const intro = sheet?.querySelector<HTMLElement>('[data-sheet-intro]');
  const actions = sheet?.querySelector<HTMLElement>('[data-sheet-actions]');
  const scrim = sheet?.querySelector<HTMLElement>('[data-sheet-scrim]');
  if (!sheet || !bg || !grabber || !intro || !actions || !scrim) return;
  const bar = grabber.firstElementChild as HTMLElement | null;
  const mobile = window.matchMedia(MOBILE);

  let openness = 1;
  let about = 0;
  let animation: Controls | null = null;
  /** Distance the surface slides to collapse, px (measured). */
  let collapseShift = 0;
  /** How far the handle rises relative to the surface when collapsed (16px → 12px below the edge). */
  let handleLift = 0;
  /** The sheet's top edge in the viewport before any slide, and --about-top, px (measured). */
  let restTop = 0;
  let aboutTop = 0;

  const render = () => {
    const shift = (1 - openness) * collapseShift;
    const lift = about * Math.max(0, restTop + shift - aboutTop);
    sheet.style.setProperty('--shift', `${(shift - lift).toFixed(2)}px`);
    sheet.style.setProperty('--handle-lift', `${((1 - openness) * handleLift).toFixed(2)}px`);
    // Growing into About, the intro and buttons blur out by halfway, rising at the intro's usual fraction.
    const footer = clamp01(1 - about / look.aboutSwap);
    const shown = clamp01((openness - look.introGoneAt) / (1 - look.introGoneAt)) * footer;
    intro.style.transform = `translateY(${((shift - lift) * look.introFollow).toFixed(2)}px)`;
    intro.style.opacity = String(shown);
    intro.style.filter = blur(1 - shown);
    sheet.toggleAttribute('data-about', about > 0);
    actions.style.transform = about > 0 ? `translateY(${(-lift * look.introFollow).toFixed(2)}px)` : '';
    actions.style.opacity = about > 0 ? String(footer) : '';
    actions.style.filter = blur(1 - footer);
    scrim.style.opacity = about > 0 ? String(about) : '';
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
    restTop = sheet.getBoundingClientRect().top;
    aboutTop = px('--about-top');
    render();
  };

  const collapsed = () => sheet.hasAttribute('data-collapsed');

  /** Settle open or collapsed: a spring carrying the release speed after a drag, else duration.slow. */
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
    animation = animateValue<number>({
      keyframes: [openness, target],
      ...settleMotion(openness, target, velocity),
      onUpdate: (value) => {
        openness = clamp01(value); // a fast flick can carry a stiff spring past the end
        render();
      },
    });
  };

  // ---------- Scrolling collapses it ----------
  controller.stage.addEventListener('wheel:start', (event) => {
    const { via } = (event as CustomEvent<WheelDetail>).detail;
    if (via !== 'intro' && via !== 'init' && via !== 'hint' && mobile.matches && !collapsed()) settle(true);
  });
  document.addEventListener('toc:hold', () => {
    if (mobile.matches && !collapsed()) settle(true);
  });

  // ---------- The user opens and closes it ----------
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startOpenness = 1;
  let dragging = false;
  /** This drag is sideways: it turns the wheel instead of moving the sheet. */
  let turning = false;
  let startPosition = 0;
  const xs: { t: number; x: number }[] = [];
  let suppressClick = false;
  const samples = new DragSamples();

  const press = (event: PointerEvent) => {
    if (!mobile.matches || pointerId !== null || event.button > 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    turning = false;
    samples.reset(event);
    xs.length = 0;
    xs.push({ t: event.timeStamp, x: event.clientX });
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || collapseShift <= 0) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
      dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      turning = Math.abs(dx) > Math.abs(dy) && controller.enabled;
      if (turning) {
        startPosition = controller.position;
        startX = event.clientX;
      }
      animation?.stop(); // grab it mid-motion
      animation = null;
      startOpenness = openness;
      startY = event.clientY;
    }
    if (turning) {
      xs.push({ t: event.timeStamp, x: event.clientX });
      if (xs.length > 6) xs.shift();
      controller.setPosition(startPosition - (event.clientX - startX) / controller.stepPx, 'drag');
      return;
    }
    samples.add(event);
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
    if (turning) {
      turning = false;
      // As a drag on the wheel itself (wheel/input.ts): carry the release speed, land on a card.
      const last = xs[xs.length - 1];
      const first = xs.find((s) => last.t - s.t <= 100) ?? xs[0];
      const speed = -((last.x - first.x) / (Math.max(1, last.t - first.t) / 1000)) / controller.stepPx;
      const reduced = prefersReducedMotion();
      const projected = controller.position + (reduced ? 0 : speed * MOMENTUM_S);
      controller.springTo(Math.round(projected), 'drag', reduced ? 0 : speed);
      return;
    }
    const velocity = -samples.velocity() / collapseShift; // openness per second
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
    sheet.removeAttribute('data-about');
    for (const el of [intro, actions]) {
      el.style.opacity = '';
      el.style.filter = '';
      el.style.transform = '';
    }
    scrim.style.opacity = '';
  };
  // A phone held sideways: start collapsed so the wheel has the screen (global.css, landscape block).
  if (mobile.matches && window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches) {
    openness = 0;
    sheet.toggleAttribute('data-collapsed', true);
    grabber.setAttribute('aria-expanded', 'false');
    grabber.setAttribute('aria-label', 'Show introduction');
  }
  mobile.addEventListener('change', syncBreakpoint);
  new ResizeObserver(() => mobile.matches && measure()).observe(sheet);
  // The sheet's top moves with the viewport height (browser bars) without the sheet resizing.
  window.addEventListener('resize', () => mobile.matches && measure());
  syncBreakpoint();

  surface = {
    travel: () => {
      measure();
      return Math.max(0, restTop + (1 - openness) * collapseShift - aboutTop);
    },
    setAbout: (progress) => {
      about = clamp01(progress);
      if (mobile.matches) render();
    },
    collapse: () => {
      if (!mobile.matches || collapsed()) return false;
      settle(true);
      return true;
    },
  };
}
