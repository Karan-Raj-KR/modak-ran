import assert from 'node:assert/strict';
import { createSimulation, CONFIG } from '../../src/core/simulation';
import { COURTYARD_LEVEL } from '../../src/level/courtyard';
import type { Vec3 } from '../../src/contracts/level';

function makeSim() {
  const sim = createSimulation(COURTYARD_LEVEL);
  (sim as any).setMovementBasis({
    right: { x: 1, y: 0, z: 0 } as Vec3,
    forward: { x: 0, y: 0, z: -1 } as Vec3,
  });
  return sim;
}

console.log('Testing wall collision and boundary containment...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // North wall is at z = -9.8 with half-depth 0.2 (extent z = -9.6).
  // Player moves north (y = 1, forward = -Z).
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } });
  for (let i = 0; i < 300; i++) {
    sim.step(1 / 60);
  }

  const snapNorth = sim.getSnapshot();
  // Player should not breach past z = -9.6 + capsuleRadius(0.32) = -9.28
  assert.ok(
    snapNorth.player.position.z >= -9.5,
    `Player should be blocked by north wall, got z=${snapNorth.player.position.z}`
  );

  // South wall is at z = 9.8 with half-depth 0.2 (extent z = 9.6).
  // Restart and move south (y = -1).
  sim.processCommand({ type: 'restart' });
  sim.processCommand({ type: 'move', input: { x: 0, y: -1 } });
  for (let i = 0; i < 300; i++) {
    sim.step(1 / 60);
  }
  const snapSouth = sim.getSnapshot();
  assert.ok(
    snapSouth.player.position.z <= 9.5,
    `Player should be blocked by south wall, got z=${snapSouth.player.position.z}`
  );

  // West wall is at x = -11.8 with half-width 0.2 (extent x = -11.6).
  sim.processCommand({ type: 'restart' });
  sim.processCommand({ type: 'move', input: { x: -1, y: 0 } });
  for (let i = 0; i < 300; i++) {
    sim.step(1 / 60);
  }
  const snapWest = sim.getSnapshot();
  assert.ok(
    snapWest.player.position.x >= -11.5,
    `Player should be blocked by west wall, got x=${snapWest.player.position.x}`
  );

  // East wall is at x = 11.8 with half-width 0.2 (extent x = 11.6).
  sim.processCommand({ type: 'restart' });
  sim.processCommand({ type: 'move', input: { x: 1, y: 0 } });
  for (let i = 0; i < 300; i++) {
    sim.step(1 / 60);
  }
  const snapEast = sim.getSnapshot();
  assert.ok(
    snapEast.player.position.x <= 11.5,
    `Player should be blocked by east wall, got x=${snapEast.player.position.x}`
  );

  sim.free();
}

console.log('Testing obstacle collision and wall sliding...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // Move north-east diagonally toward east wall: x=1, y=1
  sim.processCommand({ type: 'move', input: { x: 1, y: 1 } });
  for (let i = 0; i < 180; i++) {
    sim.step(1 / 60);
  }

  // When hitting the north wall while moving diagonally, it should slide along X
  const snap = sim.getSnapshot();
  assert.ok(
    snap.player.position.x > 3,
    `Player should slide along X when blocked by north wall, got x=${snap.player.position.x}`
  );

  sim.free();
}

console.log('Testing scurry does not tunnel through walls...');
{
  const sim = makeSim();
  sim.processCommand({ type: 'start' });

  // Walk close to north wall
  sim.processCommand({ type: 'move', input: { x: 0, y: 1 } });
  for (let i = 0; i < 150; i++) {
    sim.step(1 / 60);
  }

  // Fire scurry directly into the wall
  sim.processCommand({ type: 'scurry' });
  for (let i = 0; i < 30; i++) {
    sim.step(1 / 60);
  }

  const snap = sim.getSnapshot();
  assert.ok(
    snap.player.position.z >= -9.5,
    `Scurry should not tunnel through wall, got z=${snap.player.position.z}`
  );

  sim.free();
}

console.log('All physics collision tests passed!');
