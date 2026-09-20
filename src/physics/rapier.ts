/**
 * Rapier physics wrapper — character controller with capsule collider.
 *
 * Uses @dimforge/rapier3d v0.20.0 API:
 * - KinematicCharacterController with computeColliderMovement()
 * - Capsule collider for the player
 * - Static colliders for obstacles
 *
 * All world coordinates: Y-up, 1 unit ≈ 1 meter.
 */

import RAPIER from '@dimforge/rapier3d/rapier';
import type { LevelDefinition, StaticCollider, Vec3 } from '../contracts/level';

export interface PhysicsWorld {
  world: RAPIER.World;
  characterController: RAPIER.KinematicCharacterController;
  playerCollider: RAPIER.Collider;
  /** Cleanup */
  free(): void;
}

const GRAVITY = { x: 0, y: -20, z: 0 };

export function createPhysicsWorld(level: LevelDefinition): PhysicsWorld {
  const gravity = new RAPIER.Vector3(GRAVITY.x, GRAVITY.y, GRAVITY.z);
  const world = new RAPIER.World(gravity);

  // Create character controller (offset = small gap between character and obstacles)
  const characterController = world.createCharacterController(0.01);
  characterController.setSlideEnabled(true);
  characterController.setApplyImpulsesToDynamicBodies(false);
  characterController.enableAutostep(0.5, 0.1, false);
  characterController.enableSnapToGround(0.5);
  characterController.setMaxSlopeClimbAngle(Math.PI / 4); // 45 degrees max climb

  // Ground plane (Y=0)
  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0);
  const groundBody = world.createRigidBody(groundBodyDesc);
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
  world.createCollider(groundColliderDesc, groundBody);

  // Create player capsule collider
  const pd = level.playerDimensions;
  const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(level.spawn.x, level.spawn.y + pd.feetOriginY, level.spawn.z);
  const playerBody = world.createRigidBody(playerBodyDesc);
  const playerColliderDesc = RAPIER.ColliderDesc.capsule(pd.capsuleHalfHeight, pd.capsuleRadius)
    .setFriction(0.5)
    .setRestitution(0.0);
  const playerCollider = world.createCollider(playerColliderDesc, playerBody);

  // Create static colliders from level definition
  for (const col of level.staticColliders) {
    createStaticCollider(world, col);
  }

  return {
    world,
    characterController,
    playerCollider,
    free() {
      world.free();
    },
  };
}

function createStaticCollider(world: RAPIER.World, col: StaticCollider) {
  let colliderDesc: RAPIER.ColliderDesc;

  switch (col.shape) {
    case 'box': {
      const halfX = col.dimensions.x / 2;
      const halfY = col.dimensions.y / 2;
      const halfZ = col.dimensions.z / 2;
      colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ);
      break;
    }
    case 'capsule': {
      const halfHeight = col.dimensions.y / 2;
      const radius = col.dimensions.x / 2;
      colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius);
      break;
    }
    case 'cylinder': {
      const halfHeight = col.dimensions.y / 2;
      const radius = col.dimensions.x / 2;
      colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);
      break;
    }
    case 'ramp': {
      const halfX = col.dimensions.x / 2;
      const halfY = col.dimensions.y / 2;
      const halfZ = col.dimensions.z / 2;
      colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ);
      break;
    }
    default:
      return;
  }

  const friction = col.friction ?? 0.5;
  colliderDesc.setFriction(friction);
  colliderDesc.setRestitution(0.0);

  const pos = col.transform.position;
  const rot = col.transform.rotation;
  const rotQuat = eulerToQuat(rot.x, rot.y, rot.z);

  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(pos.x, pos.y, pos.z)
    .setRotation({ x: rotQuat.x, y: rotQuat.y, z: rotQuat.z, w: rotQuat.w });

  const body = world.createRigidBody(bodyDesc);
  world.createCollider(colliderDesc, body);
}

interface Quat { x: number; y: number; z: number; w: number }

function eulerToQuat(pitch: number, yaw: number, roll: number): Quat {
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);

  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy,
  };
}

/**
 * Move a character through the world using the character controller.
 * Returns the actual displacement applied after collision resolution.
 */
export function moveCharacter(
  physics: PhysicsWorld,
  currentPos: Vec3,
  desiredMovement: Vec3,
  dt: number
): { position: Vec3; grounded: boolean; slides: boolean; collisionNormal: Vec3 | null } {
  const character = physics.characterController;

  // Move the player body to the current position
  const playerBody = physics.playerCollider.parent();
  if (!playerBody) {
    return { position: currentPos, grounded: false, slides: false, collisionNormal: null };
  }

  // Convert to Rapier vector for desired translation
  const desiredTranslation = new RAPIER.Vector3(
    desiredMovement.x * dt,
    desiredMovement.y * dt,
    desiredMovement.z * dt
  );

  // Use character controller to compute collision response
  character.computeColliderMovement(
    physics.playerCollider,
    desiredTranslation,
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    undefined,
    undefined
  );

  const grounded = character.computedGrounded();

  // Get the actual movement after collision
  const computedMovement = character.computedMovement();

  const actualPos = {
    x: currentPos.x + computedMovement.x,
    y: currentPos.y + computedMovement.y,
    z: currentPos.z + computedMovement.z,
  };

  // Detect if there was a collision (slides)
  const slides = Math.abs(computedMovement.x - desiredTranslation.x) > 0.001 ||
    Math.abs(computedMovement.z - desiredTranslation.z) > 0.001;

  // Get collision normal if there was a collision
  let collisionNormal: Vec3 | null = null;
  const numCollisions = character.numComputedCollisions();
  if (numCollisions > 0) {
    const collision = character.computedCollision(0);
    if (collision) {
      collisionNormal = {
        x: collision.normal1.x,
        y: collision.normal1.y,
        z: collision.normal1.z,
      };
    }
  }

  // Update the player body position
  playerBody.setNextKinematicTranslation(
    new RAPIER.Vector3(actualPos.x, actualPos.y, actualPos.z)
  );

  // Step the world to update collision detection
  physics.world.step();

  return {
    position: actualPos,
    grounded,
    slides,
    collisionNormal,
  };
}

/**
 * Check if a position collides with any static geometry.
 */
export function checkCollisionAt(
  physics: PhysicsWorld,
  pos: Vec3
): boolean {
  const character = physics.characterController;
  const playerBody = physics.playerCollider.parent();
  if (playerBody) {
    playerBody.setTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z), true);
  }

  const zeroMove = new RAPIER.Vector3(0, 0, 0);
  character.computeColliderMovement(
    physics.playerCollider,
    zeroMove,
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    undefined,
    undefined
  );

  return character.numComputedCollisions() > 0;
}

