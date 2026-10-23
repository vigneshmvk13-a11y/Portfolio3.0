/**
 * Gallery buttons (design/components.md → Gallery). Next shows until the row is scrolled to its end,
 * Previous once it has left the start. A press scrolls by the photos that fully fit and lands on a
 * snap point; near either end it goes all the way, so one press never leaves a sliver to scroll.
 * Smooth, or instant under reduced motion.
 */
import { prefersReducedMotion } from '../lib/reduced-motion';

/** Sub-pixel scroll positions count as the end. */
const EDGE_PX = 2;

export function initGalleries(): void {
  for (const gallery of document.querySelectorAll<HTMLElement>('[data-gallery]:not([data-gallery-ready])')) {
    const track = gallery.querySelector<HTMLElement>('[data-gallery-track]');
    const prev = gallery.querySelector<HTMLElement>('[data-gallery-prev]');
    const next = gallery.querySelector<HTMLElement>('[data-gallery-next]');
    if (!track || !prev || !next) continue;
    gallery.dataset.galleryReady = '';

    const max = () => track.scrollWidth - track.clientWidth;

    const sync = () => {
      const showPrev = track.scrollLeft > EDGE_PX;
      const showNext = track.scrollLeft < max() - EDGE_PX;
      // A focused button that disappears hands focus to the other one, or to the row.
      const focused = document.activeElement;
      if (focused === prev && !showPrev) (showNext ? next : track).focus({ preventScroll: true });
      if (focused === next && !showNext) (showPrev ? prev : track).focus({ preventScroll: true });
      prev.toggleAttribute('data-hidden', !showPrev);
      next.toggleAttribute('data-hidden', !showNext);
    };

    const page = (direction: 1 | -1) => {
      const [first, second] = track.children as HTMLCollectionOf<HTMLElement>;
      const style = getComputedStyle(track);
      const visible = track.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const pitch = second ? second.offsetLeft - first.offsetLeft : visible;
      const step = Math.max(1, Math.floor(visible / pitch)) * pitch;
      let target = track.scrollLeft + direction * step;
      if (target > max() - pitch / 2) target = max();
      if (target < pitch / 2) target = 0;
      track.scrollTo({ left: target, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    };

    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    track.addEventListener('scroll', sync, { passive: true });
    // Also runs when the closed drawer opens (the row goes from 0 wide to its real size).
    new ResizeObserver(sync).observe(track);
    sync();
  }
}
