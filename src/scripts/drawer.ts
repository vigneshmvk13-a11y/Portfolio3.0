/**
 * About behaviour. design/layout-and-motion.md → About.
 * The <dialog> does the heavy lifting (inert background, Esc, focus return); this adds open/close
 * wiring, light dismiss where `closedby` isn't supported, the /?about deep link, and `drawer:open` /
 * `drawer:close` events for the wheel.
 *
 * Desktop: CSS slides the drawer in and out (AboutDrawer.astro).
 * Mobile and tablet (Vignesh, 2026-10-24): the bottom sheet grows into About, as one surface. One value,
 * `progress` (0 = the footer, 1 = About), drives it: sheet.ts lifts the sheet's surface to --about-top
 * and blurs the footer's content out by halfway; here the dialog (no surface of its own) rides with that
 * edge and About's content blurs in only past halfway. Closing plays it back. The close button, Esc, a tap
 * above the sheet, a tap on the handle, and dragging the handle down or the content down from the top
 * (a flick, or a slow drag let go in the screen's lower third) all close it.
 */
import { animateValue, type AnimationPlaybackControlsWithThen as Controls } from 'motion';
import { sheet as look } from '../lib/motion';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { clamp01, DragSamples, DRAG_SLOP_PX, settleMotion } from './drag';
import { getSheetSurface } from './sheet';
import { bindScrollbar } from './scrollbar';

const MOBILE = '(width < 75rem)';

let initialised = false;

