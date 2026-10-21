/**
 * Homepage wiring: builds the wheel controller and connects inputs, TOC, hash, sheet, video,
 * the live region, focus and the drawer, and lazy-loads the intro when it will run.
 */
import { WheelController, type WheelDetail } from './wheel/controller';
import { bindWheelInput } from './wheel/input';
import { bindToc } from './toc';
import { bindTocMorph } from './toc-morph';
import { bindHash, indexFromHash } from './hash';
import { bindSheet } from './sheet';
import { initMotionCovers, setActiveCover } from './media';
import { watchQuality } from './quality';

let controller: WheelController | null = null;

export function getWheel(): WheelController | null {
  return controller;
}

export function initHome(): WheelController | null {
  if (controller) return controller;
  const stage = document.querySelector<HTMLElement>('[data-wheel]');
  if (!stage) return null;
  const wheel = new WheelController(stage);
  controller = wheel;
  // Dev only: handle for the interaction tests and the intro lab.
  if (import.meta.env.DEV) (window as unknown as { __wheel: WheelController }).__wheel = wheel;

  initMotionCovers();
  watchQuality(stage);
  bindWheelInput(wheel);
  bindToc(wheel);
  bindTocMorph(wheel);
  bindHash(wheel);
  bindSheet(wheel);

  const activeCard = () => stage.querySelector<HTMLElement>('[data-wheel-card]:not([inert])');
  const status = stage.querySelector<HTMLElement>('[data-wheel-status]');
  const scrollHint = document.querySelector<HTMLElement>('[data-scroll-hint]');

  // No video while moving, including a scroll that tilts the card and returns.
  stage.addEventListener('wheel:start', () => setActiveCover(null));

  stage.addEventListener('wheel:change', (event) => {
    const { via } = (event as CustomEvent<WheelDetail>).detail;
    if (via !== 'init' && via !== 'hash' && via !== 'intro') scrollHint?.setAttribute('data-hidden', '');
  });

  stage.addEventListener('wheel:settle', (event) => {
    const { index, via } = (event as CustomEvent<WheelDetail>).detail;
    const card = activeCard();
    setActiveCover(card?.querySelector<HTMLElement>('[data-motion-cover]') ?? null);
    // Announce changes the user made, not the initial placement or the intro landing.
    if (status && card && via !== 'init' && via !== 'intro') status.textContent = card.getAttribute('aria-label') ?? '';
    stage.dataset.index = String(index);
  });

  document.addEventListener('drawer:open', () => (wheel.enabled = false));
  document.addEventListener('drawer:close', () => (wheel.enabled = true));

  new ResizeObserver(() => wheel.refresh()).observe(stage);

  // Restore from the hash (or start at the first project) without animation.
  wheel.jumpTo(indexFromHash(wheel) ?? 0, 'init');
  document.documentElement.dataset.wheelReady = '';

  // The head script in index.astro decided whether the intro runs; load it only then.
  if (document.documentElement.dataset.intro === 'pending') {
    void import('./intro/intro').then(({ runIntro }) => runIntro(wheel));
  }

  return wheel;
}
