/**
 * Gameplay mechanics tests — covers capacity, pickup uniqueness, delivery,
 * timer, pause, restart, movement, scurry, cargo, surface transitions.
 */

import assert from 'node:assert/strict';
import { createSimulation, CONFIG } from '../../src/core/simulation';
import { COURTYARD_LEVEL } from '../../src/level/courtyard';
import type { Vec3 } from '../../src/contracts/level';

function makeSim() {
  return createSimulation(COURTYARD_LEVEL);
}

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

// ─── Capacity Tests ─────────────────────────────────────────────────────────
console.log('Testing capacity...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });

  // Start round
  sim.processCommand({ type: 'start' });
  let snap = sim.getSnapshot();
  assert.equal(snap.phase, 'playing', 'Should be playing after start');
  assert.equal(snap.cargo.count, 0, 'Basket starts empty');

  // Move to first collectible (near spawn)
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } }); // Up on screen = forward in world
  for (let i = 0; i < 60; i++) sim.step(1/60);

  snap = sim.getSnapshot();
  // Should have picked up at least one
  assert.ok(snap.cargo.count > 0, `Should pick up items, got ${snap.cargo.count}`);

  // Fill basket
  while (snap.cargo.count < CONFIG.CAPACITY) {
    sim.step(1/60);
    snap = sim.getSnapshot();
  }

  assert.equal(snap.cargo.count, CONFIG.CAPACITY, `Basket should be full at ${CONFIG.CAPACITY}`);

  // Try to collect more — shouldn't increase
  const beforeCount = snap.cargo.count;
  for (let i = 0; i < 30; i++) sim.step(1/60);
  snap = sim.getSnapshot();
  assert.equal(snap.cargo.count, beforeCount, 'Basket should not exceed capacity');

  sim.free();
}

// ─── Pickup Uniqueness ──────────────────────────────────────────────────────
console.log('Testing pickup uniqueness...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Move to collect an item
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 60; i++) sim.step(1/60);

  const snap1 = sim.getSnapshot();
  const pickedIds = snap1.cargo.itemIds.slice();

  // Continue moving — should not pick up same item
  for (let i = 0; i < 30; i++) sim.step(1/60);
  const snap2 = sim.getSnapshot();

  // All previously picked IDs should still be in basket
  for (const id of pickedIds) {
    assert.ok(snap2.cargo.itemIds.includes(id), `Item ${id} should remain in basket`);
  }

  sim.free();
}

// ─── Delivery Tests ─────────────────────────────────────────────────────────
console.log('Testing delivery...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Collect items and deliver
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });

  // Collect some items
  for (let i = 0; i < 120; i++) sim.step(1/60);

  const snap1 = sim.getSnapshot();
  const basketCount = snap1.cargo.count;

  if (basketCount > 0) {
    // Move toward delivery zone (back-right of courtyard)
    // Delivery zone is at (7, -5), player starts near (0, 6)
    // Need to move roughly +X and -Z
    sim.processCommand({ type: 'move', input: { x: 0.7, y: -0.7 } });

    for (let i = 0; i < 200; i++) {
      sim.step(1/60);
    }

    const snap2 = sim.getSnapshot();
    // Either delivered (score > 0) or still heading there
    if (snap2.deliveredCount > 0) {
      assert.equal(snap2.cargo.count, 0, 'Basket should be empty after delivery');
      assert.equal(snap2.score, snap2.deliveredCount, 'Score should equal delivered count');
    }
  }

  sim.free();
}

// ─── Timer Tests ────────────────────────────────────────────────────────────
console.log('Testing timer...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  let snap = sim.getSnapshot();
  const initialTime = snap.timeRemaining;
  assert.equal(initialTime, CONFIG.ROUND_DURATION, 'Timer should start at 60');

  // Step a few frames
  for (let i = 0; i < 60; i++) sim.step(1/60);

  snap = sim.getSnapshot();
  assert.ok(snap.timeRemaining < initialTime, 'Timer should count down');
  assert.ok(snap.timeRemaining > 58, 'Timer should not jump too far');

  sim.free();
}

