import assert from 'node:assert/strict';
import { modakPoints, walkable, isInDeliveryZone } from '../src/map';

assert.equal(modakPoints.length, 42);

for (const [x, z] of modakPoints) {
  assert.equal(walkable(x, z), true, `unreachable modak at (${x}, ${z})`);
  assert.equal(isInDeliveryZone(x, z), false, `modak in delivery zone at (${x}, ${z})`);
}

console.log('map: all 42 fixed 3D modaks are walkable and outside delivery zone');
