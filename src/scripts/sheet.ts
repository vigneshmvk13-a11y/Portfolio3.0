/**
 * Mobile bottom sheet: a forward step collapses it, a backward step or returning to the first
 * project expands it (design/layout-and-motion.md → Bottom sheet). Desktop ignores the attribute.
 */
import { shortestDelta } from './wheel/geometry';
import type { WheelController, WheelDetail } from './wheel/controller';

export function bindSheet(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  if (!sheet) return;

  controller.stage.addEventListener('wheel:change', (event) => {
    const { index, from = index } = (event as CustomEvent<WheelDetail>).detail;
    const forward = shortestDelta(from, index, controller.count) > 0;
    sheet.toggleAttribute('data-collapsed', index !== 0 && forward);
  });
}
