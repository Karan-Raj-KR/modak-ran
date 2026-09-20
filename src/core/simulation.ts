/**
 * Core simulation — authoritative game state machine.
 *
 * Owns: physics stepping, movement processing, collision response, time,
 * score, state transitions, collectible/delivery logic, rush orders,
 * practice mode, personal best ghost.
 *
 * Does NOT import Three.js, DOM, or any presentation code.
 * Emits snapshots and events for the presentation to consume.
 */

import { createPhysicsWorld, moveCharacter, type PhysicsWorld } from '../physics/rapier';
import type {
  LevelDefinition,
  Vec3,
  CollectibleSpawn,
  RegionId,
} from '../contracts/level';
import type {
  GameSnapshot,
  GamePhase,
  CargoSnapshot,
  ScurrySnapshot,
  PlayerSnapshot,
  RushOrderSnapshot,
  RunSummary,
  GhostSample,
} from '../contracts/snapshot';
import type {
  AnyGameEvent,
  PickedUpEvent,
  DeliveredEvent,
  ScurryStartedEvent,
  BumpedEvent,
  RoundEndedEvent,
  BasketFullEvent,
  SurfaceChangedEvent,
  RushOrderStartedEvent,
  RushOrderCompletedEvent,
  RushOrderExpiredEvent,
  FullBasketBonusEvent,
} from '../contracts/events';
import type { GameCommand } from '../contracts/commands';

// ─── Configuration ──────────────────────────────────────────────────────────
export const CONFIG = {
  // Simulation
  FIXED_TIMESTEP: 1 / 60,
  MAX_CATCHUP: 0.1,

  // Movement
  NORMAL_SPEED: 4.8,
  ACCELERATION: 24,
  BRAKING: 32,
  CAPSULE_RADIUS: 0.32,
  CAPSULE_HALF_HEIGHT: 0.35,

  // Scurry
  SCURRY_SPEED: 8.5,
  SCURRY_DURATION: 0.28,
  SCURRY_COOLDOWN: 2.5,

  // Cargo
  CAPACITY: 6,
  FULL_BASKET_SPEED_PENALTY: 1.0, // Zero slowdown initially

  // Scoring
  POINTS_PER_MODAK: 10,
  FULL_BASKET_BONUS: 30,
  RUSH_ORDER_BONUS: 40,

  // Pickup/delivery
  // Pickup radius covers the player capsule (0.32) plus the modak leaf plate
  // footprint, so a modak is collected when Mushak visibly touches it.
  PICKUP_RADIUS: 0.95,
  DELIVERY_UNLOAD_COOLDOWN: 0.1,

  // Timer
  ROUND_DURATION: 60,

  // Rush orders are switched off for this build: the timed side-objective
  // competed with the core collect-and-deliver loop and its panel obscured the
  // world. The scheduling and scoring code is kept intact — restore a non-empty
  // schedule to re-enable.
  RUSH_ORDER_TIMES: [] as number[],
  RUSH_ORDER_DURATION: 14,
  RUSH_ORDER_REQUIRED: 3,

  // Ghost recording
  GHOST_SAMPLE_RATE: 0.1, // seconds between samples
  GHOST_MAX_SAMPLES: 800,
  GHOST_STORAGE_KEY: 'modak_ghost_v1_1_1',
  PB_STORAGE_KEY: 'modak_pb_v2',

  // Physics
  GROUND_FRICTION: 0.7,
  WALL_SLIDE_BOUNCE: 0.0,
} as const;

// ─── Rush Order State ────────────────────────────────────────────────────────
interface RushOrder {
  regionId: RegionId;
  regionLabel: string;
  startTime: number;
  endTime: number;
  /** IDs of items collected from target region after order started */
  qualifyingCollected: Set<number>;
  /** Count delivered from qualifying set */
  deliveredCount: number;
  completed: boolean;
  expired: boolean;
}

// ─── Round State ────────────────────────────────────────────────────────────
interface RoundState {
  collected: Set<number>;
  basket: number[];
  /** Map itemId -> regionId for region tracking */
  basketRegions: Map<number, RegionId | null>;
  delivered: number;
  ended: boolean;
  pointsScore: number;
  fullBasketBonuses: number;
  rushOrdersCompleted: number;
  rushOrdersIssued: number;
}

