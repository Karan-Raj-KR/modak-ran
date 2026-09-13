/**
 * Core simulation — authoritative game state machine.
 *
 * Owns: physics stepping, movement processing, collision response, time,
 * score, state transitions, collectible/delivery logic.
 *
 * Does NOT import Three.js, DOM, or any presentation code.
 * Emits snapshots and events for the presentation to consume.
 */

import { createPhysicsWorld, moveCharacter, type PhysicsWorld } from '../physics/rapier';
import type {
  LevelDefinition,
  Vec3,
  CollectibleSpawn,
  SurfaceZone,
} from '../contracts/level';
import type { GameSnapshot, GamePhase, CargoSnapshot, ScurrySnapshot, PlayerSnapshot } from '../contracts/snapshot';
import type { AnyGameEvent, PickedUpEvent, DeliveredEvent, ScurryStartedEvent, BumpedEvent, RoundEndedEvent, SurfaceChangedEvent } from '../contracts/events';
import type { GameCommand } from '../contracts/commands';

// ─── Configuration ──────────────────────────────────────────────────────────
export const CONFIG = {
  // Simulation
  FIXED_TIMESTEP: 1 / 60,
  MAX_CATCHUP: 0.1, // Max seconds of catchup per frame

  // Movement
  NORMAL_SPEED: 4.8,
  ACCELERATION: 22,
  BRAKING: 30,
  CAPSULE_RADIUS: 0.32,
  CAPSULE_HALF_HEIGHT: 0.35,

  // Scurry
  SCURRY_SPEED: 8.5,
  SCURRY_DURATION: 0.28,
  SCURRY_COOLDOWN: 2.5,

  // Cargo
  CAPACITY: 6,
  FULL_BASKET_SPEED_PENALTY: 0.9, // 10% speed reduction when full

  // Pickup/delivery
  PICKUP_RADIUS: 0.75,
  DELIVERY_UNLOAD_COOLDOWN: 0.1, // Prevent double-unload

  // Timer
  ROUND_DURATION: 60,

  // Physics
  GROUND_FRICTION: 0.7,
  WALL_SLIDE_BOUNCE: 0.0,
} as const;

// ─── Round State ────────────────────────────────────────────────────────────
interface RoundState {
  /** Set of collected item IDs */
  collected: Set<number>;
  /** Items currently in basket (array for ordered access) */
  basket: number[];
  /** Number successfully delivered */
  delivered: number;
  /** Whether this round has ended */
  ended: boolean;
}

function freshRound(): RoundState {
  return {
    collected: new Set(),
    basket: [],
    delivered: 0,
    ended: false,
  };
}

// ─── Simulation State ───────────────────────────────────────────────────────
interface SimState {
  phase: GamePhase;
  roundId: number;
  roundTimer: number;
  elapsedSimTime: number;

  // Player
  playerPos: Vec3;
  playerHeading: number;
  playerVelocity: Vec3;
  grounded: boolean;

  // Movement
  inputIntent: Vec3; // Normalized screen-space input
  movementState: 'idle' | 'walking' | 'scurrying' | 'scurry-cooldown';

  // Scurry
  scurryActive: boolean;
  scurryTimer: number;
  scurryCooldown: number;
  scurryDirection: Vec3;

  // Surface
  currentSurfaceId: string | null;

  // Audio
  muted: boolean;

  // Personal best
  personalBest: number;
  pbImproved: boolean;

  // Delivery cooldown (prevent instant re-unload)
  deliveryCooldown: number;
}

// ─── Simulation Interface ───────────────────────────────────────────────────
export interface Simulation {
  /** Process a command from the presentation */
  processCommand(command: GameCommand): void;

  /** Step the simulation by dt seconds (fixed timestep recommended) */
  step(dt: number): void;

  /** Get current snapshot for rendering */
  getSnapshot(): GameSnapshot;

  /** Get events emitted since last getEvents() call */
  getEvents(): AnyGameEvent[];

  /** Get active collectible positions (for presentation) */
  getCollectiblePositions(): CollectibleSpawn[];

