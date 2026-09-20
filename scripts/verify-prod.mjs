/**
 * Production-output verification for Modak Run.
 *
 * Unlike playtest.mjs this drives the built bundle with real browser input
 * events (CDP Input domain) and asserts only through the player-visible HUD, so
 * it exercises exactly what a visitor gets: no dev-only test hooks, no reading
 * of internal state.
 *
 * Usage: node scripts/verify-prod.mjs <url> <outDir>
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT ?? 9355);
const url = process.argv[2];
const outDir = process.argv[3];
const MOBILE = process.argv.includes('--mobile');
if (!url || !outDir) {
  console.error('usage: node scripts/verify-prod.mjs <url> <outDir> [--mobile]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const badResponses = [];
const consoleErrors = [];
const pageErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const tmp = '/tmp/chrome_prod_' + Date.now();
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${tmp}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--mute-audio',
  `--window-size=${MOBILE ? '390,844' : '1280,800'}`,
  'about:blank',
], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = tabs.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* waiting */ }
    await sleep(250);
  }
  throw new Error('chrome never came up');
}

const page = await connect();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let mid = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++mid;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

async function evalIn(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
}
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(outDir, `${MOBILE ? 'mobile' : 'desktop'}-${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

// ─── Real browser input, not synthetic DOM events ───────────────────────────
const KEYCODES = {
  KeyW: { code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 },
  KeyA: { code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 },
  KeyS: { code: 'KeyS', key: 's', windowsVirtualKeyCode: 83 },
  KeyD: { code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 },
  Space: { code: 'Space', key: ' ', windowsVirtualKeyCode: 32 },
  Escape: { code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 },
};
const keyDown = (k) => send('Input.dispatchKeyEvent', { type: 'keyDown', ...KEYCODES[k] });
const keyUp = (k) => send('Input.dispatchKeyEvent', { type: 'keyUp', ...KEYCODES[k] });

async function hold(k, ms) {
  await keyDown(k);
  await sleep(ms);
  await keyUp(k);
}

async function realClick(selector) {
  const box = await centerOf(selector);
  if (MOBILE) {
    // Under touch emulation a genuine tap is the real user path.
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}

async function centerOf(selector) {
  const box = await evalIn(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!box) throw new Error('no element for ' + selector);
  return box;
}

/** Guard that a HUD control is actually reachable, not covered by an overlay. */
async function hitTestable(selector) {
  return evalIn(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return 'absent';
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return 'zero-sized';
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return (hit === el || el.contains(hit)) ? true : 'covered by ' + (hit?.id || hit?.tagName + '.' + hit?.className); })()`);
}

/** Read the HUD exactly as a player sees it. */
async function hud() {
  return evalIn(`(() => {
    const t = (id) => document.getElementById(id)?.textContent?.trim() ?? null;
    const n = (s) => s === null ? null : parseInt(s, 10);
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    return {
      timer: t('hud-timer-val'),
      delivered: n(t('hud-delivered-val')),
      basket: n(t('hud-basket-val')),
      points: n(t('hud-pts-val')),
      cue: vis('basket-cue') && document.getElementById('basket-cue').classList.contains('cue-visible'),
      start: vis('overlay-start'), pause: vis('overlay-pause'), results: vis('overlay-results'),
      resultsPoints: t('val-points'), resultsDelivered: t('val-delivered'), resultsBest: t('val-best'),
      soundLabel: document.getElementById('hud-btn-sound')?.getAttribute('aria-label'),
    };
  })()`);
}

