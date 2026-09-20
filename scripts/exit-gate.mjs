/**
 * Phase 1 exit gate, run as one continuous browser session with no refresh:
 *
 *   start -> collect a full basket -> deliver -> collect a second full basket
 *   -> deliver -> let the timer expire -> read the result screen -> restart ->
 *   collect again
 *
 * This exists because `npm test` passing does not prove the loop is playable:
 * the gate has to be walked through the real input path and the real HUD.
 *
 * Usage: node scripts/exit-gate.mjs <url> <outDir>
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT ?? 9541);
const url = process.argv[2];
const outDir = process.argv[3];
if (!url || !outDir) {
  console.error('usage: node scripts/exit-gate.mjs <url> <outDir>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(500);
  }
  throw new Error('chrome not reachable');
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

const pageErrors = [];
const consoleErrors = [];

async function main() {
  const tmp = '/tmp/chrome_gate_' + Date.now();
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
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const page = await connect();
    const client = makeClient(page.webSocketDebuggerUrl);
    await client.ready;
    client.on((msg) => {
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        consoleErrors.push(msg.params.entry.text);
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
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await client.send('Page.navigate', { url });
    await sleep(4500);

    const evalIn = async (expression) => {
      const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval exception');
      return r.result.value;
    };
    const shot = async (name) => {
      const r = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(r.data, 'base64'));
    };

    // The Play button, pressed through the real DOM listener.
    await evalIn(`document.getElementById('btn-play-main').click()`);
    await sleep(800);
    const started = await evalIn(`(() => { const s = window.__modak.snapshot(); return { phase: s.phase, time: +s.timeRemaining.toFixed(1), basket: s.cargo.count, active: s.activeCollectibleIds.length }; })()`);
    check('gate: pressing Play starts a round with the full field and a running clock', started.phase === 'playing' && started.basket === 0 && started.active === 42, JSON.stringify(started));
    await shot('01-started');

    // One collect-and-deliver cycle, driven by keyboard events only. Budgets are
    // in simulation seconds: SwiftShader renders this scene near 3 fps and the
    // loop clamps each frame delta, so wall-clock budgets would just be wrong.
    const cycle = async (label) => await evalIn(`(async () => {
      const m = window.__modak;
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const simLeft = () => m.snapshot().timeRemaining;
      const press = (code, on) => m.key(on ? 'keydown' : 'keyup', code);
      const hold = async (code, simSec) => {
        const t0 = simLeft();
        press(code, true);
        while (t0 - simLeft() < simSec && m.snapshot().phase === 'playing') await sleep(40);
        press(code, false);
      };
      const steer = async (tx, tz, stopAt, simSec) => {
        let held = new Set();
        const t0 = simLeft();
        while (t0 - simLeft() < simSec && m.snapshot().phase === 'playing') {
          const p = m.snapshot().player.position;
          const dx = tx - p.x, dz = tz - p.z;
          if (Math.hypot(dx, dz) <= stopAt) break;
          const want = [];
          if (dz < -0.08) want.push('KeyW');
          if (dz > 0.08) want.push('KeyS');
          if (dx > 0.08) want.push('KeyD');
          if (dx < -0.08) want.push('KeyA');
          const nx = new Set(want);
          for (const k of held) if (!nx.has(k)) press(k, false);
          for (const k of nx) if (!held.has(k)) press(k, true);
          held = nx;
          await sleep(50);
        }
        for (const k of held) press(k, false);
        await sleep(200);
        return +(t0 - simLeft()).toFixed(2);
      };

      // Fill the basket by walking the nearest live modaks. Bounded in
      // simulation seconds so two full cycles always fit inside one 60s round.
      const ids = m.level.collectibles;
      const cycleT0 = simLeft();
      let north = true, guard = 0;
      while (m.snapshot().cargo.count < m.snapshot().cargo.capacity && guard++ < 12 && cycleT0 - simLeft() < 15) {
        const p = m.snapshot().player.position;
        const live = m.snapshot().activeCollectibleIds
          .map((id) => ids.find((c) => c.id === id))
          .sort((a, b) => Math.hypot(a.position.x - p.x, a.position.z - p.z) - Math.hypot(b.position.x - p.x, b.position.z - p.z));
        // Walk to the nearest live modak; if that stalls, shift a lane over.
        const target = live[guard % 3 === 0 ? Math.min(2, live.length - 1) : 0];
        const spent = await steer(target.position.x, target.position.z, 0.4, 4);
        if (spent >= 5.9) { north = !north; await hold(north ? 'KeyW' : 'KeyS', 1.5); }
      }
      const filled = m.snapshot();

      // Deliver: steer to the pad centre.
      const dz = m.level.deliveryZone.position;
      await steer(dz.x, dz.z, 0.7, 8);
      const arrived = m.snapshot();
      const lt = simLeft();
      while (lt - simLeft() < 1.5 && m.snapshot().phase === 'playing') await sleep(80);
      const after = m.snapshot();
      return {
        basket: filled.cargo.count,
        cueShown: !!document.getElementById('basket-cue'),
        deliveredBefore: arrived.deliveredCount,
        deliveredAfter: after.deliveredCount,
        basketAfter: after.cargo.count,
        points: after.pointsScore,
        bonuses: after.fullBasketBonuses,
        fieldLeft: after.activeCollectibleIds.length,
        simUsed: +(cycleT0 - simLeft()).toFixed(1),
        timeLeft: +after.timeRemaining.toFixed(1),
      };
    })()`);

    const first = await cycle('first');
    check('gate: basket 1 fills to capacity and the pad unloads it exactly once',
      first.basket === 6 && first.deliveredAfter >= 6 && first.basketAfter === 0 &&
        first.points === first.deliveredAfter * 10 + first.bonuses * 30,
      JSON.stringify(first));
    await shot('02-after-first-delivery');

    // A route can brush the pad mid-fill, which unloads and immediately allows
    // collecting again, so the second cycle may deliver more than one basket.
    // What must hold is that the running total advanced past 12, the basket is
    // empty on the pad, and the score agrees with the counters.
    const second = await cycle('second');
    check('gate: a second basket collects and delivers in the same round without a refresh',
      second.deliveredAfter >= 12 && second.basketAfter === 0 &&
        second.points === second.deliveredAfter * 10 + second.bonuses * 30,
      JSON.stringify(second));
    await shot('03-after-second-delivery');

    const litSections = await evalIn(`(() => {
      const el = document.getElementById('hud-delivered-val');
      return { delivered: el ? el.textContent : null };
    })()`);
    check('gate: the HUD delivered counter tracks both deliveries',
      Number(litSections.delivered?.split('/')[0]) >= 12, JSON.stringify(litSections));

    // Let the clock run out.
    const ended = await evalIn(`(async () => {
      const m = window.__modak;
      const w0 = performance.now();
      const s0 = m.snapshot().timeRemaining;
      await new Promise(r => setTimeout(r, 4000));
      const rate = Math.max((s0 - m.snapshot().timeRemaining) / 4, 0.05);
      const budget = Math.min(((m.snapshot().timeRemaining / rate) * 1000) * 1.35 + 10000, 600000);
      const t0 = performance.now();
      while (performance.now() - t0 < budget) {
        if (m.snapshot().phase === 'results') {
          const s = m.snapshot();
          return { reached: true, summary: s.lastRunSummary, best: s.personalBest, simRate: +rate.toFixed(2), wallSeconds: +((performance.now() - t0) / 1000).toFixed(1) };
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return { reached: false, stillLeft: +m.snapshot().timeRemaining.toFixed(1) };
    })()`);
    check('gate: the round finishes on its own timer and produces a summary', ended.reached === true, JSON.stringify(ended.summary ?? ended));
    await shot('04-results');

    const resultsHud = await evalIn(`(() => {
      const t = (id) => document.getElementById(id)?.textContent ?? null;
      const res = document.getElementById('overlay-results');
      return {
        visible: !!res && !res.classList.contains('hidden'),
        points: Number(t('val-points')),
        deliveredRow: t('val-delivered'),
        bonusRow: t('val-bonuses'),
        bestRow: t('val-best'),
        playAgain: !!document.getElementById('btn-play-again-game'),
      };
    })()`);
    // The printed breakdown must add up to the headline score, and the personal
    // best must be labelled as local to this device.
    const rows = {
      delivered: Number((resultsHud.deliveredRow ?? '').match(/^(\d+) × (\d+)/)?.[1] ?? -1),
      perModak: Number((resultsHud.deliveredRow ?? '').match(/\d+ × (\d+)/)?.[1] ?? -1),
      bonuses: Number((resultsHud.bonusRow ?? '').match(/^(\d+) × (\d+)/)?.[1] ?? -1),
      perBonus: Number((resultsHud.bonusRow ?? '').match(/\d+ × (\d+)/)?.[1] ?? -1),
      note: await evalIn(`document.querySelector('.brow-note')?.textContent ?? ''`),
    };
    check('gate: the result screen shows a self-consistent breakdown and a local best',
      resultsHud.visible && resultsHud.playAgain && rows.delivered >= 12 &&
        resultsHud.points === rows.delivered * rows.perModak + rows.bonuses * rows.perBonus &&
        /this device/i.test(rows.note),
      JSON.stringify({ ...resultsHud, rows }));

    // Restart from the result screen and collect again — the loop must be live.
    await evalIn(`document.getElementById('btn-play-again-game').click()`);
    await sleep(900);
    const restarted = await evalIn(`window.__modak.snapshot()`);
    check('gate: restart from the result screen restores every piece of state',
      restarted.phase === 'playing' && restarted.cargo.count === 0 && restarted.deliveredCount === 0 &&
        restarted.pointsScore === 0 && restarted.activeCollectibleIds.length === 42 && restarted.timeRemaining > 58,
      JSON.stringify({ phase: restarted.phase, basket: restarted.cargo.count, delivered: restarted.deliveredCount, points: restarted.pointsScore, field: restarted.activeCollectibleIds.length, time: +restarted.timeRemaining.toFixed(1) }));

    const again = await evalIn(`(async () => {
      const m = window.__modak;
      const sp = m.level.collectibles.find((c) => c.id === 0);
      let held = new Set();
      const t0 = m.snapshot().timeRemaining;
      while (t0 - m.snapshot().timeRemaining < 6 && m.snapshot().phase === 'playing') {
        const p = m.snapshot().player.position;
        const dx = sp.position.x - p.x, dz = sp.position.z - p.z;
        if (Math.hypot(dx, dz) <= 0.4) break;
        const want = [];
        if (dz < -0.08) want.push('KeyW');
        if (dz > 0.08) want.push('KeyS');
        if (dx > 0.08) want.push('KeyD');
        if (dx < -0.08) want.push('KeyA');
        const nx = new Set(want);
        for (const k of held) if (!nx.has(k)) m.key('keyup', k);
        for (const k of nx) if (!held.has(k)) m.key('keydown', k);
        held = nx;
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const k of held) m.key('keyup', k);
      // Let the pickup pop finish before counting meshes; the pop keeps the
      // modak visible for a few hundred milliseconds on purpose.
      await new Promise((r) => setTimeout(r, 1200));
      const hidden = window.__modakVisual.collectibles.filter((v) => !v.rendered.visible).length;
      return { basket: m.snapshot().cargo.count, hiddenMeshes: hidden };
    })()`);
    // After a restart the field is whole again, so the only missing meshes are
    // the ones now sitting in the basket.
    check('gate: collecting works again after the restart, and the meshes agree',
      again.basket >= 1 && again.hiddenMeshes === again.basket,
      JSON.stringify(again));
    await shot('05-restarted-collecting');

    const realErrors = consoleErrors.filter((e) => !/favicon|DevTools/i.test(e));
    check('gate: no console errors across the whole session', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
    check('gate: no uncaught exceptions across the whole session', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    const passed = results.filter((r) => r.ok).length;
    console.log(`\n${passed}/${results.length} exit-gate checks passed`);
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ url, results }, null, 2));
    if (passed !== results.length) process.exitCode = 1;
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((e) => {
  console.error('HARNESS ERROR:', e.message);
  process.exitCode = 1;
});
