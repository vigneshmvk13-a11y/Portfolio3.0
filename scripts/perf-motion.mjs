#!/usr/bin/env node
/**
 * Frame-rate check for every homepage motion (AGENTS.md → Motion rules: 60fps).
 * Drives the system Chrome over the DevTools Protocol with trusted input, records every
 * requestAnimationFrame timestamp while each motion runs, and reports fps and missed frames.
 * No dependency. Usage:  node scripts/perf-motion.mjs [baseUrl]
 * Env: THROTTLE=n  CPU slowdown (e.g. 4 ≈ a mid-range phone)   HEADFUL=1  real window (real GPU vsync)
 * A frame counts as missed when its interval exceeds 1.5 × the display's frame time.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4321';
const THROTTLE = Number(process.env.THROTTLE ?? 1);
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'perf-'));
const flags = ['--hide-scrollbars', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'];
const chrome = spawn(chromePath, process.env.HEADFUL ? flags : ['--headless=new', ...flags]);
const wsUrl = await new Promise((ok) => chrome.stderr.on('data', (c) => { const m = /DevTools listening on (ws:\/\/\S+)/.exec(String(c)); if (m) ok(m[1]); }));
const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
let id = 0; const pending = new Map(); const listeners = new Set();
ws.addEventListener('message', ({ data }) => { const m = JSON.parse(String(data)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); } else for (const l of listeners) l(m); });
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const i = ++id; pending.set(i, { ok, fail }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
/** The browser's own first tab (see page()). */
const INITIAL_TAB = (await send('Target.getTargets')).targetInfos.find((t) => t.type === 'page').targetId;

// Records rAF timestamps from document start (so the intro is covered) until __perf.stop().
// Each start() bumps a generation, so a restarted recording never runs two loops at once.
const RECORDER = `window.__perf = {
  frames: [], gen: 0,
  start() { const gen = ++this.gen; this.frames = []; const loop = (t) => { if (this.gen !== gen) return; this.frames.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); },
  stop() { this.gen++; return this.frames; },
  /** Frames from the first wheel motion on (for the intro: excludes page load). */
  sinceMotion() { this.gen++; const t = this.motionAt ?? 0; const i = this.frames.findIndex((f) => f >= t); return this.frames.slice(Math.max(0, i - 1)); },
};
document.addEventListener('wheel:start', () => { window.__perf.motionAt ??= performance.now(); });
window.__perf.start();`;

/** `initial`: drive the browser's first tab. Chrome skips view transitions in tabs created over CDP. */
async function page(width, height, { intro = false, reduced = false, initial = false } = {}) {
  const mobile = width < 768;
  const { targetId } = initial ? { targetId: INITIAL_TAB } : await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 3 : 1, mobile }, sessionId);
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] }, sessionId);
  if (THROTTLE > 1) await send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }, sessionId);
  if (!intro) await send('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('intro-seen', '1')" }, sessionId);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER }, sessionId);
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  return {
    async goto(path = '/') { const loaded = new Promise((ok) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.delete(l); ok(); } }; listeners.add(l); }); await send('Page.navigate', { url: BASE + path }, sessionId); await loaded; },
    eval: evaluate,
    /** Run `act`, then record frames for `ms`. */
    async measure(act, ms) { await evaluate('window.__perf.start()'); await act(); await sleep(ms); return evaluate('window.__perf.stop()'); },
    wheel: (deltaY) => send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: width / 2, y: height / 2, deltaX: 0, deltaY }, sessionId),
    touch: (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }, sessionId),
    async drag(x, y0, y1, ms = 200, steps = 12) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }, sessionId);
      for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] }, sessionId); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    /** Click `selector` (trusted mouse input) and record frames for `ms` in the page that's showing then. */
    async click(selector) {
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 }, sessionId);
    },
    /** Navigate by `act`, then return the new page's frames from its first one (the recorder starts at document start). */
    async transition(act, ms) {
      const loaded = new Promise((ok) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.frameNavigated') { listeners.delete(l); ok(); } }; listeners.add(l); });
      await act(); await loaded; await sleep(ms);
      return evaluate('window.__perf.stop()');
    },
    swipeX: async (x0, x1, y, ms = 200, steps = 12) => {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] }, sessionId);
      for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y }] }, sessionId); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    close: () => (initial ? Promise.resolve() : send('Target.closeTarget', { targetId })),
  };
}

