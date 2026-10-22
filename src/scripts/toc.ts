/**
 * Keeps both TOCs (desktop side list, mobile morphing panel) and the mobile handle's ticks and label in
 * sync with the wheel, and turns a plain click on an item into a rotation. Modifier-clicks still open
 * the case study. The mobile panel's open/close and scrubbing live in toc-morph.ts.
 */
import type { WheelController, WheelDetail } from './wheel/controller';

const ACTIVE = ['bg-surface-selected', 'text-fg-strong'];
const INACTIVE = ['text-fg-secondary', 'hover:bg-surface-hover'];

export function bindToc(controller: WheelController): void {
  const items = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];
  const ticks = [...document.querySelectorAll<SVGRectElement>('[data-toc-tick]')];
  const handle = document.querySelector<HTMLButtonElement>('[data-toc-handle]');

  const sync = (index: number) => {
    for (const item of items) {
      const active = Number(item.dataset.index) === index;
      item.classList.remove(...(active ? INACTIVE : ACTIVE));
      item.classList.add(...(active ? ACTIVE : INACTIVE));
      if (active) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }
    for (const tick of ticks) {
      const active = Number(tick.dataset.tocTick) === index;
      tick.classList.toggle('fill-fg-strong', active);
      tick.classList.toggle('fill-line-strong', !active);
    }
    handle?.setAttribute('aria-label', `Projects, ${index + 1} of ${controller.count}`);
  };

  controller.stage.addEventListener('wheel:change', (event) => sync((event as CustomEvent<WheelDetail>).detail.index));
  sync(controller.index);

  for (const item of items) {
    item.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!controller.enabled) return;
      event.preventDefault();
      controller.goTo(Number(item.dataset.index), 'toc');
    });
  }
}
