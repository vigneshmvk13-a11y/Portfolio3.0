/**
/**
 * Homepage intro (design/layout-and-motion.md → Intro choreography). The first frame shows only the lead
 * card; the wheel spins at once (whole turns, a small overshoot, settle back) and the other cards fade in
 * behind it as it turns (WheelRenderer.setIntro), landing on the first project. Then the hero text, TOC and
 * footer fade in together. Any input skips straight to the final state.
 *
 * Lazy-loaded by home.ts only when the head script in index.astro set html[data-intro="pending"]
 * (first visit this session, no reduced motion, no deep link). CSS hides [data-intro-reveal] and the
 * non-lead cards while pending and reveals them after --intro-failsafe if this never runs.
 */
import { ease, intro, quality } from '../../lib/motion';
import { isLite, onLite } from '../quality';
import type { WheelController } from '../wheel/controller';

const SKIP_EVENTS = ['wheel', 'keydown', 'pointerdown', 'touchstart'] as const;
const DESKTOP = '(min-width: 75rem)';

/** Where each revealed element comes from (data-intro-reveal value). */
function revealFrom(element: HTMLElement): string {
  const rise = `translateY(${intro.revealRise}px)`;
  switch (element.dataset.introReveal) {
    case 'sheet': // mobile: the bottom sheet slides up; desktop: it's the left column
      return window.matchMedia(DESKTOP).matches ? rise : 'translateY(100%)';
    case 'edge': // mobile TOC handle slides in from the right edge
      return 'translateX(100%)';
    case 'rise':
      return rise;
    default:
      return 'none';
  }
}

/**
 * Start loading and decoding every cover now, without waiting for it: a card that paints for the first
 * time mid-spin decodes in that frame and can drop it. The spin starts regardless (Vignesh: no delay).
 */
function warmCovers(): void {
  for (const img of document.querySelectorAll<HTMLImageElement>('[data-wheel-card] img')) {
    img.loading = 'eager';
    void img.decode().catch(() => undefined);
  }
}

/** Resolves after `count` frames have been produced. */
function frames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => (--count <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

export function runIntro(controller: WheelController): void {
  const root = document.documentElement;
  let done = false;

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    for (const type of SKIP_EVENTS) window.removeEventListener(type, skip, true);
    if (skipped) controller.jumpTo(0, 'intro');
    controller.setIntro(null);
    delete root.dataset.introSpinning;
    controller.enabled = true;
    root.dataset.intro = 'done';
    document.dispatchEvent(new CustomEvent('intro:done'));
    if (skipped) return;

    const visible = [...document.querySelectorAll<HTMLElement>('[data-intro-reveal]')].filter(
      (element) => element.getClientRects().length > 0,
    );
    for (const element of visible) {
      element.animate([{ opacity: 0, transform: revealFrom(element) }, { opacity: 1, transform: 'none' }], {
        duration: intro.revealDuration * 1000,
        easing: `cubic-bezier(${ease.out.join(', ')})`,
        fill: 'backwards',
      });
    }
  };

  // Capture phase, so the input that skips is still handled normally afterwards (a scroll moves the wheel).
  const skip = () => finish(true);
  for (const type of SKIP_EVENTS) window.addEventListener(type, skip, { capture: true, passive: true });

  controller.enabled = false;
  // Only the lead card at first; the rest fade in over the first `trailIn` positions of the turn.
  const start = controller.position;
  const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  controller.setIntro({ lead: controller.index, reveal: (position) => smooth((position - start) / intro.trailIn) });
  warmCovers();
  controller.prewarm(); // every card gets its layer now, at opacity 0
  controller.refresh();
  void frames(1).then(() => {
    if (done) return; // skipped while preparing
    root.dataset.introSpinning = ''; // CSS stops hiding the other cards; the renderer takes over
    const end = start + intro.spinTurns * controller.count;
    const spin = controller.animatePosition([end + intro.spinOvershoot, end], {
      duration: intro.spinDuration * 1000, // animateValue takes ms (unlike animate())
      times: [0, intro.spinOvershootAt, 1],
      ease: [intro.spinEase, ease.inOut],
    });
    // Slow device (scripts/quality.ts): same spin, played faster, also if detected mid-spin.
    const hurry = () => (spin.speed = quality.introSpeed);
    if (isLite()) hurry();
    else onLite(hurry);
    spin.then(() => finish(false));
  });
}
