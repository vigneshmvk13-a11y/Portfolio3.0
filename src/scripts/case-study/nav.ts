/**
 * Floating Previous / Home / Next (design/layout-and-motion.md → Case study → Floating nav).
 * Collapses to Home while scrolling down; expands on scroll up, at the top and near the page end.
 * Keyboard focus inside it always shows it in full (CSS :focus-within).
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
      nav!.removeAttribute('data-collapsed');
      anchor = y;
    } else if (Math.abs(delta) >= caseStudy.navScrollSlop) {
      nav!.toggleAttribute('data-collapsed', delta > 0);
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
