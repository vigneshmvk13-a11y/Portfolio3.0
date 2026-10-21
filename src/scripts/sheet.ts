/**
 * Mobile bottom sheet (design/layout-and-motion.md → Bottom sheet): it collapses as soon as the wheel
 * starts moving, in either direction and on any project, and expands again `sheet.expandDelay` after
 * the wheel settles, unless a finger is still on the TOC (toc:hold / toc:release). Desktop ignores the
 * attribute. The intro and initial placement don't count as the user scrolling.
 */
import { sheet as timing } from '../lib/motion';
import type { WheelController, WheelDetail } from './wheel/controller';

export function bindSheet(controller: WheelController): void {
  const sheet = document.querySelector<HTMLElement>('[data-bottom-sheet]');
  if (!sheet) return;

  let held = false;
  let expandTimer = 0;

  const collapse = () => {
    window.clearTimeout(expandTimer);
    sheet.setAttribute('data-collapsed', '');
  };
  const expandSoon = () => {
    window.clearTimeout(expandTimer);
    expandTimer = window.setTimeout(() => {
      if (!held && !controller.moving) sheet.removeAttribute('data-collapsed');
    }, timing.expandDelay * 1000);
  };

  controller.stage.addEventListener('wheel:start', (event) => {
    const { via } = (event as CustomEvent<WheelDetail>).detail;
    if (via !== 'intro' && via !== 'init') collapse();
  });
  controller.stage.addEventListener('wheel:settle', () => {
    if (sheet.hasAttribute('data-collapsed')) expandSoon();
  });

  document.addEventListener('toc:hold', () => {
    held = true;
    collapse();
  });
  document.addEventListener('toc:release', () => {
    held = false;
    if (!controller.moving) expandSoon();
  });
}
