/**
 * GameSnapshot — read-only state snapshot emitted by simulation each frame.
 */

import type { Vec3, RegionId } from './level';

export type GamePhase = 'loading' | 'ready' | 'playing' | 'paused' | 'results';

export type MovementState =
  | 'idle'
  | 'walking'
  | 'scurrying'
  | 'scurry-cooldown';

export interface PlayerSnapshot {
  position: Vec3;
  heading: number;
  velocity: Vec3;
  grounded: boolean;
  movementState: MovementState;
}

export interface ScurrySnapshot {
  active: boolean;
  remainingDuration: number;
  cooldownRemaining: number;
}

export interface CargoSnapshot {
  count: number;
  capacity: number;
  itemIds: number[];
}

export interface RushOrderSnapshot {
  regionId: RegionId;
  regionLabel: string;
  /** Items collected from target region after order started and delivered */
  progress: number;
  /** Required deliveries */
  required: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Total duration in seconds */
  totalDuration: number;
}

export interface RunSummary {
  deliveredCount: number;
  pointsScore: number;
  fullBasketBonuses: number;
  rushOrdersCompleted: number;
  rushOrdersIssued: number;
  basketRemainingAtEnd: number;
}

export interface GhostSample {
  t: number;
  x: number;
  z: number;
  heading: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  timeRemaining: number;
  elapsedTime: number;

  /** Whether this is an unscored practice session */
  isPractice: boolean;

  /** Modaks delivered this round */
  deliveredCount: number;
  totalCollectibles: number;

  /** Points score: 10pts/modak + 30pts full basket bonus */
  pointsScore: number;
  /** How many full-basket bonuses earned this round */
  fullBasketBonuses: number;
  /** Rush orders successfully completed */
  rushOrdersCompleted: number;

  cargo: CargoSnapshot;

  /** Personal best points score */
  personalBest: number;
  pbImproved: boolean;

  player: PlayerSnapshot;
  scurry: ScurrySnapshot;

  activeCollectibleIds: number[];
  currentSurface: string | null;

  muted: boolean;
  roundId: number;

  /** Legacy alias: same as deliveredCount */
  score: number;

  /** Active rush order, if any */
  rushOrder: RushOrderSnapshot | null;

  /** Ghost visible toggle */
  ghostEnabled: boolean;

  /** Ghost trajectory from personal best run (null if not available) */
  ghostSamples: GhostSample[] | null;

  /** Summary of last round for results screen */
  lastRunSummary: RunSummary | null;
}

