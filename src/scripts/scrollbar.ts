/**
 * Overlay scrollbar (design/components.md → Scrollbar). The scroller keeps native scrolling (wheel,
 * touch, keys) with its own scrollbar hidden; this draws a thin thumb over its right edge, inside the
 * panel's rounded corners, and lets a pointer drag it. The thumb only moves by transform.
 * Shown while there's something to scroll: always with a mouse, only while scrolling on touch (CSS).
 */

/** How long the thumb counts as "scrolling" after the last scroll event (touch screens fade it after). */
const SCROLLING_MS = 800;

export function bindScrollbar(scroller: HTMLElement, track: HTMLElement): void {
  const thumb = track.firstElementChild as HTMLElement | null;
  if (!thumb) return;

  let thumbH = 0;
  /** px of scroll per px of thumb travel. */
  let scale = 1;
  let frame = 0;
  let idle = 0;

  const place = () => {
    frame = 0;
    const range = scroller.scrollHeight - scroller.clientHeight;
    const travel = track.clientHeight - thumbH;
    const y = range > 0 ? (scroller.scrollTop / range) * travel : 0;
    thumb.style.transform = `translateY(${Math.min(travel, Math.max(0, y)).toFixed(2)}px)`;
  };

  const measure = () => {
    const range = scroller.scrollHeight - scroller.clientHeight;
    track.toggleAttribute('data-hidden', range <= 1);
    if (range <= 1) return;
    const min = parseFloat(getComputedStyle(track).getPropertyValue('--scrollbar-min')) || 0;
    thumbH = Math.max(min, (track.clientHeight * scroller.clientHeight) / scroller.scrollHeight);
    scale = range / Math.max(1, track.clientHeight - thumbH);
    thumb.style.height = `${thumbH.toFixed(2)}px`;
    place();
  };

  scroller.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(place);
      track.setAttribute('data-scrolling', '');
      window.clearTimeout(idle);
      idle = window.setTimeout(() => track.removeAttribute('data-scrolling'), SCROLLING_MS);
    },
    { passive: true },
  );

  // Size changes: the panel opening (0 → its size), the viewport, images arriving in the content.
  const resize = new ResizeObserver(measure);
  resize.observe(scroller);
  for (const child of scroller.children) resize.observe(child);

  // Dragging the thumb scrolls proportionally.
  let pointerId: number | null = null;
  let startY = 0;
  let startScroll = 0;
  thumb.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    event.preventDefault(); // no text selection while dragging
    pointerId = event.pointerId;
    startY = event.clientY;
    startScroll = scroller.scrollTop;
    thumb.setPointerCapture(event.pointerId);
    track.setAttribute('data-dragging', '');
  });
  thumb.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    scroller.scrollTop = startScroll + (event.clientY - startY) * scale;
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    track.removeAttribute('data-dragging');
  };
  thumb.addEventListener('pointerup', release);
  thumb.addEventListener('pointercancel', release);

  // The thumb sits over the scroller, not in it: pass a wheel over it on to the scroller.
  thumb.addEventListener(
    'wheel',
    (event) => {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1;
      scroller.scrollTop += event.deltaY * unit;
    },
    { passive: true },
  );
}
