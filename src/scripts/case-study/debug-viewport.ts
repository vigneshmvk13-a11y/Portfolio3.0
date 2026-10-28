/**
 * TEMPORARY, preview branch only (fix/safari-bottom-bar): with ?debug, a readout of what the browser reports
 * for the viewport, the safe area and the floating nav, to size the nav's bottom offset in iOS 26 Safari.
 * Remove before merging to main.
 */
export function showViewportDebug(): void {
  const probe = (css: string): HTMLElement => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;${css}`;
    document.body.append(el);
    return el;
  };
  const safe = probe('height:0;padding-bottom:env(safe-area-inset-bottom)');
  const svh = probe('height:100svh');
  const lvh = probe('height:100lvh');
  const dvh = probe('height:100dvh');

  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;left:8px;top:35%;z-index:100;margin:0;padding:8px;font:11px/1.4 monospace;' +
    'color:var(--color-fg-on-media);background:var(--color-fg-primary);border-radius:8px;pointer-events:none;white-space:pre';
  document.body.append(box);

  const nav = document.querySelector<HTMLElement>('[data-case-nav]');
  const tabs = document.querySelector<HTMLElement>('[data-case-tabs]');
  const vv = window.visualViewport;
  const ua = navigator.userAgent;
  const browser = /CriOS/.test(ua) ? 'Chrome iOS' : /FxiOS/.test(ua) ? 'Firefox iOS' : /Safari/.test(ua) ? 'Safari' : 'other';
  let frame = 0;

  function render(): void {
    frame = 0;
    const r = nav?.getBoundingClientRect();
    const px = (n: number | undefined) => (n === undefined ? '–' : `${Math.round(n * 10) / 10}`);
    box.textContent = [
      `browser        ${browser}`,
      `screen.height  ${screen.height}`,
      `innerHeight    ${window.innerHeight}`,
      `clientHeight   ${document.documentElement.clientHeight}`,
      `vv.height      ${px(vv?.height)}  top ${px(vv?.offsetTop)}`,
      `100svh/lvh/dvh ${svh.offsetHeight} / ${lvh.offsetHeight} / ${dvh.offsetHeight}`,
      `safe-bottom    ${getComputedStyle(safe).paddingBottom}`,
      `nav bottom css ${nav ? getComputedStyle(nav).bottom : '–'}`,
      `nav rect       top ${px(r?.top)}  bottom ${px(r?.bottom)}`,
      `gap to vp end  ${px(r ? window.innerHeight - r.bottom : undefined)}`,
      `nav hidden     ${nav?.hasAttribute('data-hidden') ?? '–'}`,
      `tabs unstuck   ${tabs?.hasAttribute('data-unstuck') ?? '–'}`,
      `scrollY        ${Math.round(window.scrollY)}`,
    ].join('\n');
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  vv?.addEventListener('resize', schedule);
  vv?.addEventListener('scroll', schedule);
  render();
}
