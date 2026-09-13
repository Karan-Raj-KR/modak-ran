/**
 * GameSnapshot — read-only state snapshot emitted by simulation each frame.
 *
 * PRESENTATION: Read this data to render the scene. Do NOT mutate any snapshot.
 * All positions are world Y-up coordinates.
 * Player position is feet origin (Y ≈ 0 when grounded).
 * Heading is yaw rotation in radians (0 = +Z, CCW positive).
 */

import type { Vec3 } from './level';

export type GamePhase = 'loading' | 'ready' | 'playing' | 'paused' | 'results';

export type MovementState =
  | 'idle'
  | 'walking'
  | 'scurrying'
  | 'scurry-cooldown';

export interface PlayerSnapshot {
  /** Feet position (ground contact point) */
  position: Vec3;
  /** Yaw rotation in radians */
  heading: number;
  /** Current velocity in world units/second */
  velocity: Vec3;
  /** Whether the character controller is grounded */
  grounded: boolean;
  /** Current movement state */
  movementState: MovementState;
}

export interface ScurrySnapshot {
  /** Whether scurry burst is currently active */
  active: boolean;
  /** Remaining scurry time in seconds (0 if not active) */
  remainingDuration: number;
  /** Current cooldown remaining in seconds (0 when ready) */
  cooldownRemaining: number;
}

export interface CargoSnapshot {
  /** Number of items currently carried */
  count: number;
  /** Maximum capacity */
  capacity: number;
  /** IDs of items in basket (max length = capacity) */
  itemIds: number[];
}

export interface GameSnapshot {
  /** Current game phase */
  phase: GamePhase;

  /** Round timer: seconds remaining (counting down from 60) */
  timeRemaining: number;
  /** Elapsed simulation time this round */
  elapsedTime: number;

  /** Number of modaks delivered */
  deliveredCount: number;
  /** Total collectibles in the level */
  totalCollectibles: number;

  /** Current basket state */
  cargo: CargoSnapshot;

  /** Personal best delivered count */
  personalBest: number;
  /** Whether personal best was improved this round */
  pbImproved: boolean;

  /** Player state */
  player: PlayerSnapshot;

  /** Scurry state */
  scurry: ScurrySnapshot;

  /** Active collectible IDs (not yet collected) */
  activeCollectibleIds: number[];

  /** Current surface zone ID (null = normal ground) */
  currentSurface: string | null;

  /** Whether audio is muted */
  muted: boolean;

  /** Unique round identifier for event correlation */
  roundId: number;

  /** Current score (alias for deliveredCount) */
  score: number;
}
