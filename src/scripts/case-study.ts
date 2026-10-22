/**
 * Case-study page wiring: media, section tabs, the floating nav and the swipe between projects.
 * The page transition itself runs from Base.astro's head (src/scripts/page-transition.js).
 */
import { initMotionCovers, setActiveCover } from './media';
import { bindTabs } from './case-study/tabs';
import { bindNav } from './case-study/nav';
import { bindSwipe } from './case-study/swipe';

/** At most one video plays: the cover most in view (at least half visible), or none. */
function playMostVisibleCover(): void {
  const covers = [...document.querySelectorAll<HTMLElement>('[data-case-page] [data-motion-cover]')].filter((cover) =>
    cover.querySelector('video'),
  );
  if (covers.length === 0) return;
  const ratios = new Map<Element, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
      let best: HTMLElement | null = null;
      let bestRatio = 0.5;
      for (const cover of covers) {
        const ratio = ratios.get(cover) ?? 0;
        if (ratio >= bestRatio) {
          best = cover;
          bestRatio = ratio;
        }
      }
      setActiveCover(best);
    },
    { threshold: [0, 0.5, 0.75, 1] },
  );
  for (const cover of covers) observer.observe(cover);
}

export function initCaseStudy(): void {
  initMotionCovers();
  playMostVisibleCover();
  bindTabs();
  bindNav();
  bindSwipe();
}
