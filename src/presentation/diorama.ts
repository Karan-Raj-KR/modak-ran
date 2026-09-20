import * as THREE from 'three';
import type { LevelDefinition } from '../contracts/level';
import {
  createSandstoneTexture,
  createTerracottaTexture,
  createRangoliTexture,
} from './textures';

export interface DioramaInstance {
  group: THREE.Group;
  update: (time: number, delta: number) => void;
  triggerDeliveryEffect: (count: number, allowParticles: boolean) => void;
  setDeliveryEmphasis: (on: boolean) => void;
  reset: () => void;
}

/** Number of festoon sections — one lights up per completed delivery. */
const LIGHT_SECTIONS = 7;

export function createDiorama(scene: THREE.Scene, level: LevelDefinition): DioramaInstance {
  const group = new THREE.Group();

  const colors = {
    sandstoneWarm: 0xd9b98c,
    sandstoneBorder: 0xc3a074,
    sandstoneDark: 0x9c7a53,
    plinthSide: 0x7d5f40,
    terracottaInlay: 0xa8462d,
    wetStone: 0x2a2024,
    indigoFabric: 0x272a5e,
    indigoDeep: 0x1b1d47,
    goldZari: 0xe8b23c,
    brassMetal: 0xc99a2e,
    vermilion: 0xb03a26,
    marigoldYellow: 0xf3bb3c,
    marigoldOrange: 0xe0721f,
    foliageBanana: 0x3f7a48,
    foliageMid: 0x2f6238,
    foliageDeep: 0x24492c,
    flowerOrange: 0xf2661f,
    flowerWhite: 0xfff6e6,
    timberWood: 0x5a3d27,
    timberDark: 0x40291a,
    bulbWarm: 0xffd794,
    bulbOff: 0x5a4a3c,
  };

  const texSandstone = createSandstoneTexture();
  const texTerracotta = createTerracottaTexture();
  const texRangoli = createRangoliTexture();

  const matSandstone = new THREE.MeshStandardMaterial({ map: texSandstone, roughness: 0.82, metalness: 0.02 });
  const matSandstoneBorder = new THREE.MeshStandardMaterial({ color: colors.sandstoneBorder, roughness: 0.78, metalness: 0.03 });
  const matSandstoneDark = new THREE.MeshStandardMaterial({ color: colors.sandstoneDark, roughness: 0.84, metalness: 0.02 });
  const matPlinth = new THREE.MeshStandardMaterial({ color: colors.plinthSide, roughness: 0.9, metalness: 0.0 });
  const matTerracotta = new THREE.MeshStandardMaterial({ map: texTerracotta, roughness: 0.78, metalness: 0.02 });
  // Wet stone reads as a glossy, sky-reflecting film — not a black hole.
  const matWetStone = new THREE.MeshStandardMaterial({ color: 0x8b8798, roughness: 0.1, metalness: 0.0 });

  // Muted clay for the inlaid route bands: present, but not a red stripe.
  const matInlay = new THREE.MeshStandardMaterial({ color: 0xa8705a, roughness: 0.8, metalness: 0.02 });
  const matIndigo = new THREE.MeshStandardMaterial({ color: colors.indigoFabric, roughness: 0.62, metalness: 0.04, side: THREE.DoubleSide });
  const matIndigoDeep = new THREE.MeshStandardMaterial({ color: colors.indigoDeep, roughness: 0.68, side: THREE.DoubleSide });
  const matGold = new THREE.MeshStandardMaterial({ color: colors.goldZari, roughness: 0.3, metalness: 0.72 });
  const matBrass = new THREE.MeshStandardMaterial({ color: colors.brassMetal, roughness: 0.34, metalness: 0.7 });
  const matVermilion = new THREE.MeshStandardMaterial({ color: colors.vermilion, roughness: 0.66 });
  const matMarigoldYellow = new THREE.MeshStandardMaterial({ color: colors.marigoldYellow, roughness: 0.62 });
  const matMarigoldOrange = new THREE.MeshStandardMaterial({ color: colors.marigoldOrange, roughness: 0.62 });
  const matBananaLeaf = new THREE.MeshStandardMaterial({ color: colors.foliageBanana, roughness: 0.55, side: THREE.DoubleSide });
  const matLeafMid = new THREE.MeshStandardMaterial({ color: colors.foliageMid, roughness: 0.62, side: THREE.DoubleSide });
  const matShrub = new THREE.MeshStandardMaterial({ color: colors.foliageDeep, roughness: 0.85 });
  const matSoil = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.95, metalness: 0.0 });
  const matFlowerOrange = new THREE.MeshStandardMaterial({ color: colors.flowerOrange, roughness: 0.55 });
  const matFlowerWhite = new THREE.MeshStandardMaterial({ color: colors.flowerWhite, roughness: 0.55 });
  const matTimber = new THREE.MeshStandardMaterial({ color: colors.timberWood, roughness: 0.8, metalness: 0.02 });
  const matTimberDark = new THREE.MeshStandardMaterial({ color: colors.timberDark, roughness: 0.85 });
  const matFlame = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });

  // Emissive lamp surfaces instead of one shadow-casting light per lamp.
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xffc46b,
    emissive: 0xffa834,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });

  const deliveryZone = level.deliveryZone;
  const dz = deliveryZone.position;

  // ─── Shared geometries ────────────────────────────────────────────────────
  const geoMarigold = new THREE.SphereGeometry(0.075, 7, 6);
  const geoLeafBlade = new THREE.SphereGeometry(0.26, 8, 6);
  geoLeafBlade.scale(1.0, 0.42, 1.7);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONTINUOUS DUSK BACKDROP
  // A sky dome plus an outer ground apron so there is never a seam or a black
  // gap between the courtyard and the horizon.
  // ═══════════════════════════════════════════════════════════════════════════
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 32;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d')!;
  const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
  // Stops run from the zenith (0.0) to the nadir (1.0); the horizon is 0.5.
  grad.addColorStop(0.0, '#121029');
  grad.addColorStop(0.26, '#251d45');
  grad.addColorStop(0.4, '#4c2c51');
  grad.addColorStop(0.47, '#8f4a3e');
  grad.addColorStop(0.5, '#d98a45');
  grad.addColorStop(0.53, '#b06a3c');
  grad.addColorStop(0.62, '#6d4436');
  grad.addColorStop(1.0, '#3a2828');
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 32, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(96, 40, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  skyDome.position.y = 5;
  group.add(skyDome);

  // Low sun glow just above the horizon, behind the skyline.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe0a8, transparent: true, opacity: 0.7, depthWrite: false, fog: false })
  );
  sun.position.set(30, 6.5, -86);
  sun.lookAt(0, 6.5, 0);
  group.add(sun);

  // Ground apron: earth, a river band, a far bank, then a warm rim that matches
  // the sky at the horizon so the two meet without a seam.
  const apronCanvas = document.createElement('canvas');
  apronCanvas.width = 512;
  apronCanvas.height = 512;
  const apronCtx = apronCanvas.getContext('2d')!;
  const radial = apronCtx.createRadialGradient(256, 256, 16, 256, 256, 256);
  radial.addColorStop(0.0, '#4a3a34');
  radial.addColorStop(0.18, '#42332f');
  radial.addColorStop(0.27, '#372b2a');
  radial.addColorStop(0.33, '#22304a');
  radial.addColorStop(0.38, '#3d5573');
  radial.addColorStop(0.44, '#243043');
  radial.addColorStop(0.5, '#5a4034');
  radial.addColorStop(0.64, '#7d5540');
  radial.addColorStop(0.82, '#9a6a45');
  radial.addColorStop(1.0, '#b06a3c');
  apronCtx.fillStyle = radial;
  apronCtx.fillRect(0, 0, 512, 512);
  const apronTex = new THREE.CanvasTexture(apronCanvas);
  apronTex.colorSpace = THREE.SRGBColorSpace;

  const apron = new THREE.Mesh(
    new THREE.CircleGeometry(90, 96),
    new THREE.MeshBasicMaterial({ map: apronTex, fog: false })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.5;
  group.add(apron);

  // ─── Restrained distant scenery ──────────────────────────────────────────
  // A small dark town on the far bank, just beyond the river ring, reading
  // against the bright dusk band rather than looming over the courtyard.
  const matFar = new THREE.MeshBasicMaterial({ color: 0x2b2030, fog: false });
  const matFarLit = new THREE.MeshBasicMaterial({ color: 0xffc078, fog: false });
  const skyline = new THREE.Group();
  // The river ring lands at about 0.38 of the apron radius (r ~ 34 world units);
  // the far bank therefore starts near r = 40.
  skyline.position.y = -0.45;

  const farDefs = [
    { a: -0.62, r: 44, w: 1.5, h: 2.0, spire: 1.3 },
    { a: -0.5, r: 47, w: 2.4, h: 1.3, spire: 0 },
    { a: -0.38, r: 45, w: 1.3, h: 2.4, spire: 1.6 },
    { a: -0.26, r: 48, w: 2.8, h: 1.1, spire: 0 },
    { a: -0.12, r: 46, w: 1.6, h: 1.7, spire: 0.9 },
    { a: 0.14, r: 47, w: 2.9, h: 1.0, spire: 0 },
    { a: 0.26, r: 45, w: 1.6, h: 1.8, spire: 1.1 },
    { a: 0.4, r: 48, w: 2.3, h: 1.2, spire: 0 },
    { a: 0.52, r: 44, w: 1.3, h: 2.2, spire: 1.4 },
    { a: 0.64, r: 47, w: 2.2, h: 1.3, spire: 0 },
  ];

  for (const f of farDefs) {
    const x = Math.sin(f.a) * f.r;
    const z = -Math.cos(f.a) * f.r;
    const body = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.w * 0.7), matFar);
    body.position.set(x, f.h / 2, z);
    skyline.add(body);

    if (f.spire > 0) {
      const shikhara = new THREE.Mesh(new THREE.ConeGeometry(f.w * 0.42, f.spire, 4), matFar);
      shikhara.position.set(x, f.h + f.spire / 2, z);
      shikhara.rotation.y = Math.PI / 4;
      skyline.add(shikhara);
    }

    const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), matFarLit);
    lit.position.set(x, f.h * 0.55, z + f.w * 0.36);
    skyline.add(lit);
  }
  group.add(skyline);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. COURTYARD PLINTH AND PAVING
  // ═══════════════════════════════════════════════════════════════════════════
  const wb = level.worldBounds;
  const courtW = wb.maxX - wb.minX;
  const courtD = wb.maxZ - wb.minZ;

  // Ground layers are flat planes stacked a few millimetres apart. Nothing here
  // uses a thick box, so decals, lamps and modaks can never be buried by it.
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(courtW + 1.6, 0.7, courtD + 1.6), matPlinth);
  plinth.position.set(0, -0.351, 0);
  plinth.receiveShadow = true;
  group.add(plinth);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(courtW + 0.4, courtD + 0.4), matSandstone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;
  floor.receiveShadow = true;
  group.add(floor);

  // Terracotta border frame: a rectangle with a rectangular hole.
  const frameOuter = new THREE.Shape();
  frameOuter.moveTo(-(courtW + 0.4) / 2, -(courtD + 0.4) / 2);
  frameOuter.lineTo((courtW + 0.4) / 2, -(courtD + 0.4) / 2);
  frameOuter.lineTo((courtW + 0.4) / 2, (courtD + 0.4) / 2);
  frameOuter.lineTo(-(courtW + 0.4) / 2, (courtD + 0.4) / 2);
  const frameHole = new THREE.Path();
  frameHole.moveTo(-(courtW - 1.6) / 2, -(courtD - 1.6) / 2);
  frameHole.lineTo((courtW - 1.6) / 2, -(courtD - 1.6) / 2);
  frameHole.lineTo((courtW - 1.6) / 2, (courtD - 1.6) / 2);
  frameHole.lineTo(-(courtW - 1.6) / 2, (courtD - 1.6) / 2);
  frameOuter.holes.push(frameHole);
  const border = new THREE.Mesh(new THREE.ShapeGeometry(frameOuter), matInlay);
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.005;
  border.receiveShadow = true;
  group.add(border);

  // Curved inlay bands set flush into the paving, suggesting the walking
  // routes between the planters. Built as flat ribbons, not tubes, so they
  // read as stone inlay rather than pipe lying on the floor.
  function flatRibbon(pts: THREE.Vector3[], width: number, y: number, material: THREE.Material) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const dir = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      dir.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      const sx = -dir.z * width * 0.5;
      const sz = dir.x * width * 0.5;
      positions.push(p.x - sx, y, p.z - sz, p.x + sx, y, p.z + sz);
      const v = i / (pts.length - 1);
      uvs.push(0, v, 1, v);
      if (i < pts.length - 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  function inlayRibbon(fromX: number, fromZ: number, toX: number, toZ: number, bulge: number) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i++) {
      const f = i / 26;
      pts.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(fromX, toX, f) + Math.sin(f * Math.PI) * bulge,
          0,
          THREE.MathUtils.lerp(fromZ, toZ, f)
        )
      );
    }
    group.add(flatRibbon(pts, 0.34, 0.012, matInlay));
  }
  inlayRibbon(-1.0, 8.4, 5.6, -3.4, 2.0);
  inlayRibbon(-9.4, 5.6, -4.6, -4.6, -1.6);
  inlayRibbon(9.6, 5.2, 9.0, -3.0, 1.4);

  // Wet-stone traction zone. The simulation treats it as a box; it is drawn as
  // an ellipse touching the box edges so a hard-edged dark rectangle never cuts
  // across the front of the courtyard. Traction is a soft modifier, so the
  // uncovered corners are not a gameplay boundary.
  for (const zone of level.surfaceZones) {
    const w = zone.bounds.maxX - zone.bounds.minX;
    const d = zone.bounds.maxZ - zone.bounds.minZ;
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), matWetStone);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(w / 2, 1, d / 2);
    puddle.position.set(zone.bounds.minX + w / 2, 0.014, zone.bounds.minZ + d / 2);
    puddle.receiveShadow = true;
    group.add(puddle);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PERIMETER — low balustrades aligned to the wall colliders
  // ═══════════════════════════════════════════════════════════════════════════
  function balustrade(cx: number, cz: number, alongX: boolean, span: number) {
    const g = new THREE.Group();
    const len = span;
    const base = alongX
      ? new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.42), matSandstoneBorder)
      : new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, len), matSandstoneBorder);
    base.position.y = 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const rail = alongX
      ? new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.46), matSandstoneBorder)
      : new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, len), matSandstoneBorder);
    rail.position.y = 0.86;
    rail.castShadow = true;
    g.add(rail);

    const count = Math.floor(len / 0.9);
    for (let i = 0; i <= count; i++) {
      const off = -len / 2 + (i * len) / count;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.5, 8), matSandstone);
      post.position.set(alongX ? off : 0, 0.55, alongX ? 0 : off);
      post.castShadow = true;
      g.add(post);
    }
    g.position.set(cx, 0, cz);
    group.add(g);
  }
  balustrade(0, wb.minZ + 0.2, true, courtW);
  balustrade(0, wb.maxZ - 0.2, true, courtW);
  balustrade(wb.minX + 0.2, 0, false, courtD);
  balustrade(wb.maxX - 0.2, 0, false, courtD);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FESTOON STRING LIGHTS — the round's visible progress bar
  // ═══════════════════════════════════════════════════════════════════════════
  // Unlit bulbs stay pale and small so an unlit string does not read as a
  // necklace of dark beads across the courtyard.
  const matBulbOff = new THREE.MeshStandardMaterial({
    color: 0xbfae9c,
    emissive: 0x140f0c,
    roughness: 0.6,
    metalness: 0.05,
  });
  const matBulbOn = new THREE.MeshStandardMaterial({
    color: colors.bulbWarm,
    emissive: 0xffb95e,
    emissiveIntensity: 2.2,
    roughness: 0.35,
  });
  const matWire = new THREE.LineBasicMaterial({ color: 0x2c2422 });
  const geoBulb = new THREE.SphereGeometry(0.085, 7, 6);

  interface FestoonSection {
    bulbs: THREE.Mesh[];
    lit: boolean;
  }
  /** One entry per delivery step; every string contributes a bulb to each. */
  const sections: FestoonSection[] = [];
  for (let s = 0; s < LIGHT_SECTIONS; s++) sections.push({ bulbs: [], lit: false });

  function addFestoon(a: THREE.Vector3, b: THREE.Vector3, sag: number, bulbsPerSection: number) {
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);

    const wirePts = curve.getPoints(28);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePts), matWire));

    const total = LIGHT_SECTIONS * bulbsPerSection;
    for (let s = 0; s < LIGHT_SECTIONS; s++) {
      for (let i = 0; i < bulbsPerSection; i++) {
        const f = (s * bulbsPerSection + i + 0.5) / total;
        const bulb = new THREE.Mesh(geoBulb, matBulbOff);
        bulb.position.copy(curve.getPoint(f));
        bulb.position.y -= 0.1;
        group.add(bulb);
        sections[s].bulbs.push(bulb);
      }
    }
  }

  // Strings hug the courtyard perimeter at head height, so the lit/unlit state
  // reads from anywhere without any wire crossing the play area.
  const PANDAL_PT = new THREE.Vector3(6.6, 6.6, -7.2);
  const STALL_PT = new THREE.Vector3(-6.6, 6.0, -6.4);
  const SW_PT = new THREE.Vector3(-10.4, 5.6, 6.6);
  const S_PT = new THREE.Vector3(0, 5.4, 8.9);
  const SE_PT = new THREE.Vector3(10.4, 5.6, 6.6);
  addFestoon(PANDAL_PT, STALL_PT, 0.9, 3);
  addFestoon(STALL_PT, SW_PT, 1.1, 3);
  addFestoon(PANDAL_PT, SE_PT, 1.1, 3);
  addFestoon(SW_PT, S_PT, 0.8, 3);
  addFestoon(S_PT, SE_PT, 0.8, 3);

  // One soft warm light for the whole festival, rather than one per bulb.
  const festivalGlow = new THREE.PointLight(0xffb45e, 0.0, 26, 1.4);
  festivalGlow.position.set(0, 5.2, -1.0);
  group.add(festivalGlow);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GANESH PANDAL SHRINE — the primary landmark, rear/right
  // ═══════════════════════════════════════════════════════════════════════════
  const pandal = new THREE.Group();
  pandal.position.set(7.0, 0, -8.0);

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.0), matSandstoneDark);
  step1.position.y = 0.15;
  step1.castShadow = true;
  step1.receiveShadow = true;
  pandal.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 2.6), matSandstone);
  step2.position.y = 0.41;
  step2.castShadow = true;
  step2.receiveShadow = true;
  pandal.add(step2);

  // Sanctuary back wall with a gilded arch opening
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.0, 0.26), matSandstoneDark);
  backWall.position.set(0, 2.0, -1.2);
  backWall.castShadow = true;
  pandal.add(backWall);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 8, 20, Math.PI), matGold);
  arch.position.set(0, 2.05, -1.05);
  pandal.add(arch);
  const archPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.16), matGold);
  archPillarL.position.set(-0.72, 1.3, -1.05);
  pandal.add(archPillarL);
  const archPillarR = archPillarL.clone();
  archPillarR.position.x = 0.72;
  pandal.add(archPillarR);

  const goldAura = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.07, 28), matGold);
  goldAura.rotation.x = Math.PI / 2;
  goldAura.position.set(0, 2.0, -1.06);
  pandal.add(goldAura);

  // ─── Revered Ganesha idol ─────────────────────────────────────────────────
  // Seated, whole and undamaged. No part of the game interacts with it.
  const idol = new THREE.Group();
  idol.position.set(0, 0.52, -0.62);
  const matIdol = new THREE.MeshStandardMaterial({ color: 0xd8942f, roughness: 0.42, metalness: 0.28 });
  const matIdolAccent = new THREE.MeshStandardMaterial({ color: 0xb03a26, roughness: 0.55 });

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.26, 20), matSandstone);
  pedestal.position.y = 0.13;
  pedestal.castShadow = true;
  idol.add(pedestal);

  const seatedBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), matIdol);
  seatedBody.scale.set(0.95, 1.0, 0.86);
  seatedBody.position.y = 0.6;
  seatedBody.castShadow = true;
  idol.add(seatedBody);

  const sacredThread = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.032, 8, 20), matGold);
  sacredThread.position.set(0, 0.66, 0.06);
  sacredThread.rotation.set(0.5, 0, 0.42);
  idol.add(sacredThread);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), matIdol);
  head.scale.set(0.98, 0.94, 1.0);
  head.position.set(0, 1.03, 0.06);
  head.castShadow = true;
  idol.add(head);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), matGold);
  crown.position.set(0, 1.36, 0.06);
  crown.castShadow = true;
  idol.add(crown);

  // Broad lotus ears
  const geoEar = new THREE.SphereGeometry(0.22, 14, 10);
  geoEar.scale(0.22, 1.0, 0.92);
  const earL = new THREE.Mesh(geoEar, matIdol);
  earL.position.set(-0.3, 1.05, 0.04);
  earL.rotation.z = 0.16;
  idol.add(earL);
  const earR = new THREE.Mesh(geoEar, matIdol);
  earR.position.set(0.3, 1.05, 0.04);
  earR.rotation.z = -0.16;
  idol.add(earR);

  // Trunk curving gently to Mushak's side, ending in a lifted tip
  const trunk = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.98, 0.24),
        new THREE.Vector3(-0.06, 0.82, 0.34),
        new THREE.Vector3(-0.17, 0.68, 0.31),
        new THREE.Vector3(-0.22, 0.62, 0.2),
        new THREE.Vector3(-0.16, 0.68, 0.13),
      ]),
      16, 0.062, 8, false
    ),
    matIdol
  );
  trunk.castShadow = true;
  idol.add(trunk);

  // Four arms, hands resting and holding a modak and a lotus
  const geoArm = new THREE.SphereGeometry(0.075, 8, 8);
  geoArm.scale(0.8, 2.1, 0.8);
  const armSlots: [number, number, number, number][] = [
    [-0.34, 0.72, 0.14, 0.5],
    [0.34, 0.72, 0.14, -0.5],
    [-0.36, 0.66, -0.06, 0.9],
    [0.36, 0.66, -0.06, -0.9],
  ];
  for (const [ax, ay, az, rot] of armSlots) {
    const arm = new THREE.Mesh(geoArm, matIdol);
    arm.position.set(ax, ay, az);
    arm.rotation.z = rot;
    idol.add(arm);
  }

  const offeredModak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 8), matFlowerWhite);
  offeredModak.position.set(-0.44, 0.5, 0.2);
  idol.add(offeredModak);

  const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), matIdolAccent);
  lotus.scale.set(1.3, 0.5, 1.3);
  lotus.position.set(0.44, 0.5, 0.2);
  idol.add(lotus);

  pandal.add(idol);

  // A single soft, non-shadow-casting warm light so the deity is always clearly
  // and respectfully visible, even before the festival lights come on.
  const sanctumLight = new THREE.PointLight(0xffb45e, 2.2, 7.5, 1.6);
  sanctumLight.position.set(0, 2.1, -0.2);
  pandal.add(sanctumLight);

  // ─── Pillars with marigold toran wraps ────────────────────────────────────
  const pillarSlots: [number, number][] = [
    [-1.85, 1.12],
    [1.85, 1.12],
    [-1.85, -1.12],
    [1.85, -1.12],
  ];
  const geoCapital = new THREE.BoxGeometry(0.46, 0.22, 0.46);
  const geoPillarBase = new THREE.BoxGeometry(0.5, 0.3, 0.5);
  const geoPillarShaft = new THREE.CylinderGeometry(0.16, 0.19, 2.5, 12);
  const geoGarlandBead = geoMarigold;

  for (const [px, pz] of pillarSlots) {
    const pBase = new THREE.Mesh(geoPillarBase, matSandstoneBorder);
    pBase.position.set(px, 0.55, pz);
    pBase.castShadow = true;
    pandal.add(pBase);

    const shaft = new THREE.Mesh(geoPillarShaft, matSandstone);
    shaft.position.set(px, 1.9, pz);
    shaft.castShadow = true;
    pandal.add(shaft);

    const capital = new THREE.Mesh(geoCapital, matSandstoneBorder);
    capital.position.set(px, 3.24, pz);
    capital.castShadow = true;
    pandal.add(capital);

    // Hanging marigold-and-hibiscus garland on each pillar pair
    for (let gy = 0; gy < 7; gy++) {
      const bead = new THREE.Mesh(
        geoGarlandBead,
        gy % 3 === 2 ? matFlowerWhite : gy % 2 === 0 ? matMarigoldOrange : matMarigoldYellow
      );
      bead.position.set(px, 3.02 - gy * 0.24, pz + 0.02);
      bead.scale.setScalar(0.92 - gy * 0.02);
      pandal.add(bead);
    }
  }

  // ─── Side drapes: deep indigo fabric with gold trim ───────────────────────
  for (const side of [-1, 1]) {
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6, 6, 1), matIndigo);
    const dp = drape.geometry.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i);
      dp.setZ(i, Math.sin((x / 1.5) * Math.PI * 4) * 0.09);
    }
    drape.geometry.computeVertexNormals();
    drape.position.set(side * 1.86, 1.9, 0);
    drape.rotation.y = (Math.PI / 2) * side;
    pandal.add(drape);

    const drapeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), matGold);
    drapeTrim.position.set(side * 1.86, 1.9, side * 0.74);
    pandal.add(drapeTrim);
  }

  // ─── Canopy: visible fabric thickness, scalloped edge and gold trim ───────
  const canopyOuter = new THREE.Mesh(new THREE.ConeGeometry(3.05, 1.35, 4, 1, false), matIndigo);
  canopyOuter.position.y = 3.92;
  canopyOuter.rotation.y = Math.PI / 4;
  canopyOuter.castShadow = true;
  pandal.add(canopyOuter);

  // Underside gives the roof real thickness instead of a single surface.
  const canopyUnder = new THREE.Mesh(new THREE.ConeGeometry(2.92, 1.24, 4, 1, true), matIndigoDeep);
  canopyUnder.position.y = 3.86;
  canopyUnder.rotation.set(Math.PI, 0, 0);
  canopyUnder.rotation.y = Math.PI / 4;
  pandal.add(canopyUnder);

  const canopyRim = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.16, 4.36), matIndigo);
  canopyRim.position.y = 3.28;
  canopyRim.rotation.y = Math.PI / 4;
  canopyRim.castShadow = true;
  pandal.add(canopyRim);

  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(4.46, 0.07, 4.46), matGold);
  canopyTrim.position.y = 3.16;
  canopyTrim.rotation.y = Math.PI / 4;
  pandal.add(canopyTrim);

  // Scalloped valance: a continuous fabric skirt hanging from the canopy rim
  // with a marigold bead at each scallop, rather than detached tabs.
  const geoValance = new THREE.ConeGeometry(0.13, 0.34, 4);
  function valanceSkirt(cx: number, cz: number, half: number, rotY: number) {
    const skirt = new THREE.Group();
    skirt.position.set(cx, 3.14, cz);
    skirt.rotation.y = rotY;
    const band = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.3, 0.05), matIndigo);
    band.position.y = -0.15;
    skirt.add(band);
    const count = 9;
    for (let i = 0; i < count; i++) {
      const t = -half + (i + 0.5) * ((half * 2) / count);
      const tab = new THREE.Mesh(geoValance, i % 2 === 0 ? matIndigo : matVermilion);
      tab.rotation.x = Math.PI;
      tab.position.set(t, -0.44, 0);
      skirt.add(tab);
      const bead = new THREE.Mesh(geoMarigold, matMarigoldYellow);
      bead.position.set(t, -0.62, 0);
      skirt.add(bead);
    }
    return skirt;
  }
  const RIM = 2.14;
  pandal.add(valanceSkirt(0, RIM, RIM, 0));
  pandal.add(valanceSkirt(0, -RIM, RIM, 0));
  pandal.add(valanceSkirt(RIM, 0, RIM, Math.PI / 2));
  pandal.add(valanceSkirt(-RIM, 0, RIM, Math.PI / 2));

  const kalashSpire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 12), matGold);
  kalashSpire.position.y = 4.9;
  kalashSpire.castShadow = true;
  pandal.add(kalashSpire);
  const kalashBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matGold);
  kalashBall.position.y = 5.36;
  pandal.add(kalashBall);
  const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), matFlowerWhite);
  coconut.position.y = 5.56;
  pandal.add(coconut);

  // Toran garland strung across the sanctum entrance
  const toranPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const f = i / 16;
    toranPts.push(new THREE.Vector3(-1.9 + f * 3.8, 2.98 - Math.sin(f * Math.PI) * 0.42, 1.2));
  }
  const toranWire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(toranPts), matWire);
  pandal.add(toranWire);
  for (let i = 0; i <= 16; i++) {
    const p = toranPts[i];
    const g = new THREE.Mesh(geoMarigold, i % 2 === 0 ? matMarigoldOrange : matMarigoldYellow);
    g.position.set(p.x, p.y - 0.1, p.z);
    pandal.add(g);
    if (i % 4 === 2) {
      const leafBead = new THREE.Mesh(geoLeafBlade, matLeafMid);
      leafBead.position.set(p.x, p.y - 0.26, p.z);
      leafBead.scale.setScalar(0.5);
      pandal.add(leafBead);
    }
  }

  // Offering table with brass thalis, modaks and a coconut
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.13, 0.72), matTimber);
  tableTop.position.set(0, 0.62, 0.72);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  pandal.add(tableTop);
  for (const lx of [-1.0, 1.0]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.6), matTimberDark);
    leg.position.set(lx, 0.32, 0.72);
    pandal.add(leg);
  }
  for (let tx = -0.72; tx <= 0.72; tx += 0.72) {
    const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.035, 16), matBrass);
    thali.position.set(tx, 0.7, 0.72);
    pandal.add(thali);
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.19, 9), matFlowerWhite);
    mound.position.set(tx, 0.8, 0.72);
    pandal.add(mound);
  }
  const offeringCoconut = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), matSandstoneDark);
  offeringCoconut.position.set(0, 0.76, 1.02);
  pandal.add(offeringCoconut);

  // Two brass samai lamps flanking the pad — emissive, no per-lamp light.
  function samaiLamp(lx: number, lz: number) {
    const g = new THREE.Group();
    g.position.set(lx, 0.55, lz);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.08, 14), matBrass);
    g.add(b);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.05, 8), matBrass);
    stem.position.y = 0.56;
    stem.castShadow = true;
    g.add(stem);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.08, 14), matBrass);
    dish.position.y = 0.76;
    g.add(dish);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 12, 1, true), matBrass);
    crown.position.y = 1.16;
    g.add(crown);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 7), matFlame);
    flame.position.y = 0.9;
    g.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matLampGlow);
    glow.position.y = 0.88;
    g.add(glow);
    pandal.add(g);
    return g;
  }
  const lampL = samaiLamp(-1.5, 1.0);
  const lampR = samaiLamp(1.5, 1.0);

  group.add(pandal);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DELIVERY PAD — rangoli, emphasis ring and a beacon when the basket is full
  // ═══════════════════════════════════════════════════════════════════════════
  const padR = Math.max(deliveryZone.dimensions.x, deliveryZone.dimensions.z) / 2;

  const padRing = new THREE.Mesh(new THREE.RingGeometry(padR + 0.05, padR + 0.34, 44), matTerracotta);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(dz.x, 0.022, dz.z);
  padRing.receiveShadow = true;
  group.add(padRing);

  const rangoliMat = new THREE.MeshBasicMaterial({ map: texRangoli, transparent: true, opacity: 0.97, depthWrite: false });
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(padR + 0.05, 44), rangoliMat);
  rangoli.rotation.x = -Math.PI / 2;
  rangoli.position.set(dz.x, 0.028, dz.z);
  group.add(rangoli);

  const emphasisMat = new THREE.MeshBasicMaterial({
    color: colors.goldZari,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const emphasisRing = new THREE.Mesh(new THREE.RingGeometry(padR + 0.4, padR + 0.66, 44), emphasisMat);
  emphasisRing.rotation.x = -Math.PI / 2;
  emphasisRing.position.set(dz.x, 0.034, dz.z);
  group.add(emphasisRing);

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd268,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(padR * 0.92, padR, 3.2, 24, 1, true), beaconMat);
  beacon.position.set(dz.x, 1.6, dz.z);
  group.add(beacon);

  // Small brass lamps ringing the pad so it reads as the destination.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.Group();
    g.position.set(dz.x + Math.cos(a) * (padR + 0.55), 0, dz.z + Math.sin(a) * (padR + 0.55));
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.26, 10), matBrass);
    body.position.y = 0.13;
    body.castShadow = true;
    g.add(body);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 7), matFlame);
    flame.position.y = 0.33;
    g.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), matLampGlow);
    glow.position.y = 0.31;
    g.add(glow);
    group.add(g);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SWEETS STALL — left side
  // ═══════════════════════════════════════════════════════════════════════════
  const stall = new THREE.Group();
  stall.position.set(-7.0, 0, -6.8);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.85, 1.8), matTimber);
  counter.position.y = 0.425;
  counter.castShadow = true;
  counter.receiveShadow = true;
  stall.add(counter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.09, 2.02), matSandstoneBorder);
  counterTop.position.y = 0.89;
  counterTop.castShadow = true;
  stall.add(counterTop);

  const frontBanner = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.05), matVermilion);
  frontBanner.position.set(0, 0.5, 0.93);
  stall.add(frontBanner);

  for (const [spx, spz] of [[-1.85, 0.82], [1.85, 0.82], [-1.85, -0.82], [1.85, -0.82]] as const) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.1, 0.15), matTimberDark);
    post.position.set(spx, 1.8, spz);
    post.castShadow = true;
    stall.add(post);
  }

  // Striped fabric awning with real thickness and a scalloped front edge
  const awningGroup = new THREE.Group();
  awningGroup.position.set(0, 2.72, 0);
  awningGroup.rotation.x = 0.14;
  const awningTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.09, 2.5), matIndigo);
  awningTop.castShadow = true;
  awningGroup.add(awningTop);
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 2.5), matFlowerWhite);
    stripe.position.set(-1.87 + i * 0.75, 0, 0);
    awningGroup.add(stripe);
  }
  const awningTrim = new THREE.Mesh(new THREE.BoxGeometry(4.56, 0.07, 0.09), matGold);
  awningTrim.position.set(0, -0.06, 1.28);
  awningGroup.add(awningTrim);
  stall.add(awningGroup);

  for (let i = 0; i <= 10; i++) {
    const tab = new THREE.Mesh(geoValance, i % 2 === 0 ? matIndigo : matVermilion);
    tab.rotation.x = Math.PI;
    tab.position.set(-2.05 + i * 0.41, 2.5, 1.3);
    stall.add(tab);
  }

  // Brass thalis of sweets on the counter
  const sweetMounds: [number, number, number][] = [
    [-1.05, 1.16, 0xfdf3e2],
    [0, 1.12, 0xf2a53a],
    [1.05, 1.16, 0xfdf3e2],
  ];
  for (const [mx, my, mc] of sweetMounds) {
    const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.05, 16), matBrass);
    thali.position.set(mx, 0.94, 0.15);
    stall.add(thali);
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.4, 9),
      new THREE.MeshStandardMaterial({ color: mc, roughness: 0.5 })
    );
    mound.position.set(mx, my, 0.15);
    mound.castShadow = true;
    stall.add(mound);
  }

  // Signboard
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.62, 0.06), matTimberDark);
  signBoard.position.set(0, 2.05, 1.02);
  signBoard.castShadow = true;
  stall.add(signBoard);
  const signBorder = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.7, 0.04), matGold);
  signBorder.position.set(0, 2.05, 0.99);
  stall.add(signBorder);
  const signModak = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.26, 9), matFlowerWhite);
  signModak.position.set(-0.35, 2.05, 1.06);
  stall.add(signModak);
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.02), matFlowerWhite);
    bar.position.set(0.28, 2.16 - i * 0.14, 1.06);
    stall.add(bar);
  }

  // Hanging lanterns at the awning corners
  for (const hx of [-1.9, 1.9]) {
    const lg = new THREE.Group();
    lg.position.set(hx, 2.28, 1.05);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 8), matBrass);
    lg.add(cap);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 10), matLampGlow);
    glass.position.y = -0.19;
    lg.add(glass);
    const base = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.09, 8), matBrass);
    base.position.y = -0.36;
    base.rotation.x = Math.PI;
    lg.add(base);
    stall.add(lg);
  }

  group.add(stall);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PLANTED ISLANDS — footprints match the cylinder colliders exactly
  // ═══════════════════════════════════════════════════════════════════════════
  function planter(islandLevelId: string, radius: number, soilY: number) {
    const col = level.staticColliders.find((c) => c.id === islandLevelId);
    const cx = col ? col.transform.position.x : 0;
    const cz = col ? col.transform.position.z : 0;

    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    group.add(g);

    const curb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.34, 30), matSandstoneBorder);
    curb.position.y = 0.17;
    curb.castShadow = true;
    curb.receiveShadow = true;
    g.add(curb);

    // Chiselled curb band so the stone does not read as a plain drum
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, 0.045, 6, 30), matSandstoneDark);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.3;
    g.add(band);

    const soil = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.88, radius * 0.88, 0.06, 24), matSoil);
    soil.position.y = 0.33;
    soil.receiveShadow = true;
    g.add(soil);

    return { g, radius, soilY: soilY };
  }

  // Layered leaf cluster — replaces the single giant banana fan.
  function leafCluster(g: THREE.Group, radius: number, baseY: number) {
    const rings = [
      { count: 7, r: 0.72, scale: 0.72, y: 0.34, tilt: 0.9 },
      { count: 5, r: 0.42, scale: 0.92, y: 0.6, tilt: 0.6 },
      { count: 3, r: 0.14, scale: 1.05, y: 0.82, tilt: 0.32 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2 + ring.y;
        const leaf = new THREE.Mesh(
          geoLeafBlade,
          ring.scale > 0.9 ? matBananaLeaf : matLeafMid
        );
        leaf.position.set(
          Math.cos(a) * radius * ring.r,
          baseY + ring.y,
          Math.sin(a) * radius * ring.r
        );
        leaf.rotation.set(0, -a, ring.tilt);
        leaf.scale.setScalar(ring.scale);
        leaf.castShadow = true;
        g.add(leaf);
      }
    }

    // Low shrub mound filling the centre
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), matShrub);
      bush.position.set(Math.cos(a) * radius * 0.3, baseY + 0.12, Math.sin(a) * radius * 0.3);
      bush.scale.set(1.1, 0.6, 1.1);
      bush.castShadow = true;
      g.add(bush);
    }
  }

  // Compact flower clusters on stems of varied height — no bare stalks.
  function flowerCluster(g: THREE.Group, fx: number, fz: number, baseY: number, seed: number) {
    const stemH = 0.3 + ((seed * 7) % 5) * 0.07;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, stemH, 5), matLeafMid);
    stem.position.set(fx, baseY + stemH / 2, fz);
    g.add(stem);

    // Two leaves at the node
    for (let l = 0; l < 2; l++) {
      const lf = new THREE.Mesh(geoLeafBlade, matLeafMid);
      lf.scale.setScalar(0.3);
      lf.position.set(fx + (l === 0 ? -0.09 : 0.09), baseY + stemH * 0.45, fz);
      lf.rotation.set(0, l === 0 ? -1.2 : 1.2, l === 0 ? 0.7 : -0.7);
      g.add(lf);
    }

    // Marigold head: a tight ball of petals rather than a lone sphere
    const headY = baseY + stemH + 0.06;
    const petalMat = seed % 2 === 0 ? matMarigoldOrange : matMarigoldYellow;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), petalMat);
    core.position.set(fx, headY, fz);
    core.castShadow = true;
    g.add(core);
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(geoMarigold, petalMat);
      petal.scale.setScalar(0.72);
      petal.position.set(fx + Math.cos(a) * 0.075, headY, fz + Math.sin(a) * 0.075);
      g.add(petal);
    }
  }

  const islandA = planter('island-a', 2.0, 0.36);
  leafCluster(islandA.g, islandA.radius, islandA.soilY);
  // A small tulsi vrindavan on its own plinth, a traditional courtyard feature.
  {
    const tg = new THREE.Group();
    tg.position.set(0, 0.36, 0);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.34, 12), matSandstoneDark);
    pot.position.y = 0.17;
    pot.castShadow = true;
    tg.add(pot);
    const tulsi = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), matShrub);
    tulsi.position.y = 0.52;
    tulsi.scale.set(1.0, 0.85, 1.0);
    tulsi.castShadow = true;
    tg.add(tulsi);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(geoLeafBlade, matBananaLeaf);
      leaf.scale.setScalar(0.5);
      leaf.position.set(Math.cos(a) * 0.2, 0.68, Math.sin(a) * 0.2);
      leaf.rotation.set(0, -a, 0.9);
      tg.add(leaf);
    }
    islandA.g.add(tg);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 0.55 + (i % 3) * 0.42;
    flowerCluster(islandA.g, Math.cos(a) * islandA.radius * r, Math.sin(a) * islandA.radius * r, islandA.soilY, i);
  }

  const islandB = planter('island-b', 1.6, 0.36);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 0.3 + (i % 4) * 0.17;
    flowerCluster(islandB.g, Math.cos(a) * islandB.radius * r, Math.sin(a) * islandB.radius * r, islandB.soilY, i + 3);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), matShrub);
    bush.position.set(Math.cos(a) * islandB.radius * 0.62, islandB.soilY + 0.12, Math.sin(a) * islandB.radius * 0.62);
    bush.scale.set(1.05, 0.62, 1.05);
    bush.castShadow = true;
    islandB.g.add(bush);
  }
  const islandBCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), matLeafMid);
  islandBCore.position.y = islandB.soilY + 0.3;
  islandBCore.scale.set(1.0, 0.8, 1.0);
  islandBCore.castShadow = true;
  islandB.g.add(islandBCore);

  // ─── Scattered ground flowers along the routes (visual only) ──────────────
  const decorSpots: [number, number][] = [
    [-9.8, 7.6], [-9.9, -1.6], [10.4, 8.0], [10.4, -6.8],
    [-1.4, -7.6], [1.6, 8.6], [-6.2, 8.6], [6.4, 8.6],
  ];
  for (const [sx, sz] of decorSpots) {
    const patch = new THREE.Group();
    patch.position.set(sx, 0, sz);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + sx;
      flowerCluster(patch, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.02, i + Math.abs(Math.round(sx)));
    }
    group.add(patch);
  }

  // Perimeter lamps from the level props, rendered as emissive brass samai.
  for (const prop of level.props) {
    if (prop.kind !== 'lamp') continue;
    const g = new THREE.Group();
    g.position.set(prop.transform.position.x, 0, prop.transform.position.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.14, 12), matSandstoneDark);
    base.position.y = 0.07;
    base.castShadow = true;
    g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8), matBrass);
    stem.position.y = 0.55;
    stem.castShadow = true;
    g.add(stem);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.13, 0.09, 12), matBrass);
    dish.position.y = 1.02;
    g.add(dish);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 10, 1, true), matBrass);
    crown.position.y = 1.42;
    g.add(crown);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 7), matFlame);
    flame.position.y = 1.14;
    g.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), matLampGlow);
    glow.position.y = 1.12;
    g.add(glow);
    group.add(g);
  }

  // ─── Delivery petal burst (lightweight pool, no per-petal light) ──────────
  interface Petal {
    mesh: THREE.Mesh;
    life: number;
    vx: number;
    vy: number;
    vz: number;
  }
  const petalPool: Petal[] = [];
  const petalMats = [matMarigoldOrange, matMarigoldYellow, matFlowerWhite];
  for (let i = 0; i < 26; i++) {
    const mesh = new THREE.Mesh(geoMarigold, petalMats[i % petalMats.length]);
    mesh.visible = false;
    group.add(mesh);
    petalPool.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
  }

  scene.add(group);

  // ═══════════════════════════════════════════════════════════════════════════
  // Animation and state
  // ═══════════════════════════════════════════════════════════════════════════
  let emphasis = 0;
  let emphasisTarget = 0;
  let burst = 0;
  let deliveriesMade = 0;
  let litSections = 0;

  function applyLitSections() {
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const shouldLight = i < litSections;
      if (s.lit === shouldLight) continue;
      s.lit = shouldLight;
      for (const b of s.bulbs) b.material = shouldLight ? matBulbOn : matBulbOff;
    }
    festivalGlow.intensity = (litSections / LIGHT_SECTIONS) * 1.5;
  }

  applyLitSections();

  return {
    group,

    update: (time, delta) => {
      emphasis += (emphasisTarget - emphasis) * Math.min(1, delta * 6);

      // Pad ring: calm breathing normally, urgent pulse when the basket is full.
      const rate = 2.0 + emphasis * 5.0;
      const pulse = 1.0 + Math.sin(time * rate) * (0.04 + emphasis * 0.1);
      emphasisRing.scale.set(pulse, pulse, 1);
      emphasisMat.opacity = emphasis * (0.45 + Math.sin(time * rate) * 0.3);
      beaconMat.opacity = emphasis * (0.1 + Math.sin(time * rate) * 0.06);
      beacon.scale.set(1 + emphasis * 0.05, 1, 1 + emphasis * 0.05);

      // Lamp flames flicker without needing a light per lamp.
      const flicker = 1.35 + Math.sin(time * 11.0) * 0.22 + Math.cos(time * 23.0) * 0.12;
      matLampGlow.emissiveIntensity = flicker;
      lampL.scale.setScalar(1 + Math.sin(time * 9.0) * 0.012);
      lampR.scale.setScalar(1 + Math.cos(time * 8.0) * 0.012);

      if (burst > 0) {
        burst = Math.max(0, burst - delta);
        const p = 1 - burst / 1.1;
        padRing.scale.setScalar(1 + p * 0.16);
      } else {
        padRing.scale.setScalar(1);
      }

      for (const petal of petalPool) {
        if (petal.life <= 0) continue;
        petal.life -= delta;
        petal.vy -= 5.2 * delta;
        petal.mesh.position.x += petal.vx * delta;
        petal.mesh.position.y += petal.vy * delta;
        petal.mesh.position.z += petal.vz * delta;
        petal.mesh.rotation.y += delta * 6;
        const s = Math.max(0.001, petal.life / 1.0);
        petal.mesh.scale.setScalar(0.6 + s * 0.7);
        if (petal.life <= 0) petal.mesh.visible = false;
      }
    },

    triggerDeliveryEffect: (count, allowParticles) => {
      burst = 1.1;
      deliveriesMade++;
      litSections = Math.min(LIGHT_SECTIONS, deliveriesMade);
      applyLitSections();

      if (!allowParticles) return;
      const spawn = Math.min(petalPool.length, 8 + count * 3);
      let spawned = 0;
      for (const petal of petalPool) {
        if (spawned >= spawn) break;
        if (petal.life > 0) continue;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * padR * 0.7;
        petal.mesh.position.set(dz.x + Math.cos(a) * r, 0.25, dz.z + Math.sin(a) * r);
        petal.mesh.visible = true;
        petal.life = 0.85 + Math.random() * 0.3;
        petal.vx = Math.cos(a) * (0.5 + Math.random() * 0.9);
        petal.vy = 2.6 + Math.random() * 1.9;
        petal.vz = Math.sin(a) * (0.5 + Math.random() * 0.9);
        spawned++;
      }
    },

    setDeliveryEmphasis: (on) => {
      emphasisTarget = on ? 1 : 0;
    },

    reset: () => {
      emphasis = 0;
      emphasisTarget = 0;
      burst = 0;
      deliveriesMade = 0;
      litSections = 0;
      padRing.scale.setScalar(1);
      emphasisMat.opacity = 0;
      beaconMat.opacity = 0;
      for (const petal of petalPool) {
        petal.life = 0;
        petal.mesh.visible = false;
      }
      applyLitSections();
    },
  };
}
