/**
 * Headless-Chrome playtest harness for Modak Run.
 *
 * Drives the real keyboard path and reads the real HUD DOM, so a pass here
 * means the shipped game behaves for a player — not just that a unit test likes
 * the pure rules function.
 *
 * Usage:
 *   node scripts/playtest.mjs <url> <outDir> [--mobile] [--prod]
 *
 *   <url>     e.g. http://localhost:5174/  or  http://localhost:4173/
 *   <outDir>  directory for screenshots
 *   --mobile  emulate a 390x844 touch phone
 *   --prod    skip the dev-only window.__modak handle and assert via DOM only
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT ?? 9333);

const url = process.argv[2];
const outDir = process.argv[3];
const MOBILE = process.argv.includes('--mobile');
const PROD = process.argv.includes('--prod');

if (!url || !outDir) {
  console.error('usage: node scripts/playtest.mjs <url> <outDir> [--mobile] [--prod]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const consoleErrors = [];
const pageErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome devtools endpoint never came up');
}

function makeClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  });

  const open = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('websocket failed')), { once: true });
  });

  return {
    ready: open,
    on: (fn) => listeners.push(fn),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    },
    close: () => ws.close(),
  };
}

/** Evaluate an expression in the page, awaiting promises. */
async function evalIn(client, expression) {
  const r = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error('page eval threw: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
  }
  return r.result.value;
}

