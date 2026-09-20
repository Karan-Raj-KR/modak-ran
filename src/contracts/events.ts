/**
 * Game events — emitted by simulation for presentation feedback.
 */

import type { Vec3, RegionId } from './level';

export type GameEventType =
  | 'pickedUp'
  | 'delivered'
  | 'scurryStarted'
  | 'bumped'
  | 'roundEnded'
  | 'basketFull'
  | 'surfaceChanged'
  | 'rushOrderStarted'
  | 'rushOrderCompleted'
  | 'rushOrderExpired'
  | 'fullBasketBonus';

export interface GameEvent {
  eventId: number;
  roundId: number;
  timestamp: number;
  type: GameEventType;
}

export interface PickedUpEvent extends GameEvent {
  type: 'pickedUp';
  position: Vec3;
  itemId: number;
  basketCount: number;
  regionId: RegionId | null;
}

export interface DeliveredEvent extends GameEvent {
  type: 'delivered';
  position: Vec3;
  count: number;
  totalDelivered: number;
  pointsEarned: number;
  fullBasketBonus: boolean;
}

export interface ScurryStartedEvent extends GameEvent {
  type: 'scurryStarted';
  direction: Vec3;
}

export interface BumpedEvent extends GameEvent {
  type: 'bumped';
  position: Vec3;
  normal: Vec3;
  intensity: number;
}

export interface RoundEndedEvent extends GameEvent {
  type: 'roundEnded';
  deliveredCount: number;
  allDelivered: boolean;
  finalScore: number;
}

export interface BasketFullEvent extends GameEvent {
  type: 'basketFull';
  position: Vec3;
}

export interface SurfaceChangedEvent extends GameEvent {
  type: 'surfaceChanged';
  surfaceId: string | null;
  label: string;
}

export interface RushOrderStartedEvent extends GameEvent {
  type: 'rushOrderStarted';
  regionId: RegionId;
  regionLabel: string;
  durationSeconds: number;
}

export interface RushOrderCompletedEvent extends GameEvent {
  type: 'rushOrderCompleted';
  regionId: RegionId;
  regionLabel: string;
  bonusPoints: number;
}

export interface RushOrderExpiredEvent extends GameEvent {
  type: 'rushOrderExpired';
  regionId: RegionId;
  progress: number;
}

export interface FullBasketBonusEvent extends GameEvent {
  type: 'fullBasketBonus';
  bonusPoints: number;
}

export type AnyGameEvent =
  | PickedUpEvent
  | DeliveredEvent
  | ScurryStartedEvent
  | BumpedEvent
  | RoundEndedEvent
  | BasketFullEvent
  | SurfaceChangedEvent
  | RushOrderStartedEvent
  | RushOrderCompletedEvent
  | RushOrderExpiredEvent
  | FullBasketBonusEvent;

