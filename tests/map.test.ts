import assert from 'node:assert/strict';
import { modakPoints, walkable } from '../src/map';
assert.equal(modakPoints.length, 42);
for (const [x,y] of modakPoints) { assert.equal(walkable(x,y), true, `unreachable modak ${x},${y}`); assert.equal(x >= 786 && x <= 884 && y >= 105 && y <= 201, false, `modak in delivery zone ${x},${y}`); }
console.log('map: 42 fixed modaks are walkable and outside delivery zone');
