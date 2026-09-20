/**
 * Level definition contract — shared, frozen boundary between simulation and presentation.
 *
 * UNITS: Y-up world coordinates. 1 unit ≈ 1 meter for gameplay feel.
 * PLAYER ORIGIN: feet position (ground contact point at Y=0).
 * YAW: 0 = facing +Z, positive rotation is counter-clockwise (left-hand rule).
 * DIMENSIONS: width = X extent, depth = Z extent, height = Y extent.
 *
 * Static colliders define non-traversable regions.
 * Surface zones define traction modifiers.
 * Props are visual-only and do not block movement.
 * Decorations listed here must NOT block the player collider.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler angles (radians): x=pitch, y=yaw, z=roll
}

export type ColliderShape = 'box' | 'capsule' | 'cylinder' | 'ramp';

export interface StaticCollider {
  id: string;
  shape: ColliderShape;
  transform: Transform;
  /** Half-extents for box; radius+halfHeight for capsule; radius+halfHeight for cylinder */
  dimensions: Vec3;
  /** Optional friction override for this collider surface */
  friction?: number;
}

export interface RampGeometry {
  id: string;
  transform: Transform;
  /** Width along local X */
  width: number;
  /** Depth along local Z (horizontal span) */
  depth: number;
  /** Height at the top (Y rise) */
  height: number;
}

export type PropKind =
  | 'pandal-shrine'
  | 'preparation-stall'
  | 'island-a'
  | 'island-b'
  | 'lamp'
  | 'rangoli'
  | 'tulsi'
  | 'table'
  | 'garland'
  | 'decoration';

export interface Prop {
  id: string;
  kind: PropKind;
  transform: Transform;
  dimensions: Vec3;
  /** If true, this prop has NO collider. Gemini may replace visuals freely. */
  nonColliding: boolean;
}

export type RegionId = 'stall' | 'garden' | 'courtyard';

export interface RegionDefinition {
  id: RegionId;
  label: string;
  center: Vec3;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface CollectibleSpawn {
  id: number;
  position: Vec3;
  regionId?: RegionId;
  regionLabel?: string;
}

export interface SurfaceZone {
  id: string;
  shape: 'box';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Traction modifier: 1.0 = normal, <1 = slippery (less braking/lateral force) */
  traction: number;
  /** Display name for presentation (e.g. "wet stone") */
  label: string;
}

export interface DeliveryZone {
  id: string;
  shape: 'box';
  position: Vec3;
  dimensions: Vec3;
}

export interface PlayerDimensions {
  /** Capsule radius for collision */
  capsuleRadius: number;
  /** Capsule half-height (total height = 2 * halfHeight + 2 * radius) */
  capsuleHalfHeight: number;
  /** Origin offset from feet (Y=0) — should be capsuleHalfHeight + capsuleRadius */
  feetOriginY: number;
}

export interface LevelDefinition {
  /** Stable version string */
  levelId: string;
  /** SemVer-like version for detecting incompatible changes */
  version: string;

  /** World footprint */
  worldBounds: {
    minX: number; maxX: number;
    minZ: number; maxZ: number;
  };

  /** Player spawn position (feet, Y=0) */
  spawn: Vec3;

  /** Player collider dimensions */
  playerDimensions: PlayerDimensions;

  /** Non-traversable static colliders */
  staticColliders: StaticCollider[];

  /** Optional ramp geometry (added as trimesh collider) */
  ramps: RampGeometry[];

  /** Visual-only props (rendered by presentation, no collision) */
  props: Prop[];

  /** Collectible pickup locations */
  collectibles: CollectibleSpawn[];

  /** Named collection regions */
  regions?: RegionDefinition[];

  /** Delivery zone definition */
  deliveryZone: DeliveryZone;

  /** Surface traction zones */
  surfaceZones: SurfaceZone[];
}

