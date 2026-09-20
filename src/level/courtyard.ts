/**
 * Courtyard v1 level definition.
 *
 * 24 x 20 unit footprint. Y-up coordinates.
 * Player spawns at front-center (south side).
 * Shrine and delivery zone at back-right (north-east).
 * Two planted islands create routing choices.
 * 42 collectibles in three purposeful regions along walkable paths.
 *
 * Regions:
 *   courtyard — central plaza + south arrival (near spawn)
 *   garden    — west pathway + planted islands + flower area
 *   stall     — sweet stall counter + west-north zone
 */

import type { LevelDefinition } from '../contracts/level';

export const COURTYARD_LEVEL: LevelDefinition = {
  levelId: 'courtyard-v1',
  version: '1.1.0',

  worldBounds: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },

  spawn: { x: 0, y: 0, z: 6 },

  playerDimensions: {
    capsuleRadius: 0.32,
    capsuleHalfHeight: 0.35,
    feetOriginY: 0.67, // capsuleHalfHeight + capsuleRadius
  },

  staticColliders: [
    // Perimeter walls
    { id: 'wall-north', shape: 'box', transform: { position: { x: 0, y: 0.5, z: -9.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 24, y: 1.0, z: 0.4 } },
    { id: 'wall-south', shape: 'box', transform: { position: { x: 0, y: 0.5, z: 9.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 24, y: 1.0, z: 0.4 } },
    { id: 'wall-west', shape: 'box', transform: { position: { x: -11.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.4, y: 1.0, z: 20 } },
    { id: 'wall-east', shape: 'box', transform: { position: { x: 11.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.4, y: 1.0, z: 20 } },

    // Pandal shrine (back-right, non-traversable sanctuary)
    { id: 'shrine-platform', shape: 'box', transform: { position: { x: 7.0, y: 0.25, z: -8.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.6, y: 0.5, z: 3.0 } },
    { id: 'shrine-wall', shape: 'box', transform: { position: { x: 7.0, y: 1.8, z: -9.3 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.2, y: 3.2, z: 0.3 } },

    // Preparation stall (back-left, counter obstacle)
    { id: 'stall-counter', shape: 'box', transform: { position: { x: -7.0, y: 0.425, z: -6.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.0, y: 0.85, z: 1.8 } },

    // Planted Island A (center-left, circular planter).
    // dimensions are full extents: diameter 4.0 -> collider radius 2.0.
    { id: 'island-a', shape: 'cylinder', transform: { position: { x: -3.0, y: 0.15, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.0, y: 0.3, z: 4.0 } },

    // Planted Island B (center-right, smaller). Diameter 3.2 -> radius 1.6.
    { id: 'island-b', shape: 'cylinder', transform: { position: { x: 4.0, y: 0.15, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 3.2, y: 0.3, z: 3.2 } },
  ],

  ramps: [],

  props: [
    // Delivery pad (visual-only, rangoli indicator)
    { id: 'delivery-pad', kind: 'rangoli', transform: { position: { x: 7.0, y: 0.01, z: -5.0 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } }, dimensions: { x: 2.6, y: 0, z: 2.6 }, nonColliding: true },

    // Shrine decorative elements
    { id: 'shrine-canopy', kind: 'pandal-shrine', transform: { position: { x: 7.0, y: 3.4, z: -8.0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } }, dimensions: { x: 2.9, y: 1.2, z: 2.9 }, nonColliding: true },
    { id: 'shrine-kalash', kind: 'pandal-shrine', transform: { position: { x: 7.0, y: 1.35, z: -8.4 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.5, y: 0.8, z: 0.5 }, nonColliding: true },
    { id: 'shrine-table', kind: 'table', transform: { position: { x: 7.0, y: 0.55, z: -6.9 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 2.6, y: 0.18, z: 0.8 }, nonColliding: true },
    { id: 'shrine-garland', kind: 'garland', transform: { position: { x: 7.0, y: 2.7, z: -6.85 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 3.6, y: 0.2, z: 0.2 }, nonColliding: true },

    // Stall canopy
    { id: 'stall-canopy', kind: 'preparation-stall', transform: { position: { x: -7.0, y: 2.6, z: -6.8 }, rotation: { x: 0.12, y: 0, z: 0 } }, dimensions: { x: 4.4, y: 0.1, z: 2.4 }, nonColliding: true },

    // Planted Island A decorations (footprint matches the 4.0 collider diameter)
    { id: 'island-a-foliage', kind: 'island-a', transform: { position: { x: -3.0, y: 0.25, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.0, y: 0.8, z: 4.0 }, nonColliding: true },
    { id: 'island-a-tulsi', kind: 'tulsi', transform: { position: { x: -3.0, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.6, y: 0.65, z: 0.6 }, nonColliding: true },

    // Planted Island B decorations (footprint matches the 3.2 collider diameter)
    { id: 'island-b-foliage', kind: 'island-b', transform: { position: { x: 4.0, y: 0.22, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 3.2, y: 0.7, z: 3.2 }, nonColliding: true },

    // Perimeter lamps
    ...([
      { x: -11.2, z: -9.2 }, { x: 0, z: -9.5 }, { x: 11.2, z: 9.2 },
      { x: -11.2, z: 9.2 }, { x: -11.2, z: 0 }, { x: 11.2, z: 0 }, { x: 0, z: 9.5 },
    ] as const).map((p, i) => ({
      id: `lamp-${i}`, kind: 'lamp' as PropKind,
      transform: { position: { x: p.x, y: 0, z: p.z }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { x: 0.7, y: 1.3, z: 0.7 },
      nonColliding: true,
    })),

    // Front rangoli
    { id: 'rangoli-front', kind: 'rangoli', transform: { position: { x: 0, y: 0.02, z: 5.5 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } }, dimensions: { x: 2.7, y: 0, z: 2.7 }, nonColliding: true },
  ],

  // 42 collectibles in three regions:
  // courtyard (14): central plaza + south arrival — easy access near spawn
  // garden    (14): west pathway + planted islands — scenic loop
  // stall     (14): west-north zone near sweet stall — bonus territory
  collectibles: [
    // ── COURTYARD region (14) ─────────────────────────────────────────────
    { id: 0,  position: { x:  0.0, y: 0, z:  4.2 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 1,  position: { x: -1.5, y: 0, z:  5.0 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 2,  position: { x:  1.5, y: 0, z:  5.0 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 3,  position: { x: -0.2, y: 0, z:  2.5 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 4,  position: { x:  0.2, y: 0, z:  0.8 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 5,  position: { x:  0.6, y: 0, z: -1.0 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 6,  position: { x:  0.7, y: 0, z: -2.5 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 7,  position: { x:  0.6, y: 0, z: -4.2 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 8,  position: { x:  1.8, y: 0, z: -1.8 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 9,  position: { x:  1.9, y: 0, z: -3.6 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 10, position: { x: -3.2, y: 0, z:  6.0 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 11, position: { x:  3.2, y: 0, z:  6.5 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 12, position: { x: -1.8, y: 0, z:  7.5 }, regionId: 'courtyard', regionLabel: 'Courtyard' },
    { id: 13, position: { x:  1.8, y: 0, z:  7.5 }, regionId: 'courtyard', regionLabel: 'Courtyard' },

    // ── GARDEN region (14) — west path + planted islands ─────────────────
    { id: 14, position: { x: -7.0, y: 0, z:  3.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 15, position: { x: -8.8, y: 0, z:  4.0 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 16, position: { x: -7.2, y: 0, z:  1.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 17, position: { x: -8.9, y: 0, z:  1.8 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 18, position: { x: -7.0, y: 0, z: -0.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 19, position: { x: -8.8, y: 0, z: -1.0 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 20, position: { x: -7.2, y: 0, z: -2.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 21, position: { x: -8.8, y: 0, z: -3.0 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 22, position: { x: -5.2, y: 0, z:  6.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 23, position: { x: -7.5, y: 0, z:  6.8 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 24, position: { x:  7.2, y: 0, z:  1.2 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 25, position: { x:  7.5, y: 0, z:  2.8 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 26, position: { x:  8.8, y: 0, z:  1.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },
    { id: 27, position: { x:  8.6, y: 0, z:  3.5 }, regionId: 'garden', regionLabel: 'Flower Garden' },

    // ── STALL region (14) — near sweet stall + pandal approach ────────────
    { id: 28, position: { x: -2.8, y: 0, z: -4.5 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 29, position: { x: -4.8, y: 0, z: -4.2 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 30, position: { x: -6.8, y: 0, z: -4.0 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 31, position: { x: -9.2, y: 0, z: -4.5 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 32, position: { x:  3.8, y: 0, z: -4.5 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 33, position: { x:  4.6, y: 0, z: -2.8 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 34, position: { x:  5.2, y: 0, z: -1.2 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 35, position: { x:  6.8, y: 0, z: -1.8 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 36, position: { x:  8.8, y: 0, z: -3.2 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 37, position: { x:  9.2, y: 0, z: -4.8 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 38, position: { x:  9.0, y: 0, z: -1.5 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 39, position: { x:  7.4, y: 0, z:  5.2 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 40, position: { x:  9.0, y: 0, z:  6.0 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
    { id: 41, position: { x:  5.2, y: 0, z:  7.0 }, regionId: 'stall', regionLabel: 'Sweet Stall' },
  ],

  regions: [
    {
      id: 'courtyard',
      label: 'Courtyard',
      center: { x: 0, y: 0, z: 2 },
      bounds: { minX: -4, maxX: 4, minZ: -5, maxZ: 8 },
    },
    {
      id: 'garden',
      label: 'Flower Garden',
      center: { x: -7, y: 0, z: 1 },
      bounds: { minX: -11.5, maxX: -5.5, minZ: -4, maxZ: 8 },
    },
    {
      id: 'stall',
      label: 'Sweet Stall',
      center: { x: 5, y: 0, z: -3 },
      bounds: { minX: -10, maxX: 11.5, minZ: -6.5, maxZ: 8 },
    },
  ],

  deliveryZone: {
    id: 'delivery-pad',
    shape: 'box',
    position: { x: 7.0, y: 0.01, z: -5.0 },
    dimensions: { x: 2.6, y: 1.0, z: 2.6 },
  },

  surfaceZones: [
    // Wet stone shortcut (south wall path, lower traction)
    {
      id: 'wet-stone',
      shape: 'box',
      bounds: { minX: -5.0, maxX: 5.0, minZ: 8.5, maxZ: 9.5 },
      traction: 0.65,
      label: 'Wet Stone',
    },
  ],
};

import type { PropKind } from '../contracts/level';
