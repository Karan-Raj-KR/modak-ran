import * as THREE from 'three';
import { modakPoints } from '../world';
import { createLeafTexture } from './textures';

export interface CollectiblesInstance {
  group: THREE.Group;
  update: (time: number, delta: number) => void;
  checkPickup: (playerX: number, playerZ: number, canCollect: boolean) => number | null;
  triggerPickupEffect: (id: number) => void;
  reset: () => void;
}

export function createCollectibles(scene: THREE.Scene): CollectiblesInstance {
  const group = new THREE.Group();

  const texLeaf = createLeafTexture();

  const matModak = new THREE.MeshStandardMaterial({
    color: 0xfdf7ee,
    roughness: 0.38,
    metalness: 0.04,
  });

  const matSaffronTip = new THREE.MeshStandardMaterial({
    color: 0xf29f27,
    roughness: 0.45,
  });

  const matLeaf = new THREE.MeshStandardMaterial({
    map: texLeaf,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });

  const matShadow = new THREE.MeshBasicMaterial({
    color: 0x0a0f16,
    transparent: true,
    opacity: 0.35,
  });

  function createModakModel(): THREE.Group {
    const modakG = new THREE.Group();

    // Bulbous rounded base
    const baseGeo = new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const base = new THREE.Mesh(baseGeo, matModak);
    base.position.y = 0.06;
    base.castShadow = true;
    modakG.add(base);

    // Pleated cone top with 10 radial pleats
    const coneGeo = new THREE.ConeGeometry(0.22, 0.32, 10);
    const cone = new THREE.Mesh(coneGeo, matModak);
    cone.position.y = 0.22;
    cone.castShadow = true;
    modakG.add(cone);

    // Saffron pinched tip
    const tipGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const tip = new THREE.Mesh(tipGeo, matSaffronTip);
    tip.position.y = 0.38;
    modakG.add(tip);

    return modakG;
  }

  // Scalloped circular banana leaf plate geometry
  const leafShape = new THREE.Shape();
  const numScallops = 16;
  const baseR = 0.38;
  const scallopR = 0.05;

  for (let i = 0; i <= numScallops * 2; i++) {
    const ang = (i / (numScallops * 2)) * Math.PI * 2;
    const r = baseR + (i % 2 === 0 ? scallopR : -scallopR * 0.5);
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) leafShape.moveTo(x, y);
    else leafShape.lineTo(x, y);
  }
  const leafGeo = new THREE.ShapeGeometry(leafShape);

  const shadowGeo = new THREE.CircleGeometry(0.42, 16);

  interface VisualItem {
    id: number;
    x: number;
    z: number;
    mesh: THREE.Group;
    leaf: THREE.Mesh;
    shadow: THREE.Mesh;
    baseY: number;
    collected: boolean;
    popTimer: number;
  }

  const visuals: VisualItem[] = [];

  modakPoints.forEach(([x, z], id) => {
    // Ground shadow beneath leaf
    const shadow = new THREE.Mesh(shadowGeo, matShadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.008, z);
    group.add(shadow);

    // Scalloped banana leaf plate
    const leaf = new THREE.Mesh(leafGeo, matLeaf);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.set(x, 0.015, z);
    leaf.receiveShadow = true;
    group.add(leaf);

    // Pleated Modak sweet
    const mesh = createModakModel();
    mesh.position.set(x, 0.018, z);
    group.add(mesh);

    visuals.push({
      id,
      x,
      z,
      mesh,
      leaf,
      shadow,
      baseY: 0.018,
      collected: false,
      popTimer: 0,
    });
  });

  scene.add(group);

  return {
    group,
    update: (_time: number, delta: number) => {
      visuals.forEach((v) => {
        if (v.popTimer > 0) {
          v.popTimer -= delta;
          const prog = 1 - Math.max(0, v.popTimer) / 0.25;
          const s = 1.0 + prog * 0.8;
          v.mesh.scale.set(s, s, s);
          v.mesh.position.y = v.baseY + prog * 0.5;
          v.leaf.scale.set(Math.max(0, 1 - prog), Math.max(0, 1 - prog), 1);
          v.shadow.scale.set(Math.max(0, 1 - prog), Math.max(0, 1 - prog), 1);

          if (v.popTimer <= 0) {
            v.mesh.visible = false;
            v.leaf.visible = false;
            v.shadow.visible = false;
          }
        }
      });
    },

    checkPickup: (playerX: number, playerZ: number, canCollect: boolean): number | null => {
      if (!canCollect) return null;
      const rSq = 0.85 * 0.85;
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
      if (v && !v.collected) {
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
        v.shadow.visible = true;
        v.mesh.scale.set(1, 1, 1);
        v.leaf.scale.set(1, 1, 1);
        v.shadow.scale.set(1, 1, 1);
        v.mesh.position.set(v.x, v.baseY, v.z);
      });
    },
  };
}