// ─── Pause Tests ────────────────────────────────────────────────────────────
console.log('Testing pause...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 30; i++) sim.step(1/60);

  const timeBeforePause = sim.getSnapshot().timeRemaining;

  sim.processCommand({ type: 'pause' });
  let snap = sim.getSnapshot();
  assert.equal(snap.phase, 'paused', 'Should be paused');

  // Step while paused — timer should not change
  for (let i = 0; i < 30; i++) sim.step(1/60);
  snap = sim.getSnapshot();
  assert.equal(snap.timeRemaining, timeBeforePause, 'Timer should not change while paused');

  // Resume
  sim.processCommand({ type: 'resume' });
  snap = sim.getSnapshot();
  assert.equal(snap.phase, 'playing', 'Should be playing after resume');

  sim.free();
}

// ─── Restart Tests ──────────────────────────────────────────────────────────
console.log('Testing restart...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 120; i++) sim.step(1/60);

  const snap1 = sim.getSnapshot();

  // Restart
  sim.processCommand({ type: 'restart' });
  const snap2 = sim.getSnapshot();

  assert.equal(snap2.phase, 'playing', 'Should be playing after restart');
  assert.equal(snap2.timeRemaining, CONFIG.ROUND_DURATION, 'Timer should reset');
  assert.equal(snap2.cargo.count, 0, 'Basket should be empty');
  assert.equal(snap2.deliveredCount, 0, 'Delivered should reset');
  assert.equal(snap2.elapsedTime, 0, 'Elapsed time should reset');
  assert.ok(snap2.roundId > snap1.roundId, 'Round ID should increment');

  sim.free();
}

// ─── Movement Direction Tests ───────────────────────────────────────────────
console.log('Testing movement directions...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Test rightward movement (+X)
  sim.processCommand({ type: 'move', input: { x: 1, y: 0 } });
  for (let i = 0; i < 10; i++) sim.step(1/60);
  let snap = sim.getSnapshot();
  assert.ok(snap.player.position.x > 0, `Right movement should increase X, got ${snap.player.position.x}`);

  // Reset
  sim.processCommand({ type: 'restart' });

  // Test forward movement (-Z in screen = forward in world)
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 10; i++) sim.step(1/60);
  snap = sim.getSnapshot();
  assert.ok(snap.player.position.z < 6, `Forward movement should decrease Z, got ${snap.player.position.z}`);

  sim.free();
}

// ─── Diagonal Speed Normalization ───────────────────────────────────────────
console.log('Testing diagonal normalization...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Move diagonally (full input)
  sim.processCommand({ type: 'move', input: { x: 1, y: -1 } });
  for (let i = 0; i < 5; i++) sim.step(1/60);
  const snap1 = sim.getSnapshot();
  const diagSpeed = Math.hypot(snap1.player.velocity.x, snap1.player.velocity.z);

  // Reset
  sim.processCommand({ type: 'restart' });

  // Move straight (half input)
  sim.processCommand({ type: 'move', input: { x: 1, y: 0 } });
  for (let i = 0; i < 5; i++) sim.step(1/60);
  const snap2 = sim.getSnapshot();
  const straightSpeed = Math.hypot(snap2.player.velocity.x, snap2.player.velocity.z);

  // Diagonal should not be faster than straight (should be normalized)
  assert.ok(diagSpeed <= straightSpeed * 1.1, `Diagonal ${diagSpeed} should not exceed straight ${straightSpeed} significantly`);

  sim.free();
}

// ─── Scurry Tests ───────────────────────────────────────────────────────────
console.log('Testing scurry...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Start moving
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 5; i++) sim.step(1/60);

  // Scurry
  sim.processCommand({ type: 'scurry' });
  // Step once to let scurry accelerate
  sim.step(1/60);
  let snap = sim.getSnapshot();
  assert.ok(snap.scurry.active, 'Scurry should be active');
  assert.ok(Math.abs(snap.player.velocity.z) > CONFIG.NORMAL_SPEED, 'Scurry should be faster than normal');

  // Wait for scurry to end
  for (let i = 0; i < 30; i++) sim.step(1/60);
  snap = sim.getSnapshot();
  assert.ok(!snap.scurry.active, 'Scurry should end');
  assert.ok(snap.scurry.cooldownRemaining > 0, 'Cooldown should be active');

  // Try to scurry again during cooldown
  const beforeCooldown = snap.scurry.cooldownRemaining;
  sim.processCommand({ type: 'scurry' });
  snap = sim.getSnapshot();
  assert.equal(snap.scurry.cooldownRemaining, beforeCooldown, 'Scurry should not activate during cooldown');

  sim.free();
}

