/**
 * Case-study page wiring: media, section tabs, the floating nav and the swipe between projects.
 * The page transition itself runs from Base.astro's head (src/scripts/page-transition.js).
 */
import { initMotionCovers, setActiveCover } from './media';
import { bindTabs } from './case-study/tabs';
import { bindNav } from './case-study/nav';
import { bindSwipe } from './case-study/swipe';

/** Of the page's own covers, only the one most in view (at least half visible) plays, or none. The More projects row plays on its own (data-autoplay). */
function playMostVisibleCover(): void {
  const covers = [...document.querySelectorAll<HTMLElement>('[data-case-page] [data-motion-cover]:not([data-autoplay])')].filter((cover) =>
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
  // TEMPORARY (preview branch only): viewport readout for the iOS 26 Safari nav spacing. Remove before merging.
  if (new URLSearchParams(location.search).has('debug')) {
    import('./case-study/debug-viewport').then((m) => m.showViewportDebug());
  }
}
