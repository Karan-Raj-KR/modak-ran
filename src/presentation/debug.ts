import * as THREE from 'three';
import type { LevelDefinition } from '../contracts/level';
import type { GameSnapshot } from '../contracts/snapshot';

export interface DebugOverlay {
  update: (snapshot: GameSnapshot) => void;
}

/**
 * Development-only diagnostic layer for the player collider, pickup sensors,
 * static colliders and delivery bounds. Enabled with `?debug=1` on the Vite
 * dev server; it is compiled out of production builds.
 */
export function createDebugOverlay(scene: THREE.Scene, level: LevelDefinition): DebugOverlay {
  const enabled =
    import.meta.env?.DEV === true &&
    typeof window !== 'undefined' &&
    window.location.search.includes('debug');

  if (!enabled) return { update: () => {} };

  const group = new THREE.Group();
  scene.add(group);

  const matCollider = new THREE.LineBasicMaterial({ color: 0xff3860 });
  const matSensor = new THREE.LineBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: 0.85 });
  const matDelivery = new THREE.LineBasicMaterial({ color: 0xffd23f });
  const matPlayer = new THREE.LineBasicMaterial({ color: 0x66ff88 });

  function boxEdges(
    cx: number, cy: number, cz: number,
    w: number, h: number, d: number,
    material: THREE.LineBasicMaterial
  ) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(geo);
    geo.dispose();
    const line = new THREE.LineSegments(edges, material);
    line.position.set(cx, cy, cz);
    return line;
  }

  function circleEdges(cx: number, cz: number, radius: number, y: number, material: THREE.LineBasicMaterial) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
  }

  // Static colliders (full extents, matching the Rapier wrapper's convention)
  for (const col of level.staticColliders) {
    const p = col.transform.position;
    const d = col.dimensions;
    if (col.shape === 'cylinder') {
      group.add(circleEdges(p.x, p.z, d.x / 2, p.y + d.y / 2, matCollider));
      group.add(circleEdges(p.x, p.z, d.x / 2, p.y - d.y / 2, matCollider));
    } else {
      group.add(boxEdges(p.x, p.y, p.z, d.x, d.y, d.z, matCollider));
    }
  }

  // Delivery bounds
  const dz = level.deliveryZone;
  group.add(boxEdges(dz.position.x, 0.5, dz.position.z, dz.dimensions.x, 1.0, dz.dimensions.z, matDelivery));

  // Player footprint ring, radius = capsule radius + pickup radius
  const pd = level.playerDimensions;
  const footprint = circleEdges(0, 0, pd.capsuleRadius, 0.03, matPlayer);
  group.add(footprint);

  // Pickup sensor rings, one per collectible, toggled by authoritative state
  const sensors = level.collectibles.map((c) => {
    const ring = circleEdges(c.position.x, c.position.z, 0.95, 0.02, matSensor);
    group.add(ring);
    return { id: c.id, ring };
  });

  const label = document.createElement('div');
  label.id = 'debug-label';
  label.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:60;font:11px/1.4 ui-monospace,monospace;' +
    'color:#8ff;background:rgba(0,0,0,.6);padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre;';
  document.body.appendChild(label);

  return {
    update: (snapshot: GameSnapshot) => {
      const active = new Set(snapshot.activeCollectibleIds);
      for (const s of sensors) s.ring.visible = active.has(s.id);

      const p = snapshot.player.position;
      footprint.position.set(p.x, 0.03, p.z);

      const v = snapshot.player.velocity;
      label.textContent =
        `phase ${snapshot.phase}  t ${snapshot.timeRemaining.toFixed(1)}\n` +
        `pos ${p.x.toFixed(2)}, ${p.z.toFixed(2)}  v ${Math.hypot(v.x, v.z).toFixed(2)}\n` +
        `basket ${snapshot.cargo.count}/${snapshot.cargo.capacity}  delivered ${snapshot.deliveredCount}\n` +
        `active ${snapshot.activeCollectibleIds.length}/${level.collectibles.length}  pts ${snapshot.pointsScore}`;
    },
  };
}
