import assert from 'node:assert/strict';
import { walkable, modakPoints, isInDeliveryZone } from '../../src/world';

// Test world definitions and reachable bounds
assert.equal(modakPoints.length, 42, 'Must have exactly 42 modaks');

for (const [x, z] of modakPoints) {
  assert.equal(walkable(x, z), true, `Modak at (${x}, ${z}) must be walkable`);
  assert.equal(isInDeliveryZone(x, z), false, `Modak at (${x}, ${z}) must not be inside delivery zone`);
}

console.log('presentation tests: world colliders, delivery boundaries, and 42 modak points passed');
