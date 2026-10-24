/**
 * MotionCover controller. AGENTS.md → Media rules:
 * - one "active" video plays at a time; covers marked `data-autoplay` (the More projects row) play whenever
 *   they are near the viewport, together, because they are the point of that row;
 * - sources attach only when the cover is near the viewport;
 * - reduced motion or Save-Data → poster only, the video never loads.
 */
import { onReducedMotionChange, prefersSaveData } from '../lib/reduced-motion';

const NEAR_VIEWPORT = '200px';

let initialised = false;
let allowed = true;
let activeCover: HTMLElement | null = null;
const nearViewport = new WeakSet<Element>();

function videoOf(cover: HTMLElement): HTMLVideoElement | null {
  return cover.querySelector('video');
}

function attachSources(video: HTMLVideoElement): void {
  if (video.dataset.attached !== undefined) return;
  const { webm, mp4 } = video.dataset;
  for (const [src, type] of [
    [webm, 'video/webm'],
    [mp4, 'video/mp4'],
  ] as const) {
    if (!src) continue;
    const source = document.createElement('source');
    source.src = src;
    source.type = type;
    video.append(source);
  }
  video.dataset.attached = '';
  video.load();
}

function stop(video: HTMLVideoElement): void {
  video.pause();
  if (video.currentTime > 0) video.currentTime = 0;
  delete video.dataset.playing;
}

function sync(): void {
  for (const video of document.querySelectorAll<HTMLVideoElement>('[data-motion-cover] video')) {
    const cover = video.closest<HTMLElement>('[data-motion-cover]');
    const shouldPlay =
      allowed &&
      cover !== null &&
      (cover === activeCover || cover.hasAttribute('data-autoplay')) &&
      nearViewport.has(cover) &&
      !document.hidden;
    if (!shouldPlay) {
      stop(video);
      continue;
    }
    attachSources(video);
    video
      .play()
      .then(() => {
        video.dataset.playing = '';
      })
      .catch(() => {
        // Autoplay refused (e.g. low-power mode): the poster stays, which is fine.
      });
  }
}

/** Make `cover` the only playing cover. Pass null to stop all. */
export function setActiveCover(cover: HTMLElement | null): void {
  activeCover = cover;
  for (const el of document.querySelectorAll<HTMLElement>('[data-motion-cover]')) {
    el.toggleAttribute('data-active', el === cover);
  }
  sync();
}

export function initMotionCovers(): void {
  if (initialised) return;
  initialised = true;

  const covers = document.querySelectorAll<HTMLElement>('[data-motion-cover]');
  activeCover = document.querySelector<HTMLElement>('[data-motion-cover][data-active]');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) nearViewport.add(entry.target);
        else nearViewport.delete(entry.target);
      }
      sync();
    },
    { rootMargin: NEAR_VIEWPORT },
  );
  for (const cover of covers) {
    if (videoOf(cover)) observer.observe(cover);
  }

  onReducedMotionChange((reduced) => {
    allowed = !reduced && !prefersSaveData();
    sync();
  });
  document.addEventListener('visibilitychange', sync);
}
