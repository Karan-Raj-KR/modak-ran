import { spawn } from 'child_process';
import fs from 'fs';

async function run() {
  const tmpDir = '/tmp/chrome_modak_' + Date.now();
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9223',
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
      const res = await fetch('http://localhost:9223/json');
      const tabs = await res.json();
      const gameTab = tabs.find((t) => t.url.includes('5174'));
      if (gameTab) {
        connected = true;
        console.log('Connected to tab:', gameTab.title, gameTab.url);
        
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
          if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[BROWSER EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
          }
        };

        ws.onopen = async () => {
          await send('Page.enable');
          await send('Runtime.enable');

          await new Promise((r) => setTimeout(r, 1200));

          // Inspect errors or state
          const evalRes = await send('Runtime.evaluate', {
            expression: `
              ({
                hasGame: !!document.getElementById('game'),
                hasCanvas: !!document.querySelector('canvas'),
                hasUiLayer: !!document.getElementById('ui-layer'),
                error: window.__LAST_ERROR__ || null
              })
            `,
            returnByValue: true
          });
          console.log('DOM check:', evalRes.result?.value);

          // Click "Let's Play"
          await send('Runtime.evaluate', {
            expression: `
              const btn = document.getElementById('btn-play-main');
              if (btn) btn.click();
            `
          });

          await new Promise((r) => setTimeout(r, 800));

          const shot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('/Users/karanrajkr/.gemini/antigravity-ide/brain/5d4a1f9c-3346-4d1b-b479-2d4ad555fd1c/live_game_actual.png', Buffer.from(shot.data, 'base64'));
          console.log('Screenshot captured successfully!');

          ws.close();
          chrome.kill();
          process.exit(0);
        };
        break;
      }
    } catch (e) {
      // retry
    }
  }

  if (!connected) {
    console.error('Failed to connect to Chrome remote debugging port');
    chrome.kill();
    process.exit(1);
  }
}

run();