export function initAboutDrawer(): void {
  if (initialised) return;
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-about]');
  const scroller = dialog?.querySelector<HTMLElement>('[data-about-scroll]');
  const grabber = dialog?.querySelector<HTMLButtonElement>('[data-about-grabber]');
  const light = dialog?.querySelector<HTMLElement>('[data-about-grabber-light]');
  const banner = dialog?.querySelector<HTMLElement>('[data-about-banner]');
  const scrollbar = dialog?.querySelector<HTMLElement>('[data-about-scrollbar]');
  if (!dialog || !scroller || !grabber || !light || !banner || !scrollbar) return;
  initialised = true;
  const mobile = window.matchMedia(MOBILE);
  bindScrollbar(scroller, scrollbar);

  // ---------- Mobile: the sheet grows into About ----------
  let progress = 0;
  /** px the surface rises, from where the footer's top edge rested to --about-top. */
  let travel = 0;
  let animation: Controls | null = null;

  const render = () => {
    getSheetSurface()?.setAbout(progress);
    const settled = progress >= 1;
    dialog.style.transform = settled ? '' : `translateY(${((1 - progress) * travel).toFixed(2)}px)`;
    const shown = clamp01((progress - look.aboutSwap) / (1 - look.aboutSwap));
    scroller.style.opacity = settled ? '' : String(shown);
    scroller.style.filter = shown >= 1 ? '' : `blur(${((1 - shown) * look.introBlur).toFixed(2)}px)`;
    // The handle turns light as the banner arrives under it.
    light.style.opacity = settled ? '' : String(shown);
    if (settled) scrollbar.style.removeProperty('--about-in');
    else scrollbar.style.setProperty('--about-in', String(shown));
  };

  const clearFrame = () => {
    dialog.style.transform = '';
    scroller.style.opacity = '';
    scroller.style.filter = '';
    scroller.style.willChange = '';
    light.style.opacity = '';
    scrollbar.style.removeProperty('--about-in');
  };

  /** Settle at About (1) or back at the footer (0, then the dialog closes). */
  const settle = (target: 0 | 1, velocity?: number) => {
    animation?.stop();
    animation = null;
    const done = () => {
      animation = null;
      scroller.style.willChange = '';
      if (target === 0) {
        clearFrame();
        if (dialog.open) dialog.close();
      }
    };
    if (prefersReducedMotion()) {
      progress = target;
      render();
      return done();
    }
    scroller.style.willChange = 'opacity, filter';
    animation = animateValue<number>({
      keyframes: [progress, target],
      ...settleMotion(progress, target, velocity),
      onUpdate: (value) => {
        progress = clamp01(value);
        render();
      },
      onComplete: done,
    });
  };

  // Is white content (not the banner) under the handle's bar?
  const syncOnWhite = () => {
    const bar = grabber.firstElementChild as HTMLElement;
    dialog.toggleAttribute('data-on-white', banner.getBoundingClientRect().bottom < bar.getBoundingClientRect().bottom);
  };
  scroller.addEventListener('scroll', syncOnWhite, { passive: true });

  // ---------- Open and close ----------
  // The close button takes focus on open. Safari shows a ring for that even after a tap, so the ring stays
  // hidden unless the sheet was opened from the keyboard, or until a key is pressed (AboutDrawer.astro).
  const open = (animate = true, viaKeyboard = false) => {
    if (dialog.open) return;
    dialog.toggleAttribute('data-pointer-open', !viaKeyboard);
    if (!viaKeyboard) document.addEventListener('keydown', () => dialog.removeAttribute('data-pointer-open'), { once: true });
    if (mobile.matches) {
      // Start exactly on the sheet's surface, wherever it rests (open or collapsed).
      travel = getSheetSurface()?.travel() ?? 0;
      progress = animate ? 0 : 1;
      render();
      dialog.showModal();
      scroller.scrollTop = 0;
      syncOnWhite();
      if (animate) settle(1);
    } else {
      dialog.classList.toggle('no-entrance', !animate);
      dialog.showModal();
      scroller.scrollTop = 0;
      if (!animate) requestAnimationFrame(() => dialog.classList.remove('no-entrance'));
    }
    document.dispatchEvent(new CustomEvent('drawer:open'));
  };

  const close = () => {
    if (!dialog.open) return;
    if (mobile.matches) settle(0);
    else dialog.close();
  };

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('[data-about-open]')) {
      event.preventDefault();
      // detail is 0 for a click made with Enter or Space.
      open(true, (event as MouseEvent).detail === 0);
    } else if (target?.closest('[data-about-close]')) {
      close();
    }
  });

  // Esc and light dismiss (`closedby="any"`) ask first: on mobile, play the morph back before closing.
  dialog.addEventListener('cancel', (event) => {
    if (!mobile.matches) return;
    event.preventDefault();
    close();
  });

  // Light dismiss for browsers without `closedby="any"`: a click on the dialog box itself is the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && !('closedBy' in HTMLDialogElement.prototype)) close();
  });

  dialog.addEventListener('close', () => {
    // Closed without the morph (a browser that wouldn't let Esc be cancelled): bring the sheet back.
    if (mobile.matches && progress > 0) {
      clearFrame();
      settle(0);
    }
    delete dialog.dataset.onWhite;
    document.dispatchEvent(new CustomEvent('drawer:close'));
  });

  // ---------- Mobile: dragging down closes it (the handle, or the content from the top) ----------
  /**
   * Progress at or below which a slow release closes About: the sheet's top edge in the screen's lower
   * third, but never deeper than sheet.aboutCloseMin, so it stays reachable where the footer rests higher.
   */
  const closeAt = () => {
    const aboutTop = parseFloat(getComputedStyle(dialog).top) || 0;
    return Math.max(look.aboutCloseMin, 1 - (window.innerHeight * look.aboutClosePoint - aboutTop) / travel);
  };

  /** Let go after a drag. pxPerSecond: release speed, down positive. A flick decides; otherwise the close point. */
  const releaseDrag = (pxPerSecond: number) => {    const target =
      pxPerSecond >= look.aboutFlick ? 0 : pxPerSecond <= -look.aboutFlick ? 1 : progress <= closeAt() ? 0 : 1;
    settle(target, -pxPerSecond / travel);
  };

  // The handle: drag it down (or tap it) to close.
  let pointerId: number | null = null;
  let startY = 0;
  let startProgress = 1;
  let dragging = false;
  let suppressClick = false;
  const samples = new DragSamples();

  grabber.addEventListener('pointerdown', (event) => {
    if (!mobile.matches || pointerId !== null || event.button > 0) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    dragging = false;
    samples.reset(event);
  });

  grabber.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId || travel <= 0) return;
    if (!dragging) {
      if (Math.abs(event.clientY - startY) < DRAG_SLOP_PX) return;
      dragging = true;
      grabber.setPointerCapture(event.pointerId);
      animation?.stop(); // grab it mid-motion
      animation = null;
      startProgress = progress;
      startY = event.clientY;
    }
    samples.add(event);
    progress = clamp01(startProgress - (event.clientY - startY) / travel);
    render();
  });

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    samples.lift(event.timeStamp); // held still before letting go: no flick
    releaseDrag(samples.velocity());
  };
  grabber.addEventListener('pointerup', release);
  grabber.addEventListener('pointercancel', release);

  grabber.addEventListener('click', () => {
    if (!suppressClick) close(); // a tap, not the end of a drag
  });

  /*
   * The content: a touch that starts with it scrolled to the top and moves down drags the sheet, like the
   * handle. One that starts scrolled only scrolls (up to the top, and stops there); the next one can close.
   * Up and sideways (the gallery) stay native. Touch events, not pointer events: iOS Safari has no
   * directional touch-action, so the only way to keep the browser from scrolling is cancelling touchmove.
   */
  let touchState: 'idle' | 'pending' | 'dragging' | 'native' = 'idle';
  let touchId = -1;
  let touchX = 0;
  let touchY = 0;
  let touchStartProgress = 1;
  const touchSamples = new DragSamples();
  const ownTouch = (list: TouchList) => Array.from(list).find((t) => t.identifier === touchId);

  scroller.addEventListener(
    'touchstart',
    (event) => {
      if (touchState === 'dragging' || touchState === 'pending') return; // a second finger: keep the first
      const touch = event.changedTouches[0];
      if (!mobile.matches || !dialog.open || travel <= 0 || pointerId !== null || event.touches.length > 1 || !touch) {
        touchState = 'native';
        return;
      }
      touchId = touch.identifier;
      touchX = touch.clientX;
      touchY = touch.clientY;
      touchState = scroller.scrollTop <= 0 ? 'pending' : 'native';
      touchSamples.reset({ timeStamp: event.timeStamp, clientY: touch.clientY });
    },
    { passive: true },
  );

  scroller.addEventListener(
    'touchmove',
    (event) => {
      if (touchState !== 'pending' && touchState !== 'dragging') return;
      const touch = ownTouch(event.changedTouches);
      if (!touch) return;
      if (touchState === 'pending') {
        const dx = touch.clientX - touchX;
        const dy = touch.clientY - touchY;
        if (dx === 0 && dy === 0) return;
        // Up (a scroll), sideways (the gallery), or the browser already scrolling: not ours.
        if (dy <= 0 || Math.abs(dx) > dy || !event.cancelable) {
          touchState = 'native';
          return;
        }
        event.preventDefault(); // hold the page still (no rubber band) until it's clearly a drag
        touchSamples.add({ timeStamp: event.timeStamp, clientY: touch.clientY });
        if (dy < DRAG_SLOP_PX) return;
        touchState = 'dragging';
        animation?.stop(); // grab it mid-motion
        animation = null;
        touchStartProgress = progress;
        touchY = touch.clientY;
        return;
      }
      if (event.cancelable) event.preventDefault();
      touchSamples.add({ timeStamp: event.timeStamp, clientY: touch.clientY });
      progress = clamp01(touchStartProgress - (touch.clientY - touchY) / travel);
      render();
    },
    { passive: false },
  );

  const endTouch = (event: TouchEvent) => {
    if (touchState === 'native' && event.touches.length === 0) touchState = 'idle';
    if (touchState !== 'pending' && touchState !== 'dragging') return;
    const touch = ownTouch(event.changedTouches);
    if (!touch) return;
    const wasDragging = touchState === 'dragging';
    touchState = 'idle';
    if (!wasDragging) return;
    touchSamples.lift(event.timeStamp); // held still before letting go: no flick
    // Cancelled by the system (a gesture took over): back up, never closed by accident.
    if (event.type === 'touchcancel') settle(1);
    else releaseDrag(touchSamples.velocity());
  };
  scroller.addEventListener('touchend', endTouch, { passive: true });
  scroller.addEventListener('touchcancel', endTouch, { passive: true });

  // Crossing the breakpoint while open: jump to the other layout's open state.
  mobile.addEventListener('change', () => {
    animation?.stop();
    animation = null;
    clearFrame();
    if (!dialog.open) return;
    if (mobile.matches) {
      travel = getSheetSurface()?.travel() ?? 0;
      progress = 1;
      render();
      syncOnWhite();
    } else {
      progress = 0;
      getSheetSurface()?.setAbout(0);
    }
  });

  // Deep link: /?about opens on load, without the entrance animation.
  if (new URLSearchParams(window.location.search).has('about')) open(false);
}
