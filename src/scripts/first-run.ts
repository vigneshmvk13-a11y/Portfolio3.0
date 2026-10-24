/**
 * Mobile homepage, first moments (design/layout-and-motion.md → First run). Vignesh's user tests: the wheel
 * sits above the thumb's reach, behind the sheet, so people didn't find out it moves.
 * 1. Auto-collapse: once the intro has landed (or the page is ready), the sheet collapses by itself after
 *    firstRun.autoCollapse, unless the visitor has already touched, scrolled or typed. Nothing is taken
 *    from someone who's reading it; the handle brings it back.
 * 2. Nudge: as it collapses, the centre card turns a little towards the next project and settles back.
 * 3. "Swipe to explore" sits above the collapsed sheet until the visitor first moves the wheel
 *    (data-swiped on the sheet, remembered for the session; the label is in BottomSheet.astro).
 * 5. TOC peek: then the right-edge tab slides out and back, twice.
 * The nudge and peek run once per session and never with reduced motion. (4, a sideways swipe on the
 * sheet turning the wheel, is in sheet.ts.)
 */
import { ease, firstRun } from '../lib/motion';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { getSheetSurface } from './sheet';
import type { WheelController, WheelDetail } from './wheel/controller';

const MOBILE = '(width < 75rem)';
const SHOWN = 'first-run-shown';
const SWIPED = 'wheel-swiped';
const INPUTS = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;
/** Moves the visitor made (not the intro, the page placing itself, or this nudge). */
const BY_VISITOR = new Set(['wheel', 'drag', 'key', 'toc', 'click']);

const remembered = (key: string) => {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};
const remember = (key: string) => {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked: it just runs again next time.
  }
};

const cubic = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

export function bindFirstRun(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  if (!sheet) return;
  const root = document.documentElement;
  const mobile = window.matchMedia(MOBILE);

  // ---------- 3. The swipe label goes for good once the visitor has moved the wheel ----------
  if (remembered(SWIPED)) sheet.setAttribute('data-swiped', '');
  controller.stage.addEventListener('wheel:start', (event) => {
    if (!BY_VISITOR.has((event as CustomEvent<WheelDetail>).detail.via)) return;
    sheet.setAttribute('data-swiped', '');
    remember(SWIPED);
  });

  // ---------- 1. Auto-collapse, unless the visitor got there first ----------
  let touched = false;
  const stopListening = () => {
    for (const type of INPUTS) window.removeEventListener(type, onInput, true);
  };
  const onInput = () => {
    touched = true;
    stopListening();
  };
  for (const type of INPUTS) window.addEventListener(type, onInput, { capture: true, passive: true });

  const start = () =>
    window.setTimeout(() => {
      stopListening();
      if (touched || !mobile.matches || document.querySelector('dialog[open]')) return;
      if (!getSheetSurface()?.collapse()) return;
      if (remembered(SHOWN) || prefersReducedMotion()) return;
      remember(SHOWN);
      window.setTimeout(() => nudge(controller), firstRun.nudgeDelay * 1000);
    }, firstRun.autoCollapse * 1000);

  // The intro counts as "ready" only once it has landed (its skip inputs also count as touches).
  if (root.dataset.intro === 'pending') document.addEventListener('intro:done', start, { once: true });
  else start();
}

/** 2 + 5: the centre card peeks at the next project and back, then the TOC tab peeks out twice. */
function nudge(controller: WheelController): void {
  if (controller.moving || !controller.enabled) return;
  const at = controller.position;
  controller.animatePosition(
    [at + firstRun.nudge, at],
    {
      duration: firstRun.nudgeDuration * 1000, // animateValue takes ms
      times: [0, firstRun.nudgeAt, 1],
      ease: [ease.out, ease.inOut],
    },
    'hint',
  );

  const tab = document.querySelector<HTMLElement>('[data-toc-morph]');
  if (!tab) return;
  // The tab is centred on its own height with `translate: 0 -50%`; the peek keeps that and moves sideways.
  const out = `-${firstRun.tocPeek}px -50%`;
  tab.animate([{ translate: '0 -50%' }, { translate: out }, { translate: '0 -50%' }, { translate: out }, { translate: '0 -50%' }], {
    duration: firstRun.tocPeekDuration * 1000,
    delay: firstRun.nudgeDuration * 1000,
    easing: cubic(ease.inOut),
  });
}
