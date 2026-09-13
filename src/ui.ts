import { GameState } from './types';
import { sound } from './audio';

export interface UISystem {
  setGameState: (state: GameState) => void;
  updateHUD: (timeLeft: number, delivered: number, basket: number, scurryCooldown: number) => void;
  showFullBasketWarning: () => void;
  showResults: (delivered: number, basketLeft: number, personalBest: number) => void;
  onStartGame: (cb: () => void) => void;
  onPauseToggle: (cb: () => void) => void;
  onRestartGame: (cb: () => void) => void;
  onScurryButton: (cb: () => void) => void;
  getTouchInput: () => { x: number; y: number };
}

export function createUI(container: HTMLElement): UISystem {
  // Build clean HTML structure without wiping existing canvas
  const uiLayer = document.createElement('div');
  uiLayer.id = 'ui-layer';
  uiLayer.innerHTML = `
    <!-- HUD Overlay -->
    <div id="hud" class="hud hidden">
      <div class="hud-left">
        <div class="hud-card timer-card">
          <span class="hud-label">TIME</span>
          <span id="hud-timer" class="hud-value">1:00</span>
        </div>
        <div class="hud-card score-card">
          <span class="hud-label">DELIVERED</span>
          <div class="score-display">
            <svg class="hud-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 2C8 6 6 12 6 16a6 6 0 0 0 12 0c0-4-2-10-6-14z" fill="#f5be3d" />
              <circle cx="12" cy="3" r="1.5" fill="#e89e2e" />
            </svg>
            <span id="hud-delivered" class="hud-value">0</span>
          </div>
        </div>
      </div>

      <div class="hud-center">
        <div class="hud-card basket-card">
          <span class="hud-label">BASKET (<span id="hud-basket-count">0</span>/6)</span>
          <div id="basket-pips" class="basket-pips">
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
        </div>
        <div id="hud-warning" class="hud-warning hidden">Basket Full! Deliver to Pandal</div>
      </div>

      <div class="hud-right">
        <button id="btn-sound" class="icon-btn" aria-label="Toggle Sound" title="Sound On/Off">
          <svg id="icon-sound-on" class="btn-icon" viewBox="0 0 24 24" width="22" height="22">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
          </svg>
          <svg id="icon-sound-off" class="btn-icon hidden" viewBox="0 0 24 24" width="22" height="22">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
          </svg>
        </button>
        <button id="btn-pause" class="icon-btn" aria-label="Pause Game" title="Pause Game">
          <svg class="btn-icon" viewBox="0 0 24 24" width="22" height="22">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Start Overlay -->
    <div id="screen-start" class="screen-overlay">
      <div class="panel start-panel">
        <div class="badge">GANESH CHATURTHI FESTIVAL</div>
        <h1 class="title">MODAK RUN</h1>
        <p class="subtitle">A little mouse. A festive rush.</p>
        <p class="instruction">Collect modaks. Carry six. Deliver before time runs out.</p>

        <button id="btn-play" class="btn btn-primary">Let's Play</button>

        <div class="controls-hint">
          <div class="hint-item"><span class="key">WASD</span> or <span class="key">Arrows</span> Move</div>
          <div class="hint-item"><span class="key">Space</span> Scurry Burst</div>
        </div>
      </div>
    </div>

    <!-- Pause Overlay -->
    <div id="screen-pause" class="screen-overlay hidden">
      <div class="panel pause-panel">
        <h2 class="panel-title">Game Paused</h2>
        <p class="panel-desc">Mushak is catching his breath.</p>
        <div class="btn-stack">
          <button id="btn-resume" class="btn btn-primary">Resume</button>
          <button id="btn-restart-pause" class="btn btn-secondary">Restart Round</button>
        </div>
      </div>
    </div>

    <!-- Results Overlay -->
    <div id="screen-results" class="screen-overlay hidden">
      <div class="panel results-panel">
        <div class="badge">ROUND COMPLETE</div>
        <h2 id="results-headline" class="panel-title">You delivered 0 modaks</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-label">Delivered</span>
            <span id="results-delivered" class="stat-value">0</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Personal Best</span>
            <span id="results-best" class="stat-value">0</span>
          </div>
        </div>
        <p id="results-observation" class="observation-text"></p>
        <button id="btn-play-again" class="btn btn-primary">Play Again</button>
      </div>
    </div>

    <!-- Mobile Touch Controls -->
    <div id="touch-controls" class="touch-controls hidden">
      <div id="joystick-zone" class="joystick-zone">
        <div id="joystick-base" class="joystick-base">
          <div id="joystick-thumb" class="joystick-thumb"></div>
        </div>
      </div>
      <div class="touch-actions">
        <button id="btn-touch-scurry" class="btn-touch-scurry" aria-label="Scurry Burst">
          <span class="scurry-label">SCURRY</span>
          <svg class="scurry-ring" viewBox="0 0 100 100">
            <circle class="scurry-ring-bg" cx="50" cy="50" r="44" />
            <circle id="scurry-ring-fill" class="scurry-ring-fill" cx="50" cy="50" r="44" />
          </svg>
        </button>
      </div>
    </div>
  `;
  container.appendChild(uiLayer);

  // Element handles
  const hud = document.getElementById('hud')!;
  const hudTimer = document.getElementById('hud-timer')!;
  const hudDelivered = document.getElementById('hud-delivered')!;
  const hudBasketCount = document.getElementById('hud-basket-count')!;
  const hudWarning = document.getElementById('hud-warning')!;
  const pips = Array.from(document.querySelectorAll('#basket-pips .pip'));

  const screenStart = document.getElementById('screen-start')!;
  const screenPause = document.getElementById('screen-pause')!;
  const screenResults = document.getElementById('screen-results')!;

  const btnPlay = document.getElementById('btn-play')!;
  const btnResume = document.getElementById('btn-resume')!;
  const btnRestartPause = document.getElementById('btn-restart-pause')!;
  const btnPlayAgain = document.getElementById('btn-play-again')!;
  const btnSound = document.getElementById('btn-sound')!;
  const btnPause = document.getElementById('btn-pause')!;
  const iconSoundOn = document.getElementById('icon-sound-on')!;
  const iconSoundOff = document.getElementById('icon-sound-off')!;

  const touchControls = document.getElementById('touch-controls')!;
  const joystickZone = document.getElementById('joystick-zone')!;
  const joystickBase = document.getElementById('joystick-base')!;
  const joystickThumb = document.getElementById('joystick-thumb')!;
  const btnTouchScurry = document.getElementById('btn-touch-scurry')!;
  const scurryRingFill = document.getElementById('scurry-ring-fill') as unknown as SVGCircleElement;

  // Sound icon state
  function updateSoundIcon() {
    const muted = sound.isMuted();
    if (muted) {
      iconSoundOn.classList.add('hidden');
      iconSoundOff.classList.remove('hidden');
    } else {
      iconSoundOn.classList.remove('hidden');
      iconSoundOff.classList.add('hidden');
    }
  }
  updateSoundIcon();

  btnSound.addEventListener('click', () => {
    sound.toggleMute();
    updateSoundIcon();
  });

  // Warning debouncer
  let warningTimer: number | null = null;

  // Virtual Joystick touch state
  let touchVector = { x: 0, y: 0 };
  let activeTouchId: number | null = null;
  let joystickCenter = { x: 0, y: 0 };

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    touchControls.classList.remove('hidden');
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const rect = joystickZone.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        activeTouchId = touch.identifier;
        joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        updateJoystickPosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId) {
        updateJoystickPosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        activeTouchId = null;
        touchVector = { x: 0, y: 0 };
        joystickThumb.style.transform = `translate(0px, 0px)`;
        break;
      }
    }
  }

  function updateJoystickPosition(clientX: number, clientY: number) {
    const maxRadius = 45;
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxRadius) {
      touchVector = { x: dx / maxRadius, y: dy / maxRadius };
      joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
      const angle = Math.atan2(dy, dx);
      touchVector = { x: Math.cos(angle), y: Math.sin(angle) };
      joystickThumb.style.transform = `translate(${Math.cos(angle) * maxRadius}px, ${Math.sin(angle) * maxRadius}px)`;
    }
  }

  joystickZone.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Callbacks
  let startCb: (() => void) | null = null;
  let pauseToggleCb: (() => void) | null = null;
  let restartCb: (() => void) | null = null;
  let scurryCb: (() => void) | null = null;

  function attachButton(btn: HTMLElement, cb: () => void) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cb();
    });
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  }

  attachButton(btnPlay, () => startCb && startCb());
  attachButton(btnResume, () => pauseToggleCb && pauseToggleCb());
  attachButton(btnPause, () => pauseToggleCb && pauseToggleCb());
  attachButton(btnRestartPause, () => restartCb && restartCb());
  attachButton(btnPlayAgain, () => restartCb && restartCb());

  btnTouchScurry.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (scurryCb) scurryCb();
  });
  btnTouchScurry.addEventListener('click', () => {
    if (scurryCb) scurryCb();
  });

  return {
    setGameState: (state: GameState) => {
      screenStart.classList.toggle('hidden', state !== 'READY' && state !== 'LOADING');
      screenPause.classList.toggle('hidden', state !== 'PAUSED');
      screenResults.classList.toggle('hidden', state !== 'RESULTS');
      hud.classList.toggle('hidden', state === 'READY' || state === 'LOADING');
    },

    updateHUD: (timeLeft: number, delivered: number, basket: number, scurryCooldown: number) => {
      const mins = Math.floor(timeLeft / 60);
      const secs = Math.floor(timeLeft % 60);
      hudTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      hudDelivered.textContent = String(delivered);
      hudBasketCount.textContent = String(basket);

      // Update basket capacity visual pips
      pips.forEach((pip, idx) => {
        pip.classList.toggle('full', idx < basket);
      });

      // Update scurry cooldown SVG circle
      if (scurryRingFill) {
        const circumference = 2 * Math.PI * 44; // ~276.46
        const fraction = scurryCooldown / 3.0;
        const offset = circumference * (1 - fraction);
        scurryRingFill.style.strokeDashoffset = String(offset);
        btnTouchScurry.classList.toggle('ready', scurryCooldown <= 0);
      }
    },

    showFullBasketWarning: () => {
      hudWarning.classList.remove('hidden');
      if (warningTimer) clearTimeout(warningTimer);
      warningTimer = window.setTimeout(() => {
        hudWarning.classList.add('hidden');
      }, 1600);
    },

    showResults: (delivered: number, basketLeft: number, personalBest: number) => {
      const headline = document.getElementById('results-headline')!;
      const delEl = document.getElementById('results-delivered')!;
      const bestEl = document.getElementById('results-best')!;
      const obsEl = document.getElementById('results-observation')!;

      headline.textContent = `You delivered ${delivered} modak${delivered === 1 ? '' : 's'}`;
      delEl.textContent = String(delivered);
      bestEl.textContent = String(personalBest);

      if (delivered === 42) {
        obsEl.textContent = 'Spectacular! All 42 modaks offered at the pandal.';
      } else if (basketLeft > 0) {
        obsEl.textContent = `${basketLeft} modak${basketLeft === 1 ? '' : 's'} remained safely in your basket.`;
      } else if (delivered >= 30) {
        obsEl.textContent = 'A bountiful harvest of sweets offered with care.';
      } else {
        obsEl.textContent = 'Each sweet delivered honors the festive courtyard.';
      }
    },

    onStartGame: (cb: () => void) => { startCb = cb; },
    onPauseToggle: (cb: () => void) => { pauseToggleCb = cb; },
    onRestartGame: (cb: () => void) => { restartCb = cb; },
    onScurryButton: (cb: () => void) => { scurryCb = cb; },
    getTouchInput: () => touchVector,
  };
}
