export type GameState = 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'RESULTS';

export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleCollider {
  type: 'circle';
  x: number;
  z: number;
  radius: number;
}

export type Collider = BoxCollider | CircleCollider;

export interface ModakItem {
  id: number;
  x: number;
  z: number;
  collected: boolean;
}

export interface PlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  rotation: number;
  isMoving: boolean;
  isScurrying: boolean;
  scurryTimer: number;
  scurryCooldown: number;
}
