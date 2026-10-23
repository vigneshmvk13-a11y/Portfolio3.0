/*
 * Cross-document view transitions (design/layout-and-motion.md → Page transitions).
 * Inlined into <head> by Base.astro: `pagereveal` fires before the first frame, before any module
 * script runs. Plain JS, no imports. Browsers without cross-document view transitions (or with
 * reduced motion, where global.css turns them off) navigate normally.
 *
 * Types, decided by the page being left (pageswap) and handed over in sessionStorage:
 * - expand:   a project card (homepage wheel or More projects) grows into the case-study cover; the rest dissolves.
 * - collapse: the cover shrinks back into the homepage card (Home, or browser back to the homepage).
 * - next / prev: the page slides to the neighbouring project (Previous / Next, swipe, back/forward).
 * Only the two elements that morph get `view-transition-name: case-cover`, and only for that navigation.
 */
(() => {
  if (!('onpagereveal' in window)) return;
  const KEY = 'vt-type';
  const NAME = 'case-cover';
  const root = document.documentElement;
  const TRIGGERS = '[data-card-link], [data-case-nav-prev], [data-case-nav-next], [data-case-nav-home]';
  let clicked = null;

  const pathOf = (url) => new URL(url, location.href).pathname;
  const slugOf = (url) => {
    const match = /^\/work\/([^/]+)\/?$/.exec(pathOf(url));
    return match ? decodeURIComponent(match[1]) : null;
  };
  // A project card is morphed whole (its link carries data-vt-cover): cover, badge and caption together.
  const cardCover = (slug) => document.querySelector(`[data-card-link="${CSS.escape(slug)}"][data-vt-cover]`);
  const pageCover = () => document.querySelector('#case-cover [data-vt-cover]');
  const name = (el) => {
    if (el) el.style.viewTransitionName = NAME;
    return el;
  };
  // The floating nav holds still while the page slides. Named only now: a permanent name would make it
  // a backdrop root and break its blur.
  // Opening a project: the card's caption and badge are hidden before the old page is captured, so only the
  // image grows. Captured on their own, they stayed where the card was (nothing on the new page matches
  // them) and their frosted bar floated over the growing cover; inside the card snapshot they'd grow with it.
  const LABELS = '[data-card-caption], [data-card-badge]';
  const hideLabels = (card) => {
    for (const el of card.querySelectorAll(LABELS)) el.style.visibility = 'hidden';
  };
  const NAMED = '[data-vt-cover], [data-case-nav]';
  const clearNames = () => {
    for (const el of document.querySelectorAll(NAMED)) el.style.viewTransitionName = '';
    for (const el of document.querySelectorAll(LABELS)) el.style.visibility = '';
  };
  const pinNav = () => {
    const nav = document.querySelector('[data-case-nav]');
    if (nav) nav.style.viewTransitionName = 'case-nav';
  };

  // What was tapped: Safari has no navigation.activation to tell us the destination.
  addEventListener(
    'click',
    (event) => {
      clicked = event.target instanceof Element ? event.target.closest(TRIGGERS) : null;
    },
    true,
  );

  addEventListener('pageswap', (event) => {
    sessionStorage.removeItem(KEY);
    const trigger = clicked;
    const intent = root.dataset.vtIntent; // set by the swipe (src/scripts/case-study/navigate.ts)
    clicked = null;
    delete root.dataset.vtIntent;
    if (!event.viewTransition) return;
    const target = event.activation?.entry?.url;
    const page = document.querySelector('[data-case-page]');
    let type = null;

    if (intent === 'next' || intent === 'prev') type = intent;
    else if (trigger?.matches('[data-card-link]')) {
      type = name(trigger) ? 'expand' : null;
      hideLabels(trigger);
    }
    else if (trigger?.matches('[data-case-nav-next]')) type = 'next';
    else if (trigger?.matches('[data-case-nav-prev]')) type = 'prev';
    else if (trigger?.matches('[data-case-nav-home]')) type = name(pageCover()) ? 'collapse' : null;
    else if (page && target) {
      // Browser back / forward.
      const slug = slugOf(target);
      if (pathOf(target) === '/') type = name(pageCover()) ? 'collapse' : null;
      else if (slug === page.dataset.next) type = 'next';
      else if (slug === page.dataset.prev) type = 'prev';
    }
    if (type === 'next' || type === 'prev') pinNav();
    if (type) sessionStorage.setItem(KEY, type);
  });

  addEventListener('pagereveal', (event) => {
    // Names set when this page was left (it may be back from the bfcache) mustn't leak into this transition.
    clearNames();
    const type = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!event.viewTransition || !type) return;

    let cover = null;
    if (type === 'expand') {
      cover = name(pageCover());
    } else if (type === 'collapse') {
      // The card the wheel rests on: ProjectWheel.astro has already placed it from the hash.
      const slug = decodeURIComponent(location.hash.slice(1));
      const card = document.querySelector(
        slug ? `[data-wheel-card][data-slug="${CSS.escape(slug)}"]` : '[data-wheel-card]',
      );
      if (card?.getAttribute('data-offset') === '0') cover = name(cardCover(card.getAttribute('data-slug')));
    } else {
      pinNav();
    }
    // The old cover stays opaque for the whole morph and the new one fades in over it, but only if its
    // image is ready: a still-loading image would be captured as an empty box and flash.
    const img = cover?.querySelector('img');
    if (img && !(img.complete && img.naturalWidth > 0)) root.dataset.vtCoverWait = '';
    root.dataset.vt = type;
    event.viewTransition.finished.finally(() => {
      delete root.dataset.vt;
      delete root.dataset.vtCoverWait;
      clearNames();
    });
  });
})();
