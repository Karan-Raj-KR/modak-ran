import assert from 'node:assert/strict';
import { CAPACITY, collect, deliver, end, freshRound } from '../src/rules';
const r = freshRound();
for (let i = 0; i < CAPACITY; i++) assert.equal(collect(r, i), true);
assert.equal(collect(r, 9), false); assert.equal(collect(r, 0), false);
assert.equal(deliver(r), CAPACITY); assert.equal(deliver(r), 0); assert.equal(r.delivered, CAPACITY);
end(r); assert.equal(collect(r, 10), false); assert.equal(deliver(r), 0);
const reset = freshRound(); assert.deepEqual({ basket: reset.basket, delivered: reset.delivered, items: reset.collected.size }, { basket: 0, delivered: 0, items: 0 });
console.log('rules: capacity, one-time pickup, delivery, ending, restart passed');
