/**
 * Active project ↔ URL hash. On settle: replaceState to #slug (no hash for the first project,
 * so the canonical "/" stays clean). On load and on hashchange: jump/rotate to the slug.
 */
import type { WheelController, WheelDetail } from './wheel/controller';

export function indexFromHash(controller: WheelController): number | null {
  const slug = decodeURIComponent(window.location.hash.slice(1));
  if (!slug) return null;
  const index = controller.slugs.indexOf(slug);
  return index >= 0 ? index : null;
}

export function bindHash(controller: WheelController): void {
  controller.stage.addEventListener('wheel:settle', (event) => {
    const { index, slug } = (event as CustomEvent<WheelDetail>).detail;
    const hash = index === 0 ? '' : `#${slug}`;
    if (window.location.hash === hash) return;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    history.replaceState(history.state, '', url);
  });

  window.addEventListener('hashchange', () => {
    const index = indexFromHash(controller);
    if (index !== null && index !== controller.index) controller.goTo(index, 'hash');
  });
}
