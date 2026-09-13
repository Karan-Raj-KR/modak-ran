import * as THREE from 'three';
import { modakPoints } from '../world';

export interface CollectiblesInstance {
  group: THREE.Group;
  update: (time: number, delta: number) => void;
  checkPickup: (playerX: number, playerZ: number, canCollect: boolean) => number | null;
  triggerPickupEffect: (id: number) => void;
  reset: () => void;
}

export function createCollectibles(scene: THREE.Scene): CollectiblesInstance {
  const group = new THREE.Group();

  const matModak = new THREE.MeshStandardMaterial({
    color: 0xfcf6ed,
    roughness: 0.42,
    metalness: 0.05,
  });

  const matSaffronTip = new THREE.MeshStandardMaterial({
    color: 0xe89e2e,
    roughness: 0.5,
  });

  const matLeaf = new THREE.MeshStandardMaterial({
    color: 0x3d703b,
    roughness: 0.82,
  });

  function createModakMesh(): THREE.Group {
    const modakG = new THREE.Group();

    // Bulbous rounded base
    const base = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      matModak
    );
    base.position.y = 0.08;
    base.castShadow = true;
    modakG.add(base);

    // Pleated cone top with 8 radial ridges
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 8), matModak);
    cone.position.y = 0.22;
    cone.castShadow = true;
    modakG.add(cone);

    // Saffron pinched top
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matSaffronTip);
    tip.position.y = 0.38;
    modakG.add(tip);

    return modakG;
  }

  const leafGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 12);

  interface VisualItem {
    id: number;
    x: number;
    z: number;
    mesh: THREE.Group;
    leaf: THREE.Mesh;
    baseY: number;
    collected: boolean;
    popTimer: number;
  }

  const visuals: VisualItem[] = [];

  modakPoints.forEach(([x, z], id) => {
    const leaf = new THREE.Mesh(leafGeo, matLeaf);
    leaf.position.set(x, 0.015, z);
    leaf.receiveShadow = true;
    group.add(leaf);

    const mesh = createModakMesh();
    mesh.position.set(x, 0.12, z);
    group.add(mesh);

    visuals.push({
      id,
      x,
      z,
      mesh,
      leaf,
      baseY: 0.12,
      collected: false,
      popTimer: 0,
    });
  });

  scene.add(group);

  return {
    group,
    update: (time: number, delta: number) => {
      visuals.forEach((v) => {
        if (v.popTimer > 0) {
          v.popTimer -= delta;
          const prog = 1 - Math.max(0, v.popTimer) / 0.25;
          const scale = 1.0 + prog * 0.7;
          v.mesh.scale.set(scale, scale, scale);
          v.mesh.position.y = v.baseY + prog * 0.45;
          if (v.popTimer <= 0) {
            v.mesh.visible = false;
            v.leaf.visible = false;
          }
        } else if (!v.collected) {
          const offset = v.id * 0.35;
          v.mesh.position.y = v.baseY + Math.sin(time * 3.2 + offset) * 0.04;
          v.mesh.rotation.y = time * 1.3 + offset;
        }
      });
    },

    checkPickup: (playerX: number, playerZ: number, canCollect: boolean): number | null => {
      if (!canCollect) return null;
      const rSq = 0.8 * 0.8; // 0.8 units pickup radius
      for (const v of visuals) {
        if (!v.collected && v.popTimer === 0) {
          const dx = playerX - v.x;
          const dz = playerZ - v.z;
          if (dx * dx + dz * dz <= rSq) {
            v.collected = true;
            v.popTimer = 0.25;
            return v.id;
          }
        }
      }
      return null;
    },

    triggerPickupEffect: (id: number) => {
      const v = visuals[id];
      if (v) {
        v.collected = true;
        v.popTimer = 0.25;
      }
    },

    reset: () => {
      visuals.forEach((v) => {
        v.collected = false;
        v.popTimer = 0;
        v.mesh.visible = true;
        v.leaf.visible = true;
        v.mesh.scale.set(1, 1, 1);
        v.mesh.position.set(v.x, v.baseY, v.z);
      });
    },
  };
}
