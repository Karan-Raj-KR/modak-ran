import * as THREE from 'three';
import { MAP_BOUNDS, OBSTACLES } from './map';
import { PlayerState } from './types';
import { sound } from './audio';

export interface MovementController {
  state: PlayerState;
  dustGroup: THREE.Group;
  update: (
    delta: number,
    rawInput: { x: number; y: number },
    screenVectors: { forward: THREE.Vector3; right: THREE.Vector3 }
  ) => void;
  triggerScurry: () => boolean;
  reset: (x?: number, z?: number) => void;
}

export function createMovement(scene: THREE.Scene): MovementController {
  const normalSpeed = 4.8;
  const scurrySpeed = 9.2;
  const scurryDuration = 0.25;
  const scurryCooldownTime = 3.0;
  const playerRadius = 0.35;

  const state: PlayerState = {
    x: 0,
    z: 6.0,
    vx: 0,
    vz: 0,
    rotation: -Math.PI,
    isMoving: false,
    isScurrying: false,
    scurryTimer: 0,
    scurryCooldown: 0,
  };

  // Scurry dust puff particles
  const dustGroup = new THREE.Group();
  const dustGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0xcca87d,
    transparent: true,
    opacity: 0.6,
  });

  interface DustParticle {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    vx: number;
    vz: number;
  }

  const dustParticles: DustParticle[] = [];
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(dustGeo, dustMat.clone());
    mesh.visible = false;
    dustGroup.add(mesh);
    dustParticles.push({
      mesh,
      life: 0,
      maxLife: 0.35,
      vx: 0,
      vz: 0,
    });
  }
  scene.add(dustGroup);

  function spawnDust(x: number, z: number) {
    for (let i = 0; i < 3; i++) {
      const p = dustParticles.find((dp) => dp.life <= 0);
      if (p) {
        p.mesh.position.set(x + (Math.random() - 0.5) * 0.2, 0.08, z + (Math.random() - 0.5) * 0.2);
        p.mesh.scale.set(1, 1, 1);
        p.mesh.visible = true;
        p.life = 0.35;
        p.maxLife = 0.35;
        p.vx = (Math.random() - 0.5) * 0.8;
        p.vz = (Math.random() - 0.5) * 0.8;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
      }
    }
  }

  // Check collision of circle at (px, pz) against boundaries and obstacle colliders
  function collides(px: number, pz: number): boolean {
    // Boundary check
    if (
      px - playerRadius < MAP_BOUNDS.minX ||
      px + playerRadius > MAP_BOUNDS.maxX ||
      pz - playerRadius < MAP_BOUNDS.minZ ||
      pz + playerRadius > MAP_BOUNDS.maxZ
    ) {
      return true;
    }

    // Static obstacle box colliders
    for (const obs of OBSTACLES) {
      // Find closest point on AABB to circle center
      const closestX = Math.max(obs.minX, Math.min(px, obs.maxX));
      const closestZ = Math.max(obs.minZ, Math.min(pz, obs.maxZ));

      const dx = px - closestX;
      const dz = pz - closestZ;

      if (dx * dx + dz * dz < playerRadius * playerRadius) {
        return true;
      }
    }

    return false;
  }

  return {
    state,
    dustGroup,

    triggerScurry: (): boolean => {
      // Only scurry if cooldown ready, not already scurrying, and actively moving
      if (state.scurryCooldown <= 0 && !state.isScurrying && state.isMoving) {
        state.isScurrying = true;
        state.scurryTimer = scurryDuration;
        state.scurryCooldown = scurryCooldownTime;
        sound.playScurry();
        spawnDust(state.x, state.z);
        return true;
      }
      return false;
    },

    update: (
      delta: number,
      rawInput: { x: number; y: number },
      screenVectors: { forward: THREE.Vector3; right: THREE.Vector3 }
    ) => {
      // Cooldown timer
      if (state.scurryCooldown > 0) {
        state.scurryCooldown = Math.max(0, state.scurryCooldown - delta);
      }

      // Scurry duration timer
      if (state.isScurrying) {
        state.scurryTimer -= delta;
        if (state.scurryTimer <= 0) {
          state.isScurrying = false;
        }
      }

      // Normalize diagonal input
      let inputLen = Math.hypot(rawInput.x, rawInput.y);
      let inX = 0;
      let inY = 0;
      if (inputLen > 0.05) {
        if (inputLen > 1) {
          inX = rawInput.x / inputLen;
          inY = rawInput.y / inputLen;
        } else {
          inX = rawInput.x;
          inY = rawInput.y;
        }
      }

      // Project input onto camera-relative ground directions:
      // inY = -1 (W/Up key) -> move in screenVectors.forward
      // inX = +1 (D/Right key) -> move in screenVectors.right
      const moveDirX = -inY * screenVectors.forward.x + inX * screenVectors.right.x;
      const moveDirZ = -inY * screenVectors.forward.z + inX * screenVectors.right.z;
      const moveDirLen = Math.hypot(moveDirX, moveDirZ);

      state.isMoving = moveDirLen > 0.05;

      const currentSpeed = state.isScurrying ? scurrySpeed : normalSpeed;
      const targetVx = state.isMoving ? (moveDirX / moveDirLen) * currentSpeed : 0;
      const targetVz = state.isMoving ? (moveDirZ / moveDirLen) * currentSpeed : 0;

      // Snappy acceleration and stopping
      const accel = state.isMoving ? 24 : 32;
      state.vx = THREE.MathUtils.lerp(state.vx, targetVx, Math.min(1.0, delta * accel));
      state.vz = THREE.MathUtils.lerp(state.vz, targetVz, Math.min(1.0, delta * accel));

      // Calculate target rotation from velocity
      if (state.isMoving) {
        state.rotation = Math.atan2(state.vx, state.vz);
      }

      // Move with collision sliding using small substeps to prevent tunneling
      const steps = state.isScurrying ? 4 : 2;
      const stepDelta = delta / steps;

      for (let s = 0; s < steps; s++) {
        const dx = state.vx * stepDelta;
        const dz = state.vz * stepDelta;

        // Try moving X
        const nextX = state.x + dx;
        if (!collides(nextX, state.z)) {
          state.x = nextX;
        } else {
          state.vx = 0; // stop X velocity against obstacle
        }

        // Try moving Z
        const nextZ = state.z + dz;
        if (!collides(state.x, nextZ)) {
          state.z = nextZ;
        } else {
          state.vz = 0; // stop Z velocity against obstacle
        }
      }

      if (state.isScurrying) {
        spawnDust(state.x, state.z);
      }

      // Update dust particles
      dustParticles.forEach((p) => {
        if (p.life > 0) {
          p.life -= delta;
          p.mesh.position.x += p.vx * delta;
          p.mesh.position.z += p.vz * delta;
          const ratio = Math.max(0, p.life / p.maxLife);
          p.mesh.scale.set(1 + (1 - ratio) * 1.2, 1 + (1 - ratio) * 1.2, 1 + (1 - ratio) * 1.2);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.6;
          if (p.life <= 0) {
            p.mesh.visible = false;
          }
        }
      });
    },

    reset: (x: number = 0, z: number = 6.0) => {
      state.x = x;
      state.z = z;
      state.vx = 0;
      state.vz = 0;
      state.rotation = -Math.PI;
      state.isMoving = false;
      state.isScurrying = false;
      state.scurryTimer = 0;
      state.scurryCooldown = 0;
      dustParticles.forEach((p) => {
        p.life = 0;
        p.mesh.visible = false;
      });
    },
  };
}
