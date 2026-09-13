/**
 * Courtyard v1 level definition.
 *
 * 24 x 20 unit footprint. Y-up coordinates.
 * Player spawns at front-center (south side).
 * Shrine and delivery zone at back-right (north-east).
 * Two planted islands create routing choices.
 * 42 collectibles in purposeful clusters along walkable paths.
 */

import type { LevelDefinition } from '../contracts/level';

export const COURTYARD_LEVEL: LevelDefinition = {
  levelId: 'courtyard-v1',
  version: '1.0.0',

  worldBounds: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },

  spawn: { x: 0, y: 0, z: 6 },

  playerDimensions: {
    capsuleRadius: 0.32,
    capsuleHalfHeight: 0.35,
    feetOriginY: 0.67, // capsuleHalfHeight + capsuleRadius
  },

  staticColliders: [
    // Perimeter walls (thin box colliders around boundary)
    // North wall
    { id: 'wall-north', shape: 'box', transform: { position: { x: 0, y: 0.5, z: -9.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 24, y: 1.0, z: 0.4 } },
    // South wall
    { id: 'wall-south', shape: 'box', transform: { position: { x: 0, y: 0.5, z: 9.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 24, y: 1.0, z: 0.4 } },
    // West wall
    { id: 'wall-west', shape: 'box', transform: { position: { x: -11.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.4, y: 1.0, z: 20 } },
    // East wall
    { id: 'wall-east', shape: 'box', transform: { position: { x: 11.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.4, y: 1.0, z: 20 } },

    // Pandal shrine (back-right, non-traversable sanctuary)
    { id: 'shrine-platform', shape: 'box', transform: { position: { x: 7.0, y: 0.25, z: -8.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.6, y: 0.5, z: 3.0 } },
    { id: 'shrine-wall', shape: 'box', transform: { position: { x: 7.0, y: 1.8, z: -9.3 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.2, y: 3.2, z: 0.3 } },

    // Preparation stall (back-left, counter obstacle)
    { id: 'stall-counter', shape: 'box', transform: { position: { x: -7.0, y: 0.425, z: -6.8 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 4.0, y: 0.85, z: 1.8 } },

    // Planted Island A (center-left, rounded)
    { id: 'island-a', shape: 'cylinder', transform: { position: { x: -3.0, y: 0.15, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 2.0, y: 0.3, z: 2.5 } },

    // Planted Island B (center-right, smaller)
    { id: 'island-b', shape: 'cylinder', transform: { position: { x: 4.0, y: 0.15, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 1.6, y: 0.3, z: 1.9 } },
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

    // Planted Island A decorations
    { id: 'island-a-foliage', kind: 'island-a', transform: { position: { x: -3.0, y: 0.25, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 3.8, y: 0.8, z: 4.8 }, nonColliding: true },
    { id: 'island-a-tulsi', kind: 'tulsi', transform: { position: { x: -3.0, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 0.6, y: 0.65, z: 0.6 }, nonColliding: true },

    // Planted Island B decorations
    { id: 'island-b-foliage', kind: 'island-b', transform: { position: { x: 4.0, y: 0.22, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } }, dimensions: { x: 3.2, y: 0.7, z: 3.8 }, nonColliding: true },

    // Perimeter lamps
    ...[
      { x: -11.2, z: -9.2 }, { x: 0, z: -9.5 }, { x: 11.2, z: 9.2 },
      { x: -11.2, z: 9.2 }, { x: -11.2, z: 0 }, { x: 11.2, z: 0 }, { x: 0, z: 9.5 },
    ].map((p, i) => ({
      id: `lamp-${i}`, kind: 'lamp' as PropKind,
      transform: { position: { x: p.x, y: 0, z: p.z }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { x: 0.7, y: 1.3, z: 0.7 },
      nonColliding: true,
    })),

    // Front rangoli
    { id: 'rangoli-front', kind: 'rangoli', transform: { position: { x: 0, y: 0.02, z: 5.5 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } }, dimensions: { x: 2.7, y: 0, z: 2.7 }, nonColliding: true },
  ],

  collectibles: [
    // Cluster 1: Near spawn (quick early pickups, ~2 seconds from spawn)
    { id: 0, position: { x: 0.0, y: 0, z: 4.2 } },
    { id: 1, position: { x: -1.5, y: 0, z: 5.0 } },
    { id: 2, position: { x: 1.5, y: 0, z: 5.0 } },
    { id: 3, position: { x: -0.2, y: 0, z: 2.5 } },
    { id: 4, position: { x: 0.2, y: 0, z: 0.8 } },

    // Cluster 2: Central corridor between Island A & Island B
    { id: 5, position: { x: 0.6, y: 0, z: -1.0 } },
    { id: 6, position: { x: 0.7, y: 0, z: -2.5 } },
    { id: 7, position: { x: 0.6, y: 0, z: -4.2 } },
    { id: 8, position: { x: 1.8, y: 0, z: -1.8 } },
    { id: 9, position: { x: 1.9, y: 0, z: -3.6 } },

    // Cluster 3: Approach to Pandal / Delivery Pad
    { id: 10, position: { x: 3.8, y: 0, z: -4.5 } },
    { id: 11, position: { x: 4.6, y: 0, z: -2.8 } },
    { id: 12, position: { x: 5.2, y: 0, z: -1.2 } },
    { id: 13, position: { x: 6.8, y: 0, z: -1.8 } },
    { id: 14, position: { x: 8.8, y: 0, z: -3.2 } },
    { id: 15, position: { x: 9.2, y: 0, z: -4.8 } },
    { id: 16, position: { x: 9.0, y: 0, z: -1.5 } },

    // Cluster 4: East pathway (Right of Island B)
    { id: 17, position: { x: 7.2, y: 0, z: 1.2 } },
    { id: 18, position: { x: 7.5, y: 0, z: 2.8 } },
    { id: 19, position: { x: 8.8, y: 0, z: 1.5 } },
    { id: 20, position: { x: 8.6, y: 0, z: 3.5 } },
    { id: 21, position: { x: 7.4, y: 0, z: 5.2 } },
    { id: 22, position: { x: 9.0, y: 0, z: 6.0 } },

    // Cluster 5: South arrival area
    { id: 23, position: { x: -3.2, y: 0, z: 6.0 } },
    { id: 24, position: { x: -5.2, y: 0, z: 6.5 } },
    { id: 25, position: { x: -7.5, y: 0, z: 6.8 } },
    { id: 26, position: { x: 3.2, y: 0, z: 6.5 } },
    { id: 27, position: { x: 5.2, y: 0, z: 7.0 } },
    { id: 28, position: { x: -1.8, y: 0, z: 7.5 } },
    { id: 29, position: { x: 1.8, y: 0, z: 7.5 } },

    // Cluster 6: West pathway (Left of Island A)
    { id: 30, position: { x: -7.0, y: 0, z: 3.5 } },
    { id: 31, position: { x: -8.8, y: 0, z: 4.0 } },
    { id: 32, position: { x: -7.2, y: 0, z: 1.5 } },
    { id: 33, position: { x: -8.9, y: 0, z: 1.8 } },
    { id: 34, position: { x: -7.0, y: 0, z: -0.5 } },
    { id: 35, position: { x: -8.8, y: 0, z: -1.0 } },
    { id: 36, position: { x: -7.2, y: 0, z: -2.5 } },
    { id: 37, position: { x: -8.8, y: 0, z: -3.0 } },

    // Cluster 7: Near preparation stall
    { id: 38, position: { x: -2.8, y: 0, z: -4.5 } },
    { id: 39, position: { x: -4.8, y: 0, z: -4.2 } },
    { id: 40, position: { x: -6.8, y: 0, z: -4.0 } },
    { id: 41, position: { x: -9.2, y: 0, z: -4.5 } },
  ],

  deliveryZone: {
    id: 'delivery-pad',
    shape: 'box',
    position: { x: 7.0, y: 0.01, z: -5.0 },
    dimensions: { x: 2.6, y: 1.0, z: 2.6 },
  },

  surfaceZones: [
    // Wet stone shortcut (shorter path along south wall, lower traction)
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
