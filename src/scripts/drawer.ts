/**
 * About drawer behaviour. design/layout-and-motion.md → About drawer.
 * The <dialog> does the heavy lifting (inert background, Esc, focus return); this adds
 * open/close wiring, light dismiss where `closedby` isn't supported, the /?about deep link,
 * the mobile compact header, and `drawer:open` / `drawer:close` events for the wheel.
 */
let initialised = false;

export function initAboutDrawer(): void {
  if (initialised) return;
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-about]');
  if (!dialog) return;
  initialised = true;

  const open = (animate = true) => {
    if (dialog.open) return;
    dialog.classList.toggle('no-entrance', !animate);
    dialog.showModal();
    dialog.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('drawer:open'));
    if (!animate) requestAnimationFrame(() => dialog.classList.remove('no-entrance'));
  };

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('[data-about-open]')) {
      event.preventDefault();
      open();
    } else if (target?.closest('[data-about-close]')) {
      dialog.close();
    }
  });

  // Light dismiss for browsers without `closedby="any"`: a click on the dialog box itself is the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && !('closedBy' in HTMLDialogElement.prototype)) dialog.close();
  });

  dialog.addEventListener('close', () => {
    delete dialog.dataset.compact;
    document.dispatchEvent(new CustomEvent('drawer:close'));
  });

  // Mobile compact header: on once the banner block has scrolled out of the drawer.
  const banner = dialog.querySelector('[data-about-banner]');
  const desktop = window.matchMedia('(min-width: 75rem)');
  if (banner) {
    new IntersectionObserver(
      ([entry]) => {
        dialog.toggleAttribute('data-compact', dialog.open && !entry.isIntersecting && !desktop.matches);
      },
      { root: dialog, threshold: 0 },
    ).observe(banner);
  }

  // Deep link: /?about opens on load, without the entrance animation.
  if (new URLSearchParams(window.location.search).has('about')) open(false);
}
