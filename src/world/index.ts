export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const MAP_BOUNDS = {
  minX: -10.8,
  maxX: 10.8,
  minZ: -8.8,
  maxZ: 8.8,
};

export const DELIVERY_ZONE = {
  x: 7.0,
  z: -5.0,
  width: 2.6,
  depth: 2.6,
  minX: 5.7,
  maxX: 8.3,
  minZ: -6.3,
  maxZ: -3.7,
};

export const OBSTACLES: BoxCollider[] = [
  // Pandal shrine structure
  {
    type: 'box',
    minX: 4.7,
    maxX: 9.3,
    minZ: -9.5,
    maxZ: -6.4,
  },
  // Preparation stall
  {
    type: 'box',
    minX: -9.2,
    maxX: -4.8,
    minZ: -8.2,
    maxZ: -5.4,
  },
  // Planted Island A (west)
  {
    type: 'box',
    minX: -5.0,
    maxX: -1.0,
    minZ: -2.5,
    maxZ: 2.5,
  },
  // Planted Island B (east)
  {
    type: 'box',
    minX: 2.4,
    maxX: 5.6,
    minZ: 0.1,
    maxZ: 3.9,
  },
];

export function walkable(x: number, z: number, padding: number = 0.4): boolean {
  if (
    x < MAP_BOUNDS.minX + padding ||
    x > MAP_BOUNDS.maxX - padding ||
    z < MAP_BOUNDS.minZ + padding ||
    z > MAP_BOUNDS.maxZ - padding
  ) {
    return false;
  }

  for (const obs of OBSTACLES) {
    if (
      x >= obs.minX - padding &&
      x <= obs.maxX + padding &&
      z >= obs.minZ - padding &&
      z <= obs.maxZ + padding
    ) {
      return false;
    }
  }

  return true;
}

export function isInDeliveryZone(x: number, z: number): boolean {
  return (
    x >= DELIVERY_ZONE.minX &&
    x <= DELIVERY_ZONE.maxX &&
    z >= DELIVERY_ZONE.minZ &&
    z <= DELIVERY_ZONE.maxZ
  );
}

export const modakPoints: [number, number][] = [
  // Cluster 1: Arrival courtyard & near player start (0, 6)
  [0.0, 4.2],
  [-1.5, 5.0],
  [1.5, 5.0],
  [-0.2, 2.5],
  [0.2, 0.8],

  // Cluster 2: Central corridor between Island A & Island B
  [0.6, -1.0],
  [0.7, -2.5],
  [0.6, -4.2],
  [1.8, -1.8],
  [1.9, -3.6],

  // Cluster 3: Approach to Pandal / Delivery Pad
  [3.8, -4.5],
  [4.6, -2.8],
  [5.2, -1.2],
  [6.8, -1.8],
  [8.8, -3.2],
  [9.2, -4.8],
  [9.0, -1.5],

  // Cluster 4: East pathway (Right of Island B)
  [7.2, 1.2],
  [7.5, 2.8],
  [8.8, 1.5],
  [8.6, 3.5],
  [7.4, 5.2],
  [9.0, 6.0],

  // Cluster 5: South arrival & rangoli area
  [-3.2, 6.0],
  [-5.2, 6.5],
  [-7.5, 6.8],
  [3.2, 6.5],
  [5.2, 7.0],
  [-1.8, 7.5],
  [1.8, 7.5],

  // Cluster 6: West pathway (Left of Island A)
  [-7.0, 3.5],
  [-8.8, 4.0],
  [-7.2, 1.5],
  [-8.9, 1.8],
  [-7.0, -0.5],
  [-8.8, -1.0],
  [-7.2, -2.5],
  [-8.8, -3.0],

  // Cluster 7: Near food preparation stall
  [-2.8, -4.5],
  [-4.8, -4.2],
  [-6.8, -4.0],
  [-9.2, -4.5],
];
