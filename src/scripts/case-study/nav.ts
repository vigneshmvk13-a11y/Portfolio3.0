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

  watchMedia(nav);

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

/**
 * Sets data-over-media on the nav while a [data-nav-media] element (a cover) is behind it, so the nav's
 * fill can go from 80% (white page) to 50% (cover). The observer's root is shrunk to the nav's own band,
 * so the browser reports the overlap and nothing runs per scroll frame.
 */
function watchMedia(nav: HTMLElement): void {
  const media = document.querySelectorAll('[data-nav-media]');
  if (media.length === 0) return;

  const behind = new Set<Element>();
  let observer: IntersectionObserver | undefined;

  function observe(): void {
    observer?.disconnect();
    behind.clear();
    const rect = nav.getBoundingClientRect();
    const bottom = window.innerHeight - rect.bottom;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) behind.add(entry.target);
          else behind.delete(entry.target);
        }
        nav.toggleAttribute('data-over-media', behind.size > 0);
      },
      { rootMargin: `${-Math.round(rect.top)}px 0px ${-Math.round(bottom)}px 0px` },
    );
    for (const element of media) observer.observe(element);
  }

  observe();
  window.addEventListener('resize', observe);
}