const rows = [];
function report(name, frames) {
  const intervals = frames.slice(1).map((t, i) => t - frames[i]).filter((d) => d > 0);
  const sorted = [...intervals].sort((a, b) => a - b);
  const frameTime = sorted[Math.floor(sorted.length / 2)] ?? 0; // median ≈ display refresh
  const missed = intervals.filter((d) => d > frameTime * 1.5).length;
  // VERBOSE=1: where the slow frames fall (frame index, ms).
  if (process.env.VERBOSE && missed) console.log(name, intervals.flatMap((d, i) => (d > frameTime * 1.5 ? [`#${i}: ${d.toFixed(1)}ms`] : [])).join(', '));
  const duration = frames.at(-1) - frames[0];
  rows.push({
    motion: name,
    'refresh Hz': Math.round(1000 / frameTime),
    fps: Math.round(((frames.length - 1) / duration) * 1000),
    'p95 ms': sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1),
    'max ms': sorted.at(-1)?.toFixed(1),
    missed: `${missed}/${intervals.length}`,
  });
}

try {
  const d = await page(1440, 1024);
  await d.goto('/');
  await sleep(800);
  report('desktop: one mouse notch', await d.measure(() => d.wheel(100), 700));
  report('desktop: rapid notches ×6', await d.measure(async () => { for (let i = 0; i < 6; i++) { await d.wheel(100); await sleep(45); } }, 900));
  report('desktop: trackpad scroll', await d.measure(async () => { for (let i = 0; i < 40; i++) { await d.wheel(Math.max(3, 30 - i)); await sleep(16); } }, 800));
  report('desktop: About drawer open', await d.measure(() => d.eval(`document.querySelectorAll('[data-about-open]')[1].click()`), 700));
  await d.close();

  const dr = await page(1440, 1024, { reduced: true });
  await dr.goto('/');
  await sleep(800);
  report('desktop: reduced-motion turn', await dr.measure(() => dr.wheel(100), 500));
  await dr.close();

  const di = await page(1440, 1024, { intro: true });
  await di.goto('/');
  await sleep(2300);
  report('desktop: intro (spin + reveal)', await di.eval('window.__perf.sinceMotion()'));
  await di.close();

  const m = await page(393, 852);
  await m.goto('/');
  await sleep(800);
  report('mobile: swipe + sheet collapse', await m.measure(() => m.drag(196, 450, 250), 900));
  report('mobile: swipe back (sheet stays collapsed)', await m.measure(() => m.drag(196, 250, 450), 1300));
  // Sheet: tap the collapsed surface to open it, then drag it back down.
  const sheetTop = await m.eval("Math.round(document.querySelector('[data-sheet-bg]').getBoundingClientRect().top)");
  report('mobile: sheet open (tap)', await m.measure(async () => { await m.touch('touchStart', 60, sheetTop + 8); await m.touch('touchEnd'); }, 600));
  const openTop = await m.eval("Math.round(document.querySelector('[data-sheet-bg]').getBoundingClientRect().top)");
  report('mobile: sheet drag down + settle', await m.measure(async () => { await m.touch('touchStart', 60, openTop + 60); for (let dy = 8; dy <= 96; dy += 8) { await m.touch('touchMove', 60, openTop + 60 + dy); await sleep(16); } await m.touch('touchEnd'); }, 700));
  const closedTop = await m.eval("Math.round(document.querySelector('[data-sheet-bg]').getBoundingClientRect().top)");
  report('mobile: sheet quick flick up', await m.measure(async () => { await m.touch('touchStart', 60, closedTop + 8); for (let dy = 12; dy <= 48; dy += 12) { await m.touch('touchMove', 60, closedTop + 8 - dy); await sleep(16); } await m.touch('touchEnd'); }, 500));
  // TOC: press the tab (morph open), scrub down through every row (wheel spins), release (morph closed).
  const tab = await m.eval(`(() => { const r = document.querySelector('[data-toc-morph]').getBoundingClientRect(); return { x: r.right - 13, y: r.top + r.height / 2 }; })()`);
  report('mobile: TOC press → open', await m.measure(() => m.touch('touchStart', tab.x, tab.y), 500));
  report('mobile: TOC scrub (wheel spins)', await m.measure(async () => { for (let dy = 0; dy <= 80; dy += 4) { await m.touch('touchMove', tab.x, tab.y + dy); await sleep(16); } }, 700));
  report('mobile: TOC release → close', await m.measure(() => m.touch('touchEnd'), 600));
  // About: the sheet grows into it and plays back (design/layout-and-motion.md → About).
  await sleep(400);
  report('mobile: About open (sheet grows)', await m.measure(() => m.eval(`document.querySelector('[data-sheet-actions] [data-about-open]').click()`), 800));
  report('mobile: About gallery Next', await m.measure(() => m.eval(`document.querySelector('[data-gallery-next]').click()`), 700));
  report('mobile: About close (plays back)', await m.measure(() => m.eval(`document.querySelector('[data-about-close]').click()`), 800));
  await m.eval(`document.querySelector('[data-sheet-actions] [data-about-open]').click()`);
  await sleep(900);
  const grip = await m.eval(`(() => { const r = document.querySelector('[data-about-grabber]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  report('mobile: About handle drag down + close', await m.measure(async () => { await m.touch('touchStart', grip.x, grip.y); for (let dy = 12; dy <= 360; dy += 12) { await m.touch('touchMove', grip.x, grip.y + dy); await sleep(16); } await m.touch('touchEnd'); }, 800));
  await m.close();

  // First run (src/scripts/first-run.ts): left alone, the sheet collapses, the card peeks, the TOC tab peeks.
  const fr = await page(393, 852);
  await fr.goto('/');
  await sleep(2300);
  report('mobile: first run (collapse + nudge + TOC peek)', await fr.measure(async () => {}, 2400));
  const frTop = await fr.eval("Math.round(document.querySelector('[data-sheet-bg]').getBoundingClientRect().top)");
  report('mobile: sideways swipe on the sheet turns the wheel', await fr.measure(() => fr.swipeX(320, 120, frTop + 40, 250), 900));
  await fr.close();

  const mi = await page(393, 852, { intro: true });
  await mi.goto('/');
  await sleep(2300);
  report('mobile: intro (spin + sheet)', await mi.eval('window.__perf.sinceMotion()'));
  await mi.close();

  // Case study (design/layout-and-motion.md → Case study).
  const c = await page(1440, 1024);
  await c.goto('/work/smart-mapping/');
  await sleep(600);
  report('case desktop: nav hides (scroll down)', await c.measure(async () => { for (let i = 0; i < 6; i++) { await c.wheel(100); await sleep(40); } }, 900));
  report('case desktop: nav returns (scroll up)', await c.measure(() => c.wheel(-120), 900));
  report('case desktop: tab tap (pill + smooth scroll)', await c.measure(() => c.click('[data-case-tab="outcome"]'), 1200));
  await c.close();

  const cm = await page(393, 852);
  await cm.goto('/work/smart-mapping/');
  await sleep(600);
  report('case mobile: swipe follow + spring back', await cm.measure(() => cm.swipeX(300, 220, 500), 600));
  await cm.close();

  // Page transitions run only in the browser's own tab (see page()).
  const t = await page(1440, 1024, { initial: true });
  await t.goto('/');
  await sleep(800);
  report('transition: card → case-study cover', await t.transition(() => t.click('[data-wheel-card][data-offset="0"] [data-card-link]'), 700));
  await sleep(300);
  report('transition: Next (slide)', await t.transition(() => t.click('[data-case-nav-next]'), 700));
  await sleep(300);
  report('transition: Home from Fyn (cover → Fyn card)', await t.transition(() => t.click('[data-case-nav-home]'), 700));
  await sleep(300);
  await t.goto('/work/smart-mapping/');
  await sleep(600);
  await t.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
  await sleep(600);
  report('transition: Home from the page end (fade + card settle)', await t.transition(() => t.click('[data-case-nav-home]'), 700));
} finally {
  ws.close(); chrome.kill(); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.log(`CPU throttle ${THROTTLE}×${process.env.HEADFUL ? ', headful' : ', headless'}`);
console.table(rows);
