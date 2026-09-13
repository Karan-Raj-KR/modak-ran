/**
 * Presentation commands — input from presentation to simulation.
 *
 * CONVENTION: All movement commands use screen-space vectors.
 * - positive X = screen-right
 * - positive Y = screen-up
 * The simulation converts these to world-space using the camera basis.
 *
 * COMMAND SEMANTICS:
 * - start: Begin a new round (READY -> PLAYING)
 * - pause: Toggle pause (PLAYING -> PAUSED, PAUSED -> PLAYING)
 * - restart: Return to ready state, reset round (RESULTS/PAUSED -> READY)
 * - move: Continuous directional input (sent every frame while keys held)
 * - scurry: One-shot burst command (press-based)
 * - setMuted: Toggle audio mute
 */

export type CommandType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'move'
  | 'scurry'
  | 'setMuted';

export interface StartCommand {
  type: 'start';
}

export interface PauseCommand {
  type: 'pause';
}

export interface ResumeCommand {
  type: 'resume';
}

export interface RestartCommand {
  type: 'restart';
}

export interface MoveCommand {
  type: 'move';
  /** Normalized screen-space input vector. X: right, Y: up. */
  input: { x: number; y: number };
}

export interface ScurryCommand {
  type: 'scurry';
}

export interface SetMutedCommand {
  type: 'setMuted';
  muted: boolean;
}

export type GameCommand =
  | StartCommand
  | PauseCommand
  | ResumeCommand
  | RestartCommand
  | MoveCommand
  | ScurryCommand
  | SetMutedCommand;
