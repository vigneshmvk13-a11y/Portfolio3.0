/**
 * Homepage intro (design/layout-and-motion.md → Intro choreography). Only the wheel shows; it spins
 * like a slot machine (whole turns, a small overshoot, settle back) and lands on the first project.
 * Then the hero text, TOC and footer appear. Any input skips straight to the final state.
 *
 * Lazy-loaded by home.ts only when the head script in index.astro set html[data-intro="pending"]
 * (first visit this session, no reduced motion, no deep link). CSS hides [data-intro-reveal]
 * while pending and reveals it after --intro-failsafe if this never runs.
 */
import { ease, intro } from '../../lib/motion';
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

export function runIntro(controller: WheelController): void {
  const root = document.documentElement;
  let done = false;

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    for (const type of SKIP_EVENTS) window.removeEventListener(type, skip, true);
    if (skipped) controller.jumpTo(0, 'intro');
    controller.enabled = true;
    root.dataset.intro = 'done';
    if (skipped) return;

    const visible = [...document.querySelectorAll<HTMLElement>('[data-intro-reveal]')].filter(
      (element) => element.getClientRects().length > 0,
    );
    visible.forEach((element, i) => {
      element.animate([{ opacity: 0, transform: revealFrom(element) }, { opacity: 1, transform: 'none' }], {
        duration: intro.revealDuration * 1000,
        delay: i * intro.revealStagger * 1000,
        easing: `cubic-bezier(${ease.out.join(', ')})`,
        fill: 'backwards',
      });
    });
  };

  // Capture phase, so the input that skips is still handled normally afterwards (a scroll moves the wheel).
  const skip = () => finish(true);
  for (const type of SKIP_EVENTS) window.addEventListener(type, skip, { capture: true, passive: true });

  controller.enabled = false;
  const start = controller.position;
  const end = start + intro.spinTurns * controller.count;
  controller
    .animatePosition([end + intro.spinOvershoot, end], {
      duration: intro.spinDuration * 1000, // animateValue takes ms (unlike animate())
      times: [0, intro.spinOvershootAt, 1],
      ease: [intro.spinEase, ease.inOut],
    })
    .then(() => finish(false));
}
