#!/usr/bin/env node
/**
 * Homepage wheel interaction test (design/layout-and-motion.md → Project wheel → Verified).
 * Drives the system Chrome over the DevTools Protocol with trusted input (wheel, keys, touch,
 * clicks) and checks index, hash, TOC, sheet, focus, live region and reduced motion.
 * No dependency. Usage:  node scripts/test-wheel.mjs [baseUrl] [screenshotDir]
 *   e.g. node scripts/test-wheel.mjs http://127.0.0.1:4321   (dev)  or  http://localhost:4321 (preview)
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4321';
const OUT = process.argv[3] ?? tmpdir();
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'wt-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
const wsUrl = await new Promise((ok) => chrome.stderr.on('data', (c) => { const m = /DevTools listening on (ws:\/\/\S+)/.exec(String(c)); if (m) ok(m[1]); }));
const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
let id = 0; const pending = new Map(); const listeners = new Set();
ws.addEventListener('message', ({ data }) => { const m = JSON.parse(String(data)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); } else for (const l of listeners) l(m); });
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const i = ++id; pending.set(i, { ok, fail }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let failures = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) failures++; };

async function page(width, height, { reduced = false, mobile = width < 768, intro = false } = {}) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  // The intro runs once per session; most tests start from the resting state.
  if (!intro) await send('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('intro-seen', '1')" }, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] }, sessionId);
  const errors = [];
  listeners.add((m) => { if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); });
  const p = {
    sessionId, targetId, errors,
    async goto(path, wait = 600) { const loaded = new Promise((ok) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.delete(l); ok(); } }; listeners.add(l); }); await send('Page.navigate', { url: BASE + path }, sessionId); await loaded; await sleep(wait); },
    /** Inline opacity the renderer wrote on card i (1 = front, --wheel-fade at ±1). */
    opacity(i) { return this.eval(`Number(document.querySelectorAll('[data-wheel-card]')[${i}].style.opacity)`); },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId); return r.result.value; },
    state() { return this.eval(`(() => { const s = document.querySelector('[data-wheel]'); return { index: s?.dataset.index, moving: 'moving' in (s?.dataset ?? {}), hash: location.hash, toc: document.querySelector('[data-toc="side"] [aria-current]')?.textContent.trim(), sheet: document.querySelector('[data-bottom-sheet]')?.hasAttribute('data-collapsed'), active: document.querySelector('[data-wheel-card]:not([inert])')?.dataset.slug, status: document.querySelector('[data-wheel-status]')?.textContent, focus: document.activeElement?.closest('[data-wheel-card]')?.dataset.slug ?? document.activeElement?.tagName }; })()`); },
    wheel(deltaY, x = width / 2, y = height / 2) { return send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY }, sessionId); },
    async key(key, code = key, keyCode = 0) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(key === 'Enter' ? { text: '\r' } : {}) }, sessionId); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode }, sessionId); },
    async click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }, sessionId); },
    async drag(x, y0, y1, ms = 160, steps = 8) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }, sessionId);
      for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] }, sessionId); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    async shot(name) { const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); await writeFile(join(OUT, name), Buffer.from(data, 'base64')); },
    close() { return send('Target.closeTarget', { targetId }); },
  };
  return p;
}

