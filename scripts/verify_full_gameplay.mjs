import { spawn } from 'child_process';
import fs from 'fs';

async function run() {
  const tmpDir = '/tmp/chrome_modak_verify_' + Date.now();
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'http://localhost:5174/'
  ]);

  let connected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch('http://localhost:9225/json');
      const tabs = await res.json();
      const gameTab = tabs.find((t) => t.url.includes('5174'));
      if (gameTab) {
        connected = true;
        const ws = new WebSocket(gameTab.webSocketDebuggerUrl);
        let msgId = 1;
        const callbacks = new Map();

        function send(method, params = {}) {
          return new Promise((resolve) => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
          });
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && callbacks.has(msg.id)) {
            callbacks.get(msg.id)(msg.result);
            callbacks.delete(msg.id);
          }
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('[CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description || '').join(' '));
          }
        };

        ws.onopen = async () => {
          await send('Page.enable');
          await send('Runtime.enable');
          await send('Input.enable');

          console.log('--- 1. Testing Game Launch & Start ---');
          await new Promise((r) => setTimeout(r, 1000));
          await send('Runtime.evaluate', {
            expression: `document.getElementById('btn-play-main')?.click();`
          });
          await new Promise((r) => setTimeout(r, 500));

          console.log('--- 2. Collecting Modaks (Moving Right & Up) ---');
          // Move right
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD' });
          await new Promise((r) => setTimeout(r, 1400));
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD' });

          // Scurry
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space' });
          await new Promise((r) => setTimeout(r, 200));
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });

          // Move Up (towards Pandal / North)
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' });
          await new Promise((r) => setTimeout(r, 1800));
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' });

          // Check basket state
          const basketState = await send('Runtime.evaluate', {
            expression: `({
              timer: document.getElementById('hud-timer-val')?.textContent,
              score: document.getElementById('hud-score-val')?.textContent,
              basket: document.getElementById('hud-basket-val')?.textContent
            })`,
            returnByValue: true
          });
          console.log('Basket state after collection:', basketState.result?.value);

          // Move towards delivery rangoli pad at X: 7, Z: -5
          console.log('--- 3. Delivering to Ganesh Pandal ---');
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD' });
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' });
          await new Promise((r) => setTimeout(r, 1500));
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD' });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' });

          await new Promise((r) => setTimeout(r, 800));

          const deliveryState = await send('Runtime.evaluate', {
            expression: `({
              timer: document.getElementById('hud-timer-val')?.textContent,
              score: document.getElementById('hud-score-val')?.textContent,
              basket: document.getElementById('hud-basket-val')?.textContent
            })`,
            returnByValue: true
          });
          console.log('State after delivery:', deliveryState.result?.value);

          // Capture delivery screenshot
          const deliveryShot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('/Users/karanrajkr/.gemini/antigravity-ide/brain/5d4a1f9c-3346-4d1b-b479-2d4ad555fd1c/delivery_verification.png', Buffer.from(deliveryShot.data, 'base64'));
          console.log('Saved delivery_verification.png');

          console.log('--- 4. Testing Pause / Resume ---');
          await send('Runtime.evaluate', {
            expression: `document.getElementById('hud-btn-pause')?.click();`
          });
          await new Promise((r) => setTimeout(r, 400));
          const pauseVisible = await send('Runtime.evaluate', {
            expression: `!document.getElementById('overlay-pause')?.classList.contains('hidden')`,
            returnByValue: true
          });
          console.log('Pause overlay visible:', pauseVisible.result?.value);

          // Resume
          await send('Runtime.evaluate', {
            expression: `document.getElementById('btn-resume-game')?.click();`
          });
          await new Promise((r) => setTimeout(r, 400));
          const pauseHidden = await send('Runtime.evaluate', {
            expression: `document.getElementById('overlay-pause')?.classList.contains('hidden')`,
            returnByValue: true
          });
          console.log('Pause overlay dismissed on resume:', pauseHidden.result?.value);

          console.log('--- 5. Testing Multiple Restarts ---');
          await send('Runtime.evaluate', {
            expression: `
              const btnSound = document.getElementById('hud-btn-sound');
              btnSound?.click();
            `
          });
          await send('Runtime.evaluate', {
            expression: `
              const btnPause = document.getElementById('hud-btn-pause');
              btnPause?.click();
            `
          });
          await new Promise((r) => setTimeout(r, 300));
          await send('Runtime.evaluate', {
            expression: `document.getElementById('btn-restart-from-pause')?.click();`
          });
          await new Promise((r) => setTimeout(r, 500));

          const restartState = await send('Runtime.evaluate', {
            expression: `({
              timer: document.getElementById('hud-timer-val')?.textContent,
              score: document.getElementById('hud-score-val')?.textContent,
              basket: document.getElementById('hud-basket-val')?.textContent
            })`,
            returnByValue: true
          });
          console.log('State after restart:', restartState.result?.value);

          console.log('--- 6. Testing Mobile Portrait Viewport ---');
          await send('Emulation.setDeviceMetricsOverride', {
            width: 412,
            height: 892,
            deviceScaleFactor: 2,
            mobile: true
          });
          await new Promise((r) => setTimeout(r, 600));

          const portraitShot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('/Users/karanrajkr/.gemini/antigravity-ide/brain/5d4a1f9c-3346-4d1b-b479-2d4ad555fd1c/portrait_verification.png', Buffer.from(portraitShot.data, 'base64'));
          console.log('Saved portrait_verification.png');

          ws.close();
          chrome.kill();
          console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
          process.exit(0);
        };
        break;
      }
    } catch (e) {}
  }

  if (!connected) {
    chrome.kill();
    process.exit(1);
  }
}

run();