function freshRound(): RoundState {
  return {
    collected: new Set(),
    basket: [],
    basketRegions: new Map(),
    delivered: 0,
    ended: false,
    pointsScore: 0,
    fullBasketBonuses: 0,
    rushOrdersCompleted: 0,
    rushOrdersIssued: 0,
  };
}

// ─── Ghost Recording ─────────────────────────────────────────────────────────
interface GhostTrajectory {
  samples: GhostSample[];
  score: number;
  version: string;
}

function loadGhost(): GhostTrajectory | null {
  try {
    const raw = localStorage.getItem(CONFIG.GHOST_STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GhostTrajectory;
    if (!g.samples || !g.version) return null;
    return g;
  } catch {
    return null;
  }
}

function saveGhost(traj: GhostTrajectory): void {
  try {
    localStorage.setItem(CONFIG.GHOST_STORAGE_KEY, JSON.stringify(traj));
  } catch { /* storage unavailable */ }
}

// ─── Simulation State ───────────────────────────────────────────────────────
interface SimState {
  phase: GamePhase;
  isPractice: boolean;
  roundId: number;
  roundTimer: number;
  elapsedSimTime: number;

  playerPos: Vec3;
  playerHeading: number;
  playerVelocity: Vec3;
  grounded: boolean;

  inputIntent: Vec3;
  movementState: 'idle' | 'walking' | 'scurrying' | 'scurry-cooldown';

  scurryActive: boolean;
  scurryTimer: number;
  scurryCooldown: number;
  scurryDirection: Vec3;

  currentSurfaceId: string | null;

  muted: boolean;
  ghostEnabled: boolean;

  personalBest: number;
  pbImproved: boolean;

  deliveryCooldown: number;

  // Rush order scheduling
  rushOrder: RushOrder | null;
  nextRushOrderIdx: number;

  // Ghost recording
  ghostSamples: GhostSample[];
  lastGhostSampleTime: number;
  savedGhost: GhostTrajectory | null;

  lastRunSummary: RunSummary | null;
}

// ─── Simulation Interface ───────────────────────────────────────────────────
export interface Simulation {
  processCommand(command: GameCommand): void;
  step(dt: number): void;
  getSnapshot(): GameSnapshot;
  getEvents(): AnyGameEvent[];
  getCollectiblePositions(): CollectibleSpawn[];
  getLevel(): LevelDefinition;
  free(): void;
}

export function createSimulation(level: LevelDefinition): Simulation {
  const physics: PhysicsWorld = createPhysicsWorld(level);

  // Level spawn is the feet position; the physics body is tracked at the
  // capsule centre so the first step does not pop it out of the ground.
  const spawnCentre: Vec3 = {
    x: level.spawn.x,
    y: level.spawn.y + level.playerDimensions.feetOriginY,
    z: level.spawn.z,
  };

  const state: SimState = {
    // 'ready' = world is fully built and visible behind the start screen, but
    // the round timer does not run until Play is pressed.
    phase: 'ready',
    isPractice: false,
    roundId: 0,
    roundTimer: CONFIG.ROUND_DURATION,
    elapsedSimTime: 0,

    playerPos: { ...spawnCentre },
    playerHeading: -Math.PI,
    playerVelocity: { x: 0, y: 0, z: 0 },
    grounded: true,

    inputIntent: { x: 0, y: 0, z: 0 },
    movementState: 'idle',

    scurryActive: false,
    scurryTimer: 0,
    scurryCooldown: 0,
    scurryDirection: { x: 0, y: 0, z: 0 },

    currentSurfaceId: null,

    muted: false,
    ghostEnabled: true,

    personalBest: 0,
    pbImproved: false,

    deliveryCooldown: 0,

    rushOrder: null,
    nextRushOrderIdx: 0,

    ghostSamples: [],
    lastGhostSampleTime: 0,
    savedGhost: loadGhost(),

    lastRunSummary: null,
  };

  let round: RoundState = freshRound();
  let events: AnyGameEvent[] = [];
  let nextEventId = 1;

  let movementBasis = {
    right: { x: 1, y: 0, z: 0 } as Vec3,
    forward: { x: 0, y: 0, z: 1 } as Vec3,
  };

  // Load personal best
  try {
    const saved = localStorage.getItem(CONFIG.PB_STORAGE_KEY);
    if (saved) state.personalBest = parseInt(saved, 10) || 0;
  } catch { /* ignore */ }

  // ─── Helpers ────────────────────────────────────────────────────────────
  function emit(e: AnyGameEvent) {
    events.push(e);
  }

  function mkEvent(type: string): { eventId: number; roundId: number; timestamp: number; type: string } {
    return { eventId: nextEventId++, roundId: state.roundId, timestamp: state.elapsedSimTime, type };
  }

  function getRegionForItem(id: number): RegionId | null {
    const spawn = level.collectibles.find(c => c.id === id);
    return spawn?.regionId ?? null;
  }

  // ─── Command Processing ─────────────────────────────────────────────────
  function processCommand(command: GameCommand) {
    switch (command.type) {
      case 'start':
        // Scored round — always clears practice mode
        startRound(false);
        break;

      case 'startPractice':
        startRound(true);
        break;

      case 'pause':
        if (state.phase === 'playing') {
          state.phase = 'paused';
        } else if (state.phase === 'paused') {
          state.phase = 'playing';
        }
        break;

      case 'resume':
        if (state.phase === 'paused') {
          state.phase = 'playing';
        }
        break;

      case 'restart':
        // Restart preserves the current practice/scored mode
        startRound(state.isPractice);
        break;

      case 'move':
        state.inputIntent = { x: command.input.x, y: command.input.y, z: 0 };
        break;

      case 'scurry':
        tryScurry();
        break;

      case 'setMuted':
        state.muted = command.muted;
        break;

      case 'toggleGhost':
        state.ghostEnabled = !state.ghostEnabled;
        break;
    }
  }

  // ─── Round Management ───────────────────────────────────────────────────
  /** Wipe every per-round value back to a clean slate. Leaves phase untouched. */
  function resetRound() {
    round = freshRound();
    state.roundId++;
    state.roundTimer = CONFIG.ROUND_DURATION;
    state.elapsedSimTime = 0;
    state.playerPos = { ...spawnCentre };
    state.playerHeading = -Math.PI;
    state.playerVelocity = { x: 0, y: 0, z: 0 };
    state.grounded = true;
    state.scurryActive = false;
    state.scurryTimer = 0;
    state.scurryCooldown = 0;
    state.scurryDirection = { x: 0, y: 0, z: 0 };
    state.movementState = 'idle';
    state.currentSurfaceId = null;
    state.deliveryCooldown = 0;
    state.inputIntent = { x: 0, y: 0, z: 0 };
    state.rushOrder = null;
    state.nextRushOrderIdx = 0;
    state.ghostSamples = [];
    state.lastGhostSampleTime = -999;
    state.pbImproved = false;
    state.lastRunSummary = null;
    events = [];
    nextEventId = 1;
  }

  function startRound(practice: boolean) {
    resetRound();
    state.phase = 'playing';
    state.isPractice = practice;
    if (practice) state.roundTimer = Infinity;
  }

  function endRound() {
    if (round.ended) return;
    state.phase = 'results';
    round.ended = true;

    const summary: RunSummary = {
      deliveredCount: round.delivered,
      pointsScore: round.pointsScore,
      fullBasketBonuses: round.fullBasketBonuses,
      rushOrdersCompleted: round.rushOrdersCompleted,
      rushOrdersIssued: round.rushOrdersIssued,
      basketRemainingAtEnd: round.basket.length,
    };
    state.lastRunSummary = summary;

    if (!state.isPractice && round.pointsScore > state.personalBest) {
      state.personalBest = round.pointsScore;
      state.pbImproved = true;
      try { localStorage.setItem(CONFIG.PB_STORAGE_KEY, String(state.personalBest)); } catch { /* ignore */ }

      // Save ghost trajectory
      if (state.ghostSamples.length > 0) {
        const traj: GhostTrajectory = {
          samples: state.ghostSamples.slice(0, CONFIG.GHOST_MAX_SAMPLES),
          score: round.pointsScore,
          version: `${level.levelId}-${level.version}`,
        };
        saveGhost(traj);
        state.savedGhost = traj;
      }
    } else {
      state.pbImproved = false;
    }

    emit({
      ...mkEvent('roundEnded'),
      type: 'roundEnded',
      deliveredCount: round.delivered,
      allDelivered: round.delivered >= level.collectibles.length,
      finalScore: round.pointsScore,
    } as RoundEndedEvent);
  }

  // ─── Scurry ──────────────────────────────────────────────────────────────
  function tryScurry(): boolean {
    if (
      state.phase !== 'playing' ||
      state.scurryActive ||
      state.scurryCooldown > 0 ||
      (state.inputIntent.x === 0 && state.inputIntent.y === 0)
    ) return false;

    const basis = movementBasis;
    const worldDirX = state.inputIntent.x * basis.right.x + state.inputIntent.y * basis.forward.x;
    const worldDirZ = state.inputIntent.x * basis.right.z + state.inputIntent.y * basis.forward.z;
    const len = Math.hypot(worldDirX, worldDirZ);
    if (len < 0.01) return false;

    state.scurryActive = true;
    state.scurryTimer = CONFIG.SCURRY_DURATION;
    state.scurryCooldown = CONFIG.SCURRY_COOLDOWN;
    state.movementState = 'scurrying';
    state.scurryDirection = { x: worldDirX / len, y: 0, z: worldDirZ / len };

    emit({ ...mkEvent('scurryStarted'), type: 'scurryStarted', direction: { ...state.scurryDirection } } as ScurryStartedEvent);
    return true;
  }

  // ─── Rush Order Logic ────────────────────────────────────────────────────
  function tryScheduleRushOrder() {
    if (state.isPractice) return;
    if (state.rushOrder !== null) return;
    if (state.nextRushOrderIdx >= CONFIG.RUSH_ORDER_TIMES.length) return;

    const nextTime = CONFIG.RUSH_ORDER_TIMES[state.nextRushOrderIdx];
    if (state.elapsedSimTime < nextTime) return;

    state.nextRushOrderIdx++;

    // Pick a region deterministically (by round seeding)
    const regions: RegionId[] = ['stall', 'garden', 'courtyard'];
    const regionIdx = (state.roundId + state.nextRushOrderIdx) % regions.length;
    const targetRegionId = regions[regionIdx];
    const targetRegion = level.regions?.find(r => r.id === targetRegionId);

    // Check if enough uncollected items remain in this region
    const available = level.collectibles.filter(
      c => c.regionId === targetRegionId && !round.collected.has(c.id)
    );
    if (available.length < CONFIG.RUSH_ORDER_REQUIRED) {
      // Skip this order, try next time if applicable
      return;
    }

    const order: RushOrder = {
      regionId: targetRegionId,
      regionLabel: targetRegion?.label ?? targetRegionId,
      startTime: state.elapsedSimTime,
      endTime: state.elapsedSimTime + CONFIG.RUSH_ORDER_DURATION,
      qualifyingCollected: new Set(),
      deliveredCount: 0,
      completed: false,
      expired: false,
    };

    state.rushOrder = order;
    round.rushOrdersIssued++;

    emit({
      ...mkEvent('rushOrderStarted'),
      type: 'rushOrderStarted',
      regionId: order.regionId,
      regionLabel: order.regionLabel,
      durationSeconds: CONFIG.RUSH_ORDER_DURATION,
    } as RushOrderStartedEvent);
  }

  function updateRushOrder(dt: number) {
    const order = state.rushOrder;
    if (!order || order.completed || order.expired) return;

    if (state.elapsedSimTime >= order.endTime) {
      order.expired = true;
      state.rushOrder = null;
      emit({
        ...mkEvent('rushOrderExpired'),
        type: 'rushOrderExpired',
        regionId: order.regionId,
        progress: order.deliveredCount,
      } as RushOrderExpiredEvent);
    }
  }

  // ─── Movement Basis ──────────────────────────────────────────────────────
  function setMovementBasis(basis: { right: Vec3; forward: Vec3 }) {
    movementBasis = basis;
  }

  // ─── Ghost Recording ─────────────────────────────────────────────────────
  function maybeRecordGhostSample() {
    if (state.isPractice) return;
    const timeSinceLast = state.elapsedSimTime - state.lastGhostSampleTime;
    if (timeSinceLast < CONFIG.GHOST_SAMPLE_RATE) return;
    if (state.ghostSamples.length >= CONFIG.GHOST_MAX_SAMPLES) return;

    state.ghostSamples.push({
      t: state.elapsedSimTime,
      x: state.playerPos.x,
      z: state.playerPos.z,
      heading: state.playerHeading,
    });
    state.lastGhostSampleTime = state.elapsedSimTime;
  }

  // ─── Simulation Step ─────────────────────────────────────────────────────
  function step(dt: number) {
    if (state.phase !== 'playing') return;

    state.elapsedSimTime += dt;

    // Cooldowns
    if (state.scurryCooldown > 0) state.scurryCooldown = Math.max(0, state.scurryCooldown - dt);
    if (state.deliveryCooldown > 0) state.deliveryCooldown = Math.max(0, state.deliveryCooldown - dt);

    // Scurry timer
    if (state.scurryActive) {
      state.scurryTimer -= dt;
      if (state.scurryTimer <= 0) {
        state.scurryActive = false;
        state.movementState = 'idle';
      }
    }

    // Rush order scheduling and updates
    tryScheduleRushOrder();
    updateRushOrder(dt);

    // ── Movement ────────────────────────────────────────────────────────
    const inputX = state.inputIntent.x;
    const inputY = state.inputIntent.y;
    const inputLen = Math.hypot(inputX, inputY);

    let normInputX = 0;
    let normInputY = 0;
    if (inputLen > 0.05) {
      if (inputLen > 1) {
        normInputX = inputX / inputLen;
        normInputY = inputY / inputLen;
      } else {
        normInputX = inputX;
        normInputY = inputY;
      }
    }

    const hasIntent = inputLen > 0.05;

    const basis = movementBasis;
    const worldMoveX = normInputX * basis.right.x + normInputY * basis.forward.x;
    const worldMoveZ = normInputX * basis.right.z + normInputY * basis.forward.z;
    const worldMoveLen = Math.hypot(worldMoveX, worldMoveZ);

    // Surface traction
    const oldSurface = state.currentSurfaceId;
    state.currentSurfaceId = getSurfaceAt(state.playerPos.x, state.playerPos.z);
    if (oldSurface !== state.currentSurfaceId) {
      const label = state.currentSurfaceId
        ? level.surfaceZones.find(s => s.id === state.currentSurfaceId)?.label ?? state.currentSurfaceId
        : 'Normal Ground';
      emit({ ...mkEvent('surfaceChanged'), type: 'surfaceChanged', surfaceId: state.currentSurfaceId, label } as SurfaceChangedEvent);
    }

    const surface = state.currentSurfaceId
      ? level.surfaceZones.find(s => s.id === state.currentSurfaceId)
      : null;
    const traction = surface?.traction ?? 1.0;

    let speed: number;
    let accel: number;
    if (state.scurryActive) {
      speed = CONFIG.SCURRY_SPEED;
      accel = 40;
    } else {
      speed = CONFIG.NORMAL_SPEED * CONFIG.FULL_BASKET_SPEED_PENALTY;
      accel = hasIntent ? CONFIG.ACCELERATION : CONFIG.BRAKING;
      accel *= traction;
    }

    let targetVx = 0;
    let targetVz = 0;
    if (hasIntent && worldMoveLen > 0.01) {
      targetVx = (worldMoveX / worldMoveLen) * speed;
      targetVz = (worldMoveZ / worldMoveLen) * speed;
    }

    const lerpFactor = Math.min(1.0, accel * dt);
    state.playerVelocity.x = lerp(state.playerVelocity.x, targetVx, lerpFactor);
    state.playerVelocity.z = lerp(state.playerVelocity.z, targetVz, lerpFactor);

    if (hasIntent && worldMoveLen > 0.01) {
      state.playerHeading = Math.atan2(worldMoveX, worldMoveZ);
    }

    const posBeforeMove = { ...state.playerPos };

    const moveResult = moveCharacter(
      physics,
      state.playerPos,
      { x: state.playerVelocity.x, y: 0, z: state.playerVelocity.z },
      dt
    );

    if (moveResult.slides) {
      emit({
        ...mkEvent('bumped'),
        type: 'bumped',
        position: { ...state.playerPos },
        normal: moveResult.collisionNormal ?? { x: 0, y: 0, z: 0 },
        intensity: Math.hypot(state.playerVelocity.x, state.playerVelocity.z) / CONFIG.NORMAL_SPEED,
      } as BumpedEvent);
    }

    state.playerPos = moveResult.position;
    state.grounded = moveResult.grounded;

    // Velocity is what actually happened, not what was intended. Pushing into
    // a wall therefore yields ~0 speed instead of full-speed footing in place.
    state.playerVelocity.x = (state.playerPos.x - posBeforeMove.x) / dt;
    state.playerVelocity.z = (state.playerPos.z - posBeforeMove.z) / dt;

    const achievedSpeed = Math.hypot(state.playerVelocity.x, state.playerVelocity.z);
    if (achievedSpeed < 0.5) {
      state.movementState = 'idle';
    } else if (state.scurryActive) {
      state.movementState = 'scurrying';
    } else {
      state.movementState = 'walking';
    }

    // ── Ghost recording ─────────────────────────────────────────────────
    maybeRecordGhostSample();

    // ── Collectible Pickup ───────────────────────────────────────────────
    if (round.basket.length < CONFIG.CAPACITY) {
      for (const spawn of level.collectibles) {
        if (round.collected.has(spawn.id)) continue;

        const dx = state.playerPos.x - spawn.position.x;
        const dz = state.playerPos.z - spawn.position.z;
        if (dx * dx + dz * dz <= CONFIG.PICKUP_RADIUS * CONFIG.PICKUP_RADIUS) {
          round.collected.add(spawn.id);
          round.basket.push(spawn.id);
          const regionId = spawn.regionId ?? null;
          round.basketRegions.set(spawn.id, regionId);

          // Track for rush order
          if (state.rushOrder && !state.rushOrder.completed && !state.rushOrder.expired) {
            if (regionId === state.rushOrder.regionId) {
              state.rushOrder.qualifyingCollected.add(spawn.id);
            }
          }

          emit({
            ...mkEvent('pickedUp'),
            type: 'pickedUp',
            position: { ...spawn.position },
            itemId: spawn.id,
            basketCount: round.basket.length,
            regionId,
          } as PickedUpEvent);

          if (round.basket.length >= CONFIG.CAPACITY) {
            emit({ ...mkEvent('basketFull'), type: 'basketFull', position: { ...state.playerPos } } as BasketFullEvent);
            break;
          }
        }
      }
    }

    // ── Delivery ─────────────────────────────────────────────────────────
    if (round.basket.length > 0 && state.deliveryCooldown <= 0) {
      const dz = level.deliveryZone;
      if (
        state.playerPos.x >= dz.position.x - dz.dimensions.x / 2 &&
        state.playerPos.x <= dz.position.x + dz.dimensions.x / 2 &&
        state.playerPos.z >= dz.position.z - dz.dimensions.z / 2 &&
        state.playerPos.z <= dz.position.z + dz.dimensions.z / 2
      ) {
        const count = round.basket.length;
        const deliveredIds = [...round.basket];
        round.delivered += count;
        round.basket = [];

        // Scoring
        const basePoints = count * CONFIG.POINTS_PER_MODAK;
        const isFullBasket = count === CONFIG.CAPACITY;
        const bonusPoints = isFullBasket ? CONFIG.FULL_BASKET_BONUS : 0;
        round.pointsScore += basePoints + bonusPoints;
        if (isFullBasket) {
          round.fullBasketBonuses++;
          emit({ ...mkEvent('fullBasketBonus'), type: 'fullBasketBonus', bonusPoints: CONFIG.FULL_BASKET_BONUS } as FullBasketBonusEvent);
        }

        // Rush order progress tracking
        if (state.rushOrder && !state.rushOrder.completed && !state.rushOrder.expired) {
          const order = state.rushOrder;
          for (const id of deliveredIds) {
            if (order.qualifyingCollected.has(id)) {
              order.deliveredCount++;
              order.qualifyingCollected.delete(id);
            }
          }
          if (order.deliveredCount >= CONFIG.RUSH_ORDER_REQUIRED) {
            order.completed = true;
            round.pointsScore += CONFIG.RUSH_ORDER_BONUS;
            round.rushOrdersCompleted++;
            state.rushOrder = null;
            emit({
              ...mkEvent('rushOrderCompleted'),
              type: 'rushOrderCompleted',
              regionId: order.regionId,
              regionLabel: order.regionLabel,
              bonusPoints: CONFIG.RUSH_ORDER_BONUS,
            } as RushOrderCompletedEvent);
          }
        }

        // Clear basket region map for delivered items
        for (const id of deliveredIds) round.basketRegions.delete(id);

        state.deliveryCooldown = CONFIG.DELIVERY_UNLOAD_COOLDOWN;

        emit({
          ...mkEvent('delivered'),
          type: 'delivered',
          position: { ...state.playerPos },
          count,
          totalDelivered: round.delivered,
          pointsEarned: basePoints + bonusPoints,
          fullBasketBonus: isFullBasket,
        } as DeliveredEvent);

        if (round.delivered >= level.collectibles.length) {
          endRound();
          return;
        }
      }
    }

    // ── Timer ─────────────────────────────────────────────────────────────
    if (!state.isPractice) {
      state.roundTimer -= dt;
      if (state.roundTimer <= 0) {
        state.roundTimer = 0;
        endRound();
        return;
      }
    }
  }

  // ─── Surface Detection ──────────────────────────────────────────────────
  function getSurfaceAt(x: number, z: number): string | null {
    for (const zone of level.surfaceZones) {
      if (x >= zone.bounds.minX && x <= zone.bounds.maxX &&
          z >= zone.bounds.minZ && z <= zone.bounds.maxZ) {
        return zone.id;
      }
    }
    return null;
  }

  // ─── Snapshot ───────────────────────────────────────────────────────────
  function getSnapshot(): GameSnapshot {
    const cargoCount = round.basket.length;
    const activeIds = level.collectibles
      .filter(c => !round.collected.has(c.id))
      .map(c => c.id);

    const playerState: PlayerSnapshot = {
      position: { ...state.playerPos },
      heading: state.playerHeading,
      velocity: { ...state.playerVelocity },
      grounded: state.grounded,
      movementState: state.movementState,
    };

    const scurrySnap: ScurrySnapshot = {
      active: state.scurryActive,
      remainingDuration: state.scurryTimer,
      cooldownRemaining: state.scurryCooldown,
    };

    const cargoSnap: CargoSnapshot = {
      count: cargoCount,
      capacity: CONFIG.CAPACITY,
      itemIds: [...round.basket],
    };

    let rushOrderSnap: RushOrderSnapshot | null = null;
    if (state.rushOrder && !state.rushOrder.completed && !state.rushOrder.expired) {
      const o = state.rushOrder;
      rushOrderSnap = {
        regionId: o.regionId,
        regionLabel: o.regionLabel,
        progress: o.deliveredCount,
        required: CONFIG.RUSH_ORDER_REQUIRED,
        timeRemaining: Math.max(0, o.endTime - state.elapsedSimTime),
        totalDuration: CONFIG.RUSH_ORDER_DURATION,
      };
    }

    // Ghost: only show if version matches level
    let ghostSamples: GhostSample[] | null = null;
    if (state.ghostEnabled && state.savedGhost) {
      const expectedVersion = `${level.levelId}-${level.version}`;
      if (state.savedGhost.version === expectedVersion) {
        ghostSamples = state.savedGhost.samples;
      }
    }

    return {
      phase: state.phase,
      timeRemaining: state.isPractice ? Infinity : state.roundTimer,
      elapsedTime: state.elapsedSimTime,
      isPractice: state.isPractice,
      deliveredCount: round.delivered,
      totalCollectibles: level.collectibles.length,
      pointsScore: round.pointsScore,
      fullBasketBonuses: round.fullBasketBonuses,
      rushOrdersCompleted: round.rushOrdersCompleted,
      cargo: cargoSnap,
      personalBest: state.personalBest,
      pbImproved: state.pbImproved,
      player: playerState,
      scurry: scurrySnap,
      activeCollectibleIds: activeIds,
      currentSurface: state.currentSurfaceId,
      muted: state.muted,
      roundId: state.roundId,
      score: round.delivered,
      rushOrder: rushOrderSnap,
      ghostEnabled: state.ghostEnabled,
      ghostSamples,
      lastRunSummary: state.lastRunSummary,
    };
  }

  function getEvents(): AnyGameEvent[] {
    const snap = events;
    events = [];
    return snap;
  }

  function getCollectiblePositions(): CollectibleSpawn[] {
    return level.collectibles;
  }

  function getLevel(): LevelDefinition {
    return level;
  }

  function free() {
    physics.free();
  }

  return {
    processCommand,
    step,
    getSnapshot,
    getEvents,
    getCollectiblePositions,
    getLevel,
    free,
    setMovementBasis,
  } as Simulation & { setMovementBasis(b: { right: Vec3; forward: Vec3 }): void };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
