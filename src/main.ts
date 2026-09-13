import './style.css';
import * as THREE from 'three';
import { CAPACITY, freshRound, collect, deliver, end, Round } from './rules';
import { MAP_BOUNDS, OBSTACLES, isInDeliveryZone, modakPoints } from './world';
import { GameSnapshot, GameEvent, GameState, PresentationCommand } from './contracts/presentation';
import { createPresentation } from './presentation';

function initApp() {
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container element #game not found');
  }

  // 1. Initialize Presentation Layer
  const presentation = createPresentation(container);

  // 2. Authoritative Gameplay State
  let gameState: GameState = 'READY';
  let roundId = 1;
  let round: Round = freshRound();
  let timeRemaining = 60.0;
  let personalBest = 0;

  try {
    const savedPB = localStorage.getItem('modak_pb');
    if (savedPB) personalBest = parseInt(savedPB, 10) || 0;
  } catch {
    // ignore
  }

  // Player physics state
  const player = {
    x: 0.0,
    z: 6.0,
    vx: 0.0,
    vz: 0.0,
    heading: -Math.PI,
    speed: 0.0,
    isMoving: false,
    isScurrying: false,
    scurryTimer: 0.0,
    scurryCooldown: 0.0,
    radius: 0.38,
  };

  const normalSpeed = 4.8;
  const scurrySpeed = 9.2;
  const scurryDuration = 0.25;
  const scurryCooldownDuration = 3.0;

  // Collectibles state
  interface CollectibleState {
    id: number;
    x: number;
    z: number;
    active: boolean;
  }

  let collectibles: CollectibleState[] = modakPoints.map(([x, z], id) => ({
    id,
    x,
    z,
    active: true,
  }));

  // Transient event queue for presentation
  let pendingEvents: GameEvent[] = [];

  // Collision detection against walls and obstacles
  function collides(px: number, pz: number): boolean {
    if (
      px - player.radius < MAP_BOUNDS.minX ||
      px + player.radius > MAP_BOUNDS.maxX ||
      pz - player.radius < MAP_BOUNDS.minZ ||
      pz + player.radius > MAP_BOUNDS.maxZ
    ) {
      return true;
    }

    for (const obs of OBSTACLES) {
      const closestX = Math.max(obs.minX, Math.min(px, obs.maxX));
      const closestZ = Math.max(obs.minZ, Math.min(pz, obs.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      if (dx * dx + dz * dz < player.radius * player.radius) {
        return true;
      }
    }
    return false;
  }

  function startRound() {
    roundId++;
    round = freshRound();
    timeRemaining = 60.0;
    player.x = 0.0;
    player.z = 6.0;
    player.vx = 0.0;
    player.vz = 0.0;
    player.heading = -Math.PI;
    player.speed = 0.0;
    player.isMoving = false;
    player.isScurrying = false;
    player.scurryTimer = 0.0;
    player.scurryCooldown = 0.0;

    collectibles = modakPoints.map(([x, z], id) => ({
      id,
      x,
      z,
      active: true,
    }));
    pendingEvents = [];

    gameState = 'PLAYING';
  }

  function finishRound() {
    gameState = 'RESULTS';
    end(round);

    if (round.delivered > personalBest) {
      personalBest = round.delivered;
      try {
        localStorage.setItem('modak_pb', String(personalBest));
      } catch {
        // ignore
      }
    }

    pendingEvents.push({ type: 'round_end', finalScore: round.delivered });
  }

  function triggerScurry() {
    if (player.scurryCooldown <= 0 && !player.isScurrying && player.isMoving) {
      player.isScurrying = true;
      player.scurryTimer = scurryDuration;
      player.scurryCooldown = scurryCooldownDuration;
      pendingEvents.push({ type: 'scurry', x: player.x, z: player.z });
    }
  }

  // Keyboard input state
  const keysDown = new Set<string>();

  window.addEventListener('keydown', (e) => {
    keysDown.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'PLAYING') {
        triggerScurry();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keysDown.clear();
  });

  // Handle commands from presentation layer
  presentation.onCommand((cmd: PresentationCommand) => {
    switch (cmd.type) {
      case 'start':
      case 'restart':
        startRound();
        break;
      case 'pause':
        if (gameState === 'PLAYING') gameState = 'PAUSED';
        break;
      case 'resume':
        if (gameState === 'PAUSED') gameState = 'PLAYING';
        break;
      case 'scurry':
        if (gameState === 'PLAYING') triggerScurry();
        break;
    }
  });

  // Auto-pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'PLAYING') {
      gameState = 'PAUSED';
    }
  });

  // Main Loop
  let lastTime = performance.now();

  function tick(now: number) {
    requestAnimationFrame(tick);

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (gameState === 'PLAYING') {
      // 1. Process Input
      let rawX = 0;
      let rawY = 0;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) rawX -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) rawX += 1;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) rawY -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) rawY += 1;

      // Project onto camera basis
      const basis = presentation.getMovementBasis();
      const moveDirX = -rawY * basis.forward.x + rawX * basis.right.x;
      const moveDirZ = -rawY * basis.forward.z + rawX * basis.right.z;
      const moveLen = Math.hypot(moveDirX, moveDirZ);

      player.isMoving = moveLen > 0.05;

      // Scurry timers
      if (player.scurryCooldown > 0) {
        player.scurryCooldown = Math.max(0, player.scurryCooldown - delta);
      }
      if (player.isScurrying) {
        player.scurryTimer -= delta;
        if (player.scurryTimer <= 0) {
          player.isScurrying = false;
        }
      }

      const currentSpeed = player.isScurrying ? scurrySpeed : normalSpeed;
      const targetVx = player.isMoving ? (moveDirX / moveLen) * currentSpeed : 0;
      const targetVz = player.isMoving ? (moveDirZ / moveLen) * currentSpeed : 0;

      player.vx = THREE.MathUtils.lerp(player.vx, targetVx, Math.min(1.0, delta * 24));
      player.vz = THREE.MathUtils.lerp(player.vz, targetVz, Math.min(1.0, delta * 24));
      player.speed = Math.hypot(player.vx, player.vz);

      if (player.isMoving) {
        player.heading = Math.atan2(player.vx, player.vz);
      }

      // 2. Collision Sliding with sub-stepping
      const steps = player.isScurrying ? 4 : 2;
      const stepDelta = delta / steps;

      for (let s = 0; s < steps; s++) {
        const nextX = player.x + player.vx * stepDelta;
        if (!collides(nextX, player.z)) {
          player.x = nextX;
        } else {
          player.vx = 0;
        }

        const nextZ = player.z + player.vz * stepDelta;
        if (!collides(player.x, nextZ)) {
          player.z = nextZ;
        } else {
          player.vz = 0;
        }
      }

      // 3. Collectibles Pickup Check
      const canCollect = round.basket < CAPACITY;
      const pickupRadiusSq = 0.8 * 0.8;

      collectibles.forEach((c) => {
        if (c.active && canCollect) {
          const dx = player.x - c.x;
          const dz = player.z - c.z;
          if (dx * dx + dz * dz <= pickupRadiusSq) {
            c.active = false;
            collect(round, c.id);
            pendingEvents.push({
              type: 'pickup',
              id: c.id,
              basketCount: round.basket,
            });
          }
        }
      });

      // 4. Delivery Zone Check
      if (isInDeliveryZone(player.x, player.z) && round.basket > 0) {
        const count = deliver(round);
        if (count > 0) {
          pendingEvents.push({
            type: 'delivery',
            count,
            newScore: round.delivered,
          });

          if (round.delivered >= 42) {
            finishRound();
            return;
          }
        }
      }

      // 5. Timer Countdown
      timeRemaining = Math.max(0, timeRemaining - delta);
      if (timeRemaining <= 0) {
        finishRound();
        return;
      }
    }

    // Prepare immutable Snapshot for Presentation
    const snapshot: GameSnapshot = {
      state: gameState,
      roundId,
      timeRemaining,
      score: round.delivered,
      basketCount: round.basket,
      basketCapacity: CAPACITY,
      player: {
        x: player.x,
        z: player.z,
        heading: player.heading,
        speed: player.speed,
        isMoving: player.isMoving,
        isScurrying: player.isScurrying,
        scurryCooldown: player.scurryCooldown,
      },
      collectibles: collectibles.map((c) => ({ ...c })),
      events: [...pendingEvents],
    };

    // Render snapshot through presentation engine
    presentation.render(snapshot, delta);

    // Clear processed events
    pendingEvents = [];
  }

  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
