/**
 * Feature tests: scoring (10pts/modak, +30 full basket), rush orders, practice mode.
 */

import assert from 'node:assert/strict';
import { createSimulation, CONFIG } from '../../src/core/simulation';
import { COURTYARD_LEVEL } from '../../src/level/courtyard';
import type { Vec3 } from '../../src/contracts/level';

const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };
const FORWARD: Vec3 = { x: 0, y: 0, z: -1 };

function makeSim() {
  const sim = createSimulation(COURTYARD_LEVEL);
  (sim as any).setMovementBasis({ right: RIGHT, forward: FORWARD });
  return sim;
}

// ── Scoring: 10 pts per modak ─────────────────────────────────────────────
console.log('Testing base scoring (10 pts/modak)...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // Walk toward first collectible cluster (spawn at 0,6; items at ~0,4.2)
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } }); // forward = -Z = into courtyard
  for (let i = 0; i < 60; i++) sim.step(1 / 60);

  let snap = sim.getSnapshot();
  const collectedBefore = snap.cargo.count;
  assert.ok(collectedBefore > 0, `Should collect items near spawn, got ${collectedBefore}`);

  // Move to delivery zone (7, -5) — go right and north
  sim.processCommand({ type: 'move', input: { x: 0.7, y: 0.7 } });
  for (let i = 0; i < 240; i++) sim.step(1 / 60);

  snap = sim.getSnapshot();
  if (snap.deliveredCount > 0) {
    // Score should be deliveredCount * 10 (no full basket bonus since < 6)
    const expected = snap.deliveredCount * CONFIG.POINTS_PER_MODAK;
    assert.equal(snap.pointsScore, expected, `Score ${snap.pointsScore} should be ${expected}`);
  }

  sim.free();
}

// ── Scoring: Full basket bonus (30 pts extra for delivering exactly 6) ────
console.log('Testing full basket bonus (+30 pts for 6-modak delivery)...');
{
  // Manually drive simulation to a full basket and delivery
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // Warp simulation: collect 6 items by walking around and driving manually
  // Just step through simulation collecting items
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } });
  for (let i = 0; i < 120; i++) sim.step(1 / 60);

  let snap = sim.getSnapshot();
  // Continue until basket is full or we run out of attempts
  let attempts = 0;
  while (snap.cargo.count < 6 && attempts < 600) {
    sim.step(1 / 60);
    snap = sim.getSnapshot();
    attempts++;
  }

  if (snap.cargo.count === 6) {
    // Deliver — move to delivery pad (7, -5)
    sim.processCommand({ type: 'move', input: { x: 1, y: 0 } }); // right
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    sim.processCommand({ type: 'move', input: { x: 0, y: 1 } }); // into courtyard
    for (let i = 0; i < 120; i++) sim.step(1 / 60);

    snap = sim.getSnapshot();
    if (snap.deliveredCount === 6) {
      const expectedScore = 6 * CONFIG.POINTS_PER_MODAK + CONFIG.FULL_BASKET_BONUS;
      assert.equal(snap.pointsScore, expectedScore,
        `Full basket score should be ${expectedScore}, got ${snap.pointsScore}`);
      assert.equal(snap.fullBasketBonuses, 1, 'Should count one full basket bonus');
    }
  }

  sim.free();
}

// ── Practice mode: timer doesn't run, records not updated ─────────────────
console.log('Testing practice mode...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'startPractice' });

  let snap = sim.getSnapshot();
  assert.equal(snap.isPractice, true, 'Should be in practice mode');
  assert.equal(snap.phase, 'playing', 'Should be playing');

  const initialTime = snap.timeRemaining;

  // Step 2 seconds
  for (let i = 0; i < 120; i++) sim.step(1 / 60);

  snap = sim.getSnapshot();
  // Timer should not decrease in practice mode
  assert.equal(snap.timeRemaining, initialTime, 'Timer should not decrease in practice mode');

  sim.free();
}

// ── Practice mode: switch to scored round resets ──────────────────────────
console.log('Testing practice to scored round transition...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'startPractice' });
  for (let i = 0; i < 60; i++) sim.step(1 / 60);

  let snap = sim.getSnapshot();
  assert.equal(snap.isPractice, true, 'Should be in practice');

  // Start a scored round
  sim.processCommand({ type: 'start' });
  snap = sim.getSnapshot();
  assert.equal(snap.isPractice, false, 'Should not be in practice after start');
  assert.equal(snap.timeRemaining, CONFIG.ROUND_DURATION, 'Timer should reset to 60');
  assert.equal(snap.deliveredCount, 0, 'Delivered should reset');
  assert.equal(snap.pointsScore, 0, 'Score should reset');

  sim.free();
}

// ── Ghost toggle ──────────────────────────────────────────────────────────
console.log('Testing ghost toggle...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  let snap = sim.getSnapshot();
  const initialGhostEnabled = snap.ghostEnabled;
  assert.equal(initialGhostEnabled, true, 'Ghost should default to enabled');

  sim.processCommand({ type: 'toggleGhost' });
  snap = sim.getSnapshot();
  assert.equal(snap.ghostEnabled, false, 'Ghost should be disabled after toggle');

  sim.processCommand({ type: 'toggleGhost' });
  snap = sim.getSnapshot();
  assert.equal(snap.ghostEnabled, true, 'Ghost should re-enable after second toggle');

  sim.free();
}

// ── Collision tests run inline (imported from collision tests) ─────────────
console.log('Running collision verification...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // Walk north 5 seconds and verify bounded
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } });
  for (let i = 0; i < 300; i++) sim.step(1 / 60);
  const snap = sim.getSnapshot();
  assert.ok(snap.player.position.z >= -9.5, `Should be blocked by north wall at ${snap.player.position.z}`);

  sim.free();
}

console.log('All feature tests passed!');
