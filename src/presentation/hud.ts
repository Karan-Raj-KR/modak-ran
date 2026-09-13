import { GameSnapshot } from '../contracts/snapshot';
import { GameCommand } from '../contracts/commands';
import { PresentationAudio } from './audio';

export interface HUDInstance {
  update: (snapshot: GameSnapshot) => void;
  showWarning: (text: string) => void;
  onCommand: (handler: (cmd: GameCommand) => void) => void;
  dispose: () => void;
}

export function createHUD(container: HTMLElement, audio: PresentationAudio): HUDInstance {
  const uiLayer = document.createElement('div');
  uiLayer.id = 'ui-layer';

  uiLayer.innerHTML = `
    <!-- TOP-LEFT: ORNATE GOLD PLAQUE "MODAK RUN" -->
    <div id="plaque-modak-run" class="ornate-plaque">
      <div class="plaque-top-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 2C8.8 6 6.8 11.5 6.8 15.5a5.2 5.2 0 0 0 10.4 0C17.2 11.5 15.2 6 12 2z" fill="#f5be3d" />
          <circle cx="12" cy="3" r="1.4" fill="#e87e23" />
        </svg>
      </div>
      <div class="plaque-text">
        <span class="plaque-wing">⊰</span>
        <span class="plaque-title">MODAK RUN</span>
        <span class="plaque-wing">⊱</span>
      </div>
    </div>

    <!-- TOP-CENTER: COUNTDOWN TIMER PILL -->
    <div id="timer-pill" class="dark-hud-pill timer-pill">
      <span id="hud-timer-val" class="timer-digits">01:00</span>
    </div>

    <!-- TOP-RIGHT: SCORE, BASKET, SOUND & PAUSE PILL -->
    <div id="stats-pill" class="dark-hud-pill stats-pill">
      <!-- Delivered Modak Score -->
      <div class="pill-stat">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="icon-modak-svg">
          <path d="M12 2C9 6 7 11.5 7 15.5a5 5 0 0 0 10 0C17 11.5 15 6 12 2z" fill="#fdf7ee" />
          <circle cx="12" cy="3" r="1.3" fill="#f29f27" />
        </svg>
        <span id="hud-score-val" class="stat-number">0</span>
      </div>

      <!-- Basket Capacity (e.g. 0/6) -->
      <div class="pill-stat">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="icon-basket-svg">
          <path d="M4 10h16l-2 9H6l-2-9z" fill="#9e7347" stroke="#7a512b" stroke-width="1.5" />
          <path d="M7 10V6a5 5 0 0 1 10 0v4" fill="none" stroke="#d49a5b" stroke-width="2" />
        </svg>
        <span id="hud-basket-val" class="stat-number">0/6</span>
      </div>

      <div class="pill-sep"></div>

      <!-- Audio Mute Toggle -->
      <button id="hud-btn-sound" class="pill-btn" aria-label="Toggle Sound" title="Sound On/Off">
        <svg id="svg-sound-on" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <svg id="svg-sound-off" class="hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      </button>

      <!-- Pause Toggle -->
      <button id="hud-btn-pause" class="pill-btn" aria-label="Pause Game" title="Pause">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      </button>
    </div>

    <!-- BASKET FULL NOTICE POPUP -->
    <div id="hud-notice" class="hud-notice hidden">Basket Full! Deliver to Pandal</div>

    <!-- BOTTOM-CENTER: CONTROLS LEGEND -->
    <div class="bottom-legend">
      <span class="legend-line"></span>
      <span class="legend-text">WASD to move &nbsp;•&nbsp; SPACE to scurry</span>
      <span class="legend-line"></span>
    </div>

    <!-- BOTTOM-RIGHT: CIRCULAR GOLD SCURRY BUTTON -->
    <button id="btn-scurry-control" class="scurry-circle-btn" type="button" aria-label="Scurry Burst">
      <svg class="scurry-mouse-svg" viewBox="0 0 64 48" width="46" height="36">
        <!-- Running mouse silhouette -->
        <path d="M6 34c4-1 9-2 14-6 4-3 9-4 15-4 7 0 13 4 17 9 2 2 4 4 7 5-3 2-7 3-11 3-5 0-9-1-14-1-6 0-12 1-17 3-4 1-8 2-11-2z" fill="#f5be3d" />
        <circle cx="51" cy="33" r="6.5" fill="#f5be3d" />
        <circle cx="48" cy="24" r="5" fill="#f5be3d" />
        <!-- Motion swoosh lines -->
        <path d="M12 20c8-2 16-2 22 2M6 26c6-1 12-1 18 1" stroke="#f5be3d" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
      <span class="scurry-btn-label">SPACE</span>
      <svg class="scurry-cooldown-overlay" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="46" />
        <circle id="scurry-ring-meter" class="ring-meter" cx="50" cy="50" r="46" />
      </svg>
    </button>

    <!-- START SCREEN (SUBTLE COMPACT FESTIVAL CARD) -->
    <div id="overlay-start" class="screen-overlay">
      <div class="festival-card">
        <div class="card-filigree">❖ &nbsp; FESTIVAL OF GANESHA &nbsp; ❖</div>
        <h1 class="main-title">MODAK RUN</h1>
        <p class="subtitle-text">A little mouse. A festive rush.</p>
        <p class="summary-text">Collect six modaks. Deliver to the sacred pandal. Scurry back for more!</p>
        <button id="btn-play-main" class="gold-cta-btn" type="button">Let's Play</button>
      </div>
    </div>

    <!-- PAUSE SCREEN -->
    <div id="overlay-pause" class="screen-overlay hidden">
      <div class="festival-card">
        <div class="card-filigree">❖ &nbsp; PAUSED &nbsp; ❖</div>
        <h2 class="card-heading">Mushak is Resting</h2>
        <p class="summary-text">Take a breath before continuing the festive celebration.</p>
        <div class="button-column">
          <button id="btn-resume-game" class="gold-cta-btn" type="button">Resume</button>
          <button id="btn-restart-from-pause" class="secondary-btn" type="button">Restart Round</button>
        </div>
      </div>
    </div>

    <!-- RESULTS SCREEN -->
    <div id="overlay-results" class="screen-overlay hidden">
      <div class="festival-card">
        <div class="card-filigree">❖ &nbsp; ROUND COMPLETE &nbsp; ❖</div>
        <h2 id="results-title-text" class="card-heading">Festive Offerings Delivered</h2>
        <div class="results-stats-row">
          <div class="stat-cell">
            <span class="stat-title">Delivered</span>
            <span id="val-delivered" class="stat-number">0</span>
          </div>
          <div class="stat-cell">
            <span class="stat-title">Personal Best</span>
            <span id="val-best" class="stat-number">0</span>
          </div>
        </div>
        <p id="val-observation" class="observation-sentence"></p>
        <button id="btn-play-again-game" class="gold-cta-btn" type="button">Play Again</button>
      </div>
    </div>

    <!-- MOBILE TOUCH JOYSTICK ZONE -->
    <div id="touch-joystick-zone" class="touch-joystick-zone hidden">
      <div id="joystick-base" class="joystick-base">
        <div id="joystick-thumb" class="joystick-thumb"></div>
      </div>
    </div>
  `;

  container.appendChild(uiLayer);

  // Handles
  const timerVal = document.getElementById('hud-timer-val')!;
  const scoreVal = document.getElementById('hud-score-val')!;
  const basketVal = document.getElementById('hud-basket-val')!;
  const noticeEl = document.getElementById('hud-notice')!;

  const overlayStart = document.getElementById('overlay-start')!;
  const overlayPause = document.getElementById('overlay-pause')!;
  const overlayResults = document.getElementById('overlay-results')!;

  const btnPlayMain = document.getElementById('btn-play-main')!;
  const btnResume = document.getElementById('btn-resume-game')!;
  const btnRestartPause = document.getElementById('btn-restart-from-pause')!;
  const btnPlayAgain = document.getElementById('btn-play-again-game')!;
  const btnSound = document.getElementById('hud-btn-sound')!;
  const btnPause = document.getElementById('hud-btn-pause')!;
  const svgSoundOn = document.getElementById('svg-sound-on')!;
  const svgSoundOff = document.getElementById('svg-sound-off')!;
  const btnScurry = document.getElementById('btn-scurry-control')!;
  const scurryRingMeter = document.getElementById('scurry-ring-meter') as unknown as SVGCircleElement;

  const touchJoystick = document.getElementById('touch-joystick-zone')!;
  const joystickBase = document.getElementById('joystick-base')!;
  const joystickThumb = document.getElementById('joystick-thumb')!;

  function refreshSoundIcon() {
    const isMuted = audio.isMuted();
    svgSoundOn.classList.toggle('hidden', isMuted);
    svgSoundOff.classList.toggle('hidden', !isMuted);
  }
  refreshSoundIcon();

  btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextMute = audio.toggleMute();
    refreshSoundIcon();
    sendCmd({ type: 'setMuted', muted: nextMute });
  });

  // Touch device detection
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (hasTouch) {
    touchJoystick.classList.remove('hidden');
    const label = btnScurry.querySelector('.scurry-btn-label');
    if (label) label.textContent = 'SCURRY';
  }

  // Virtual Joystick touch state
  let touchVector = { x: 0, y: 0 };
  let activeTouchId: number | null = null;
  let joystickCenter = { x: 0, y: 0 };

  joystickBase.addEventListener('touchstart', (e: TouchEvent) => {
    if (activeTouchId !== null) return;
    const t = e.changedTouches[0];
    activeTouchId = t.identifier;
    const rect = joystickBase.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleJoystickMove(t.clientX, t.clientY);
  });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === activeTouchId) {
        handleJoystickMove(t.clientX, t.clientY);
        break;
      }
    }
  });

  function endTouch(e: TouchEvent) {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        activeTouchId = null;
        touchVector = { x: 0, y: 0 };
        joystickThumb.style.transform = 'translate(0px, 0px)';
        sendCmd({ type: 'move', input: { x: 0, y: 0 } });
        break;
      }
    }
  }

  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  function handleJoystickMove(clientX: number, clientY: number) {
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const maxRadius = 38;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * (clampedDist / maxRadius);
    const ny = Math.sin(angle) * (clampedDist / maxRadius);
    touchVector = { x: nx, y: ny };

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;
    joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    sendCmd({ type: 'move', input: { x: nx, y: -ny } });
  }

  // Keyboard input
  const keysDown = new Set<string>();

  function updateKeyboardMovement() {
    let x = 0;
    let y = 0;
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) x -= 1;
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) x += 1;
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) y += 1;
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) y -= 1;

    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }

    sendCmd({ type: 'move', input: { x, y } });
  }

  window.addEventListener('keydown', (e) => {
    // If start overlay is up, any key can start the game
    if (!overlayStart.classList.contains('hidden')) {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
        startGame();
        return;
      }
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Space' && !keysDown.has('Space')) {
      sendCmd({ type: 'scurry' });
    }

    if (!keysDown.has(e.code)) {
      keysDown.add(e.code);
      updateKeyboardMovement();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keysDown.has(e.code)) {
      keysDown.delete(e.code);
      updateKeyboardMovement();
    }
  });

  // Scurry Button Action
  btnScurry.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendCmd({ type: 'scurry' });
  });

  let commandHandler: ((cmd: GameCommand) => void) | null = null;
  function sendCmd(cmd: GameCommand) {
    if (commandHandler) commandHandler(cmd);
  }

  function startGame() {
    audio.resume();
    audio.playPickup(1);
    overlayStart.classList.add('hidden');
    sendCmd({ type: 'restart' });
  }

  btnPlayMain.addEventListener('click', startGame);

  btnResume.addEventListener('click', () => {
    sendCmd({ type: 'resume' });
  });

  btnRestartPause.addEventListener('click', () => {
    sendCmd({ type: 'restart' });
  });

  btnPlayAgain.addEventListener('click', () => {
    sendCmd({ type: 'restart' });
  });

  btnPause.addEventListener('click', (e) => {
    e.stopPropagation();
    sendCmd({ type: 'pause' });
  });

  let noticeTimeout = 0;

  return {
    update: (snapshot: GameSnapshot) => {
      // 1. Timer formatting (mm:ss matching the reference "00:42")
      const timeRemaining = Math.max(0, Math.ceil(snapshot.timeRemaining ?? 60));
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      timerVal.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // 2. Score number
      scoreVal.textContent = String(snapshot.deliveredCount ?? snapshot.score ?? 0);

      // 3. Basket Capacity (e.g. 3/6)
      basketVal.textContent = `${snapshot.cargo?.count ?? 0}/${snapshot.cargo?.capacity ?? 6}`;

      // 4. Scurry Cooldown radial indicator
      const meterCircumference = 289.0;
      const isScurryReady = (snapshot.scurry?.cooldownRemaining ?? 0) <= 0.01;
      if (isScurryReady) {
        scurryRingMeter.style.strokeDashoffset = '0';
        btnScurry.classList.add('ready');
      } else {
        btnScurry.classList.remove('ready');
        const cd = snapshot.scurry?.cooldownRemaining ?? 0;
        const progress = 1 - (cd / 2.5);
        const offset = meterCircumference * (1 - Math.min(1.0, Math.max(0, progress)));
        scurryRingMeter.style.strokeDashoffset = String(offset);
      }

      // 5. Overlays state matching phase
      overlayPause.classList.toggle('hidden', snapshot.phase !== 'paused');

      if (snapshot.phase === 'results') {
        overlayResults.classList.remove('hidden');
        const deliveredEl = document.getElementById('val-delivered');
        const bestEl = document.getElementById('val-best');
        const obsEl = document.getElementById('val-observation');
        const delivered = snapshot.deliveredCount ?? snapshot.score ?? 0;
        const best = snapshot.personalBest ?? delivered;
        if (deliveredEl) deliveredEl.textContent = String(delivered);
        if (bestEl) bestEl.textContent = String(best);
        if (obsEl) {
          if (delivered >= 30) {
            obsEl.textContent = 'A splendid devotion! Lord Ganesha showers divine blessings upon Mushak.';
          } else if (delivered >= 18) {
            obsEl.textContent = 'A bountiful offering! The festival lamps burn brightly with joy.';
          } else {
            obsEl.textContent = 'A humble and sincere offering. Keep scurrying with devotion!';
          }
        }
      } else {
        overlayResults.classList.add('hidden');
      }
    },

    showWarning: (text: string) => {
      noticeEl.textContent = text;
      noticeEl.classList.remove('hidden');
      clearTimeout(noticeTimeout);
      noticeTimeout = window.setTimeout(() => {
        noticeEl.classList.add('hidden');
      }, 2000);
    },

    onCommand: (handler: (cmd: GameCommand) => void) => {
      commandHandler = handler;
    },

    dispose: () => {
      if (uiLayer.parentNode) {
        uiLayer.parentNode.removeChild(uiLayer);
      }
    },
  };
}
