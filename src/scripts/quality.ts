/**
 * Adaptive quality (design/rules.md → Performance). The wheel motion is the site's identity, so a
 * slow device keeps it and loses the expensive extras instead: html[data-quality="lite"] drops the
 * caption blur (ProjectWheel.astro) and plays the intro faster (intro.ts).
 *
 * Lite starts on Save-Data, or when frames sampled while the wheel moves are too often slow
 * (`quality` in lib/motion.ts). The verdict is kept for the session; the head script in index.astro
 * applies it before first paint on the next load.
 */
import { quality } from '../lib/motion';
import { prefersSaveData } from '../lib/reduced-motion';

const STORAGE_KEY = 'quality-lite';
const listeners = new Set<() => void>();

export function isLite(): boolean {
  return document.documentElement.dataset.quality === 'lite';
}

/** Calls `callback` once if the page switches to lite later (not if it already is). */
export function onLite(callback: () => void): void {
  listeners.add(callback);
}

function goLite(): void {
  if (isLite()) return;
  document.documentElement.dataset.quality = 'lite';
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage blocked: lite for this page only.
  }
  for (const callback of listeners) callback();
  listeners.clear();
}

/**
 * Samples frame intervals only while the wheel moves (wheel:start → wheel:settle), over a rolling
 * window of the last `quality.sampleFrames` motion frames, judged at each settle. Rolling, so a
 * device that slows down later (heat, battery saver) still switches. Stops once lite.
 */
export function watchQuality(stage: HTMLElement): void {
  if (prefersSaveData()) goLite();
  if (isLite()) return;

  const intervals: number[] = [];
  let last: number | null = null;
  let frame = 0;

  const tick = (now: number) => {
    if (last !== null) {
      intervals.push(now - last);
      if (intervals.length > quality.sampleFrames) intervals.shift();
    }
    last = now;
    frame = requestAnimationFrame(tick);
  };

  stage.addEventListener('wheel:start', () => {
    if (frame || isLite()) return;
    last = null; // idle time between motions isn't a slow frame
    frame = requestAnimationFrame(tick);
  });
  stage.addEventListener('wheel:settle', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (intervals.length < quality.sampleFrames) return;
    const slow = intervals.filter((ms) => ms > quality.slowFrameMs).length;
    if (slow / intervals.length >= quality.slowShare) goLite();
  });
}
