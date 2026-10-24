/**
 * Floating Previous / Home / Next (design/layout-and-motion.md → Case study → Floating nav).
 * Shown in full on load. Scrolling down hides it (data-hidden: it sinks and fades); scrolling up brings it
 * back, in full. It also shows at the very top and near the page end, where there's no further down to
 * go. Keyboard focus inside it always shows it (CSS :focus-within).
 */
import { caseStudy } from '../../lib/motion';

export function bindNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-case-nav]');
  if (!nav) return;

  let anchor = window.scrollY;
  let frame = 0;

  function update(): void {
    frame = 0;
    const y = window.scrollY;
    const atEnd = document.documentElement.scrollHeight - window.innerHeight - y < caseStudy.navEndZone;
    const delta = y - anchor;
    if (y <= 0 || atEnd) {
      nav!.removeAttribute('data-hidden');
      anchor = y;
    } else if (Math.abs(delta) >= caseStudy.navScrollSlop) {
      nav!.toggleAttribute('data-hidden', delta > 0);
      anchor = y;
    }
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
}
