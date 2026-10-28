/**
 * Case-study section tabs (design/layout-and-motion.md → Case study → Tabs).
 * - The active tab follows the scroll: the last section whose top has passed the reading line.
 * - A tap scrolls to the section (respecting scroll-margin) and holds that tab until the scroll ends.
 * - The white pill slides to the active tab (CSS transition on translate and width).
 * - Phones: the row scrolls sideways to keep the active tab in view.
 * - Not sticky while it rests in the bottom of the screen (bindStickiness).
 */
import { prefersReducedMotion } from '../../lib/reduced-motion';

/** The reading line, as a share of the viewport height. */
const READING_LINE = 0.35;
/** Fallback for browsers without `scrollend`: release a tap's hold after this long, ms. */
const HOLD_FALLBACK = 1200;
/** The bottom share of the viewport where the tabs aren't sticky (bindStickiness). */
const UNSTICK_ZONE = 0.25;

/**
 * iOS 26 Safari draws the page on under its floating toolbar but cuts sticky and fixed elements off at the
 * layout viewport's bottom edge (innerHeight, ~18pt above the toolbar), slicing the tab bar at the top of
 * the page (Vignesh's iPhone, 2026-10-28). So the tabs drop `sticky` while they're in the bottom quarter.
 * They can only stick at the top, so there they're never stuck, and losing `sticky` moves nothing.
 */
function bindStickiness(nav: HTMLElement): void {
  new IntersectionObserver(([entry]) => nav.toggleAttribute('data-unstuck', entry.isIntersecting), {
    rootMargin: `${-(1 - UNSTICK_ZONE) * 100}% 0px 0px 0px`,
  }).observe(nav);
}

export function bindTabs(): void {
  const nav = document.querySelector<HTMLElement>('[data-case-tabs]');
  if (!nav) return;
  const list = nav.querySelector<HTMLElement>('[data-case-tabs-list]');
  const pill = nav.querySelector<HTMLElement>('[data-case-tabs-pill]');
  const tabs = [...nav.querySelectorAll<HTMLAnchorElement>('[data-case-tab]')];
  const sections = tabs.map((tab) => document.getElementById(tab.dataset.caseTab ?? ''));
  if (!list || !pill || sections.some((s) => !s)) return;
  bindStickiness(nav);

  let active = 0;
  let holding = false;
  let holdTimer = 0;
  let frame = 0;

  function placePill(): void {
    const item = tabs[active].parentElement as HTMLElement;
    pill!.style.setProperty('--pill-x', `${item.offsetLeft}px`);
    pill!.style.setProperty('--pill-w', `${item.offsetWidth}px`);
  }

  function revealTab(): void {
    if (list!.scrollWidth <= list!.clientWidth) return;
    const item = tabs[active].parentElement as HTMLElement;
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    if (left >= list!.scrollLeft && right <= list!.scrollLeft + list!.clientWidth) return;
    list!.scrollTo({
      left: left - (list!.clientWidth - item.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function setActive(index: number): void {
    if (index === active) return;
    tabs[active].removeAttribute('aria-current');
    active = index;
    tabs[active].setAttribute('aria-current', 'location');
    placePill();
    revealTab();
  }

  function fromScroll(): void {
    frame = 0;
    if (holding) return;
    const line = window.innerHeight * READING_LINE;
    let index = 0;
    sections.forEach((section, i) => {
      if (section!.getBoundingClientRect().top <= line) index = i;
    });
    setActive(index);
  }

  function release(): void {
    holding = false;
    window.clearTimeout(holdTimer);
    fromScroll();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      setActive(i);
      holding = true;
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(release, HOLD_FALLBACK);
      sections[i]!.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(history.state, '', `#${sections[i]!.id}`);
    });
  });

  window.addEventListener('scrollend', () => holding && release());
  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(fromScroll);
    },
    { passive: true },
  );
  new ResizeObserver(placePill).observe(list);

  fromScroll();
  placePill();
  // Place the pill before enabling its transition, so it doesn't slide in from the left on load.
  requestAnimationFrame(() => nav.setAttribute('data-ready', ''));
}
