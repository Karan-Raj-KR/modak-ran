/**
 * Test fixtures for the presentation layer.
 * Import these to build and test visuals without the simulation.
 */

import { COURTYARD_LEVEL } from '../level/courtyard';
import type { GameSnapshot } from './snapshot';
import type { AnyGameEvent } from './events';
import type { LevelDefinition, Vec3 } from './level';

export { COURTYARD_LEVEL };

export function makeMockSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    phase: 'playing',
    timeRemaining: 60,
    elapsedTime: 0,
    deliveredCount: 0,
    totalCollectibles: 42,
    cargo: { count: 0, capacity: 6, itemIds: [] },
    personalBest: 0,
    pbImproved: false,
    player: {
      position: { x: 0, y: 0, z: 6 },
      heading: -Math.PI,
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      movementState: 'idle',
    },
    scurry: { active: false, remainingDuration: 0, cooldownRemaining: 0 },
    activeCollectibleIds: Array.from({ length: 42 }, (_, i) => i),
    currentSurface: null,
    muted: false,
    roundId: 1,
    score: 0,
    ...overrides,
  };
}

export function makeMockEvents(count: number = 0): AnyGameEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    eventId: i + 1,
    roundId: 1,
    timestamp: i * 0.5,
    type: 'pickedUp' as const,
    position: { x: 0, y: 0, z: 4 },
    itemId: i,
    basketCount: 1,
  }));
}

export function makeMockLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return { ...COURTYARD_LEVEL, ...overrides };
}
