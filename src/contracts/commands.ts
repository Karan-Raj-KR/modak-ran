/**
 * Presentation commands — input from presentation to simulation.
 */

export type CommandType =
  | 'start'
  | 'startPractice'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'move'
  | 'scurry'
  | 'setMuted'
  | 'toggleGhost';

export interface StartCommand { type: 'start'; }
export interface StartPracticeCommand { type: 'startPractice'; }
export interface PauseCommand { type: 'pause'; }
export interface ResumeCommand { type: 'resume'; }
export interface RestartCommand { type: 'restart'; }
export interface MoveCommand {
  type: 'move';
  input: { x: number; y: number };
}
export interface ScurryCommand { type: 'scurry'; }
export interface SetMutedCommand { type: 'setMuted'; muted: boolean; }
export interface ToggleGhostCommand { type: 'toggleGhost'; }

export type GameCommand =
  | StartCommand
  | StartPracticeCommand
  | PauseCommand
  | ResumeCommand
  | RestartCommand
  | MoveCommand
  | ScurryCommand
  | SetMutedCommand
  | ToggleGhostCommand;