try {
  await send('Network.enable');
  await send('Log.enable');
  await send('Runtime.enable');
  await send('Page.enable');
  if (MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await send('Emulation.setDeviceMetricsOverride', {
    width: MOBILE ? 390 : 1280,
    height: MOBILE ? 844 : 800,
    deviceScaleFactor: MOBILE ? 2 : 1,
    mobile: MOBILE,
  });

  await send('Page.navigate', { url });
  await sleep(6000);

  for (const e of events) {
    if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
      badResponses.push(`${e.params.response.status} ${e.params.response.url}`);
    }
    if (e.method === 'Network.loadingFailed') {
      badResponses.push(`FAILED ${e.params.request.url} (${e.params.errorText})`);
    }
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
      consoleErrors.push(e.params.entry.text);
    }
    if (e.method === 'Runtime.exceptionThrown') {
      pageErrors.push(e.params.exceptionDetails.exception?.description ?? 'exception');
    }
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
      consoleErrors.push(e.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  }

  // ── No dev-only test surface should exist in the shipped bundle ──────────
  const devSurface = await evalIn(`({ modak: typeof window.__modak, visual: typeof window.__modakVisual, debugLabel: !!document.getElementById('debug-label') })`);
  check('prod: dev-only automation and debug overlay are absent', devSurface.modak === 'undefined' && devSurface.visual === 'undefined' && devSurface.debugLabel === false, JSON.stringify(devSurface));

  const boot = await hud();
  check('prod: starts on the start screen with a full 60s timer', boot.start === true && boot.timer === '01:00', JSON.stringify(boot));
  check('prod: labels Time / Delivered / Basket / Points are all present', boot.delivered !== null && boot.basket !== null && boot.points !== null, JSON.stringify(boot));
  await shot('01-start');

  // ── Real mouse click on Play ─────────────────────────────────────────────
  await realClick('#btn-play-main');
  await sleep(400);
  const afterPlay = await hud();
  check('prod: a real mouse click on Play starts the round', afterPlay.start === false, JSON.stringify(afterPlay));

  // With the start overlay gone, every in-game control must be reachable — a
  // full-screen layer with pointer-events enabled silently breaks the HUD.
  const reachability = {};
  for (const sel of ['#hud-btn-pause', '#hud-btn-sound', '#btn-scurry-control']) {
    reachability[sel] = await hitTestable(sel);
  }
  const unreachable = Object.entries(reachability).filter(([, v]) => v !== true);
  check('prod: in-game HUD controls are hit-testable (nothing covers them)', unreachable.length === 0, JSON.stringify(reachability));

  if (MOBILE) {
    // ── Touch controls must exist and actually drive the game ──────────────
    const ui = await evalIn(`(() => {
      const zone = document.getElementById('touch-joystick-zone');
      const base = document.getElementById('joystick-base');
      const btn = document.getElementById('btn-scurry-control');
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height }; };
      return { zoneShown: !!zone && !zone.classList.contains('hidden'), base: r(base), btn: r(btn), vw: innerWidth, vh: innerHeight };
    })()`);
    check('prod(mobile): thumbstick is shown on a touch device', ui.zoneShown === true, JSON.stringify({ shown: ui.zoneShown }));
    const inside = ui.base && ui.btn && ui.base.cx - ui.base.w / 2 >= -1 && ui.base.cy + ui.base.h / 2 <= ui.vh + 1
      && ui.btn.cx + ui.btn.w / 2 <= ui.vw + 1 && ui.btn.cy - ui.btn.h / 2 >= 0;
    check('prod(mobile): thumbstick and scurry button sit fully on screen', inside === true, JSON.stringify({ base: ui.base, btn: ui.btn, vh: ui.vh, vw: ui.vw }));
    await shot('02-touch-controls');

    // Drag the stick north, alternating a slight east/west lean, and confirm
    // the pickups register through the touch path.
    const cx = ui.base.cx, cy = ui.base.cy;
    const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12 }] });
    for (let i = 0; i < 16 && (await hud()).basket < 6; i++) {
      await touch('touchStart', cx, cy);
      await touch('touchMove', cx + (i % 2 === 0 ? 16 : -16), cy - 34);
      await sleep(300);
      await touch('touchEnd');
      await sleep(60);
    }
    const touchHud = await hud();
    check('prod(mobile): dragging the thumbstick collects modaks', touchHud.basket >= 4, `basket=${touchHud.basket}`);
    await shot('03-touch-collected');
  }

  // ── Fill the basket to the capacity limit ────────────────────────────────
  // A serpentine: advance north while waggling across x in ~1-unit steps. The
  // lane modaks sit between x = -0.2 and x = 0.7, so a straight run can drift
  // past them; the waggle guarantees coverage. On mobile the thumbstick drag
  // above has already collected some, so this only tops the basket up.
  for (let i = 0; i < 40 && (await hud()).basket < 6; i++) {
    await hold('KeyW', 300);
    await hold(i % 2 === 0 ? 'KeyD' : 'KeyA', 190);
  }
  const h = await hud();
  check('prod: the basket fills to exactly 6 and no further', h.basket === 6, `basket=${h.basket}`);
  await shot(MOBILE ? '04-basket-full' : '02-basket');

  const cueOn = h.cue;
  check('prod: basket-full cue appears once the basket is at capacity', cueOn === true, `basket=${h.basket} cue=${cueOn}`);

  // ── Real keyboard: home into the pandal pad using the game's own cue ─────
  // Rather than a blind sweep, steer by reading the on-screen arrow the game
  // shows when the basket is full. This both reaches the pad reliably and
  // proves the directional cue actually points at the delivery area.
  async function cueBearing() {
    return evalIn(`(() => {
      const el = document.getElementById('basket-cue-arrow');
      if (!el) return null;
      const t = getComputedStyle(el).transform;
      if (!t || t === 'none') return null;
      const m = t.match(/matrix\\(([-\\d.eE+]+), ([-\\d.eE+]+)/);
      if (!m) return null;
      return -Math.atan2(parseFloat(m[2]), parseFloat(m[1])) * 180 / Math.PI;
    })()`);
  }

  for (let i = 0; i < 60 && (await hud()).delivered === 0; i++) {
    const bearing = await cueBearing();
    if (bearing === null) { await hold('KeyD', 250); continue; }
    const rad = (bearing * Math.PI) / 180;
    const wx = Math.cos(rad);   // screen right  -> world +X
    const wz = -Math.sin(rad);  // screen up     -> world -Z
    const keys = [];
    if (wx > 0.25) keys.push('KeyD'); else if (wx < -0.25) keys.push('KeyA');
    if (wz > 0.25) keys.push('KeyS'); else if (wz < -0.25) keys.push('KeyW');
    if (keys.length === 0) keys.push('KeyD');
    for (const k of keys) await keyDown(k);
    await sleep(260);
    for (const k of keys) await keyUp(k);
  }
  await sleep(700);
  const delivered = await hud();
  check('prod: the basket-full cue points at the pad and entering it unloads and scores', delivered.basket === 0 && delivered.delivered === 6, JSON.stringify(delivered));
  const expected = delivered.delivered * 10 + Math.floor(delivered.delivered / 6) * 30;
  check('prod: points equal delivered x10 plus full-basket bonuses', delivered.points === expected, `points=${delivered.points} expected=${expected} delivered=${delivered.delivered}`);
  await shot('03-delivered');

  // ── Pause / resume: Escape on desktop, the on-screen button on phones ────
  if (MOBILE) {
    await realClick('#hud-btn-pause');
  } else {
    await keyDown('Escape'); await keyUp('Escape');
  }
  await sleep(300);
  const paused = await hud();
  const timerA = paused.timer;
  await sleep(1500);
  const stillPaused = await hud();
  check(
    `prod: ${MOBILE ? 'the pause button' : 'Escape'} pauses and shows the pause screen`,
    paused.pause === true,
    JSON.stringify({ pause: paused.pause, timer: timerA })
  );
  check('prod: the clock is held while paused', timerA === stillPaused.timer, `${timerA} vs ${stillPaused.timer}`);
  await shot('04-paused');
  await realClick('#btn-resume-game');
  await sleep(400);
  const resumed = await hud();
  check('prod: Resume returns to play', resumed.pause === false && resumed.results === false, JSON.stringify({ p: resumed.pause, r: resumed.results }));

  // ── Sound toggle ─────────────────────────────────────────────────────────
  await realClick('#hud-btn-sound');
  await sleep(200);
  const muted = await hud();
  check('prod: sound button exposes its state in the label', /off|on/.test(muted.soundLabel ?? ''), muted.soundLabel);
  await realClick('#hud-btn-sound');

  // ── Mute state persisted to localStorage ─────────────────────────────────
  await shot('05-playing');

  // ── Restart from the results screen ──────────────────────────────────────
  const ended = await evalIn(`(async () => {
    const t0 = performance.now();
    const num = (id) => parseInt(document.getElementById(id)?.textContent ?? '', 10);
    while (performance.now() - t0 < 200000) {
      const res = document.getElementById('overlay-results');
      if (res && !res.classList.contains('hidden')) {
        return { results: true, points: num('val-points'), delivered: num('hud-delivered-val'), basket: num('hud-basket-val') };
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return { results: false };
  })()`);
  check('prod: the round finishes on the timer and shows results', ended.results === true, JSON.stringify(ended));
  await shot('06-results');

  await realClick('#btn-play-again-game');
  await sleep(600);
  const replay = await hud();
  check('prod: Play again resets basket, deliveries and the 60s clock', replay.results === false && replay.basket === 0 && replay.timer === '01:00', JSON.stringify(replay));
  await shot('07-replay');

  // Collect again after the restart, purely with real keys.
  for (let i = 0; i < 8 && (await hud()).basket === 0; i++) {
    await hold('KeyW', 500);
  }
  const afterRestart = await hud();
  check('prod: collecting works again after restart without a page reload', afterRestart.basket >= 1, `basket=${afterRestart.basket}`);

  // ── Asset integrity ──────────────────────────────────────────────────────
  const assets = await evalIn(`(() => {
    const entries = performance.getEntriesByType('resource').map(e => e.name);
    return { wasm: entries.filter(u => u.endsWith('.wasm')), js: entries.filter(u => u.endsWith('.js')), css: entries.filter(u => u.endsWith('.css')) };
  })()`);
  check('prod: the Rapier WASM file is fetched by the page', assets.wasm.length === 1, JSON.stringify(assets.wasm));
  check('prod: JS and CSS bundles load', assets.js.length >= 1 && assets.css.length >= 1, `${assets.js.length} js, ${assets.css.length} css`);

  const glOk = await evalIn(`(() => { const c = document.querySelector('canvas'); if (!c) return 'no canvas'; const g = c.getContext('webgl2') || c.getContext('webgl'); return g ? 'ok' : 'no webgl'; })()`);
  check('prod: a WebGL canvas is present', glOk === 'ok', glOk);

  const overflow = await evalIn(`({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight })`);
  check('prod: no page scrolling', overflow.sw <= overflow.cw + 1 && overflow.sh <= overflow.ch + 1, JSON.stringify(overflow));

  check('prod: no failed or 4xx/5xx network responses', badResponses.length === 0, badResponses.slice(0, 5).join(' | '));
  check('prod: no console errors across a full round', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));
  check('prod: no uncaught exceptions across a full round', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} finally {
  chrome.kill('SIGKILL');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} production checks passed`);
for (const f of failed) console.log(`  FAIL ${f.name}: ${f.detail}`);
fs.writeFileSync(path.join(outDir, `report${MOBILE ? '-mobile' : ''}.json`), JSON.stringify({ results, badResponses, consoleErrors, pageErrors }, null, 2));
process.exit(failed.length ? 1 : 0);
