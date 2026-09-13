import { spawn } from 'child_process';
import fs from 'fs';

async function run() {
  const tmpDir = '/tmp/chrome_modak_play_' + Date.now();
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9224',
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
      const res = await fetch('http://localhost:9224/json');
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
            console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description || '').join(' '));
          }
        };

        ws.onopen = async () => {
          await send('Page.enable');
          await send('Runtime.enable');
          await send('Input.enable');

          await new Promise((r) => setTimeout(r, 1000));

          // Start Game
          await send('Runtime.evaluate', {
            expression: `
              const btn = document.getElementById('btn-play-main');
              if (btn) btn.click();
            `
          });

          await new Promise((r) => setTimeout(r, 500));

          console.log('Simulating movement: pressing D (moving right)...');
          // Press D
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD' });
          await new Promise((r) => setTimeout(r, 1200));

          // Press Space to scurry
          console.log('Pressing Space to scurry...');
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space' });
          await new Promise((r) => setTimeout(r, 200));
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });
          await new Promise((r) => setTimeout(r, 800));

          // Release D
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD' });

          // Take screenshot while Mushak is moving/scurrying towards the right!
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('/Users/karanrajkr/.gemini/antigravity-ide/brain/5d4a1f9c-3346-4d1b-b479-2d4ad555fd1c/mushak_running_screenshot.png', Buffer.from(shot.data, 'base64'));
          console.log('Gameplay screenshot saved to mushak_running_screenshot.png');

          // Check score & basket state
          const stateRes = await send('Runtime.evaluate', {
            expression: `
              ({
                timer: document.getElementById('hud-timer-val')?.textContent,
                score: document.getElementById('hud-score-val')?.textContent,
                basket: document.getElementById('hud-basket-val')?.textContent,
                scurryReady: document.getElementById('btn-scurry-control')?.classList.contains('ready')
              })
            `,
            returnByValue: true
          });
          console.log('Game state during run:', stateRes.result?.value);

          ws.close();
          chrome.kill();
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
