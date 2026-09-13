/**
 * Game events — emitted by simulation for presentation feedback.
 *
 * EVENT DELIVERY: Presentation receives a batch of new events each frame via
 * render(snapshot, events, dt). Events are one-shot — presentation must not
 * replay them on subsequent frames. Use the eventId + roundId for deduplication
 * if needed.
 *
 * All world positions are feet-origin Y-up coordinates.
 */

import type { Vec3 } from './level';

export type GameEventType =
  | 'pickedUp'
  | 'delivered'
  | 'scurryStarted'
  | 'bumped'
  | 'roundEnded'
  | 'basketFull'
  | 'surfaceChanged';

export interface GameEvent {
  /** Unique event identifier (monotonically increasing within a round) */
  eventId: number;
  /** Round ID this event belongs to */
  roundId: number;
  /** Simulation timestamp when event occurred (seconds) */
  timestamp: number;
  /** Event type discriminator */
  type: GameEventType;
}

export interface PickedUpEvent extends GameEvent {
  type: 'pickedUp';
  /** World position where pickup occurred */
  position: Vec3;
  /** ID of the collected item */
  itemId: number;
  /** Current basket count after pickup */
  basketCount: number;
}

export interface DeliveredEvent extends GameEvent {
  type: 'delivered';
  /** World position where delivery occurred */
  position: Vec3;
  /** Number of items delivered in this batch */
  count: number;
  /** Total delivered so far */
  totalDelivered: number;
}

export interface ScurryStartedEvent extends GameEvent {
  type: 'scurryStarted';
  /** Direction of scurry (normalized) */
  direction: Vec3;
}

export interface BumpedEvent extends GameEvent {
  type: 'bumped';
  /** World position of collision */
  position: Vec3;
  /** Collision normal (pointing away from obstacle) */
  normal: Vec3;
  /** Impact intensity (0-1, used for camera shake) */
  intensity: number;
}

export interface RoundEndedEvent extends GameEvent {
  type: 'roundEnded';
  /** Final delivered count */
  deliveredCount: number;
  /** Whether all items were delivered */
  allDelivered: boolean;
}

export interface BasketFullEvent extends GameEvent {
  type: 'basketFull';
  /** Position of player when basket was full */
  position: Vec3;
}

export interface SurfaceChangedEvent extends GameEvent {
  type: 'surfaceChanged';
  /** New surface zone ID (null = normal ground) */
  surfaceId: string | null;
  /** Surface label */
  label: string;
}

export type AnyGameEvent =
  | PickedUpEvent
  | DeliveredEvent
  | ScurryStartedEvent
  | BumpedEvent
  | RoundEndedEvent
  | BasketFullEvent
  | SurfaceChangedEvent;