async function shot(client, name) {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

/** Read the player-visible HUD, which is the ground truth for a submission. */
async function readHud(client) {
  return evalIn(client, `(() => {
    const t = (id) => document.getElementById(id)?.textContent?.trim() ?? null;
    const num = (s) => s === null ? null : parseInt(s, 10);
    const cue = document.getElementById('basket-cue');
    const res = document.getElementById('overlay-results');
    return {
      timer: t('hud-timer-val'),
      delivered: num(t('hud-delivered-val')),
      basket: num(t('hud-basket-val')),
      points: num(t('hud-pts-val')),
      cueVisible: !!cue && cue.classList.contains('cue-visible'),
      cueText: cue ? cue.textContent.replace(/\\s+/g,' ').trim() : null,
      resultsVisible: !!res && !res.classList.contains('hidden'),
      resultsPoints: t('val-points'),
      resultsDelivered: t('val-delivered'),
      resultsBest: t('val-best'),
      startVisible: (() => { const s = document.getElementById('overlay-start'); return !!s && !s.classList.contains('hidden'); })(),
      pauseVisible: (() => { const p = document.getElementById('overlay-pause'); return !!p && !p.classList.contains('hidden'); })(),
      playClickable: (() => {
        const b = document.getElementById('btn-play-main');
        if (!b || b.offsetParent === null) return 'absent';
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        return hit === b || b.contains(hit) ? true : 'covered by ' + (hit?.id || hit?.className);
      })(),
    };
  })()`);
}

async function main() {
  const tmp = '/tmp/chrome_playtest_' + Date.now();
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmp}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--mute-audio',
    `--window-size=${MOBILE ? '390,844' : '1280,800'}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const page = await connect();
    const client = makeClient(page.webSocketDebuggerUrl);
    await client.ready;

    client.on((msg) => {
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        consoleErrors.push(`[error] ${msg.params.entry.text}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
    });

    await client.send('Log.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    if (MOBILE) {
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      await client.send('Emulation.setUserAgentOverride', {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });
    }
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: MOBILE ? 390 : 1280,
      height: MOBILE ? 844 : 800,
      deviceScaleFactor: MOBILE ? 2 : 1,
      mobile: MOBILE,
    });

    await client.send('Page.navigate', { url });
    await sleep(MOBILE ? 4500 : 4000);

    const tag = MOBILE ? 'mobile' : 'desktop';
    const m = PROD ? '' : 'window.__modak.';

    // ── Boot state ────────────────────────────────────────────────────────
    if (!PROD) {
      const boot = await evalIn(client, `(() => { const s = window.__modak.snapshot(); return { phase: s.phase, time: s.timeRemaining, active: s.activeCollectibleIds.length, basket: s.cargo.count, delivered: s.deliveredCount, pos: s.player.position }; })()`);
      check(`${tag}: boots into 'ready' with a full 60s timer`, boot.phase === 'ready' && boot.time === 60, JSON.stringify(boot));
      check(`${tag}: 42 collectibles live before playing`, boot.active === 42, `active=${boot.active}`);
    }
    await shot(client, `${tag}-01-start`);

    const hudAtRest = await readHud(client);
    check(`${tag}: Play button is clickable (not covered by another panel)`, hudAtRest.playClickable === true, String(hudAtRest.playClickable));
    check(`${tag}: timer has not drained while the start screen is up`, hudAtRest.timer === '01:00', `timer=${hudAtRest.timer}`);

    // ── Start the round ───────────────────────────────────────────────────
    await evalIn(client, `document.getElementById('btn-play-main').click()`);
    await sleep(500);
    const started = await readHud(client);
    check(`${tag}: start overlay clears on Play`, !started.startVisible);
    if (!PROD) {
      const clock = await evalIn(client, `window.__modak.snapshot().timeRemaining`);
      check(`${tag}: round timer is running after Play`, clock < 60, `timeRemaining=${clock}`);
    }
    await shot(client, `${tag}-02-gameplay`);

    if (MOBILE) {
      const touchUi = await evalIn(client, `(() => {
        const zone = document.getElementById('touch-joystick-zone');
        const btn = document.getElementById('btn-scurry-control');
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        return { zoneVisible: !!zone && !zone.classList.contains('hidden'), zoneRect: r(zone), scurryRect: r(btn), vw: innerWidth, vh: innerHeight };
      })()`);
      check(`${tag}: on-screen joystick is shown on a touch device`, touchUi.zoneVisible === true, JSON.stringify(touchUi));
      const zr = touchUi.zoneRect, sr = touchUi.scurryRect;
      const onScreen = !!zr && !!sr && zr.x >= 0 && zr.y + zr.h <= touchUi.vh && sr.x + sr.w <= touchUi.vw && sr.y >= 0;
      check(`${tag}: touch controls sit fully on screen`, onScreen, JSON.stringify(touchUi));
    }

    if (!PROD) {
      // ── Trace every modak: authoritative position == rendered position ──
      const trace = await evalIn(client, `(() => {
        const vis = window.__modakVisual.collectibles;
        const bad = vis.filter(v => Math.abs(v.rendered.x - v.authoritative.x) > 1e-6 || Math.abs(v.rendered.z - v.authoritative.z) > 1e-6);
        const sunk = vis.filter(v => v.rendered.y > 0.5);
        return { count: vis.length, mismatched: bad.length, sample: bad.slice(0,3), sunk: sunk.length };
      })()`);
      check(`${tag}: all 42 rendered modaks sit on their authoritative XZ`, trace.count === 42 && trace.mismatched === 0, JSON.stringify(trace));
      check(`${tag}: no modak floats above ground`, trace.sunk === 0, `sunk=${trace.sunk}`);
    }

    // ── Walk a real route and collect a full basket ───────────────────────
    if (!PROD) {
      const basketRun = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const goto = async (tx, tz, maxMs) => {
          let held = new Set();
          const t0 = performance.now();
          while (performance.now() - t0 < maxMs) {
            const p = m.snapshot().player.position;
            const dx = tx - p.x, dz = tz - p.z;
            if (Math.hypot(dx, dz) <= 0.45) break;
            const want = [];
            if (dz < -0.08) want.push('KeyW');
            if (dz > 0.08) want.push('KeyS');
            if (dx > 0.08) want.push('KeyD');
            if (dx < -0.08) want.push('KeyA');
            const nx = new Set(want);
            for (const k of held) if (!nx.has(k)) m.key('keyup', k);
            for (const k of nx) if (!held.has(k)) m.key('keydown', k);
            held = nx;
            await sleep(50);
          }
          for (const k of held) m.key('keyup', k);
          await sleep(90);
        };
        const log = [];
        for (const id of [0, 1, 2, 12, 13, 3]) {
          const sp = m.level.collectibles.find(c => c.id === id);
          const before = m.snapshot().cargo.count;
          await goto(sp.position.x, sp.position.z, 3500);
          const s = m.snapshot();
          log.push({ id, before, after: s.cargo.count, visible: s.cargo.itemIds.includes(id) });
        }
        return { log, cargo: m.snapshot().cargo, time: m.snapshot().timeRemaining };
      })()`);
      const increments = basketRun.log.every((e, i) => e.after === i + 1 && e.visible);
      check(`${tag}: six pickups each increment the basket exactly once`, increments, JSON.stringify(basketRun.log));

      // ── Full basket refuses more, keeps items available ────────────────
      const refusal = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sp = m.level.collectibles.find(c => c.id === 10);
        let held = new Set(); const t0 = performance.now();
        while (performance.now() - t0 < 4000) {
          const p = m.snapshot().player.position;
          const dx = sp.position.x - p.x, dz = sp.position.z - p.z;
          if (Math.hypot(dx, dz) <= 0.45) break;
          const want = []; if (dz < -0.08) want.push('KeyW'); if (dz > 0.08) want.push('KeyS');
          if (dx > 0.08) want.push('KeyD'); if (dx < -0.08) want.push('KeyA');
          const nx = new Set(want);
          for (const k of held) if (!nx.has(k)) m.key('keyup', k);
          for (const k of nx) if (!held.has(k)) m.key('keydown', k);
          held = nx; await new Promise(r => setTimeout(r, 50));
        }
        for (const k of held) m.key('keyup', k);
        await new Promise(r => setTimeout(r, 200));
        const s = m.snapshot();
        return { basket: s.cargo.count, id10Active: s.activeCollectibleIds.includes(10) };
      })()`);
      check(`${tag}: full basket blocks pickup without consuming the item`, refusal.basket === 6 && refusal.id10Active, JSON.stringify(refusal));

      const cueHud = await readHud(client);
      check(`${tag}: basket-full cue is shown and worded correctly`, cueHud.cueVisible && /Basket full .* return to the pandal/.test(cueHud.cueText ?? ''), cueHud.cueText);
      await shot(client, `${tag}-03-basket-full`);

      // ── Scurry at maximum speed still collects ─────────────────────────
      await evalIn(client, `window.__modak.send({ type: 'restart' })`);
      await sleep(400);
      const scurry = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        // Modak 0 sits at (0, 4.2), i.e. -Z from the spawn at (0, 6): W leads to it.
        m.key('keydown', 'KeyW');
        await sleep(60);
        let bursts = 0;
        let peak = 0;
        const t0 = performance.now();
        while (performance.now() - t0 < 4000) {
          const s = m.snapshot();
          peak = Math.max(peak, Math.hypot(s.player.velocity.x, s.player.velocity.z));
          if (s.cargo.count > 0) break;
          if (s.scurry.cooldownRemaining <= 0.02 && !s.scurry.active) { m.send({ type: 'scurry' }); bursts++; }
          await sleep(40);
        }
        m.key('keyup', 'KeyW');
        await sleep(120);
        const s = m.snapshot();
        return { bursts, peakSpeed: +peak.toFixed(2), basket: s.cargo.count, pos: { x: +s.player.position.x.toFixed(2), z: +s.player.position.z.toFixed(2) } };
      })()`);
      check(`${tag}: pickup registers during maximum-speed scurry`, scurry.basket >= 1 && scurry.bursts >= 1 && scurry.peakSpeed > 7, JSON.stringify(scurry));

      // ── Delivery ───────────────────────────────────────────────────────
      const delivery = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const dz = m.level.deliveryZone.position;
        let held = new Set(); const t0 = performance.now();
        while (performance.now() - t0 < 12000) {
          const p = m.snapshot().player.position;
          const dx = dz.x - p.x, dz2 = dz.z - p.z;
          if (Math.hypot(dx, dz2) <= 0.6) break;
          const want = []; if (dz2 < -0.08) want.push('KeyW'); if (dz2 > 0.08) want.push('KeyS');
          if (dx > 0.08) want.push('KeyD'); if (dx < -0.08) want.push('KeyA');
          const nx = new Set(want);
          for (const k of held) if (!nx.has(k)) m.key('keyup', k);
          for (const k of nx) if (!held.has(k)) m.key('keydown', k);
          held = nx; await sleep(50);
        }
        for (const k of held) m.key('keyup', k);
        const entered = m.snapshot();
        await sleep(2500);
        const lingered = m.snapshot();
        return {
          onEnter: { basket: entered.cargo.count, delivered: entered.deliveredCount, points: entered.pointsScore, bonuses: entered.fullBasketBonuses },
          lingered: { basket: lingered.cargo.count, delivered: lingered.deliveredCount, points: lingered.pointsScore, bonuses: lingered.fullBasketBonuses },
        };
      })()`);
      const d = delivery.onEnter;
      const expectedPoints = d.delivered * 10 + d.bonuses * 30;
      check(
        `${tag}: entering the pad unloads the whole basket exactly once`,
        d.basket === 0 && d.delivered > 0 && delivery.lingered.delivered === d.delivered,
        JSON.stringify(delivery)
      );
      check(
        `${tag}: score matches delivered x10 + fullBasketBonus x30`,
        d.points === expectedPoints,
        `points=${d.points} expected=${expectedPoints} (delivered ${d.delivered}, bonuses ${d.bonuses})`
      );
      check(`${tag}: lingering in the pad cannot double-score`, delivery.lingered.points === delivery.onEnter.points, `${delivery.onEnter.points} -> ${delivery.lingered.points}`);
      await shot(client, `${tag}-04-delivered`);

      // ── Collection resumes after delivery ─────────────────────────────
      const resume = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const before = m.snapshot().cargo.count;
        const sp = m.level.collectibles.find(c => c.id === 7);
        let held = new Set(); const t0 = performance.now();
        while (performance.now() - t0 < 6000) {
          const p = m.snapshot().player.position;
          const dx = sp.position.x - p.x, dz = sp.position.z - p.z;
          if (Math.hypot(dx, dz) <= 0.45) break;
          const want = []; if (dz < -0.08) want.push('KeyW'); if (dz > 0.08) want.push('KeyS');
          if (dx > 0.08) want.push('KeyD'); if (dx < -0.08) want.push('KeyA');
          const nx = new Set(want);
          for (const k of held) if (!nx.has(k)) m.key('keyup', k);
          for (const k of nx) if (!held.has(k)) m.key('keydown', k);
          held = nx; await sleep(50);
        }
        for (const k of held) m.key('keyup', k);
        await sleep(150);
        return { before, after: m.snapshot().cargo.count };
      })()`);
      check(`${tag}: collecting is possible again immediately after delivery`, resume.after > resume.before, JSON.stringify(resume));

      // ── Pause / resume ─────────────────────────────────────────────────
      const pause = await evalIn(client, `(async () => {
        const m = window.__modak;
        m.send({ type: 'pause' });
        await new Promise(r => setTimeout(r, 700));
        const a = m.snapshot();
        m.key('keydown', 'KeyW');
        await new Promise(r => setTimeout(r, 400));
        m.key('keyup', 'KeyW');
        const b = m.snapshot();
        m.send({ type: 'resume' });
        await new Promise(r => setTimeout(r, 200));
        const c = m.snapshot();
        return { pausedPhase: a.phase, timeDriftWhilePaused: +(b.timeRemaining - a.timeRemaining).toFixed(3), movedWhilePaused: +(Math.hypot(b.player.position.x - a.player.position.x, b.player.position.z - a.player.position.z)).toFixed(3), resumedPhase: c.phase };
      })()`);
      check(`${tag}: pause halts the timer and movement, resume restores play`, pause.pausedPhase === 'paused' && pause.timeDriftWhilePaused === 0 && pause.movedWhilePaused === 0 && pause.resumedPhase === 'playing', JSON.stringify(pause));
      const pauseHud = await readHud(client);
      await evalIn(client, `window.__modak.send({ type: 'pause' })`);
      await sleep(250);
      const pauseShown = await readHud(client);
      check(`${tag}: pause overlay appears only while paused`, !pauseHud.pauseVisible && pauseShown.pauseVisible, `${pauseHud.pauseVisible} -> ${pauseShown.pauseVisible}`);
      await shot(client, `${tag}-05-paused`);
      await evalIn(client, `document.getElementById('btn-resume-game').click()`);
      await sleep(200);

      // ── Round end and restart ───────────────────────────────────────────
      const beforeRestart = await evalIn(client, `window.__modak.snapshot()`);
      await evalIn(client, `window.__modak.send({ type: 'restart' })`);
      await sleep(400);
      const afterRestart = await evalIn(client, `window.__modak.snapshot()`);
      check(
        `${tag}: restart resets basket, deliveries, score, timer and all 42 pickups`,
        afterRestart.cargo.count === 0 &&
          afterRestart.deliveredCount === 0 &&
          afterRestart.pointsScore === 0 &&
          afterRestart.timeRemaining > 58 &&
          afterRestart.activeCollectibleIds.length === 42 &&
          afterRestart.roundId === beforeRestart.roundId + 1,
        JSON.stringify({ from: beforeRestart.roundId, to: afterRestart.roundId, basket: afterRestart.cargo.count, active: afterRestart.activeCollectibleIds.length, time: afterRestart.timeRemaining })
      );

      const visualAfterRestart = await evalIn(client, `window.__modakVisual.collectibles.filter(v => !v.rendered.visible).length`);
      check(`${tag}: every modak is on the ground again after restart`, visualAfterRestart === 0, `hidden=${visualAfterRestart}`);

      // Collect once more post-restart to prove the loop is live.
      const post = await evalIn(client, `(async () => {
        const m = window.__modak;
        const sp = m.level.collectibles.find(c => c.id === 0);
        let held = new Set(); const t0 = performance.now();
        while (performance.now() - t0 < 4000) {
          const p = m.snapshot().player.position;
          const dx = sp.position.x - p.x, dz = sp.position.z - p.z;
          if (Math.hypot(dx, dz) <= 0.45) break;
          const want = []; if (dz < -0.08) want.push('KeyW'); if (dz > 0.08) want.push('KeyS');
          if (dx > 0.08) want.push('KeyD'); if (dx < -0.08) want.push('KeyA');
          const nx = new Set(want);
          for (const k of held) if (!nx.has(k)) m.key('keyup', k);
          for (const k of nx) if (!held.has(k)) m.key('keydown', k);
          held = nx; await new Promise(r => setTimeout(r, 50));
        }
        for (const k of held) m.key('keyup', k);
        await new Promise(r => setTimeout(r, 150));
        return m.snapshot().cargo.count;
      })()`);
      check(`${tag}: collecting works again after a restart without a refresh`, post === 1, `basket=${post}`);

      // ── Let the clock run out to reach the results screen ──────────────
      // Headless software GL can render below 10 fps; the loop clamps each
      // frame's delta, so the round takes longer than 60 wall-clock seconds.
      const endGame = await evalIn(client, `(async () => {
        const m = window.__modak;
        const t0 = performance.now();
        const s0 = m.snapshot();
        while (performance.now() - t0 < 170000) {
          const s = m.snapshot();
          if (s.phase === 'results') {
            return { reached: true, summary: s.lastRunSummary, best: s.personalBest, simSeconds: s0.timeRemaining - s.timeRemaining, wallSeconds: (performance.now() - t0) / 1000 };
          }
          await new Promise(r => setTimeout(r, 500));
        }
        return { reached: false, stillLeft: m.snapshot().timeRemaining };
      })()`);
      check(`${tag}: the round ends on the timer and produces a summary`, endGame.reached === true, JSON.stringify(endGame.summary ?? endGame));
      const endHud = await readHud(client);
      check(`${tag}: results screen is shown with delivered total and local best`, endHud.resultsVisible && /×/.test(endHud.resultsDelivered ?? '') && /pts/.test(endHud.resultsBest ?? ''), JSON.stringify({ pts: endHud.resultsPoints, del: endHud.resultsDelivered, best: endHud.resultsBest }));
      await shot(client, `${tag}-06-results`);

      // Play again from results, no refresh.
      await evalIn(client, `document.getElementById('btn-play-again-game').click()`);
      await sleep(500);
      const again = await evalIn(client, `window.__modak.snapshot()`);
      check(`${tag}: Play again starts a fresh round from the results screen`, again.phase === 'playing' && again.cargo.count === 0 && again.activeCollectibleIds.length === 42, JSON.stringify({ phase: again.phase, time: again.timeRemaining }));
      await shot(client, `${tag}-07-replayed`);
    }

    // ── Page scrolling / overflow ─────────────────────────────────────────
    const overflow = await evalIn(client, `(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, bodyOverflow: getComputedStyle(document.body).overflow }))()`);
    check(`${tag}: nothing overflows the viewport (no page scroll)`, overflow.sw <= overflow.cw + 1 && overflow.sh <= overflow.ch + 1, JSON.stringify(overflow));

    // ── Errors ────────────────────────────────────────────────────────────
    const realErrors = consoleErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
    check(`${tag}: no console errors during the run`, realErrors.length === 0, realErrors.slice(0, 4).join(' | '));
    check(`${tag}: no uncaught page exceptions`, pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  } finally {
    chrome.kill('SIGKILL');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILURES:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  fs.writeFileSync(path.join(outDir, `report-${MOBILE ? 'mobile' : 'desktop'}-${PROD ? 'prod' : 'dev'}.json`), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err.message);
  process.exit(1);
});
