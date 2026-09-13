import * as THREE from 'three';
import { modakPoints } from './map';
import { ModakItem } from './types';

export interface CollectibleManager {
  group: THREE.Group;
  items: ModakItem[];
  checkPickup: (playerX: number, playerZ: number, canCollect: boolean) => number | null;
  update: (time: number, delta: number) => void;
  reset: () => void;
}

export function createCollectibles(scene: THREE.Scene): CollectibleManager {
  const group = new THREE.Group();

  // Curated modak material: rich ivory cream with soft luster
  const matModak = new THREE.MeshStandardMaterial({
    color: 0xfaf4e8,
    roughness: 0.45,
    metalness: 0.05,
  });

  // Marigold/saffron pinched tip
  const matSaffronTip = new THREE.MeshStandardMaterial({
    color: 0xe89e2e,
    roughness: 0.5,
  });

  // Banana leaf plate (pattal) material
  const matLeaf = new THREE.MeshStandardMaterial({
    color: 0x3d703b,
    roughness: 0.8,
  });

  // Create single procedural modak geometry with radial pleats
  function createModakMesh(): THREE.Group {
    const modakG = new THREE.Group();

    // Rounded bulbous bottom
    const baseGeo = new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, matModak);
    baseMesh.position.y = 0.08;
    baseMesh.castShadow = true;
    modakG.add(baseMesh);

    // Pleated cone top with 8 radial ridges
    const coneGeo = new THREE.ConeGeometry(0.22, 0.32, 8);
    const coneMesh = new THREE.Mesh(coneGeo, matModak);
    coneMesh.position.y = 0.22;
    coneMesh.castShadow = true;
    modakG.add(coneMesh);

    // Saffron saffron top pinch
    const tipGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const tipMesh = new THREE.Mesh(tipGeo, matSaffronTip);
    tipMesh.position.y = 0.38;
    modakG.add(tipMesh);

    return modakG;
  }

  // Pattal leaf plate geometry
  const leafGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 12);

  interface ModakVisual {
    item: ModakItem;
    mesh: THREE.Group;
    leaf: THREE.Mesh;
    baseY: number;
    collectedAnim: number; // >0 if currently popping
  }

  const visuals: ModakVisual[] = [];
  const items: ModakItem[] = [];

  modakPoints.forEach(([x, z], index) => {
    const item: ModakItem = { id: index, x, z, collected: false };
    items.push(item);

    // Leaf plate on floor
    const leaf = new THREE.Mesh(leafGeo, matLeaf);
    leaf.position.set(x, 0.015, z);
    leaf.receiveShadow = true;
    group.add(leaf);

    // Modak sweet floating slightly above leaf
    const mesh = createModakMesh();
    mesh.position.set(x, 0.12, z);
    group.add(mesh);

    visuals.push({
      item,
      mesh,
      leaf,
      baseY: 0.12,
      collectedAnim: 0,
    });
  });

  scene.add(group);

  return {
    group,
    items,
    checkPickup: (playerX: number, playerZ: number, canCollect: boolean): number | null => {
      if (!canCollect) return null;

      const pickupRadiusSq = 0.75 * 0.75; // 0.75 unit radius
      for (const v of visuals) {
        if (!v.item.collected && v.collectedAnim === 0) {
          const dx = playerX - v.item.x;
          const dz = playerZ - v.item.z;
          if (dx * dx + dz * dz <= pickupRadiusSq) {
            v.item.collected = true;
            v.collectedAnim = 0.25; // 250ms pop animation
            return v.item.id;
          }
        }
      }
      return null;
    },

    update: (time: number, delta: number) => {
      visuals.forEach((v) => {
        if (v.collectedAnim > 0) {
          // Quick scale-up and fade out pop
          v.collectedAnim -= delta;
          const progress = 1 - Math.max(0, v.collectedAnim) / 0.25;
          const scale = 1.0 + progress * 0.6;
          v.mesh.scale.set(scale, scale, scale);
          v.mesh.position.y = v.baseY + progress * 0.4;
          if (v.collectedAnim <= 0) {
            v.mesh.visible = false;
            v.leaf.visible = false;
          }
        } else if (!v.item.collected) {
          // Gentle floating bob and slow rotation
          const offset = v.item.id * 0.35;
          v.mesh.position.y = v.baseY + Math.sin(time * 3.0 + offset) * 0.04;
          v.mesh.rotation.y = time * 1.2 + offset;
        }
      });
    },

    reset: () => {
      visuals.forEach((v) => {
        v.item.collected = false;
        v.collectedAnim = 0;
        v.mesh.visible = true;
        v.leaf.visible = true;
        v.mesh.scale.set(1, 1, 1);
        v.mesh.position.set(v.item.x, v.baseY, v.item.z);
      });
    },
  };
}
