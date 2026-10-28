#!/usr/bin/env node
/**
 * Case-study interaction test (design/layout-and-motion.md → Case study, Page transitions).
 * Drives the system Chrome over the DevTools Protocol with trusted input. No dependency.
 * Usage:  node scripts/test-case-study.mjs [baseUrl]     (run against `pnpm preview` or `pnpm dev`)
 * Checks: tabs (tap scrolls, active follows scroll), floating nav collapse/expand, swipe to the next
 * project, and which page transition each navigation gets (expand, collapse, fade, next, prev).
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4321';
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'case-'));
const flags = ['--hide-scrollbars', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'];
const chrome = spawn(chromePath, process.env.HEADFUL ? flags : ['--headless=new', ...flags]);
const wsUrl = await new Promise((ok) => chrome.stderr.on('data', (c) => { const m = /DevTools listening on (ws:\/\/\S+)/.exec(String(c)); if (m) ok(m[1]); }));
const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
let id = 0; const pending = new Map(); const listeners = new Set();
ws.addEventListener('message', ({ data }) => { const m = JSON.parse(String(data)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); } else for (const l of listeners) l(m); });
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const i = ++id; pending.set(i, { ok, fail }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Records, on every page, which transition the new page revealed with (read a frame later, once
// page-transition.js has run) and how many covers carried the shared view-transition name.
const RECORDER = `addEventListener('pageswap', (e) => sessionStorage.setItem('__swap', String(Boolean(e.viewTransition))));
addEventListener('pagereveal', (e) => requestAnimationFrame(() => {
  window.__vt = { transition: Boolean(e.viewTransition), type: document.documentElement.dataset.vt ?? null,
    named: [...document.querySelectorAll('[data-vt-cover]')].filter((el) => el.style.viewTransitionName).length,
    names: [...document.querySelectorAll('[data-vt-cover]')].map((el) => el.style.viewTransitionName).filter(Boolean).join(','),
    swap: sessionStorage.getItem('__swap') };
}));
sessionStorage.setItem('intro-seen', '1');`;

// Drive the browser's own first tab: Chrome skips view transitions in tabs created over CDP
// (they count as background tabs), so a new target would never show one.
const { targetInfos } = await send('Target.getTargets');
const { targetId } = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER }, sessionId);

async function page(width, height) {
  const mobile = width < 768;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 3 : 1, mobile }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }, sessionId);
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  // Resolves on load, or after 8s (a navigation that never happens fails its check instead of hanging).
  const loaded = () => new Promise((ok) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.delete(l); ok(); } }; listeners.add(l); setTimeout(() => { listeners.delete(l); ok(); }, 8000); });
  return {
    eval: evaluate,
    loaded,
    async goto(path) { const done = loaded(); await send('Page.navigate', { url: BASE + path }, sessionId); await done; await sleep(400); },
    async click(selector) {
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 }, sessionId);
    },
    async hover(selector, ms) {
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }, sessionId);
      await sleep(ms);
    },
    async tap(selector) {
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }, sessionId);
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    async swipe(x0, x1, y, ms = 200, steps = 10) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] }, sessionId);
      for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y }] }, sessionId); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    scroll: (deltaY) => send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: width / 2, y: height / 2, deltaX: 0, deltaY }, sessionId),
    close: async () => {},
  };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ check: name, result: ok ? 'pass' : 'FAIL', detail: String(detail) });
  console.error(`${ok ? 'pass' : 'FAIL'}  ${name}`);
}

const path = () => 'location.pathname + location.hash';

try {
  // Desktop: tabs, nav, and the card ⇄ cover transitions.
  const d = await page(1440, 1024);
  await d.goto('/work/data-mapping/');
  const tabs = await d.eval(`[...document.querySelectorAll('[data-case-tab]')].map((t) => t.textContent.trim()).join(', ')`);
  check('tabs follow page order', tabs === 'Overview, Solution, Final designs, Outcome, Reflection', tabs);

  // The tab row is below the fold at the top of the page; bring it into view (it then sticks).
  await d.eval('window.scrollTo(0, 1200)');
  await sleep(300);
  await d.click('[data-case-tab="outcome"]');
  await sleep(1500);
  const outcome = await d.eval(`({ top: Math.round(document.getElementById('outcome').getBoundingClientRect().top), current: document.querySelector('[aria-current="location"]').dataset.caseTab })`);
  check('tab tap scrolls to its section', Math.abs(outcome.top - 100) <= 2, `section top ${outcome.top}px (scroll-margin 100)`);
  check('tapped tab is current', outcome.current === 'outcome', outcome.current);

  await d.eval(`document.getElementById('solution').scrollIntoView()`);
  await sleep(300);
  check('active tab follows scroll', (await d.eval(`document.querySelector('[aria-current="location"]').dataset.caseTab`)) === 'solution');
  const tabsPosition = `(() => { const t = document.querySelector('[data-case-tabs]'); return getComputedStyle(t).position + (t.hasAttribute('data-unstuck') ? ' unstuck' : ''); })()`;
  check('tabs stick at the top', (await d.eval(tabsPosition)) === 'sticky', await d.eval(tabsPosition));
  // iOS 26 Safari slices a sticky bar resting in its toolbar zone: in the bottom quarter the tabs aren't sticky.
  await d.eval(
    `(() => { const t = document.querySelector('[data-case-tabs]'); window.scrollTo(0, 0); window.scrollBy(0, t.getBoundingClientRect().top - innerHeight * 0.9); })()`,
  );
  await sleep(300);
  check('tabs not sticky in the bottom quarter', (await d.eval(tabsPosition)) === 'static unstuck', await d.eval(tabsPosition));
  const tabsShift = await d.eval(
    `(() => { const t = document.querySelector('[data-case-tabs]'); const a = t.getBoundingClientRect().top; t.removeAttribute('data-unstuck'); const b = t.getBoundingClientRect().top; t.setAttribute('data-unstuck', ''); return b - a; })()`,
  );
  check('dropping sticky moves nothing', tabsShift === 0, `${tabsShift}px`);

  await d.eval('window.scrollTo(0, 0)');
  await sleep(200);
  for (let i = 0; i < 6; i++) { await d.scroll(120); await sleep(40); }
  check('nav hides while scrolling', await d.eval(`document.querySelector('[data-case-nav]').hasAttribute('data-hidden')`));
  await sleep(500);
  check('nav stays hidden when scrolling stops', await d.eval(`document.querySelector('[data-case-nav]').hasAttribute('data-hidden')`));
  // iOS 26 Safari tints its toolbar from fixed elements at the bottom edge: once sunk, the nav is gone.
  check('hidden nav leaves the page (visibility)', (await d.eval(`getComputedStyle(document.querySelector('[data-case-nav]')).visibility`)) === 'hidden');
  await d.scroll(-120);
  await sleep(300);
  check('nav returns on scroll up', !(await d.eval(`document.querySelector('[data-case-nav]').hasAttribute('data-hidden')`)));
  check('shown nav is visible', (await d.eval(`getComputedStyle(document.querySelector('[data-case-nav]')).visibility`)) === 'visible');
  const navWidth = await d.eval(
    `(() => { const n = document.querySelector('[data-case-nav]'); return n.offsetWidth + '/' + n.querySelector('.case-nav__bar').offsetWidth; })()`,
  );
  check('nav box is pill-wide, not full-width', navWidth.split('/')[0] === navWidth.split('/')[1], navWidth);
  await d.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
  await sleep(300);
  check('nav shows at the page end', !(await d.eval(`document.querySelector('[data-case-nav]').hasAttribute('data-hidden')`)));

  const more = await d.eval(`[...document.querySelectorAll('[aria-labelledby="more-projects"] [data-card-link]')].map((a) => a.dataset.cardLink).join(', ')`);
  check('More projects: the next three', more === 'kotak-fyn, nova-design-system, prime-compass', more);

  // Home → card (collapse), then card → cover (expand).
  await d.eval('window.scrollTo(0, 0)'); await sleep(300);
  let arrived = d.loaded();
  await d.click('[data-case-nav-home]');
  await arrived; await sleep(800); // the transition takes 0.5s and blocks input meanwhile
  let vt = await d.eval('window.__vt');
  check('Home → homepage', (await d.eval(path())) === '/', await d.eval(path()));
  check('Home: collapse transition, cover → card', vt?.transition && vt.type === 'collapse' && vt.named === 1, JSON.stringify(vt));

  await sleep(600);
  // Hover first, as a visitor would. (The homepage prerenders the case study on hover, but Chrome turns
  // prerendering off while DevTools is attached, so here the transition runs on a prefetched page.)
  await d.hover('[data-wheel-card][data-offset="0"] [data-card-link]', 1500);
  arrived = d.loaded();
  await d.click('[data-wheel-card][data-offset="0"] [data-card-link]');
  await arrived; await sleep(800); // the transition takes 0.5s and blocks input meanwhile
  vt = await d.eval('window.__vt');
  check('card → case study', (await d.eval(path())) === '/work/data-mapping/', await d.eval(path()));
  check('card: expand transition, card → cover', vt?.transition && vt.type === 'expand' && vt.named === 1, JSON.stringify(vt));

  arrived = d.loaded();
  await d.click('[data-case-nav-next]');
  await arrived; await sleep(800); // the transition takes 0.5s and blocks input meanwhile
  vt = await d.eval('window.__vt');
  check('Next → next project', (await d.eval(path())) === '/work/kotak-fyn/', await d.eval(path()));
  check('Next: slide transition, nothing morphs', vt?.transition && vt.type === 'next' && vt.named === 0, JSON.stringify(vt));

  arrived = d.loaded();
  await d.click('[data-case-nav-prev]');
  await arrived; await sleep(800); // the transition takes 0.5s and blocks input meanwhile
  vt = await d.eval('window.__vt');
  check('Previous: slide back', vt?.transition && vt.type === 'prev', JSON.stringify(vt));

  // Home from a project other than the first zooms back into that card on the wheel.
  arrived = d.loaded();
  await d.click('[data-case-nav-next]');
  await arrived; await sleep(800);
  arrived = d.loaded();
  await d.click('[data-case-nav-home]');
  await arrived; await sleep(800);
  vt = await d.eval('window.__vt');
  check('Home from Fyn → /#kotak-fyn', (await d.eval(path())) === '/#kotak-fyn', await d.eval(path()));
  check('Home from Fyn: collapse into the Fyn card', vt?.transition && vt.type === 'collapse' && vt.named === 1, JSON.stringify(vt));
  check('wheel rests on Fyn', (await d.eval(`document.querySelector('[data-wheel-card][data-offset="0"]').dataset.slug`)) === 'kotak-fyn');

  // Home from the end of a case study (cover off screen) crossfades and the card settles in place:
  // morphing from the off-screen cover made the card fall in from above the screen.
  await d.goto('/work/data-mapping/'); // a full case study: Fyn (NDA) is short enough to keep its cover on screen
  await d.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
  await sleep(600);
  arrived = d.loaded();
  await d.click('[data-case-nav-home]');
  await arrived; await sleep(800);
  vt = await d.eval('window.__vt');
  check('Home from the page end → homepage', (await d.eval(path())) === '/', await d.eval(path()));
  check('Home from the page end: fade, the card settles (no morph)', vt?.transition && vt.type === 'fade' && vt.names === 'card-settle', JSON.stringify(vt));

  // Prime compass's System image links to Nova: a fade, not the slide to the previous project it would
  // otherwise get (Nova is Prime compass's neighbour), and nothing morphs (it isn't Nova's cover).
  await d.goto('/work/prime-compass/');
  await d.eval(`document.querySelector('[data-system-link]').scrollIntoView({ block: 'center' })`);
  await sleep(600);
  arrived = d.loaded();
  await d.click('[data-system-link]');
  await arrived; await sleep(800);
  vt = await d.eval('window.__vt');
  check('System image → Nova case study', (await d.eval(path())) === '/work/nova-design-system/', await d.eval(path()));
  check('System image: fade, nothing morphs', vt?.transition && vt.type === 'fade' && vt.named === 0, JSON.stringify(vt));

  // Floating nav at rest: blurred backdrop (a view-transition-name would make it a backdrop root).
  await d.goto('/work/data-mapping/');
  const navStyle = await d.eval(`(() => { const nav = document.querySelector('[data-case-nav]'); return { name: getComputedStyle(nav).viewTransitionName, blur: getComputedStyle(nav.querySelector('.case-nav__bg')).backdropFilter }; })()`);
  check('nav blur 40px, no transition name at rest', navStyle.name === 'none' && navStyle.blur === 'blur(40px)', JSON.stringify(navStyle));
  await d.eval('window.scrollTo(0, 0)');
  for (let i = 0; i < 6; i++) { await d.scroll(120); await sleep(40); }
  await sleep(500);
  const hiddenBar = await d.eval(`getComputedStyle(document.querySelector('.case-nav__bar')).opacity`);
  await d.scroll(-120);
  await sleep(900);
  const rest = await d.eval(`(() => { const s = (q) => getComputedStyle(document.querySelector(q)); return { prev: s('[data-case-nav-prev]').opacity, next: s('[data-case-nav-next]').opacity, bar: s('.case-nav__bar').opacity }; })()`);
  check('hidden: the bar itself never fades (blur stays live)', hiddenBar === '1', hiddenBar);
  check('after scrolling up: back in full', rest.prev === '1' && rest.next === '1' && rest.bar === '1', JSON.stringify(rest));
  await d.close();

  // Mobile: swipe left goes to the next project; a short drag springs back; the tab row doesn't swipe.
  const m = await page(393, 852);
  await m.goto('/work/data-mapping/');
  await m.swipe(300, 260, 500);
  await sleep(500);
  check('short drag springs back', (await m.eval(path())) === '/work/data-mapping/' && (await m.eval(`getComputedStyle(document.querySelector('[data-case-page]')).transform`)) === 'none');
  const tabY = await m.eval(`Math.round(document.querySelector('[data-case-tabs]').getBoundingClientRect().top + 25)`);
  await m.swipe(300, 60, tabY);
  await sleep(700);
  check('swipe on the tab row stays on the page', (await m.eval(path())).startsWith('/work/data-mapping/'), await m.eval(path()));

  // A committed swipe whose next page is slow to arrive must not leave this page pushed aside
  // (Vignesh, 2026-10-23: the page stayed shifted on the dev server). Every request for the next page,
  // The swipe is pointed at a page nothing prefetched (speculation-rules prefetches bypass request
  // interception), and that request is held until after the check.
  const heldIds = [];
  const hold = (msg) => { if (msg.method === 'Fetch.requestPaused') heldIds.push(msg.params.requestId); };
  listeners.add(hold);
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/work/slow-test/*', requestStage: 'Request' }] }, sessionId);
  // While the navigation is held, Chrome queues Runtime.evaluate; so the page records its own transform
  // 0.7s after the swipe in sessionStorage (same origin, so the 404 it lands on can read it back).
  await m.eval(`(() => {
    const page = document.querySelector('[data-case-page]');
    page.dataset.next = 'slow-test';
    sessionStorage.removeItem('__shift');
    setTimeout(() => sessionStorage.setItem('__shift', getComputedStyle(page).transform), 700);
  })()`);
  await m.swipe(330, 60, 500);
  await sleep(1500);
  const released = m.loaded();
  listeners.delete(hold);
  await send('Fetch.disable', {}, sessionId); // releases the held request (a 404 page)
  await released; await sleep(300);
  const shifted = await m.eval(`sessionStorage.getItem('__shift')`);
  check('slow next page: this page springs back meanwhile', shifted === 'none' && heldIds.length > 0, `transform ${shifted} after 0.7s, ${heldIds.length} request(s) held`);
  await m.goto('/work/data-mapping/');
  let landed = m.loaded();
  await m.swipe(330, 60, 500);
  await landed; await sleep(800);
  vt = await m.eval('window.__vt');
  check('swipe left → next project', (await m.eval(path())) === '/work/kotak-fyn/', await m.eval(path()));
  check('swipe: slide transition', vt?.transition && vt.type === 'next', JSON.stringify(vt));
  landed = m.loaded();
  await m.swipe(60, 330, 500);
  await landed; await sleep(800);
  check('swipe right → previous project', (await m.eval(path())) === '/work/data-mapping/', await m.eval(path()));
  await m.close();

  // Reduced motion: navigation is instant (no view transition).
  const r = await page(1440, 1024);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
  await r.goto('/work/data-mapping/');
  arrived = r.loaded();
  await r.click('[data-case-nav-next]');
  await arrived; await sleep(800);
  vt = await r.eval('window.__vt');
  check('reduced motion: Next is instant', (await r.eval(path())) === '/work/kotak-fyn/' && !vt?.transition, JSON.stringify(vt));
} finally {
  ws.close(); chrome.kill(); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.table(results);
if (results.some((r) => r.result !== 'pass')) process.exit(1);
