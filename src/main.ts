import './style.css';
import * as THREE from 'three';
import { CAPACITY, freshRound, collect, deliver, end, Round } from './rules';
import { MAP_BOUNDS, OBSTACLES, isInDeliveryZone, modakPoints } from './world';
import {
  GameSnapshot,
  AnyGameEvent,
  GameCommand,
  GamePhase,
  LevelDefinition,
} from './contracts';
import { createPresentation } from './presentation';

async function initApp() {
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container element #game not found');
  }

  // Authoritative simulation state
  let phase: GamePhase = 'ready';
  let roundId = 1;
  let round: Round = freshRound();
  let timeRemaining = 60.0;
  let elapsedTime = 0.0;
  let personalBest = 0;
  let pbImproved = false;
  let isMuted = false;

  try {
    const savedPB = localStorage.getItem('modak_pb');
    if (savedPB) personalBest = parseInt(savedPB, 10) || 0;
    const savedMute = localStorage.getItem('modak_muted');
    if (savedMute !== null) isMuted = savedMute === 'true';
  } catch {
    // ignore storage errors
  }

  // Player physics state
  const player = {
    x: 0.0,
    y: 0.0,
    z: 6.0,
    vx: 0.0,
    vz: 0.0,
    heading: -Math.PI,
    speed: 0.0,
    grounded: true,
    movementState: 'idle' as 'idle' | 'walking' | 'scurrying' | 'scurry-cooldown',
    radius: 0.38,
  };

  const scurry = {
    active: false,
    remainingDuration: 0.0,
    cooldownRemaining: 0.0,
  };

  const normalSpeed = 4.8;
  const scurrySpeed = 9.2;
  const scurryDuration = 0.25;
  const scurryCooldownDuration = 3.0;

  // Collectibles state
  let activeCollectibleIds = modakPoints.map((_, id) => id);

  // One-shot events queue for current frame
  let frameEvents: AnyGameEvent[] = [];
  let eventCounter = 1;

  function pushEvent(evt: any) {
    frameEvents.push({
      ...evt,
      eventId: eventCounter++,
      roundId,
      timestamp: elapsedTime,
    } as AnyGameEvent);
  }

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
    elapsedTime = 0.0;
    pbImproved = false;

    player.x = 0.0;
    player.y = 0.0;
    player.z = 6.0;
    player.vx = 0.0;
    player.vz = 0.0;
    player.heading = -Math.PI;
    player.speed = 0.0;
    player.grounded = true;
    player.movementState = 'idle';

    scurry.active = false;
    scurry.remainingDuration = 0.0;
    scurry.cooldownRemaining = 0.0;

    activeCollectibleIds = modakPoints.map((_, id) => id);
    frameEvents = [];

    phase = 'playing';
  }

  function finishRound() {
    phase = 'results';
    end(round);

    if (round.delivered > personalBest) {
      personalBest = round.delivered;
      pbImproved = true;
      try {
        localStorage.setItem('modak_pb', String(personalBest));
      } catch {
        // ignore
      }
    }

    pushEvent({
      type: 'roundEnded',
      deliveredCount: round.delivered,
      allDelivered: round.delivered >= 42,
    });
  }

  function triggerScurry() {
    if (scurry.cooldownRemaining <= 0 && !scurry.active && player.speed > 0.1) {
      scurry.active = true;
      scurry.remainingDuration = scurryDuration;
      scurry.cooldownRemaining = scurryCooldownDuration;

      pushEvent({
        type: 'scurryStarted',
        direction: {
          x: player.vx / (player.speed || 1),
          y: 0,
          z: player.vz / (player.speed || 1),
        },
      });
    }
  }

  // Active input vector
  let inputVector = { x: 0, y: 0 };

  function handleCommand(cmd: GameCommand) {
    switch (cmd.type) {
      case 'start':
      case 'restart':
        startRound();
        break;
      case 'pause':
        if (phase === 'playing') phase = 'paused';
        break;
      case 'resume':
        if (phase === 'paused') phase = 'playing';
        break;
      case 'scurry':
        if (phase === 'playing') triggerScurry();
        break;
      case 'move':
        inputVector = cmd.input;
        break;
      case 'setMuted':
        isMuted = cmd.muted;
        break;
    }
  }

  // Level definition conforming to contract
  const dummyLevel: LevelDefinition = {
    levelId: 'courtyard-v1',
    version: '1.0.0',
    worldBounds: {
      minX: -10.8,
      maxX: 10.8,
      minZ: -8.8,
      maxZ: 8.8,
    },
    spawn: { x: 0, y: 0, z: 6 },
    playerDimensions: {
      capsuleRadius: 0.38,
      capsuleHalfHeight: 0.2,
      feetOriginY: 0.4,
    },
    staticColliders: [],
    ramps: [],
    props: [],
    collectibles: modakPoints.map(([x, z], id) => ({
      id,
      position: { x, y: 0.12, z },
    })),
    surfaceZones: [],
    deliveryZone: {
      id: 'pandal-delivery',
      shape: 'box',
      position: { x: 7.0, y: 0, z: -5.0 },
      dimensions: { x: 2.6, y: 2.0, z: 2.6 },
    },
  };

  // Initialize Presentation Layer
  const presentation = await createPresentation({
    root: container,
    level: dummyLevel,
    onCommand: handleCommand,
  });

  // Auto-pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && phase === 'playing') {
      phase = 'paused';
    }
  });

  // Simulation tick loop
  let lastTime = performance.now();

  function tick(now: number) {
    requestAnimationFrame(tick);

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (phase === 'playing') {
      elapsedTime += delta;

      // Project input onto camera basis
      const basis = presentation.getMovementBasis();
      const moveDirX = inputVector.y * basis.forward.x + inputVector.x * basis.right.x;
      const moveDirZ = inputVector.y * basis.forward.z + inputVector.x * basis.right.z;
      const moveLen = Math.hypot(moveDirX, moveDirZ);

      // Scurry Timers
      if (scurry.cooldownRemaining > 0) {
        scurry.cooldownRemaining = Math.max(0, scurry.cooldownRemaining - delta);
      }
      if (scurry.active) {
        scurry.remainingDuration -= delta;
        if (scurry.remainingDuration <= 0) {
          scurry.active = false;
        }
      }

      const currentSpeed = scurry.active ? scurrySpeed : normalSpeed;
      const targetVx = moveLen > 0.05 ? (moveDirX / moveLen) * currentSpeed : 0;
      const targetVz = moveLen > 0.05 ? (moveDirZ / moveLen) * currentSpeed : 0;

      player.vx = THREE.MathUtils.lerp(player.vx, targetVx, Math.min(1.0, delta * 24));
      player.vz = THREE.MathUtils.lerp(player.vz, targetVz, Math.min(1.0, delta * 24));
      player.speed = Math.hypot(player.vx, player.vz);

      if (player.speed > 0.1) {
        player.heading = Math.atan2(player.vx, player.vz);
      }

      if (scurry.active) {
        player.movementState = 'scurrying';
      } else if (player.speed > 0.2) {
        player.movementState = 'walking';
      } else if (scurry.cooldownRemaining > 0) {
        player.movementState = 'scurry-cooldown';
      } else {
        player.movementState = 'idle';
      }

      // Collision Sliding
      const steps = scurry.active ? 4 : 2;
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

      // Collectibles Pickup
      const canCollect = round.basket < CAPACITY;
      const pickupRadiusSq = 0.8 * 0.8;

      const remainingIds: number[] = [];
      for (const id of activeCollectibleIds) {
        const [mx, mz] = modakPoints[id];
        const dx = player.x - mx;
        const dz = player.z - mz;
        if (canCollect && dx * dx + dz * dz <= pickupRadiusSq) {
          collect(round, id);
          pushEvent({
            type: 'pickedUp',
            itemId: id,
            basketCount: round.basket,
            position: { x: mx, y: 0.12, z: mz },
          });
        } else {
          remainingIds.push(id);
          if (!canCollect && dx * dx + dz * dz <= pickupRadiusSq) {
            pushEvent({
              type: 'basketFull',
              position: { x: player.x, y: player.y, z: player.z },
            });
          }
        }
      }
      activeCollectibleIds = remainingIds;

      // Delivery Zone Check
      if (isInDeliveryZone(player.x, player.z) && round.basket > 0) {
        const count = deliver(round);
        if (count > 0) {
          pushEvent({
            type: 'delivered',
            count,
            totalDelivered: round.delivered,
            position: { x: 7.0, y: 0.6, z: -7.0 },
          });

          if (round.delivered >= 42) {
            finishRound();
            return;
          }
        }
      }

      // Timer Countdown
      timeRemaining = Math.max(0, timeRemaining - delta);
      if (timeRemaining <= 0) {
        finishRound();
        return;
      }
    }

    // Prepare immutable GameSnapshot
    const snapshot: GameSnapshot = {
      phase,
      timeRemaining,
      elapsedTime,
      deliveredCount: round.delivered,
      score: round.delivered,
      totalCollectibles: 42,
      cargo: {
        count: round.basket,
        capacity: CAPACITY,
        itemIds: [],
      },
      personalBest,
      pbImproved,
      player: {
        position: { x: player.x, y: player.y, z: player.z },
        heading: player.heading,
        velocity: { x: player.vx, y: 0, z: player.vz },
        grounded: player.grounded,
        movementState: player.movementState,
      },
      scurry: {
        active: scurry.active,
        remainingDuration: scurry.remainingDuration,
        cooldownRemaining: scurry.cooldownRemaining,
      },
      activeCollectibleIds,
      currentSurface: null,
      muted: isMuted,
      roundId,
    };

    // Render snapshot and flush frame events
    presentation.render(snapshot, frameEvents, delta);
    frameEvents = [];
  }

  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
