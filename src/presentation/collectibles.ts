import * as THREE from 'three';
import type { LevelDefinition } from '../contracts/level';
import { createLeafTexture, createSoftShadowTexture } from './textures';

export interface CollectiblesInstance {
  group: THREE.Group;
  /** Per-frame animation tick. */
  update: (time: number, delta: number) => void;
  /** Make the rendered set match the authoritative active-id list. */
  sync: (activeIds: Iterable<number>) => void;
  /** Start the pop animation for an item the simulation just collected. */
  triggerPickupEffect: (id: number) => void;
  /** Where this item is actually drawn, for automated state/visual checks. */
  renderedPosition: (id: number) => { x: number; y: number; z: number; visible: boolean } | null;
  reset: () => void;
}

const POP_DURATION = 0.25;

export function createCollectibles(
  scene: THREE.Scene,
  level: LevelDefinition
): CollectiblesInstance {
  const group = new THREE.Group();

  const texLeaf = createLeafTexture();

  const matModak = new THREE.MeshStandardMaterial({
    color: 0xf7ead2,
    roughness: 0.55,
    metalness: 0.02,
    flatShading: true,
  });

  const matSaffronTip = new THREE.MeshStandardMaterial({
    color: 0xf29f27,
    roughness: 0.45,
  });

  const matLeaf = new THREE.MeshStandardMaterial({
    map: texLeaf,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });

  const matShadow = new THREE.MeshBasicMaterial({
    map: createSoftShadowTexture(),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  // ─── Modak silhouette ─────────────────────────────────────────────────────
  // A faceted, tapered cup reads as pleated rice dough; flat shading turns each
  // radial segment into a visible pleat. Topped with the pinched point and a
  // saffron dot, and served on a scalloped banana-leaf plate.
  const PLEATS = 10;
  const cupGeo = new THREE.CylinderGeometry(0.135, 0.255, 0.26, PLEATS, 1, false);
  const pointGeo = new THREE.ConeGeometry(0.1, 0.15, PLEATS);
  const tipGeo = new THREE.SphereGeometry(0.035, 6, 5);

  function createModakModel(): THREE.Group {
    const modakG = new THREE.Group();

    const cup = new THREE.Mesh(cupGeo, matModak);
    cup.position.y = 0.13;
    cup.castShadow = true;
    modakG.add(cup);

    const point = new THREE.Mesh(pointGeo, matModak);
    point.position.y = 0.335;
    point.castShadow = true;
    modakG.add(point);

    const tip = new THREE.Mesh(tipGeo, matSaffronTip);
    tip.position.y = 0.415;
    modakG.add(tip);

    return modakG;
  }

  // Banana leaf plate: a soft-edged disc with shallow scallops, so it reads as
  // a leaf rather than a spiky star.
  const leafShape = new THREE.Shape();
  const LEAF_SEGMENTS = 40;
  const baseR = 0.33;

  for (let i = 0; i <= LEAF_SEGMENTS; i++) {
    const ang = (i / LEAF_SEGMENTS) * Math.PI * 2;
    const r = baseR + Math.sin(ang * 14) * 0.014;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) leafShape.moveTo(x, y);
    else leafShape.lineTo(x, y);
  }
  const leafGeo = new THREE.ShapeGeometry(leafShape);

  const shadowGeo = new THREE.CircleGeometry(0.4, 18);

  interface VisualItem {
    id: number;
    x: number;
    z: number;
    holder: THREE.Group;
    mesh: THREE.Group;
    leaf: THREE.Mesh;
    shadow: THREE.Mesh;
    popTimer: number;
    spin: number;
  }

  /** Keyed by the simulation's item id — never by array position. */
  const byId = new Map<number, VisualItem>();

  // Resting height of the sweet above its leaf plate. Kept clear of every
  // ground layer in the diorama so nothing is buried.
  const BASE_Y = 0.042;

  for (const spawn of level.collectibles) {
    const x = spawn.position.x;
    const z = spawn.position.z;

    // One holder per item so the pop animation transforms everything together
    // and never moves the authoritative (x, z) pickup location.
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    group.add(holder);

    const shadow = new THREE.Mesh(shadowGeo, matShadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    holder.add(shadow);

    const leaf = new THREE.Mesh(leafGeo, matLeaf);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.y = 0.036;
    leaf.receiveShadow = true;
    holder.add(leaf);

    const mesh = createModakModel();
    mesh.position.y = BASE_Y;
    mesh.rotation.y = ((spawn.id % 8) / 8) * Math.PI * 2;
    holder.add(mesh);

    byId.set(spawn.id, { id: spawn.id, x, z, holder, mesh, leaf, shadow, popTimer: 0, spin: 0 });
  }

  scene.add(group);

  return {
    group,

    update: (time: number, delta: number) => {
      for (const v of byId.values()) {
        if (v.popTimer > 0) {
          v.popTimer = Math.max(0, v.popTimer - delta);
          const prog = 1 - v.popTimer / POP_DURATION;
          const s = 1.0 + prog * 0.7;
          v.mesh.scale.set(s, Math.max(0.001, 1 - prog * 0.55), s);
          v.mesh.rotation.y += delta * 9;
          v.holder.position.y = prog * 0.55;
          const fade = Math.max(0.001, 1 - prog);
          v.leaf.scale.set(fade, fade, 1);
          v.shadow.scale.set(fade, fade, 1);

          if (v.popTimer === 0) v.holder.visible = false;
          continue;
        }

        // Idle: gentle bob and slow turn. This only animates Y and rotation,
        // so the XZ pickup location stays exactly where the sim says it is.
        if (v.holder.visible) {
          v.mesh.position.y = BASE_Y + Math.sin(time * 2.2 + v.id * 0.7) * 0.022;
          v.mesh.rotation.y += delta * 0.5;
        }
      }
    },

    sync: (activeIds: Iterable<number>) => {
      const active = new Set(activeIds);
      for (const v of byId.values()) {
        const isActive = active.has(v.id);

        if (isActive) {
          // Re-spawned (restart): restore the resting transform.
          if (!v.holder.visible || v.popTimer > 0) {
            v.holder.visible = true;
            v.popTimer = 0;
            v.holder.position.set(v.x, 0, v.z);
            v.mesh.scale.set(1, 1, 1);
            v.leaf.scale.set(1, 1, 1);
            v.shadow.scale.set(1, 1, 1);
          }
        } else if (v.popTimer <= 0) {
          v.holder.visible = false;
        }
      }
    },

    triggerPickupEffect: (id: number) => {
      const v = byId.get(id);
      if (!v || v.popTimer > 0) return;
      v.holder.visible = true;
      v.popTimer = POP_DURATION;
    },

    renderedPosition: (id: number) => {
      const v = byId.get(id);
      if (!v) return null;
      return {
        x: v.holder.position.x,
        y: v.holder.position.y,
        z: v.holder.position.z,
        visible: v.holder.visible,
      };
    },

    reset: () => {
      for (const v of byId.values()) {
        v.popTimer = 0;
        v.holder.visible = true;
        v.holder.position.set(v.x, 0, v.z);
        v.mesh.scale.set(1, 1, 1);
        v.mesh.position.y = BASE_Y;
        v.leaf.scale.set(1, 1, 1);
        v.shadow.scale.set(1, 1, 1);
      }
    },
  };
}
