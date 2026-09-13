/**
 * Presentation API — the interface between simulation and visual layer.
 *
 * ARCHITECTURE:
 * - Simulation (src/core/, src/physics/, src/gameplay/) is the authority for
 *   all gameplay state. It never imports Three.js or DOM APIs.
 * - Presentation (src/presentation/) owns the canvas, camera, HTML, input
 *   capture, visual animation, and audio. It receives read-only snapshots.
 * - The presentation MUST NOT mutate simulation state directly.
 *
 * CONTRACT:
 * 1. Simulation calls presentation.render(snapshot, events, renderDeltaSeconds)
 *    each frame with authoritative state.
 * 2. Presentation captures input and calls onCommand(command) to request
 *    state changes. Simulation processes commands at the start of each tick.
 * 3. Presentation calls getMovementBasis() to convert screen-space input to
 *    world-space movement directions.
 *
 * CLEANUP: Call presentation.dispose() before creating a new one or unloading.
 */

import type { AnyGameEvent } from './events';
import type { GameSnapshot } from './snapshot';
import type { GameCommand } from './commands';
import type { LevelDefinition, Vec3 } from './level';

export interface PresentationBasis {
  /** World-space right vector on the ground plane (normalized) */
  right: Vec3;
  /** World-space forward vector on the ground plane (normalized) */
  forward: Vec3;
}

export interface Presentation {
  /** Render one frame with the given snapshot and new events */
  render(
    snapshot: GameSnapshot,
    events: AnyGameEvent[],
    renderDeltaSeconds: number
  ): void;

  /**
   * Get the camera-relative movement basis vectors.
   * These are ground-projected unit vectors derived from the camera orientation.
   * Convert screen input (x, y) to world movement:
   *   worldDir = input.x * basis.right + input.y * basis.forward
   */
  getMovementBasis(): PresentationBasis;

  /** Clean up all resources (canvas, listeners, audio contexts) */
  dispose(): void;
}

export interface CreatePresentationOptions {
  /** DOM element to attach the canvas to */
  root: HTMLElement;
  /** Level definition for building visuals */
  level: LevelDefinition;
  /** Callback when presentation needs to send a command to the simulation */
  onCommand: (command: GameCommand) => void;
}

/**
 * Create a new presentation instance.
 * The presentation should:
 * - Create and attach a WebGL canvas
 * - Set up camera, lighting, and scene
 * - Build visuals from the level definition
 * - Capture keyboard and touch input
 * - Convert input to screen-space commands
 * - Handle audio (muted state from snapshot)
 * - Call onCommand() for all user interactions
 */
import { createPresentation as createPresentationImpl } from '../presentation';

export async function createPresentation(
  opts: CreatePresentationOptions
): Promise<Presentation> {
  return createPresentationImpl(opts);
}
