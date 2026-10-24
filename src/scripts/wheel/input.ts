/**
 * Wheel inputs. design/layout-and-motion.md → Project wheel → Input.
 * - mouse wheel: each notch springs straight to the next card (rapid notches keep the momentum);
 * - trackpad: the wheel follows the scroll and snaps to a card when it goes quiet
 *   (reduced motion, both: accumulate deltaY, one short turn per gesture, locked until quiet);
 * - touch/pen drag: follow the finger, release with momentum, snap to the nearest card;
 * - keyboard: ↑/↓, PageUp/PageDown, Home/End, Enter opens the active card;
 * - click on a neighbour (they're inert, so the stage gets the click): step towards it.
 */
import { wheel } from '../../lib/motion';
import { prefersReducedMotion } from '../../lib/reduced-motion';
import type { WheelController } from './controller';

const LINE_HEIGHT_PX = 16;
/** Pointer travel before a touch counts as a drag (and the tap is cancelled). */
export const DRAG_SLOP_PX = 6;
/** How far momentum carries: projected = position + velocity × this (seconds). */
export const MOMENTUM_S = 0.2;

export function bindWheelInput(controller: WheelController): void {
  const { stage } = controller;

  // ---------- Wheel / trackpad ----------
  // Full motion: the wheel moves with the scroll (one card per stepPx of deltaY), then snaps when
  // the gesture goes quiet. Reduced motion: no scroll-linked movement, one short turn per gesture.
  let accumulated = 0;
  let locked = false;
  let lastWheelAt = 0;
  let quietTimer = 0;

  /** Integer position the current gesture started from; null between gestures. */
  let gestureFrom: number | null = null;
  /** Where the gesture has taken the wheel, in positions. */
  let scrollTarget = 0;
  let snapTimer = 0;

  const unlockWhenQuiet = () => {
    window.clearTimeout(quietTimer);
    const wait = wheel.inputQuiet * 1000 - (performance.now() - lastWheelAt);
    if (wait > 0) quietTimer = window.setTimeout(unlockWhenQuiet, wait);
    else if (!controller.moving) locked = false;
  };

  stage.addEventListener('wheel:settle', () => {
    if (locked) unlockWhenQuiet();
  });

  /**
   * End of a trackpad gesture: land on a whole card. Past the commit distance the wheel moves at
   * least one card in the scroll direction, otherwise it returns.
   */
  const snap = () => {
    const from = gestureFrom;
    gestureFrom = null;
    if (from === null || !controller.following) return; // a key, TOC click or the intro took over
    const travelled = scrollTarget - from;
    const committed = Math.abs(travelled) * controller.stepPx >= wheel.stepThreshold;
    const steps = committed ? Math.sign(travelled) * Math.max(1, Math.round(Math.abs(travelled))) : 0;
    controller.springTo(from + steps, 'wheel', controller.velocity);
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (!controller.enabled || event.ctrlKey) return; // ctrlKey = pinch-zoom on trackpads
      const unit = event.deltaMode === 1 ? LINE_HEIGHT_PX : event.deltaMode === 2 ? window.innerHeight : 1;
      const deltaY = event.deltaY * unit;

      if (!prefersReducedMotion()) {
        const inTrackpadGesture = gestureFrom !== null && controller.following;
        // A mouse notch (one event ≥ the commit distance, or line/page units) is a whole step: spring to
        // the next card at once, with no follow-then-wait. Rapid notches retarget the spring and keep its
        // speed. Large events inside a running trackpad gesture (inertia) stay scroll-linked.
        if (!inTrackpadGesture && (event.deltaMode !== 0 || Math.abs(deltaY) >= wheel.stepThreshold)) {
          window.clearTimeout(snapTimer);
          gestureFrom = null;
          controller.step(Math.sign(deltaY), 'wheel');
          return;
        }
        // A new gesture starts from where the wheel is heading, so scrolling again during a snap adds to it.
        if (!inTrackpadGesture) {
          gestureFrom = controller.destination;
          scrollTarget = gestureFrom;
        }
        scrollTarget += deltaY / controller.stepPx;
        controller.follow(scrollTarget, 'wheel');
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snap, wheel.inputQuiet * 1000);
        return;
      }

      const now = performance.now();
      if (now - lastWheelAt > wheel.inputQuiet * 1000) accumulated = 0; // new gesture
      lastWheelAt = now;
      if (locked) {
        unlockWhenQuiet();
        return;
      }
      accumulated += deltaY;
      if (Math.abs(accumulated) >= wheel.stepThreshold) {
        const direction = Math.sign(accumulated);
        accumulated = 0;
        locked = true;
        controller.step(direction, 'wheel');
      }
    },
    { passive: true },
  );

  // ---------- Touch / pen drag ----------
  let pointerId: number | null = null;
  let startY = 0;
  let startPosition = 0;
  let dragging = false;
  let suppressClick = false;
  const samples: { t: number; y: number }[] = [];

  stage.addEventListener('pointerdown', (event) => {
    if (!controller.enabled || event.pointerType === 'mouse' || pointerId !== null) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    startPosition = controller.position;
    dragging = false;
    samples.length = 0;
    samples.push({ t: event.timeStamp, y: event.clientY });
  });

  stage.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) < DRAG_SLOP_PX) return;
      dragging = true;
      stage.setPointerCapture(event.pointerId);
      startPosition = controller.position;
      startY = event.clientY;
    }
    samples.push({ t: event.timeStamp, y: event.clientY });
    if (samples.length > 6) samples.shift();
    // Finger up (negative dy) moves to the next card.
    controller.setPosition(startPosition - (event.clientY - startY) / controller.stepPx, 'drag');
  });

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);

    // Velocity over the last ~100ms of samples, in positions per second.
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last.t - s.t <= 100) ?? samples[0];
    const dt = Math.max(1, last.t - first.t) / 1000;
    const velocity = -((last.y - first.y) / dt) / controller.stepPx;

    const reduced = prefersReducedMotion();
    const projected = controller.position + (reduced ? 0 : velocity * MOMENTUM_S);
    controller.springTo(Math.round(projected), 'drag', reduced ? 0 : velocity);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // A drag must not also open the card under the finger.
  stage.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Clicks on inert neighbours land on the stage: step towards the clicked side.
      const activeCard = stage.querySelector<HTMLElement>('[data-wheel-card]:not([inert])');
      if (!controller.enabled || !activeCard || activeCard.contains(event.target as Node)) return;
      const rect = activeCard.getBoundingClientRect();
      if (event.clientY < rect.top) controller.step(-1, 'click');
      else if (event.clientY > rect.bottom) controller.step(1, 'click');
    },
    true,
  );

  // ---------- Keyboard ----------
  const keyScope = (target: EventTarget | null) => {
    if (!(target instanceof Element) || target === document.body) return true;
    if (target.closest('dialog, input, textarea, select, [contenteditable]')) return false;
    return Boolean(target.closest('[data-wheel], [data-toc], main'));
  };

  document.addEventListener('keydown', (event) => {
    if (!controller.enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!keyScope(event.target)) return;
    switch (event.key) {
      case 'ArrowUp':
      case 'PageUp':
        controller.step(-1, 'key');
        break;
      case 'ArrowDown':
      case 'PageDown':
        controller.step(1, 'key');
        break;
      case 'Home':
        controller.goTo(0, 'key');
        break;
      case 'End':
        controller.goTo(controller.count - 1, 'key');
        break;
      case 'Enter': {
        if (event.target !== document.body) return; // links handle their own Enter
        const link = stage.querySelector<HTMLAnchorElement>('[data-wheel-card]:not([inert]) a');
        if (link) window.location.assign(link.href);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  });
}
