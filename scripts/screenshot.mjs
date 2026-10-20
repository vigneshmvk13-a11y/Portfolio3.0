#!/usr/bin/env node
/**
 * Screenshots a URL at exact viewport sizes by driving the system Chrome over the
 * DevTools Protocol (Node's built-in WebSocket). No dependency (AGENTS.md → Verification).
 * `--window-size` alone can't go below ~500px wide in headless Chrome, so viewports are emulated.
 *
 *   node scripts/screenshot.mjs <url> <outDir> [393x852 412x915 1440x1024 …]
 *
 * Env:
 *   CHROME_PATH      browser binary override
 *   REDUCED_MOTION=1 emulate prefers-reduced-motion: reduce
 *   FULL_PAGE=1      capture the whole document, not just the viewport
 *   DELAY=ms         wait after load (default 800)
 *   DPR=n            device pixel ratio (default 1)
 *   EVAL="js"        run in the page after load (e.g. open a popover), then wait DELAY again
 *   SUFFIX=name      appended to the file name
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const [url, outDir = 'screenshots', ...sizes] = process.argv.slice(2);
if (!url) {
  console.error('Usage: node scripts/screenshot.mjs <url> <outDir> [WxH …]');
  process.exit(1);
}
const chromePath = CANDIDATES.find((path) => existsSync(path));
if (!chromePath) {
  console.error('No Chrome/Edge found; set CHROME_PATH.');
  process.exit(1);
}

const viewports = (sizes.length ? sizes : ['393x852', '412x915', '1440x1024']).map((s) => s.split('x').map(Number));
const delay = Number(process.env.DELAY ?? 800);
const dpr = Number(process.env.DPR ?? 1);
const slug = new URL(url).pathname.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'home';
await mkdir(outDir, { recursive: true });

const profile = await mkdtemp(join(tmpdir(), 'shot-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
]);

const wsUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20_000);
  chrome.stderr.on('data', (chunk) => {
    const match = /DevTools listening on (ws:\/\/\S+)/.exec(String(chunk));
    if (match) {
      clearTimeout(timer);
      resolveUrl(match[1]);
    }
  });
});

const socket = new WebSocket(wsUrl);
await new Promise((ok) => socket.addEventListener('open', ok, { once: true }));
let nextId = 0;
const pending = new Map();
const listeners = new Set();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(String(data));
  if (message.id && pending.has(message.id)) {
    const { ok, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else ok(message.result);
  } else if (message.method) {
    for (const listener of listeners) listener(message);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((ok, fail) => {
    const id = ++nextId;
    pending.set(id, { ok, fail });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
const once = (method, sessionId) =>
  new Promise((ok) => {
    const listener = (message) => {
      if (message.method === method && message.sessionId === sessionId) {
        listeners.delete(listener);
        ok(message.params);
      }
    };
    listeners.add(listener);
  });

try {
  for (const [width, height] of viewports) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const mobile = width < 768;
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile }, sessionId);
    if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
    if (process.env.REDUCED_MOTION) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
    }
    const loaded = once('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url }, sessionId);
    await loaded;
    await new Promise((ok) => setTimeout(ok, delay));
    if (process.env.EVAL) {
      // e.g. EVAL="document.querySelector('[data-toc-handle]').click()"
      await send('Runtime.evaluate', { expression: process.env.EVAL, userGesture: true }, sessionId);
      await new Promise((ok) => setTimeout(ok, delay));
    }

    const params = { format: 'png' };
    if (process.env.FULL_PAGE) {
      // Grow the viewport to the document so lazy images below the fold load too.
      const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
      const fullHeight = Math.ceil(cssContentSize.height);
      await send('Emulation.setDeviceMetricsOverride', { width, height: fullHeight, deviceScaleFactor: dpr, mobile }, sessionId);
      await new Promise((ok) => setTimeout(ok, delay));
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width, height: fullHeight, scale: 1 };
    }
    const { data } = await send('Page.captureScreenshot', params, sessionId);
    const suffix = process.env.SUFFIX ? `-${process.env.SUFFIX}` : '';
    const file = resolve(join(outDir, `${slug}-${width}${suffix}.png`));
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log(file);
    await send('Target.closeTarget', { targetId });
  }
} finally {
  socket.close();
  chrome.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
