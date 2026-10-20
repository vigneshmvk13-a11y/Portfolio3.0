const query = '(prefers-reduced-motion: reduce)';

/** True when the user asks for reduced motion. Safe to call during SSR (returns false). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

/** Calls `callback` now and whenever the preference changes. Returns an unsubscribe function. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const mql = window.matchMedia(query);
  const handler = () => callback(mql.matches);
  handler();
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/** True when the browser asks to save data (Chromium only; others return false). */
export function prefersSaveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}
