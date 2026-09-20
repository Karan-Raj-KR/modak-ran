import type { GameSnapshot } from '../contracts/snapshot';
import type { GameCommand } from '../contracts/commands';
import { PresentationAudio } from './audio';

export interface HUDInstance {
  /** `pandalBearing` is a screen-space angle in degrees, or null when the basket has room. */
  update: (snapshot: GameSnapshot, pandalBearing: number | null) => void;
  showWarning: (text: string) => void;
  showDelivery: (count: number, points: number, fullBonus: boolean) => void;
  floatText: (text: string, screenX: number, screenY: number, color: string) => void;
  setTotalCollectibles: (n: number) => void;
  onCommand: (handler: (cmd: GameCommand) => void) => void;
  dispose: () => void;
}

export function createHUD(container: HTMLElement, audio: PresentationAudio): HUDInstance {
  const uiLayer = document.createElement('div');
  uiLayer.id = 'ui-layer';

  uiLayer.innerHTML = `
    <div id="hud-top" class="hud-top">
      <div id="plaque-modak-run" class="ornate-plaque">
        <span class="plaque-title">MODAK RUN</span>
      </div>

      <div class="hud-stat time-stat">
        <span class="stat-label">Time</span>
        <span id="hud-timer-val" class="timer-digits">01:00</span>
      </div>

      <div class="hud-stat delivered-stat">
        <span class="stat-label">Delivered</span>
        <span id="hud-delivered-val" class="stat-number">0<span class="stat-of">/42</span></span>
      </div>

      <div class="hud-stat basket-stat">
        <span class="stat-label">Basket</span>
        <span id="hud-basket-val" class="stat-number">0<span class="stat-of">/6</span></span>
        <div id="basket-pips" class="basket-pips"></div>
      </div>

      <div class="hud-stat points-stat">
        <span class="stat-label">Points</span>
        <span id="hud-pts-val" class="stat-number">0</span>
      </div>

      <div class="hud-controls">
        <button id="hud-btn-sound" class="pill-btn" aria-label="Toggle Sound" title="Sound on/off"></button>
        <button id="hud-btn-pause" class="pill-btn" aria-label="Pause Game" title="Pause (Esc)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
      </div>
    </div>

    <div id="basket-cue" class="basket-cue" aria-live="polite">
      <span id="basket-cue-arrow" class="cue-arrow">&#10148;</span>
      <span class="cue-text">Basket full &mdash; return to the pandal</span>
    </div>

    <div id="hud-notice" class="hud-notice" role="status"></div>
    <div id="delivery-toast" class="delivery-toast" role="status"></div>
    <div id="float-layer" class="float-layer"></div>

    <div class="bottom-legend">
      <span class="legend-text">WASD / Arrows to move &nbsp;&bull;&nbsp; SPACE to scurry &nbsp;&bull;&nbsp; Deliver to the rangoli pad</span>
    </div>

    <button id="btn-scurry-control" class="scurry-circle-btn" type="button" aria-label="Scurry Burst">
      <svg class="scurry-mouse-svg" viewBox="0 0 64 48" width="44" height="34" aria-hidden="true">
        <path d="M6 34c4-1 9-2 14-6 4-3 9-4 15-4 7 0 13 4 17 9 2 2 4 4 7 5-3 2-7 3-11 3-5 0-9-1-14-1-6 0-12 1-17 3-4 1-8 2-11-2z" fill="#f5be3d"/>
        <circle cx="51" cy="33" r="6.5" fill="#f5be3d"/>
        <circle cx="48" cy="24" r="5" fill="#f5be3d"/>
        <path d="M12 20c8-2 16-2 22 2M6 26c6-1 12-1 18 1" stroke="#f5be3d" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </svg>
      <span class="scurry-btn-label">SPACE</span>
      <svg class="scurry-cooldown-overlay" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring-bg" cx="50" cy="50" r="46"/>
        <circle id="scurry-ring-meter" class="ring-meter" cx="50" cy="50" r="46"/>
      </svg>
    </button>

    <div id="touch-joystick-zone" class="touch-joystick-zone hidden">
      <div id="joystick-base" class="joystick-base">
        <div id="joystick-thumb" class="joystick-thumb"></div>
      </div>
    </div>

    <div id="overlay-start" class="screen-overlay">
      <div class="festival-card">
        <div class="card-filigree">&#10070; &nbsp; FESTIVAL OF GANESHA &nbsp; &#10070;</div>
        <h1 class="main-title">MODAK RUN</h1>
        <p class="subtitle-text">Collect. Deliver. Beat your best.</p>
        <p class="summary-text">Guide Mushak the mouse across the festival courtyard, gather modaks on the banana-leaf plates, and carry them to the rangoli pad in front of the pandal. The basket holds six &mdash; once it is full, bring them home before collecting more.</p>
        <div class="scoring-hint">
          <span class="hint-item">Each modak delivered &rarr; <strong>10 pts</strong></span>
          <span class="hint-sep">|</span>
          <span class="hint-item">A full basket of 6 &rarr; <strong>+30 bonus</strong></span>
        </div>
        <div class="controls-hint">
          <span class="key-cap">W A S D</span> move &nbsp;&middot;&nbsp; <span class="key-cap">SPACE</span> scurry &nbsp;&middot;&nbsp; <span class="key-cap">ESC</span> pause
        </div>
        <div class="button-column">
          <button id="btn-play-main" class="gold-cta-btn" type="button">Play</button>
          <button id="btn-practice-main" class="secondary-btn" type="button">Practice (no timer)</button>
        </div>
      </div>
    </div>

    <div id="overlay-pause" class="screen-overlay hidden">
      <div class="festival-card">
        <div class="card-filigree">&#10070; &nbsp; PAUSED &nbsp; &#10070;</div>
        <h2 class="card-heading">Mushak is Resting</h2>
        <p class="summary-text">The round timer is held. Nothing is lost.</p>
        <div class="button-column">
          <button id="btn-resume-game" class="gold-cta-btn" type="button">Resume</button>
          <button id="btn-restart-from-pause" class="secondary-btn" type="button">Restart Round</button>
        </div>
      </div>
    </div>

    <div id="overlay-results" class="screen-overlay hidden">
      <div class="festival-card">
        <div class="card-filigree">&#10070; &nbsp; ROUND COMPLETE &nbsp; &#10070;</div>
        <h2 id="results-title-text" class="card-heading">Festive Offerings Delivered</h2>
        <div class="results-score-big">
          <span id="val-points" class="score-big-number">0</span>
          <span class="score-big-label">points</span>
          <span id="val-pb-badge" class="pb-badge hidden">NEW BEST!</span>
        </div>
        <div class="results-breakdown">
          <div class="breakdown-row">
            <span class="brow-label">Modaks delivered</span>
            <span id="val-delivered" class="brow-val">0 &times; 10 = 0 pts</span>
          </div>
          <div class="breakdown-row" id="row-bonus">
            <span class="brow-label">Full-basket bonuses</span>
            <span id="val-bonuses" class="brow-val">0 &times; 30 = 0 pts</span>
          </div>
          <div class="breakdown-row breakdown-sep">
            <span class="brow-label">Personal best <span class="brow-note">(this device)</span></span>
            <span id="val-best" class="brow-val gold-text">0 pts</span>
          </div>
        </div>
        <p id="val-observation" class="observation-sentence"></p>
        <button id="btn-play-again-game" class="gold-cta-btn" type="button">Play again</button>
      </div>
    </div>
  `;

  container.appendChild(uiLayer);

  const $ = <T extends Element>(id: string) => uiLayer.querySelector(`#${id}`) as T;

  const timerVal = $<HTMLElement>('hud-timer-val');
  const ptsVal = $<HTMLElement>('hud-pts-val');
  const basketVal = $<HTMLElement>('hud-basket-val');
  const deliveredVal = $<HTMLElement>('hud-delivered-val');
  const basketPips = $<HTMLElement>('basket-pips');
  const noticeEl = $<HTMLElement>('hud-notice');
  const deliveryToast = $<HTMLElement>('delivery-toast');
  const floatLayer = $<HTMLElement>('float-layer');
  const basketCue = $<HTMLElement>('basket-cue');
  const basketCueArrow = $<HTMLElement>('basket-cue-arrow');

  const overlayStart = $<HTMLElement>('overlay-start');
  const overlayPause = $<HTMLElement>('overlay-pause');
  const overlayResults = $<HTMLElement>('overlay-results');

  const btnPlayMain = $<HTMLButtonElement>('btn-play-main');
  const btnPracticeMain = $<HTMLButtonElement>('btn-practice-main');
  const btnResume = $<HTMLButtonElement>('btn-resume-game');
  const btnRestartPause = $<HTMLButtonElement>('btn-restart-from-pause');
  const btnPlayAgain = $<HTMLButtonElement>('btn-play-again-game');
  const btnSound = $<HTMLButtonElement>('hud-btn-sound');
  const btnPause = $<HTMLButtonElement>('hud-btn-pause');
  const btnScurry = $<HTMLButtonElement>('btn-scurry-control');
  const scurryRingMeter = $<SVGElement>('scurry-ring-meter') as unknown as SVGCircleElement;

  const touchJoystick = $<HTMLElement>('touch-joystick-zone');
  const joystickBase = $<HTMLElement>('joystick-base');
  const joystickThumb = $<HTMLElement>('joystick-thumb');

  const pipEls: HTMLElement[] = [];
  for (let i = 0; i < 6; i++) {
    const pip = document.createElement('div');
    pip.className = 'basket-pip';
    basketPips.appendChild(pip);
    pipEls.push(pip);
  }

  const ICON_SOUND_ON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
  const ICON_SOUND_OFF =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
  const ICON_MUTE_STATE = '<span class="mute-state"></span>';

  function refreshSoundIcon() {
    const isMuted = audio.isMuted();
    btnSound.innerHTML = (isMuted ? ICON_SOUND_OFF : ICON_SOUND_ON) + ICON_MUTE_STATE;
    btnSound.setAttribute('aria-label', isMuted ? 'Sound off — tap to enable' : 'Sound on — tap to mute');
    btnSound.classList.toggle('is-muted', isMuted);
  }
  refreshSoundIcon();

  // Detect a coarse pointer as well as touch events: some touch devices report
  // neither ontouchstart nor maxTouchPoints.
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);
  if (hasTouch) {
    touchJoystick.classList.remove('hidden');
    const label = btnScurry.querySelector('.scurry-btn-label');
    if (label) label.textContent = 'SCURRY';
    uiLayer.classList.add('is-touch');
  }

  let totalCollectibles = 42;

  // ─── Transient text feedback ──────────────────────────────────────────────
  let noticeTimeout = 0;
  let toastTimeout = 0;

  const floats: { el: HTMLElement; life: number }[] = [];
  const MAX_FLOATS = 8;

  // ─── Input ───────────────────────────────────────────────────────────────
  let commandHandler: ((cmd: GameCommand) => void) | null = null;
  function sendCmd(cmd: GameCommand) {
    if (commandHandler) commandHandler(cmd);
  }

  const keysDown = new Set<string>();
  let phaseLocked = true;

  function clearHeldInput() {
    if (keysDown.size === 0) return;
    keysDown.clear();
    sendCmd({ type: 'move', input: { x: 0, y: 0 } });
  }

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

  function isTypingTarget(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;

    if (!overlayStart.classList.contains('hidden')) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame(false);
      }
      return;
    }
    if (!overlayResults.classList.contains('hidden')) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sendCmd({ type: 'start' });
      }
      return;
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) sendCmd({ type: 'pause' });
      return;
    }

    if (e.code === 'Space') {
      if (!e.repeat) sendCmd({ type: 'scurry' });
      return;
    }

    if (phaseLocked) return;

    if (!keysDown.has(e.code)) {
      keysDown.add(e.code);
      updateKeyboardMovement();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (keysDown.has(e.code)) {
      keysDown.delete(e.code);
      updateKeyboardMovement();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Never let a key survive a focus loss — otherwise Mushak runs off alone.
  window.addEventListener('blur', clearHeldInput);
  window.addEventListener('pagehide', clearHeldInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearHeldInput();
  });

  // ─── Virtual joystick ────────────────────────────────────────────────────
  let activeTouchId: number | null = null;
  let joystickCenter = { x: 0, y: 0 };

  function handleJoystickMove(clientX: number, clientY: number) {
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const maxRadius = 42;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    // Dead zone so a resting thumb does not creep.
    const mag = clamped / maxRadius;
    const eff = mag < 0.16 ? 0 : (mag - 0.16) / 0.84;

    joystickThumb.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;
    sendCmd({ type: 'move', input: { x: Math.cos(angle) * eff, y: -Math.sin(angle) * eff } });
  }

  function onTouchStart(e: TouchEvent) {
    if (phaseLocked) return;
    e.preventDefault();
    if (activeTouchId !== null) return;
    const t = e.changedTouches[0];
    activeTouchId = t.identifier;
    const rect = joystickBase.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleJoystickMove(t.clientX, t.clientY);
  }

  function onTouchMove(e: TouchEvent) {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === activeTouchId) {
        e.preventDefault();
        handleJoystickMove(t.clientX, t.clientY);
        return;
      }
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        activeTouchId = null;
        joystickThumb.style.transform = 'translate(0px, 0px)';
        sendCmd({ type: 'move', input: { x: 0, y: 0 } });
        return;
      }
    }
  }

  function releaseTouch() {
    if (activeTouchId === null) return;
    activeTouchId = null;
    joystickThumb.style.transform = 'translate(0px, 0px)';
    sendCmd({ type: 'move', input: { x: 0, y: 0 } });
  }

  joystickBase.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);
  window.addEventListener('blur', releaseTouch);

  btnScurry.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendCmd({ type: 'scurry' });
  });

  // ─── Buttons ─────────────────────────────────────────────────────────────
  function startGame(practice: boolean) {
    audio.resume();
    overlayStart.classList.add('hidden');
    sendCmd({ type: practice ? 'startPractice' : 'start' });
  }

  btnPlayMain.addEventListener('click', () => startGame(false));
  btnPracticeMain.addEventListener('click', () => startGame(true));
  btnResume.addEventListener('click', () => sendCmd({ type: 'resume' }));
  btnRestartPause.addEventListener('click', () => sendCmd({ type: 'restart' }));
  btnPlayAgain.addEventListener('click', () => sendCmd({ type: 'start' }));
  btnPause.addEventListener('click', (e) => {
    e.stopPropagation();
    sendCmd({ type: 'pause' });
  });
  btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextMute = audio.toggleMute();
    refreshSoundIcon();
    sendCmd({ type: 'setMuted', muted: nextMute });
  });

  // ─── Per-frame update ────────────────────────────────────────────────────
  return {
    update: (snap, pandalBearing) => {
      const playing = snap.phase === 'playing';
      phaseLocked = !playing;
      if (phaseLocked) clearHeldInput();

      // Timer
      if (snap.isPractice) {
        timerVal.textContent = 'PRACTICE';
        timerVal.classList.add('practice-timer');
        timerVal.classList.remove('timer-critical');
      } else {
        timerVal.classList.remove('practice-timer');
        const remaining = Math.max(0, Math.ceil(snap.timeRemaining));
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerVal.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        const critical = remaining <= 10 && playing;
        timerVal.classList.toggle('timer-critical', critical);
        timerVal.closest('.hud-stat')?.classList.toggle('is-critical', critical);
      }

      // Counters
      ptsVal.textContent = String(snap.pointsScore);
      const count = snap.cargo.count;
      const capacity = snap.cargo.capacity;
      basketVal.innerHTML = `${count}<span class="stat-of">/${capacity}</span>`;
      deliveredVal.innerHTML = `${snap.deliveredCount}<span class="stat-of">/${totalCollectibles}</span>`;

      for (let i = 0; i < pipEls.length; i++) {
        pipEls[i].classList.toggle('filled', i < count);
      }
      basketPips.classList.toggle('pips-full', count >= capacity);
      basketVal.closest('.hud-stat')?.classList.toggle('is-full', count >= capacity);

      // Persistent basket-full cue with a directional arrow toward the pandal
      const full = count >= capacity;
      basketCue.classList.toggle('cue-visible', full && playing);
      if (full && pandalBearing !== null) {
        basketCueArrow.style.transform = `rotate(${-pandalBearing}deg)`;
      }

      // Scurry cooldown ring
      const SCURRY_COOLDOWN = 2.5;
      const CIRCUMFERENCE = 289.0;
      const cd = snap.scurry.cooldownRemaining;
      if (cd <= 0.01) {
        scurryRingMeter.style.strokeDashoffset = '0';
        btnScurry.classList.add('ready');
        btnScurry.classList.remove('cooling');
      } else {
        btnScurry.classList.remove('ready');
        btnScurry.classList.add('cooling');
        scurryRingMeter.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - Math.min(1, 1 - cd / SCURRY_COOLDOWN)));
      }
      btnScurry.classList.toggle('active', snap.scurry.active);

      // Overlays follow the authoritative phase — no local screen state.
      overlayStart.classList.toggle('hidden', snap.phase !== 'ready' && snap.phase !== 'loading');
      overlayPause.classList.toggle('hidden', snap.phase !== 'paused');
      overlayResults.classList.toggle('hidden', snap.phase !== 'results');

      if (snap.phase === 'results') {
        const summary = snap.lastRunSummary;
        const pts = summary?.pointsScore ?? snap.pointsScore;
        const delivered = summary?.deliveredCount ?? snap.deliveredCount;
        const bonuses = summary?.fullBasketBonuses ?? snap.fullBasketBonuses;
        const basketLeft = summary?.basketRemainingAtEnd ?? 0;
        const best = snap.personalBest;

        $<HTMLElement>('val-points').textContent = String(pts);
        $<HTMLElement>('val-delivered').textContent = `${delivered} × 10 = ${delivered * 10} pts`;
        $<HTMLElement>('val-bonuses').textContent = `${bonuses} × 30 = ${bonuses * 30} pts`;
        $<HTMLElement>('val-best').textContent = `${best} pts`;
        $<HTMLElement>('val-pb-badge').classList.toggle('hidden', !snap.pbImproved);

        const obs = $<HTMLElement>('val-observation');
        if (delivered >= totalCollectibles) {
          obs.textContent = 'Every modak delivered — the whole courtyard glows for the festival.';
        } else if (basketLeft > 0) {
          obs.textContent = `${basketLeft} modak${basketLeft > 1 ? 's' : ''} still in the basket when time ran out — those do not score, so head back early.`;
        } else if (best > pts && best > 0) {
          obs.textContent = `Your personal best is ${best - pts} points higher. Deliver a few more full baskets.`;
        } else {
          obs.textContent = 'Full baskets are worth +30 each. Six in, six delivered, straight to the pad.';
        }
      }

      // Floating pickup marks
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= 1 / 60;
        if (f.life <= 0) {
          f.el.remove();
          floats.splice(i, 1);
        } else {
          const prog = 1 - f.life / 0.9;
          f.el.style.transform = `translate(-50%, -50%) translateY(${-prog * 42}px)`;
          f.el.style.opacity = String(Math.max(0, 1 - prog * prog));
        }
      }
    },

    showWarning: (text) => {
      noticeEl.textContent = text;
      noticeEl.classList.add('notice-visible');
      clearTimeout(noticeTimeout);
      noticeTimeout = window.setTimeout(() => noticeEl.classList.remove('notice-visible'), 2200);
    },

    showDelivery: (count, points, fullBonus) => {
      deliveryToast.innerHTML =
        `<strong>${count} modak${count > 1 ? 's' : ''} offered</strong>` +
        `<span class="toast-pts">+${points} pts</span>` +
        (fullBonus ? `<span class="toast-bonus">full basket +30</span>` : '');
      deliveryToast.classList.remove('toast-play');
      // Force a restart of the CSS animation for repeated deliveries.
      void deliveryToast.offsetWidth;
      deliveryToast.classList.add('toast-play');
      clearTimeout(toastTimeout);
      toastTimeout = window.setTimeout(() => deliveryToast.classList.remove('toast-play'), 1800);
    },

    floatText: (text, screenX, screenY, color) => {
      if (floats.length >= MAX_FLOATS) return;
      const el = document.createElement('span');
      el.className = 'float-mark';
      el.textContent = text;
      el.style.color = color;
      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;
      floatLayer.appendChild(el);
      floats.push({ el, life: 0.9 });
    },

    setTotalCollectibles: (n) => {
      totalCollectibles = n;
    },

    onCommand: (handler) => {
      commandHandler = handler;
    },

    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('blur', clearHeldInput);
      window.removeEventListener('blur', releaseTouch);
      clearTimeout(noticeTimeout);
      clearTimeout(toastTimeout);
      if (uiLayer.parentNode) uiLayer.parentNode.removeChild(uiLayer);
    },
  };
}