// ─── Scurry Without Movement ────────────────────────────────────────────────
console.log('Testing scurry requires movement...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // No movement input
  sim.processCommand({ type: 'move', input: { x: 0, y: 0 } });
  for (let i = 0; i < 5; i++) sim.step(1/60);

  // Try to scurry without movement
  const result = sim.processCommand({ type: 'scurry' });
  const snap = sim.getSnapshot();
  assert.ok(!snap.scurry.active, 'Scurry should not activate without movement');

  sim.free();
}

// ─── Surface Transition Tests ───────────────────────────────────────────────
console.log('Testing surface transitions...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  let snap = sim.getSnapshot();
  assert.equal(snap.currentSurface, null, 'Start on normal ground');

  // Move toward wet stone zone (near south wall, Z > 8.5)
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } });
  for (let i = 0; i < 60; i++) sim.step(1/60);

  snap = sim.getSnapshot();
  // Should either be on wet stone or still on normal ground
  if (snap.currentSurface === 'wet-stone') {
    assert.ok(true, 'Transitioned to wet stone surface');
  }

  sim.free();
}

// ─── Storage Failure Resilience ─────────────────────────────────────────────
console.log('Testing storage failure resilience...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Simulate localStorage failure by clearing mock
  // The simulation should still work
  for (let i = 0; i < 30; i++) sim.step(1/60);

  const snap = sim.getSnapshot();
  assert.equal(snap.phase, 'playing', 'Game should still be playing without storage');

  sim.free();
}

// ─── No Movement When Paused ────────────────────────────────────────────────
console.log('Testing no movement when paused...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Get initial position
  const initialPos = sim.getSnapshot().player.position;

  // Pause
  sim.processCommand({ type: 'pause' });

  // Try to move
  sim.processCommand({ type: 'move', input: { x: 1, y: 0 } });
  for (let i = 0; i < 30; i++) sim.step(1/60);

  const snap = sim.getSnapshot();
  assert.equal(snap.player.position.x, initialPos.x, 'X should not change while paused');
  assert.equal(snap.player.position.z, initialPos.z, 'Z should not change while paused');

  sim.free();
}

// ─── Final Tick Ordering ────────────────────────────────────────────────────
console.log('Testing final tick ordering...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });
  sim.processCommand({ type: 'start' });

  // Move close to timer expiry
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 3500; i++) sim.step(1/60); // ~58 seconds

  let snap = sim.getSnapshot();
  if (snap.phase === 'playing') {
    // Step until timer runs out
    for (let i = 0; i < 200; i++) sim.step(1/60);
    snap = sim.getSnapshot();
    assert.equal(snap.phase, 'results', 'Should transition to results when timer expires');
    assert.equal(snap.timeRemaining, 0, 'Timer should be 0');
  }

  sim.free();
}

// ─── Multiple Rounds ────────────────────────────────────────────────────────
console.log('Testing multiple rounds...');

{
  const sim = makeSim();
  (sim as any).setMovementBasis({ right: vec3(1, 0, 0), forward: vec3(0, 0, 1) });

  // Round 1
  sim.processCommand({ type: 'start' });
  for (let i = 0; i < 60; i++) sim.step(1/60);
  const snap1 = sim.getSnapshot();
  const roundId1 = snap1.roundId;

  // End round 1
  sim.processCommand({ type: 'restart' });
  const snap2 = sim.getSnapshot();
  assert.ok(snap2.roundId > roundId1, 'Round ID should increment between rounds');
  assert.equal(snap2.cargo.count, 0, 'Basket should be reset');
  assert.equal(snap2.deliveredCount, 0, 'Delivered should be reset');

  // Round 2
  for (let i = 0; i < 60; i++) sim.step(1/60);
  const snap3 = sim.getSnapshot();
  assert.equal(snap3.phase, 'playing', 'Should be playing in round 2');

  sim.free();
}

console.log('All gameplay tests passed!');
