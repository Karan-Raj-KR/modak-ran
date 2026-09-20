/**
 * Showcase capture: plays several real collect-and-deliver cycles and screenshots
 * the courtyard after each delivery, so the progressive festival lighting can be
 * verified from actual rendered output rather than from a description.
 *
 * Usage: node scripts/showcase.mjs <url> <outDir> [--mobile]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT ?? 9344);
const url = process.argv[2];
const outDir = process.argv[3];
const MOBILE = process.argv.includes('--mobile');

if (!url || !outDir) {
  console.error('usage: node scripts/showcase.mjs <url> <outDir> [--mobile]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tmp = '/tmp/chrome_showcase_' + Date.now();
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
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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
  console.log('wrote', file);
}

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
await sleep(5000);

// Practice mode keeps the clock out of the way while we walk the full loop.
await evalIn(`window.__modak.send({ type: 'startPractice' })`);
await sleep(400);
await shot('start');

// One cycle per round-trip so the courtyard can be photographed after each
// delivery, showing the lighting build up step by step.
await evalIn(`(() => {
  const m = window.__modak;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  window.__goto = async (tx, tz, maxMs) => {
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
      await sleep(45);
    }
    for (const k of held) m.key('keyup', k);
    await sleep(80);
  };
  window.__cycle = async (n) => {
    let picked = 0;
    for (const sp of m.level.collectibles) {
      if (!m.snapshot().activeCollectibleIds.includes(sp.id)) continue;
      const before = m.snapshot().cargo.count;
      await window.__goto(sp.position.x, sp.position.z, 6000);
      if (m.snapshot().cargo.count > before) picked++;
      if (m.snapshot().cargo.count >= 6) break;
    }
    const loaded = m.snapshot().cargo.count;
    const dzp = m.level.deliveryZone.position;
    await window.__goto(dzp.x, dzp.z, 14000);
    await sleep(600);
    const a = m.snapshot();
    return { cycle: n, basketLoaded: loaded, delivered: a.deliveredCount, points: a.pointsScore, bonuses: a.fullBasketBonuses, remaining: a.activeCollectibleIds.length };
  };
  return true;
})()`);

const results = [];
for (let i = 1; i <= 3; i++) {
  const r = await evalIn(`window.__cycle(${i})`);
  results.push(r);
  console.log(JSON.stringify(r));
  await shot(`delivery-${i}`);
}
console.log(JSON.stringify(results, null, 2));
await shot('after-3-deliveries');

process.exit(0);
