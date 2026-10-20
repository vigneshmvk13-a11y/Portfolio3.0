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

async function page(width, height, { reduced = false, mobile = width < 768 } = {}) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] }, sessionId);
  const errors = [];
  listeners.add((m) => { if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); });
  const p = {
    sessionId, targetId, errors,
    async goto(path) { const loaded = new Promise((ok) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.delete(l); ok(); } }; listeners.add(l); }); await send('Page.navigate', { url: BASE + path }, sessionId); await loaded; await sleep(600); },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId); return r.result.value; },
    state() { return this.eval(`(() => { const s = document.querySelector('[data-wheel]'); return { index: s?.dataset.index, moving: 'moving' in (s?.dataset ?? {}), hash: location.hash, toc: document.querySelector('[data-toc="side"] [aria-current]')?.textContent.trim(), sheet: document.querySelector('[data-bottom-sheet]')?.hasAttribute('data-collapsed'), active: document.querySelector('[data-wheel-card]:not([inert])')?.dataset.slug, status: document.querySelector('[data-wheel-status]')?.textContent, focus: document.activeElement?.closest('[data-wheel-card]')?.dataset.slug ?? document.activeElement?.tagName }; })()`); },
    wheel(deltaY, x = width / 2, y = height / 2) { return send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY }, sessionId); },
    async key(key, code = key, keyCode = 0) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode }, sessionId); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode }, sessionId); },
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

  await d.wheel(100);
  await sleep(80);
  await d.shot('mid-step-1440.png');
  await sleep(900);
  s = await d.state();
  check('mouse wheel notch steps once to Fyn', s.index === '1' && s.hash === '#fyn' && s.toc?.startsWith('Fyn'), JSON.stringify(s));
  check('live region announces', s.status === 'Fyn- Wholesale Banking app, 2 of 5', s.status);

  // Trackpad flick: many small deltas with an inertia tail → exactly one step.
  for (let i = 0; i < 30; i++) { await d.wheel(Math.max(4, 40 - i)); await sleep(16); }
  await sleep(1000);
  s = await d.state();
  check('trackpad flick with inertia steps exactly once', s.index === '2', JSON.stringify(s));

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
  await m.drag(196, 420, 220);
  await sleep(1000);
  s = await m.state();
  check('swipe up moves to next and collapses the sheet', s.index === '1' && s.sheet === true, JSON.stringify(s));
  await m.shot('after-swipe-393.png');
  await m.drag(196, 220, 420);
  await sleep(1000);
  s = await m.state();
  check('swipe down returns to first and expands the sheet', s.index === '0' && s.sheet === false, JSON.stringify(s));
  await m.drag(196, 400, 100, 90, 6); // fast flick
  await sleep(1200);
  s = await m.state();
  check('fast flick carries momentum (≥ 2 steps)', Number(s.index) >= 2, s.index);
  check('no JS errors (mobile)', m.errors.length === 0, m.errors.join(' | '));
  await m.close();

  // ---------- Reduced motion ----------
  const r = await page(1440, 1024, { reduced: true });
  await r.goto('/');
  await r.wheel(100); await sleep(60);
  s = await r.state();
  check('reduced motion: step is instant', s.index === '1' && !s.moving, JSON.stringify(s));
  await r.close();
} finally {
  ws.close(); chrome.kill(); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