try {
  // ---------- Desktop ----------
  const d = await page(1440, 1024);
  await d.goto('/');
  let s = await d.state();
  check('desktop: starts at index 0, no hash', s.index === '0' && s.hash === '', JSON.stringify(s));

  // Scroll-linked: a slow trackpad scroll moves the wheel part-way while the fingers are moving.
  for (let i = 0; i < 6; i++) { await d.wheel(20); await sleep(16); }
  await sleep(60);
  let o = await d.opacity(0);
  s = await d.state();
  check('wheel follows the scroll mid-gesture (front card part-way to its neighbour state)', o > 0.6 && o < 0.97 && s.moving, `opacity=${o} ${JSON.stringify(s)}`);
  await sleep(900);
  s = await d.state();
  check('120px of scroll commits to the next card', s.index === '1', JSON.stringify(s));
  await d.key('Home', 'Home', 36); await sleep(900);

  // A nudge below the commit distance springs back.
  for (let i = 0; i < 3; i++) { await d.wheel(10); await sleep(16); }
  await sleep(900);
  s = await d.state();
  check('small nudge (30px) returns to the same card', s.index === '0' && s.hash === '' && (await d.opacity(0)) === 1, JSON.stringify(s));

  await d.wheel(100);
  await sleep(50);
  o = await d.opacity(0);
  check('mouse notch glides at once (no jump, no pause)', o > 0.3 && o < 0.99, `opacity=${o}`);
  await d.shot('mid-step-1440.png');
  await sleep(100);
  s = await d.state();
  check('mouse notch: next project in focus within 200ms (no pause)', s.active === 'fyn', JSON.stringify(s));
  await sleep(700);
  s = await d.state();
  check('mouse wheel notch steps once to Fyn', s.index === '1' && s.hash === '#fyn' && s.toc?.startsWith('Fyn'), JSON.stringify(s));
  check('live region announces', s.status === 'Fyn- Wholesale Banking app, 2 of 5', s.status);

  // Trackpad flick with an inertia tail (765px in all): the wheel travels with it, ~1.9 cards → 2.
  for (let i = 0; i < 30; i++) { await d.wheel(Math.max(4, 40 - i)); await sleep(16); }
  await sleep(1000);
  s = await d.state();
  check('trackpad flick travels with the scroll distance (2 cards)', s.index === '3', JSON.stringify(s));

  // Scrolling again during the snap adds to it rather than fighting it.
  await d.wheel(100); await sleep(220); await d.wheel(100);
  await sleep(1000);
  s = await d.state();
  check('second notch during the snap continues forward', s.index === '0', JSON.stringify(s));
  // Spinning the mouse wheel: each notch is one project, the spring keeps its speed.
  for (let i = 0; i < 3; i++) { await d.wheel(100); await sleep(40); }
  await sleep(900);
  s = await d.state();
  check('rapid notches ×3 move three projects', s.index === '3', JSON.stringify(s));
  await d.key('Home', 'Home', 36); await sleep(900);
  await d.key('ArrowDown', 'ArrowDown', 40); await sleep(900);
  await d.key('ArrowDown', 'ArrowDown', 40); await sleep(900);

  await d.key('ArrowUp', 'ArrowUp', 38); await sleep(900);
  s = await d.state(); check('ArrowUp steps back', s.index === '1', s.index);
  await d.key('End', 'End', 35); await sleep(1100);
  s = await d.state(); check('End jumps to last (Gyst)', s.index === '4' && s.hash === '#gyst', JSON.stringify(s));
  await d.key('PageDown', 'PageDown', 34); await sleep(900);
  s = await d.state(); check('PageDown wraps last → first, hash cleared', s.index === '0' && s.hash === '', JSON.stringify(s));
  await d.key('Home', 'Home', 36); await sleep(300);
  s = await d.state(); check('Home stays on first', s.index === '0');

  // TOC click on Prime compass (index 3): shortest way is 2 steps back.
  const rect = await d.eval(`(() => { const r = document.querySelectorAll('[data-toc="side"] [data-toc-item]')[3].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await d.eval(`window.__path = []; document.querySelector('[data-wheel]').addEventListener('wheel:change', e => window.__path.push(e.detail.index));`);
  await d.click(rect.x, rect.y); await sleep(1200);
  s = await d.state(); const path = await d.eval('window.__path');
  check('TOC click rotates to Prime compass the short way', s.index === '3' && JSON.stringify(path) === '[4,3]' && s.toc === 'Prime compass', `${JSON.stringify(s)} path=${JSON.stringify(path)}`);

  // Click the lower neighbour → next.
  const below = await d.eval(`(() => { const r = document.querySelector('[data-wheel-card]:not([inert])').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.bottom + 120 }; })()`);
  await d.click(below.x, below.y); await sleep(900);
  s = await d.state(); check('click on lower neighbour steps forward', s.index === '4', s.index);

  // Keyboard focus follows: focus active card link, then ArrowDown.
  await d.eval(`document.querySelector('[data-wheel-card]:not([inert]) a').focus()`);
  await d.key('ArrowDown', 'ArrowDown', 40); await sleep(900);
  s = await d.state(); check('focus moves to the new active card', s.index === '0' && s.focus === 'smart-mapping', JSON.stringify(s));

  // Drawer disables the wheel.
  await d.eval(`document.querySelector('[data-about-open]:not(.hidden *)')?.click() ?? document.querySelectorAll('[data-about-open]')[1].click()`);
  await sleep(400);
  await d.wheel(100); await sleep(900);
  s = await d.state(); check('wheel ignored while About drawer is open', s.index === '0', s.index);
  await d.key('Escape', 'Escape', 27); await sleep(400);
  check('no JS errors (desktop)', d.errors.length === 0, d.errors.join(' | '));
  await d.close();

  // ---------- Deep link ----------
  const h = await page(1440, 1024);
  await h.goto('/#nova');
  s = await h.state();
  const ready = await h.eval(`'wheelReady' in document.documentElement.dataset && getComputedStyle(document.querySelector('.wheel')).opacity`);
  check('deep link /#nova restores Nova and reveals the wheel', s.index === '2' && s.active === 'nova' && ready === '1', `${JSON.stringify(s)} opacity=${ready}`);
  await h.close();

  // ---------- Mobile touch ----------
  const m = await page(393, 852);
  await m.goto('/');
  // Sheet: starts expanded; any swipe collapses it (either direction, any project) and it stays collapsed.
  await m.drag(196, 420, 220);
  await sleep(60);
  s = await m.state();
  check('swipe up: sheet collapses while the wheel moves', s.sheet === true, JSON.stringify(s));
  await sleep(1100);
  s = await m.state();
  check('swipe up: lands on the next project, sheet stays collapsed', s.index === '1' && s.sheet === true, JSON.stringify(s));
  await m.shot('after-swipe-393.png');
  await m.drag(196, 220, 420);
  await sleep(60);
  s = await m.state();
  check('swipe down: sheet collapses too (direction does not matter)', s.sheet === true, JSON.stringify(s));
  await sleep(1100);
  s = await m.state();
  check('swipe down: back on the first project, sheet still collapsed (no auto-reopen)', s.index === '0' && s.sheet === true, JSON.stringify(s));
  await m.drag(196, 400, 100, 90, 6); // fast flick
  await sleep(1400);
  s = await m.state();
  check('fast flick carries momentum (≥ 2 steps)', Number(s.index) >= 2, s.index);
  await m.key('Home', 'Home', 36); await sleep(1200);

  // TOC morph: press and hold, scrub, release.
  const tocState = `(() => { const r = document.querySelector('[data-toc-morph]').getBoundingClientRect(); return { w: Math.round(r.width), open: document.querySelector('[data-toc-handle]').getAttribute('aria-expanded'), hl: document.querySelector('[data-toc-panel] [data-hl]')?.dataset.index, labels: Number(getComputedStyle(document.querySelector('[data-toc-panel]')).opacity), x: r.right - 13, cy: r.top + r.height / 2 }; })()`;
  const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }, m.sessionId);
  let t = await m.eval(tocState);
  check('TOC: collapsed tab at rest', t.w === 27 && t.open === 'false', JSON.stringify(t));
  await touch('touchStart', t.x, t.cy);
  await sleep(90);
  let mid = await m.eval(tocState);
  await m.shot('toc-morph-mid-393.png');
  await sleep(400);
  let full = await m.eval(tocState);
  check('TOC: press morphs the tab into the panel', mid.w > 27 && mid.w < full.w && full.open === 'true' && full.labels === 1 && full.hl === '0', `mid=${JSON.stringify(mid)} open=${JSON.stringify(full)}`);
  await m.shot('toc-open-393.png');
  // Drag down row by row to Gyst (row 4 is 76px below the centre row).
  for (let dy = 4; dy <= 80; dy += 4) { await touch('touchMove', t.x, t.cy + dy); await sleep(16); }
  await sleep(150);
  t = await m.eval(tocState);
  s = await m.state();
  check('TOC: scrubbing highlights the row under the finger, sheet stays collapsed', t.hl === '4' && t.open === 'true' && s.sheet === true, `${JSON.stringify(t)} ${JSON.stringify(s)}`);
  await sleep(900);
  s = await m.state();
  check('TOC: the wheel spins to the finger’s project while still held', s.index === '4' && s.sheet === true, JSON.stringify(s));
  await touch('touchEnd');
  await sleep(700);
  t = await m.eval(tocState);
  s = await m.state();
  check('TOC: release collapses it; wheel stays; sheet stays collapsed', t.w === 27 && t.open === 'false' && s.index === '4' && s.sheet === true, `${JSON.stringify(t)} ${JSON.stringify(s)}`);
  // Dragging past the ends clamps to the first project.
  await touch('touchStart', t.x, t.cy);
  for (let dy = -4; dy >= -200; dy -= 8) { await touch('touchMove', t.x, t.cy + dy); await sleep(16); }
  await touch('touchEnd');
  await sleep(1400);
  s = await m.state();
  check('TOC: scrubbing past the top clamps to the first project', s.index === '0', JSON.stringify(s));
  // Quick tap: opens and stays open; tapping a row picks it and closes.
  t = await m.eval(tocState);
  await touch('touchStart', t.x, t.cy); await sleep(40); await touch('touchEnd');
  await sleep(700);
  t = await m.eval(tocState);
  check('TOC: a quick tap opens it and it stays open', t.open === 'true' && t.labels === 1, JSON.stringify(t));
  const nova = await m.eval(`(() => { const r = document.querySelectorAll('[data-toc-panel] [data-toc-item]')[2].getBoundingClientRect(); return { x: r.x + 40, y: r.y + r.height / 2 }; })()`);
  await touch('touchStart', nova.x, nova.y); await sleep(40); await touch('touchEnd');
  await sleep(1200);
  t = await m.eval(tocState);
  s = await m.state();
  check('TOC: tapping a row rotates to it and closes', s.index === '2' && t.open === 'false', `${JSON.stringify(t)} ${JSON.stringify(s)}`);
  // Tap outside closes; held still then released closes without moving the wheel.
  await touch('touchStart', t.x, t.cy); await sleep(40); await touch('touchEnd'); await sleep(500);
  await touch('touchStart', 60, 120); await sleep(40); await touch('touchEnd'); await sleep(600);
  t = await m.eval(tocState);
  s = await m.state();
  check('TOC: tapping outside only closes it (the tap does not step the wheel)', t.open === 'false' && t.w === 27 && s.index === '2', `${JSON.stringify(t)} ${JSON.stringify(s)}`);
  await touch('touchStart', t.x, t.cy); await sleep(600); await touch('touchEnd'); await sleep(700);
  t = await m.eval(tocState);
  s = await m.state();
  check('TOC: held still and released closes it, wheel unchanged', t.open === 'false' && s.index === '2', `${JSON.stringify(t)} ${JSON.stringify(s)}`);

  // Sheet: only the user reopens it (tap the surface, drag up, or the handle); drag down closes it.
  const sheetState = `(() => { const sh = document.querySelector('[data-bottom-sheet]'); const bg = sh.querySelector('[data-sheet-bg]').getBoundingClientRect(); const g = sh.querySelector('[data-sheet-grabber]'); const intro = getComputedStyle(sh.querySelector('[data-sheet-intro]')); const bar = sh.querySelector('.bottom-sheet__bar').getBoundingClientRect(); const act = sh.querySelector('[data-sheet-actions]').getBoundingClientRect(); return { handleGap: Math.round(act.top - bar.bottom), blur: intro.filter, collapsed: sh.hasAttribute('data-collapsed'), bgTop: Math.round(bg.top), expanded: g.getAttribute('aria-expanded'), label: g.getAttribute('aria-label'), introOpacity: Number(intro.opacity) }; })()`;
  let sh = await m.eval(sheetState);
  check('sheet: collapsed after scrolling, handle says "Show introduction"', sh.collapsed && sh.expanded === 'false' && sh.label === 'Show introduction' && sh.introOpacity === 0, JSON.stringify(sh));
  await touch('touchStart', 60, sh.bgTop + 8); await sleep(40); await touch('touchEnd'); await sleep(900);
  const open = await m.eval(sheetState);
  check('sheet: a tap on the collapsed surface opens it', !open.collapsed && open.expanded === 'true' && open.introOpacity === 1 && open.bgTop < sh.bgTop - 100, `${JSON.stringify(sh)} → ${JSON.stringify(open)}`);
  await m.shot('sheet-open-393.png');
  // Drag down slowly: the intro blurs as it fades, and is gone by halfway.
  {
    const travel = open.bgTop < sh.bgTop ? sh.bgTop - open.bgTop : 0;
    await touch('touchStart', 60, open.bgTop + 60);
    for (let dy = 8; dy <= Math.round(travel * 0.25) + 6; dy += 4) { await touch('touchMove', 60, open.bgTop + 60 + dy); await sleep(16); }
    await sleep(60);
    const quarter = await m.eval(sheetState);
    for (let dy = Math.round(travel * 0.25) + 6; dy <= Math.round(travel * 0.5) + 24; dy += 4) { await touch('touchMove', 60, open.bgTop + 60 + dy); await sleep(16); }
    await sleep(60);
    const half = await m.eval(sheetState);
    await m.shot('sheet-drag-quarter-393.png');
    check('sheet: a quarter of the way down the intro is half faded and blurred', quarter.introOpacity > 0.3 && quarter.introOpacity < 0.7 && quarter.blur.startsWith("blur"), JSON.stringify(quarter));
    check('sheet: by halfway the intro is gone', half.introOpacity === 0, JSON.stringify(half));
    for (let dy = Math.round(travel * 0.5) + 24; dy >= 0; dy -= 8) { await touch('touchMove', 60, open.bgTop + 60 + dy); await sleep(16); }
    await sleep(60);
    const back = await m.eval(sheetState);
    await touch('touchEnd'); await sleep(900);
    check('sheet: dragging back up brings it back (sharp, no blur) and it stays open', back.introOpacity === 1 && (await m.eval(sheetState)).collapsed === false, JSON.stringify(back));
  }
  // Drag down from the middle of the open sheet: it follows the finger, then settles closed.
  await touch('touchStart', 60, open.bgTop + 60);
  for (let dy = 8; dy <= 80; dy += 8) { await touch('touchMove', 60, open.bgTop + 60 + dy); await sleep(16); }
  const dragged = await m.eval(sheetState);
  await touch('touchEnd'); await sleep(900);
  sh = await m.eval(sheetState);
  check('sheet: dragging down follows the finger, then collapses; handle gap is --sheet-handle-gap (24px)', dragged.bgTop > open.bgTop + 50 && dragged.bgTop < sh.bgTop && sh.collapsed && sh.handleGap === 24, `open=${open.bgTop} mid=${dragged.bgTop} end=${JSON.stringify(sh)}`);
  // Fling up from the collapsed surface: opens.
  await touch('touchStart', 60, sh.bgTop + 8);
  for (let dy = 10; dy <= 60; dy += 10) { await touch('touchMove', 60, sh.bgTop + 8 - dy); await sleep(12); }
  await touch('touchEnd'); await sleep(900);
  sh = await m.eval(sheetState);
  s = await m.state();
  check('sheet: a swipe up opens it, and does not move the wheel', !sh.collapsed && s.index === '2', `${JSON.stringify(sh)} ${JSON.stringify(s)}`);
  // The handle is a button: keyboard toggles it (the non-drag alternative).
  await m.eval(`document.querySelector('[data-sheet-grabber]').focus()`);
  await m.key('Enter', 'Enter', 13); await sleep(900);
  sh = await m.eval(sheetState);
  check('sheet: the handle toggles it by keyboard', sh.collapsed && sh.expanded === 'false', JSON.stringify(sh));
  await m.key('Enter', 'Enter', 13); await sleep(900);
  sh = await m.eval(sheetState);
  check('sheet: …and back open', !sh.collapsed && sh.expanded === 'true', JSON.stringify(sh));
  check('no JS errors (mobile)', m.errors.length === 0, m.errors.join(' | '));
  await m.close();

  // Short phone (iPhone Safari leaves ~660px): the card keeps its full design width and clears the sheet.
  const sp = await page(393, 660);
  await sp.goto('/');
  const geo = await sp.eval(`(() => { const c = document.querySelector('[data-wheel-card]:not([inert])'); const sh = document.querySelector('[data-bottom-sheet]').getBoundingClientRect(); const r = c.getBoundingClientRect(); return { w: c.offsetWidth, h: c.offsetHeight, bottom: Math.round(r.bottom), sheetTop: Math.round(sh.top) }; })()`);
  check('short phone: card at full design size, clear of the expanded sheet', geo.w === 353 && geo.bottom <= geo.sheetTop - 19, JSON.stringify(geo));
  await sp.close();

  // ---------- Intro ----------
  const chrome = `(() => { const v = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return cs.visibility === 'visible' ? Number(cs.opacity) : 0; }; return { intro: document.documentElement.dataset.intro, sheet: v('[data-bottom-sheet]'), toc: v('[data-intro-reveal="rise"]'), footer: v('[data-intro-reveal="fade"]') }; })()`;
  const i1 = await page(1440, 1024, { intro: true });
  await i1.goto('/', 0);
  // The spin starts once the intro chunk has loaded and the covers are decoded (slower over a network).
  for (let t = 0; t < 1500 && !(await i1.state()).moving; t += 50) await sleep(50);
  await sleep(150);
  let c = await i1.eval(chrome);
  s = await i1.state();
  check('intro: only the wheel at first, spinning', c.intro === 'pending' && c.sheet === 0 && c.toc === 0 && c.footer === 0 && s.moving, `${JSON.stringify(c)} ${JSON.stringify(s)}`);
  await i1.shot('intro-spin-1440.png');
  await sleep(1150);
  c = await i1.eval(chrome);
  s = await i1.state();
  check('intro: lands on the first project, then reveals', c.intro === 'done' && s.index === '0' && !s.moving && s.hash === '' && s.status === '', `${JSON.stringify(c)} ${JSON.stringify(s)}`);
  await sleep(900);
  c = await i1.eval(chrome);
  check('intro: hero text, TOC and footer fully shown', c.sheet === 1 && c.toc === 1 && c.footer === 1, JSON.stringify(c));
  await i1.goto('/', 300);
  c = await i1.eval(chrome);
  check('intro: not again in the same session', c.intro === undefined && c.sheet === 1, JSON.stringify(c));
  check('no JS errors (intro)', i1.errors.length === 0, i1.errors.join(' | '));
  await i1.close();

  const i2 = await page(1440, 1024, { intro: true });
  await i2.goto('/', 400);
  await i2.key('ArrowDown', 'ArrowDown', 40);
  await sleep(60);
  c = await i2.eval(chrome);
  check('intro: any input skips to the final state', c.intro === 'done' && c.sheet === 1 && c.toc === 1, JSON.stringify(c));
  await sleep(900);
  s = await i2.state();
  check('intro: the skipping key still steps the wheel', s.index === '1', JSON.stringify(s));
  await i2.close();

  const i3 = await page(393, 852, { intro: true });
  await i3.goto('/', 300);
  c = await i3.eval(chrome);
  check('intro (mobile): sheet hidden while spinning', c.intro === 'pending' && c.sheet === 0, JSON.stringify(c));
  await i3.shot('intro-spin-393.png');
  await sleep(2300);
  c = await i3.eval(chrome);
  s = await i3.state();
  check('intro (mobile): lands on first, sheet shown and expanded', c.intro === 'done' && c.sheet === 1 && s.index === '0' && s.sheet === false, `${JSON.stringify(c)} ${JSON.stringify(s)}`);
  await i3.shot('intro-done-393.png');
  await i3.close();

  const i4 = await page(1440, 1024, { intro: true });
  await i4.goto('/#nova', 300);
  c = await i4.eval(chrome);
  check('intro: skipped for a deep link', c.intro === undefined, JSON.stringify(c));
  await i4.close();

  // ---------- Reduced motion ----------
  const r = await page(1440, 1024, { reduced: true, intro: true });
  await r.goto('/');
  c = await r.eval(chrome);
  check('reduced motion: no intro', c.intro === undefined && c.sheet === 1, JSON.stringify(c));
  await r.wheel(100); await sleep(60);
  s = await r.state();
  check('reduced motion: a notch starts a short turn', s.moving, JSON.stringify(s));
  await sleep(300);
  s = await r.state();
  check('reduced motion: the turn lands within ~0.2s', s.index === '1' && !s.moving, JSON.stringify(s));
  await r.wheel(30); await sleep(20); await r.wheel(30); await sleep(300);
  s = await r.state();
  check('reduced motion: no scroll-linked movement', s.index === '1' && (await r.opacity(1)) === 1, JSON.stringify(s));
  await r.close();

  // ---------- Adaptive quality ----------
  const blur = `(() => ({ quality: document.documentElement.dataset.quality, blur: getComputedStyle(document.querySelector('[data-card-caption]')).backdropFilter }))()`;
  const q1 = await page(1440, 1024);
  await q1.goto('/');
  for (let i = 0; i < 4; i++) { await q1.wheel(100); await sleep(700); }
  let q = await q1.eval(blur);
  check('quality: a fast device stays full (caption blur on)', q.quality === undefined && q.blur !== 'none', JSON.stringify(q));
  // Simulate a slow device: every frame burns ~25ms of main thread.
  await q1.eval(`(function burn() { const t = performance.now(); while (performance.now() - t < 25); requestAnimationFrame(burn); })()`);
  for (let i = 0; i < 4; i++) { await q1.wheel(100); await sleep(900); }
  q = await q1.eval(blur);
  s = await q1.state();
  check('quality: slow frames switch to lite (no caption blur), wheel still works', q.quality === 'lite' && q.blur === 'none' && s.index === '3', `${JSON.stringify(q)} ${JSON.stringify(s)}`);
  await q1.goto('/');
  q = await q1.eval(blur);
  check('quality: lite is applied before paint on the next load', q.quality === 'lite' && q.blur === 'none', JSON.stringify(q));
  check('no JS errors (quality)', q1.errors.length === 0, q1.errors.join(' | '));
  await q1.close();
} finally {
  ws.close(); chrome.kill(); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
