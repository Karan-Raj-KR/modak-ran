import { GameSnapshot, PresentationCommand } from '../contracts/presentation';
import { PresentationAudio } from './audio';

export interface HUDInstance {
  update: (snapshot: GameSnapshot) => void;
  showWarning: (text: string) => void;
  onCommand: (handler: (cmd: PresentationCommand) => void) => void;
  getTouchDirection: () => { x: number; y: number };
  dispose: () => void;
}

export function createHUD(container: HTMLElement, audio: PresentationAudio): HUDInstance {
  const uiLayer = document.createElement('div');
  uiLayer.id = 'ui-layer';

  uiLayer.innerHTML = `
    <!-- UNIFIED FESTIVAL HUD HEADER -->
    <header id="festival-hud" class="festival-hud hidden">
      <div class="hud-bar">
        <!-- Timer -->
        <div class="hud-item timer-item">
          <svg class="hud-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <polyline points="12 7 12 12 15 14" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <span id="hud-timer-val" class="hud-text">1:00</span>
        </div>

        <div class="hud-divider"></div>

        <!-- Delivered Count -->
        <div class="hud-item score-item">
          <svg class="hud-svg modak-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2C8.5 6 6.5 12 6.5 16a5.5 5.5 0 0 0 11 0c0-4-2-10-5.5-14z" fill="#f5be3d" />
            <circle cx="12" cy="3" r="1.5" fill="#eb8b26" />
          </svg>
          <span class="hud-label-tiny">DELIVERED</span>
          <span id="hud-score-val" class="hud-text">0</span>
        </div>

        <div class="hud-divider"></div>

        <!-- Basket Capacity Pips -->
        <div class="hud-item basket-item">
          <span class="hud-label-tiny">BASKET</span>
          <div id="basket-pips" class="pips-row">
            <span class="modak-pip"></span>
            <span class="modak-pip"></span>
            <span class="modak-pip"></span>
            <span class="modak-pip"></span>
            <span class="modak-pip"></span>
            <span class="modak-pip"></span>
          </div>
          <span id="hud-basket-val" class="hud-text-tiny">(0/6)</span>
        </div>

        <div class="hud-divider"></div>

        <!-- Actions (Sound & Pause) -->
        <div class="hud-controls">
          <button id="hud-btn-sound" class="hud-action-btn" aria-label="Toggle Sound" title="Sound On/Off">
            <svg id="svg-sound-on" class="hud-svg" viewBox="0 0 24 24" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/>
            </svg>
            <svg id="svg-sound-off" class="hud-svg hidden" viewBox="0 0 24 24" width="18" height="18">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
            </svg>
          </button>
          <button id="hud-btn-pause" class="hud-action-btn" aria-label="Pause Game" title="Pause">
            <svg class="hud-svg" viewBox="0 0 24 24" width="18" height="18">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="hud-notice" class="hud-notice hidden">Basket Full! Deliver to Pandal</div>
    </header>

    <!-- START SCREEN OVERLAY -->
    <div id="overlay-start" class="screen-overlay">
      <div class="festival-card">
        <div class="ornament-badge">FESTIVAL OF GANESHA</div>
        <h1 class="main-title">MODAK RUN</h1>
        <p class="subtitle-text">A little mouse. A festive rush.</p>
        <p class="summary-text">Collect six. Deliver. Scurry back for more.</p>

        <button id="btn-play-main" class="gold-cta-btn" type="button">Let's Play</button>

        <div class="controls-legend">
          <div class="legend-col"><span class="key-cap">WASD</span> or <span class="key-cap">Arrows</span> Move</div>
          <div class="legend-col"><span class="key-cap">Space</span> Scurry Burst</div>
        </div>
      </div>
    </div>

    <!-- PAUSE SCREEN OVERLAY -->
    <div id="overlay-pause" class="screen-overlay hidden">
      <div class="festival-card pause-card">
        <h2 class="card-heading">Game Paused</h2>
        <p class="card-desc">Mushak is catching his breath.</p>
        <div class="button-column">
          <button id="btn-resume-game" class="gold-cta-btn" type="button">Resume</button>
          <button id="btn-restart-from-pause" class="secondary-btn" type="button">Restart Round</button>
        </div>
      </div>
    </div>

    <!-- RESULTS SCREEN OVERLAY -->
    <div id="overlay-results" class="screen-overlay hidden">
      <div class="festival-card results-card">
        <div class="ornament-badge">ROUND COMPLETE</div>
        <h2 id="results-title-text" class="card-heading">You delivered 0 modaks</h2>
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

    <!-- MOBILE TOUCH CONTROLS -->
    <div id="touch-controls" class="touch-controls hidden">
      <div id="joystick-zone" class="joystick-zone">
        <div id="joystick-base" class="joystick-base">
          <div id="joystick-thumb" class="joystick-thumb"></div>
        </div>
      </div>
      <div class="touch-actions">
        <button id="btn-touch-scurry" class="touch-scurry-btn" type="button" aria-label="Scurry Burst">
          <span class="scurry-txt">SCURRY</span>
          <svg class="scurry-cooldown-svg" viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="44" />
            <circle id="scurry-ring-meter" class="ring-meter" cx="50" cy="50" r="44" />
          </svg>
        </button>
      </div>
    </div>
  `;

  container.appendChild(uiLayer);

  // Handles
  const hud = document.getElementById('festival-hud')!;
  const timerVal = document.getElementById('hud-timer-val')!;
  const scoreVal = document.getElementById('hud-score-val')!;
  const basketVal = document.getElementById('hud-basket-val')!;
  const noticeEl = document.getElementById('hud-notice')!;
  const pips = Array.from(document.querySelectorAll('#basket-pips .modak-pip'));

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

  const touchControls = document.getElementById('touch-controls')!;
  const joystickZone = document.getElementById('joystick-zone')!;
  const joystickThumb = document.getElementById('joystick-thumb')!;
  const btnTouchScurry = document.getElementById('btn-touch-scurry')!;
  const scurryRingMeter = document.getElementById('scurry-ring-meter') as unknown as SVGCircleElement;

  function refreshSoundIcon() {
    const isMuted = audio.isMuted();
    svgSoundOn.classList.toggle('hidden', isMuted);
    svgSoundOff.classList.toggle('hidden', !isMuted);
  }
  refreshSoundIcon();

  btnSound.addEventListener('click', () => {
    audio.toggleMute();
    refreshSoundIcon();
  });

  // Touch device detection
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (hasTouch) {
    touchControls.classList.remove('hidden');
  }

  // Virtual Joystick touch state
  let touchVector = { x: 0, y: 0 };
  let activeTouchId: number | null = null;
  let joystickCenter = { x: 0, y: 0 };

  joystickZone.addEventListener('touchstart', (e: TouchEvent) => {
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
        joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, { passive: false });

  function releaseTouch(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        activeTouchId = null;
        touchVector = { x: 0, y: 0 };
        joystickThumb.style.transform = 'translate(0px, 0px)';
        break;
      }
    }
  }
  window.addEventListener('touchend', releaseTouch, { passive: false });
  window.addEventListener('touchcancel', releaseTouch, { passive: false });

  function updateJoystick(clientX: number, clientY: number) {
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

  // Command handlers
  let commandHandler: ((cmd: PresentationCommand) => void) | null = null;

  function sendCmd(cmd: PresentationCommand) {
    if (commandHandler) commandHandler(cmd);
  }

  function bindClick(el: HTMLElement, fn: () => void) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  bindClick(btnPlayMain, () => sendCmd({ type: 'start' }));
  bindClick(btnResume, () => sendCmd({ type: 'resume' }));
  bindClick(btnPause, () => sendCmd({ type: 'pause' }));
  bindClick(btnRestartPause, () => sendCmd({ type: 'restart' }));
  bindClick(btnPlayAgain, () => sendCmd({ type: 'restart' }));

  btnTouchScurry.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendCmd({ type: 'scurry' });
  });
  btnTouchScurry.addEventListener('click', () => sendCmd({ type: 'scurry' }));

  let noticeTimer: number | null = null;

  return {
    update: (snapshot: GameSnapshot) => {
      // Screen overlays visibility
      overlayStart.classList.toggle('hidden', snapshot.state !== 'READY' && snapshot.state !== 'LOADING');
      overlayPause.classList.toggle('hidden', snapshot.state !== 'PAUSED');
      overlayResults.classList.toggle('hidden', snapshot.state !== 'RESULTS');
      hud.classList.toggle('hidden', snapshot.state === 'READY' || snapshot.state === 'LOADING');

      // Timer format
      const mins = Math.floor(snapshot.timeRemaining / 60);
      const secs = Math.floor(snapshot.timeRemaining % 60);
      timerVal.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Score
      scoreVal.textContent = String(snapshot.score);

      // Basket pips
      basketVal.textContent = `(${snapshot.basketCount}/${snapshot.basketCapacity})`;
      pips.forEach((pip, idx) => {
        pip.classList.toggle('filled', idx < snapshot.basketCount);
      });

      // Scurry Cooldown indicator
      if (scurryRingMeter) {
        const circ = 2 * Math.PI * 44; // ~276.46
        const fraction = snapshot.player.scurryCooldown / 3.0;
        scurryRingMeter.style.strokeDashoffset = String(circ * (1 - fraction));
        btnTouchScurry.classList.toggle('ready', snapshot.player.scurryCooldown <= 0);
      }

      // Results update if in RESULTS state
      if (snapshot.state === 'RESULTS') {
        const headline = document.getElementById('results-title-text')!;
        const delEl = document.getElementById('val-delivered')!;
        const bestEl = document.getElementById('val-best')!;
        const obsEl = document.getElementById('val-observation')!;

        headline.textContent = `You delivered ${snapshot.score} modak${snapshot.score === 1 ? '' : 's'}`;
        delEl.textContent = String(snapshot.score);

        let pb = snapshot.score;
        try {
          const stored = localStorage.getItem('modak_pb');
          if (stored) pb = Math.max(pb, parseInt(stored, 10) || 0);
        } catch {
          // ignore
        }
        bestEl.textContent = String(pb);

        if (snapshot.score === 42) {
          obsEl.textContent = 'Spectacular! All 42 modaks offered at the pandal.';
        } else if (snapshot.basketCount > 0) {
          obsEl.textContent = `${snapshot.basketCount} modak${snapshot.basketCount === 1 ? '' : 's'} remained safely in your basket.`;
        } else if (snapshot.score >= 30) {
          obsEl.textContent = 'A bountiful harvest of sweets offered with care.';
        } else {
          obsEl.textContent = 'Each sweet delivered honors the festive courtyard.';
        }
      }
    },

    showWarning: (text: string) => {
      noticeEl.textContent = text;
      noticeEl.classList.remove('hidden');
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => {
        noticeEl.classList.add('hidden');
      }, 1600);
    },

    onCommand: (handler: (cmd: PresentationCommand) => void) => {
      commandHandler = handler;
    },

    getTouchDirection: () => touchVector,

    dispose: () => {
      if (uiLayer.parentNode) uiLayer.parentNode.removeChild(uiLayer);
    },
  };
}
