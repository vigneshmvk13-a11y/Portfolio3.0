/**
 * Keeps both TOCs (desktop side list, mobile popover) and the mobile handle in sync with the wheel,
 * and turns a plain click on an item into a rotation. Modifier-clicks still open the case study.
 */
import type { WheelController, WheelDetail } from './wheel/controller';

const ACTIVE = ['bg-surface-selected', 'text-fg-primary'];
const INACTIVE = ['text-fg-secondary', 'hover:bg-surface-hover'];

export function bindToc(controller: WheelController): void {
  const items = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];
  const ticks = [...document.querySelectorAll<SVGRectElement>('[data-toc-tick]')];
  const handle = document.querySelector<HTMLButtonElement>('[data-toc-handle]');
  const popover = document.getElementById('toc-popover');

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
      tick.classList.toggle('fill-indicator', active);
      tick.classList.toggle('fill-fg-secondary', !active);
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
      const index = Number(item.dataset.index);
      if (popover?.matches(':popover-open')) {
        popover.hidePopover();
        handle?.focus();
      }
      controller.goTo(index, 'toc');
    });
  }
}