  /** Get level definition */
  getLevel(): LevelDefinition;

  /** Clean up physics */
  free(): void;
}

export function createSimulation(level: LevelDefinition): Simulation {
  // Initialize physics
  const physics: PhysicsWorld = createPhysicsWorld(level);

  // State
  const state: SimState = {
    phase: 'loading',
    roundId: 0,
    roundTimer: CONFIG.ROUND_DURATION,
    elapsedSimTime: 0,

    playerPos: { ...level.spawn },
    playerHeading: -Math.PI, // Facing toward back of courtyard
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

    personalBest: 0,
    pbImproved: false,

    deliveryCooldown: 0,
  };

  // Round state
  let round: RoundState = freshRound();

  // Events buffer
  let events: AnyGameEvent[] = [];
  let nextEventId = 1;

  // Presentation basis (updated by presentation)
  let movementBasis = {
    right: { x: 1, y: 0, z: 0 } as Vec3,
    forward: { x: 0, y: 0, z: 1 } as Vec3,
  };

  // Load personal best
  try {
    const saved = localStorage.getItem('modak_pb');
    if (saved) state.personalBest = parseInt(saved, 10) || 0;
  } catch { /* ignore */ }

  // ─── Command Processing ─────────────────────────────────────────────────
  function processCommand(command: GameCommand) {
    switch (command.type) {
      case 'start':
        if (state.phase === 'ready' || state.phase === 'loading') {
          startRound();
        }
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
        startRound();
        break;

      case 'move':
        state.inputIntent = {
          x: command.input.x,
          y: command.input.y,
          z: 0,
        };
        break;

      case 'scurry':
        tryScurry();
        break;

      case 'setMuted':
        state.muted = command.muted;
        break;
    }
  }

  // ─── Round Management ───────────────────────────────────────────────────
  function startRound() {
    round = freshRound();
    state.phase = 'playing';
    state.roundId++;
    state.roundTimer = CONFIG.ROUND_DURATION;
    state.elapsedSimTime = 0;
    state.playerPos = { ...level.spawn };
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
    events = [];
    nextEventId = 1;
  }

  function endRound() {
    state.phase = 'results';
    round.ended = true;

    // Check if basket contents are lost (not delivered)
    const lost = round.basket.length;

    // Update personal best
    if (round.delivered > state.personalBest) {
      state.personalBest = round.delivered;
      state.pbImproved = true;
      try {
        localStorage.setItem('modak_pb', String(state.personalBest));
      } catch { /* ignore */ }
    } else {
      state.pbImproved = false;
    }

    // Emit round ended event
    events.push({
      eventId: nextEventId++,
      roundId: state.roundId,
      timestamp: state.elapsedSimTime,
      type: 'roundEnded',
      deliveredCount: round.delivered,
      allDelivered: round.delivered >= level.collectibles.length,
    });
  }

  // ─── Scurry ──────────────────────────────────────────────────────────────
  function tryScurry(): boolean {
    if (
      state.phase !== 'playing' ||
      state.scurryActive ||
      state.scurryCooldown > 0 ||
      (state.inputIntent.x === 0 && state.inputIntent.y === 0)
    ) {
      return false;
    }

    // Lock direction from current movement
    const basis = movementBasis;
    const worldDirX = state.inputIntent.x * basis.right.x + state.inputIntent.y * basis.forward.x;
    const worldDirZ = state.inputIntent.x * basis.right.z + state.inputIntent.y * basis.forward.z;
    const len = Math.hypot(worldDirX, worldDirZ);

    if (len < 0.01) return false;

    state.scurryActive = true;
    state.scurryTimer = CONFIG.SCURRY_DURATION;
    state.scurryCooldown = CONFIG.SCURRY_COOLDOWN;
    state.movementState = 'scurrying';
    state.scurryDirection = {
      x: worldDirX / len,
      y: 0,
      z: worldDirZ / len,
    };

    events.push({
      eventId: nextEventId++,
      roundId: state.roundId,
      timestamp: state.elapsedSimTime,
      type: 'scurryStarted',
      direction: { ...state.scurryDirection },
    });

    return true;
  }

  // ─── Movement Basis ──────────────────────────────────────────────────────
  function setMovementBasis(basis: { right: Vec3; forward: Vec3 }) {
    movementBasis = basis;
  }

  // ─── Simulation Step ─────────────────────────────────────────────────────
  function step(dt: number) {
    // Always process frame delta for scurry/cooldown even when paused
    if (state.phase !== 'playing') {
      return;
    }

    state.elapsedSimTime += dt;

    // Decrement cooldowns
    if (state.scurryCooldown > 0) {
      state.scurryCooldown = Math.max(0, state.scurryCooldown - dt);
    }
    if (state.deliveryCooldown > 0) {
      state.deliveryCooldown = Math.max(0, state.deliveryCooldown - dt);
    }

    // Update scurry timer
    if (state.scurryActive) {
      state.scurryTimer -= dt;
      if (state.scurryTimer <= 0) {
        state.scurryActive = false;
        state.movementState = 'idle';
      }
    }

    // ─── Movement Calculation ────────────────────────────────────────────
    const inputX = state.inputIntent.x;
    const inputY = state.inputIntent.y;
    let inputLen = Math.hypot(inputX, inputY);

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

    // Convert screen-space input to world-space movement
    const basis = movementBasis;
    const worldMoveX = normInputX * basis.right.x + normInputY * basis.forward.x;
    const worldMoveZ = normInputX * basis.right.z + normInputY * basis.forward.z;
    const worldMoveLen = Math.hypot(worldMoveX, worldMoveZ);

    state.grounded = true; // Assume grounded until proven otherwise

    // Check current surface
    const oldSurface = state.currentSurfaceId;
    state.currentSurfaceId = getSurfaceAt(state.playerPos.x, state.playerPos.z);

    if (oldSurface !== state.currentSurfaceId) {
      const surfaceLabel = state.currentSurfaceId
        ? level.surfaceZones.find(s => s.id === state.currentSurfaceId)?.label ?? state.currentSurfaceId
        : 'Normal Ground';
      events.push({
        eventId: nextEventId++,
        roundId: state.roundId,
        timestamp: state.elapsedSimTime,
        type: 'surfaceChanged',
        surfaceId: state.currentSurfaceId,
        label: surfaceLabel,
      });
    }

    // Get traction modifier
    const surface = state.currentSurfaceId
      ? level.surfaceZones.find(s => s.id === state.currentSurfaceId)
      : null;
    const traction = surface?.traction ?? 1.0;

    // Speed and acceleration
    let speed: number;
    let accel: number;
    if (state.scurryActive) {
      speed = CONFIG.SCURRY_SPEED;
      accel = 40; // Fast snap during scurry
    } else {
      speed = CONFIG.NORMAL_SPEED;
      if (round.basket.length >= CONFIG.CAPACITY) {
        speed *= CONFIG.FULL_BASKET_SPEED_PENALTY;
      }
      // Traction reduces braking/lateral response
      accel = hasIntent ? CONFIG.ACCELERATION : CONFIG.BRAKING;
      accel *= traction; // Less traction = less responsive
    }

    // Target velocity
    let targetVx = 0;
    let targetVz = 0;
    if (hasIntent && worldMoveLen > 0.01) {
      targetVx = (worldMoveX / worldMoveLen) * speed;
      targetVz = (worldMoveZ / worldMoveLen) * speed;
    }

    // Smooth velocity change
    const lerpFactor = Math.min(1.0, accel * dt);
    state.playerVelocity.x = lerp(state.playerVelocity.x, targetVx, lerpFactor);
    state.playerVelocity.z = lerp(state.playerVelocity.z, targetVz, lerpFactor);

    // Update heading
    if (hasIntent && worldMoveLen > 0.01) {
      state.playerHeading = Math.atan2(worldMoveX, worldMoveZ);
    }

    // Apply movement through Rapier
    const desiredMovement = {
      x: state.playerVelocity.x,
      y: 0,
      z: state.playerVelocity.z,
    };

    const moveResult = moveCharacter(
      physics,
      state.playerPos,
      desiredMovement,
      dt
    );

    // Update state from physics result
    if (moveResult.slides) {
      // Emit bump event for wall slides
      events.push({
        eventId: nextEventId++,
        roundId: state.roundId,
        timestamp: state.elapsedSimTime,
        type: 'bumped',
        position: { ...state.playerPos },
        normal: moveResult.collisionNormal ?? { x: 0, y: 0, z: 0 },
        intensity: Math.hypot(state.playerVelocity.x, state.playerVelocity.z) / CONFIG.NORMAL_SPEED,
      });
    }

    state.playerPos = moveResult.position;
    state.grounded = moveResult.grounded;

    // Update movement state
    if (state.scurryActive) {
      state.movementState = 'scurrying';
    } else if (hasIntent) {
      state.movementState = 'walking';
    } else {
      state.movementState = 'idle';
    }

    // ─── Collectible Pickup ──────────────────────────────────────────────
    if (round.basket.length < CONFIG.CAPACITY) {
      for (const spawn of level.collectibles) {
        if (round.collected.has(spawn.id)) continue;

        const dx = state.playerPos.x - spawn.position.x;
        const dz = state.playerPos.z - spawn.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq <= CONFIG.PICKUP_RADIUS * CONFIG.PICKUP_RADIUS) {
          // Collect
          round.collected.add(spawn.id);
          round.basket.push(spawn.id);

          events.push({
            eventId: nextEventId++,
            roundId: state.roundId,
            timestamp: state.elapsedSimTime,
            type: 'pickedUp',
            position: { ...spawn.position },
            itemId: spawn.id,
            basketCount: round.basket.length,
          });
        }
      }
    }

    // ─── Delivery ────────────────────────────────────────────────────────
    if (round.basket.length > 0 && state.deliveryCooldown <= 0) {
      const dz = level.deliveryZone;
      if (
        state.playerPos.x >= dz.position.x - dz.dimensions.x / 2 &&
        state.playerPos.x <= dz.position.x + dz.dimensions.x / 2 &&
        state.playerPos.z >= dz.position.z - dz.dimensions.z / 2 &&
        state.playerPos.z <= dz.position.z + dz.dimensions.z / 2
      ) {
        const count = round.basket.length;
        round.delivered += count;
        const deliveredIds = [...round.basket];
        round.basket = [];
        state.deliveryCooldown = CONFIG.DELIVERY_UNLOAD_COOLDOWN;

        events.push({
          eventId: nextEventId++,
          roundId: state.roundId,
          timestamp: state.elapsedSimTime,
          type: 'delivered',
          position: { ...state.playerPos },
          count,
          totalDelivered: round.delivered,
        });

        // Check if all delivered
        if (round.delivered >= level.collectibles.length) {
          endRound();
          return;
        }
      }
    }

    // ─── Timer ───────────────────────────────────────────────────────────
    state.roundTimer -= dt;
    if (state.roundTimer <= 0) {
      state.roundTimer = 0;
      endRound();
      return;
    }
  }

  // ─── Surface Detection ──────────────────────────────────────────────────
  function getSurfaceAt(x: number, z: number): string | null {
    for (const zone of level.surfaceZones) {
      if (
        x >= zone.bounds.minX &&
        x <= zone.bounds.maxX &&
        z >= zone.bounds.minZ &&
        z <= zone.bounds.maxZ
      ) {
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

    return {
      phase: state.phase,
      timeRemaining: state.roundTimer,
      elapsedTime: state.elapsedSimTime,
      deliveredCount: round.delivered,
      totalCollectibles: level.collectibles.length,
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
    };
  }

  function getEvents(): AnyGameEvent[] {
    const snapshot = events;
    events = [];
    return snapshot;
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

  // ─── Exposed API ────────────────────────────────────────────────────────
  return {
    processCommand,
    step,
    getSnapshot,
    getEvents,
    getCollectiblePositions,
    getLevel,
    free,
    // Internal for testing
    setMovementBasis,
  } as Simulation & { setMovementBasis(b: { right: Vec3; forward: Vec3 }): void };
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
