/**
 * Touch swipe between case studies (design/layout-and-motion.md → Case study → Swipe).
 * Touch only (a trackpad swipe is the browser's back gesture). The page follows the finger; release
 * past a quarter of the screen, or a quick flick, goes to the previous (swipe right) or next (swipe
 * left) project with the slide transition; anything less springs back. Never starts on the tab row
 * ([data-no-swipe]) or within swipeEdge of the screen edges, which belong to the browser.
 * Vertical scrolling stays native: the page is `touch-action: pan-y pinch-zoom`.
 */
import { caseStudy, duration, ease } from '../../lib/motion';
import { goToProject } from './navigate';

type Gesture = { id: number; x: number; y: number; dx: number; swiping: boolean; samples: { x: number; t: number }[] };

export function bindSwipe(): void {
  const page = document.querySelector<HTMLElement>('[data-case-page]');
  if (!page) return;
  const { slug, prev } = page.dataset;
  if (!prev || prev === slug) return; // one project: nowhere to swipe to

  let gesture: Gesture | null = null;

  function follow(dx: number): void {
    page!.style.transform = `translate3d(${dx * caseStudy.swipeFollow}px, 0, 0)`;
  }

  function springBack(): void {
    const from = page!.style.transform;
    page!.style.transform = '';
    page!.style.willChange = '';
    if (!from) return;
    page!.animate([{ transform: from }, { transform: 'translate3d(0, 0, 0)' }], {
      duration: duration.base * 1000,
      easing: `cubic-bezier(${ease.out.join(', ')})`,
    });
  }

  function end(): void {
    if (!gesture) return;
    const { dx, swiping, samples } = gesture;
    gesture = null;
    if (!swiping) return;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const velocity = last && first && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const far = Math.abs(dx) > window.innerWidth * caseStudy.swipeCommit;
    const flick = Math.abs(velocity) > caseStudy.swipeVelocity && Math.sign(velocity) === Math.sign(dx);
    if (far || flick) {
      // Read at commit time, not bind time, so the neighbours always match the page's data attributes.
      const target = dx < 0 ? page!.dataset.next : page!.dataset.prev;
      if (target) goToProject(dx < 0 ? 'next' : 'prev', target);
      // Settle back at once. A prefetched or prerendered page takes over within a frame or two and slides
      // on from about where the finger left it. A slow one (a cold load, the dev server) would otherwise
      // leave this page frozen pushed aside: once a navigation starts, Chrome throttles this page's
      // frames and shows its last one until the next page arrives.
      springBack();
    } else {
      springBack();
    }
  }

  page.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    if ((event.target as Element).closest('[data-no-swipe]')) return;
    if (event.clientX < caseStudy.swipeEdge || event.clientX > window.innerWidth - caseStudy.swipeEdge) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, swiping: false, samples: [] };
  });

  page.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.swiping) {
      if (Math.abs(dy) > caseStudy.swipeSlop && Math.abs(dy) >= Math.abs(dx)) {
        gesture = null; // A scroll: the browser has it.
        return;
      }
      if (Math.abs(dx) < caseStudy.swipeSlop) return;
      gesture.swiping = true;
      page.setPointerCapture(event.pointerId);
      page.style.willChange = 'transform';
    }
    gesture.dx = dx;
    gesture.samples.push({ x: event.clientX, t: event.timeStamp });
    if (gesture.samples.length > 5) gesture.samples.shift();
    follow(dx);
  });

  page.addEventListener('pointerup', end);
  // The browser can take a gesture over (its own scroll or zoom) with pointercancel, or just drop the
  // capture: either way the page goes back to rest. Only the page's own capture counts: taking capture
  // from the touched child (its implicit touch capture) fires a lostpointercapture that bubbles up here.
  for (const type of ['pointercancel', 'lostpointercapture'] as const) {
    page.addEventListener(type, (event) => {
      if (!gesture || (type === 'lostpointercapture' && event.target !== page)) return;
      gesture = null;
      springBack();
    });
  }

  // Shown again (back from the next page via bfcache): the page must not still be pushed aside.
  window.addEventListener('pageshow', () => {
    page.style.transform = '';
    page.style.willChange = '';
  });
}
