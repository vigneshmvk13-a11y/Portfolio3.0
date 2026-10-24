/**
 * Floating Previous / Home / Next (design/layout-and-motion.md → Case study → Floating nav).
 * Collapses to Home while scrolling down; expands on scroll up, at the top and near the page end. While the
 * page moves its backdrop blur is off (data-scrolling); it fades back in once scrolling has stopped.
 * Keyboard focus inside it always shows it in full (CSS :focus-within).
 */
import { caseStudy } from '../../lib/motion';

export function bindNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-case-nav]');
  if (!nav) return;

  let anchor = window.scrollY;
  let frame = 0;
  let idle = 0;

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
      nav.setAttribute('data-scrolling', '');
      window.clearTimeout(idle);
      idle = window.setTimeout(() => nav.removeAttribute('data-scrolling'), caseStudy.navIdle);
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
}
