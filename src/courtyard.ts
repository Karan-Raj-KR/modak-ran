import * as THREE from 'three';
import { OBSTACLES, DELIVERY_ZONE } from './map';

export interface CourtyardElements {
  group: THREE.Group;
  deliveryZoneMesh: THREE.Mesh;
  update: (time: number) => void;
}

export function createCourtyard(scene: THREE.Scene): CourtyardElements {
  const group = new THREE.Group();

  // Curated color palette
  const colors = {
    terracotta: 0xb96e4c,
    terracottaAlt: 0xaa603f,
    sandstone: 0xe5c79e,
    sandstoneDark: 0xcca87d,
    indigo: 0x303568,
    indigoLight: 0x3e4585,
    vermilion: 0xb84d43,
    marigoldOrange: 0xe9a72f,
    marigoldYellow: 0xf5be3d,
    foliage: 0x2e5440,
    foliageLight: 0x3b6b52,
    brass: 0xd4af37,
    flame: 0xffaa22,
    leafGreen: 0x4a7c36,
    wood: 0x5a3d28,
  };

  // Shared reusable materials
  const matTerracotta = new THREE.MeshStandardMaterial({
    color: colors.terracotta,
    roughness: 0.85,
    metalness: 0.05,
  });

  const matTerracottaAlt = new THREE.MeshStandardMaterial({
    color: colors.terracottaAlt,
    roughness: 0.88,
  });

  const matSandstone = new THREE.MeshStandardMaterial({
    color: colors.sandstone,
    roughness: 0.8,
    metalness: 0.08,
  });

  const matSandstoneDark = new THREE.MeshStandardMaterial({
    color: colors.sandstoneDark,
    roughness: 0.85,
  });

  const matIndigo = new THREE.MeshStandardMaterial({
    color: colors.indigo,
    roughness: 0.7,
  });

  const matVermilion = new THREE.MeshStandardMaterial({
    color: colors.vermilion,
    roughness: 0.75,
  });

  const matMarigoldOrange = new THREE.MeshStandardMaterial({
    color: colors.marigoldOrange,
    roughness: 0.6,
  });

  const matMarigoldYellow = new THREE.MeshStandardMaterial({
    color: colors.marigoldYellow,
    roughness: 0.6,
  });

  const matFoliage = new THREE.MeshStandardMaterial({
    color: colors.foliage,
    roughness: 0.9,
  });

  const matFoliageLight = new THREE.MeshStandardMaterial({
    color: colors.foliageLight,
    roughness: 0.85,
  });

  const matBrass = new THREE.MeshStandardMaterial({
    color: colors.brass,
    roughness: 0.35,
    metalness: 0.8,
  });

  const matFlame = new THREE.MeshBasicMaterial({
    color: colors.flame,
  });

  const matWood = new THREE.MeshStandardMaterial({
    color: colors.wood,
    roughness: 0.75,
  });

  // ---------------------------------------------------------------------------
  // 1. BASE FOUNDATION & PAVING
  // ---------------------------------------------------------------------------
  // Raised plinth under the entire courtyard (25 x 21 x 0.6)
  const plinthGeo = new THREE.BoxGeometry(25, 0.6, 21);
  const plinth = new THREE.Mesh(plinthGeo, matSandstoneDark);
  plinth.position.set(0, -0.3, 0);
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main ground floor slab
  const floorGeo = new THREE.BoxGeometry(24, 0.2, 20);
  const floor = new THREE.Mesh(floorGeo, matTerracotta);
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Sandstone border edge curbing around the courtyard
  const curbThickness = 0.5;
  const curbHeight = 0.25;

  // North curb
  const northCurb = new THREE.Mesh(new THREE.BoxGeometry(24, curbHeight, curbThickness), matSandstone);
  northCurb.position.set(0, 0.05, -9.8);
  northCurb.receiveShadow = true;
  group.add(northCurb);

  // South curb
  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(24, curbHeight, curbThickness), matSandstone);
  southCurb.position.set(0, 0.05, 9.8);
  southCurb.receiveShadow = true;
  group.add(southCurb);

  // West curb
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(curbThickness, curbHeight, 20), matSandstone);
  westCurb.position.set(-11.8, 0.05, 0);
  westCurb.receiveShadow = true;
  group.add(westCurb);

  // East curb
  const eastCurb = new THREE.Mesh(new THREE.BoxGeometry(curbThickness, curbHeight, 20), matSandstone);
  eastCurb.position.set(11.8, 0.05, 0);
  eastCurb.receiveShadow = true;
  group.add(eastCurb);

  // Terracotta pavers pattern (subtle raised stones for visual richness)
  const paverGeo = new THREE.BoxGeometry(1.9, 0.02, 1.9);
  for (let px = -10; px <= 10; px += 2.2) {
    for (let pz = -8; pz <= 8; pz += 2.2) {
      if (Math.abs(px) < 11 && Math.abs(pz) < 9) {
        // Pseudo-random shade variation
        const useAlt = (Math.sin(px * 3.7 + pz * 5.1) > 0.15);
        const paver = new THREE.Mesh(paverGeo, useAlt ? matTerracottaAlt : matTerracotta);
        paver.position.set(px, 0.005, pz);
        paver.receiveShadow = true;
        group.add(paver);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. PERIMETER PILLAR LAMPS (BRASS SAMAI / DIYAS)
  // ---------------------------------------------------------------------------
  const lampPositions = [
    [-11.2, -9.2], [0, -9.5], [-11.2, 9.2], [11.2, 9.2],
    [-11.2, 0], [11.2, 0], [0, 9.5]
  ];

  lampPositions.forEach(([lx, lz]) => {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lx, 0, lz);

    // Stone plinth
    const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 8), matSandstone);
    pBase.position.y = 0.2;
    pBase.castShadow = true;
    lampGroup.add(pBase);

    // Brass stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8), matBrass);
    stem.position.y = 0.7;
    stem.castShadow = true;
    lampGroup.add(stem);

    // Brass oil bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.15, 0.15, 8), matBrass);
    bowl.position.y = 1.15;
    bowl.castShadow = true;
    lampGroup.add(bowl);

    // Warm flame tip
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), matFlame);
    flame.position.y = 1.3;
    lampGroup.add(flame);

    group.add(lampGroup);
  });

  // ---------------------------------------------------------------------------
  // 3. FESTIVAL PANDAL & SHRINE (UPPER-RIGHT)
  // Non-traversable shrine behind delivery zone: centered at (+7, -8)
  // ---------------------------------------------------------------------------
  const pandalGroup = new THREE.Group();
  pandalGroup.position.set(7.0, 0, -8.0);

  // Raised shrine platform (width 4.4, depth 2.8, height 0.5)
  const pandalBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 2.8), matSandstone);
  pandalBase.position.y = 0.25;
  pandalBase.castShadow = true;
  pandalBase.receiveShadow = true;
  pandalGroup.add(pandalBase);

  // Shrine back wall / ornate decorative sanctuary screen
  const sanctumWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.25), matSandstoneDark);
  sanctumWall.position.set(0, 1.55, -1.2);
  sanctumWall.castShadow = true;
  pandalGroup.add(sanctumWall);

  // Sanctum inner decorative arch / golden aura panel
  const archPanel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 16), matBrass);
  archPanel.rotation.x = Math.PI / 2;
  archPanel.position.set(0, 1.8, -1.05);
  pandalGroup.add(archPanel);

  // Devotional pedestal
  const deityPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.45, 12), matSandstone);
  deityPedestal.position.set(0, 0.72, -0.4);
  deityPedestal.castShadow = true;
  pandalGroup.add(deityPedestal);

  // Golden ceremonial kalash on pedestal
  const kalashPot = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), matBrass);
  kalashPot.position.set(0, 1.15, -0.4);
  kalashPot.castShadow = true;
  pandalGroup.add(kalashPot);

  const kalashTop = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 8), matVermilion);
  kalashTop.position.set(0, 1.55, -0.4);
  pandalGroup.add(kalashTop);

  // 4 Carved pillars
  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.2, 2.5, 8);
  const pillarPositions = [
    [-1.9, -1.1], [1.9, -1.1],
    [-1.9, 1.1], [1.9, 1.1],
  ];

  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, matSandstone);
    pillar.position.set(px, 1.5, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pandalGroup.add(pillar);

    // Pillar capital
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), matBrass);
    cap.position.set(px, 2.8, pz);
    pandalGroup.add(cap);
  });

  // Fabric Canopy (Indigo with gold / vermilion borders)
  const canopyGeo = new THREE.ConeGeometry(2.9, 1.2, 4);
  const canopy = new THREE.Mesh(canopyGeo, matIndigo);
  canopy.position.set(0, 3.4, 0);
  canopy.rotation.y = Math.PI / 4;
  canopy.castShadow = true;
  pandalGroup.add(canopy);

  // Canopy gold finial spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.18, 0.7, 8), matBrass);
  spire.position.set(0, 4.2, 0);
  pandalGroup.add(spire);

  // Marigold toran garland along front beam
  for (let g = -1.8; g <= 1.8; g += 0.3) {
    const garlandFlower = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      Math.abs(Math.round(g * 3)) % 2 === 0 ? matMarigoldOrange : matMarigoldYellow
    );
    // Subtle catenary droop
    const droop = Math.sin((g + 1.8) / 3.6 * Math.PI) * 0.18;
    garlandFlower.position.set(g, 2.7 - droop, 1.15);
    pandalGroup.add(garlandFlower);
  }

  // Low offering / collection table at front of shrine
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.8), matBrass);
  tableTop.position.set(0, 0.55, 1.1);
  tableTop.castShadow = true;
  pandalGroup.add(tableTop);

  // Offering bowls on table
  const bowlGeo = new THREE.CylinderGeometry(0.22, 0.12, 0.1, 8);
  const b1 = new THREE.Mesh(bowlGeo, matBrass);
  b1.position.set(-0.7, 0.68, 1.1);
  pandalGroup.add(b1);
  const b2 = new THREE.Mesh(bowlGeo, matBrass);
  b2.position.set(0.7, 0.68, 1.1);
  pandalGroup.add(b2);

  // Dedicated warm accent light inside pandal sanctum
  const shrineLight = new THREE.PointLight(0xffb74d, 1.2, 7);
  shrineLight.position.set(0, 2.2, -0.2);
  pandalGroup.add(shrineLight);

  group.add(pandalGroup);

  // ---------------------------------------------------------------------------
  // 4. DELIVERY ZONE PAD (+7, -5)
  // Clear ground-level delivery pad outlined with celebratory rangoli
  // ---------------------------------------------------------------------------
  const deliveryPadGeo = new THREE.PlaneGeometry(DELIVERY_ZONE.width, DELIVERY_ZONE.depth);
  const matDeliveryPad = new THREE.MeshStandardMaterial({
    color: colors.sandstone,
    roughness: 0.6,
    metalness: 0.1,
  });
  const deliveryPad = new THREE.Mesh(deliveryPadGeo, matDeliveryPad);
  deliveryPad.rotation.x = -Math.PI / 2;
  deliveryPad.position.set(DELIVERY_ZONE.x, 0.015, DELIVERY_ZONE.z);
  deliveryPad.receiveShadow = true;
  group.add(deliveryPad);

  // Rangoli decorative ring on delivery pad
  const rangoliRingGeo = new THREE.RingGeometry(0.9, 1.15, 32);
  const matRangoliRing = new THREE.MeshBasicMaterial({
    color: colors.vermilion,
    side: THREE.DoubleSide,
  });
  const rangoliRing = new THREE.Mesh(rangoliRingGeo, matRangoliRing);
  rangoliRing.rotation.x = -Math.PI / 2;
  rangoliRing.position.set(DELIVERY_ZONE.x, 0.02, DELIVERY_ZONE.z);
  group.add(rangoliRing);

  // Animated outer ring beacon
  const pulseRingGeo = new THREE.RingGeometry(1.2, 1.28, 32);
  const matPulseRing = new THREE.MeshBasicMaterial({
    color: colors.marigoldYellow,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, matPulseRing);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.set(DELIVERY_ZONE.x, 0.025, DELIVERY_ZONE.z);
  group.add(pulseRing);

  // Small festive lotus petals in rangoli center
  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2;
    const petalGeo = new THREE.CircleGeometry(0.2, 6);
    const petal = new THREE.Mesh(petalGeo, new THREE.MeshBasicMaterial({ color: colors.marigoldOrange }));
    petal.rotation.x = -Math.PI / 2;
    petal.position.set(
      DELIVERY_ZONE.x + Math.cos(angle) * 0.55,
      0.022,
      DELIVERY_ZONE.z + Math.sin(angle) * 0.55
    );
    group.add(petal);
  }

  // ---------------------------------------------------------------------------
  // 5. PREPARATION STALL (UPPER-LEFT, -7, -6.8)
  // Modest sweet preparation stall with counter, wooden posts, and canopy
  // ---------------------------------------------------------------------------
  const stallGroup = new THREE.Group();
  stallGroup.position.set(-7.0, 0, -6.8);

  // Stall counter table (4.0 wide, 1.8 deep, 0.85 high)
  const counterGeo = new THREE.BoxGeometry(4.0, 0.85, 1.8);
  const counter = new THREE.Mesh(counterGeo, matWood);
  counter.position.y = 0.425;
  counter.castShadow = true;
  counter.receiveShadow = true;
  stallGroup.add(counter);

  // Tablecloth runner (Indigo with saffron trim)
  const runner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 1.6), matIndigo);
  runner.position.y = 0.88;
  stallGroup.add(runner);

  // 4 Corner posts for canopy
  const stallPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8);
  const stallPostPositions = [
    [-1.9, -0.8], [1.9, -0.8],
    [-1.9, 0.8], [1.9, 0.8]
  ];
  stallPostPositions.forEach(([sx, sz]) => {
    const post = new THREE.Mesh(stallPostGeo, matWood);
    post.position.set(sx, 1.3, sz);
    post.castShadow = true;
    stallGroup.add(post);
  });

  // Slanted fabric stall canopy
  const stallCanopy = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 2.4), matIndigo);
  stallCanopy.position.set(0, 2.6, 0);
  stallCanopy.rotation.x = 0.12; // gentle forward slant
  stallCanopy.castShadow = true;
  stallGroup.add(stallCanopy);

  // Canopy striped trim
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.25, 0.08), matVermilion);
  canopyTrim.position.set(0, 2.45, 1.15);
  stallGroup.add(canopyTrim);

  // Sweet preparation trays & brass thalis on counter
  const trayGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12);
  const t1 = new THREE.Mesh(trayGeo, matBrass);
  t1.position.set(-1.0, 0.93, 0.1);
  t1.castShadow = true;
  stallGroup.add(t1);

  const t2 = new THREE.Mesh(trayGeo, matBrass);
  t2.position.set(0.2, 0.93, -0.1);
  t2.castShadow = true;
  stallGroup.add(t2);

  const t3 = new THREE.Mesh(trayGeo, matBrass);
  t3.position.set(1.2, 0.93, 0.2);
  t3.castShadow = true;
  stallGroup.add(t3);

  // Miniature sweet mounds in trays
  const sweetMound1 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 8), matSandstone);
  sweetMound1.position.set(-1.0, 1.05, 0.1);
  stallGroup.add(sweetMound1);

  const sweetMound2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 8), matMarigoldOrange);
  sweetMound2.position.set(0.2, 1.05, -0.1);
  stallGroup.add(sweetMound2);

  // Warm stall lantern
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matFlame);
  lantern.position.set(0, 2.2, 0.8);
  stallGroup.add(lantern);

  group.add(stallGroup);

  // ---------------------------------------------------------------------------
  // 6. PLANTED ISLAND A (CENTER-LEFT, -3.0, 0)
  // Rounded planted island (~3.8 x 4.8)
  // ---------------------------------------------------------------------------
  const islandAGroup = new THREE.Group();
  islandAGroup.position.set(-3.0, 0, 0);

  // Sandstone retaining curb
  const curbGeoA = new THREE.CylinderGeometry(2.0, 2.2, 0.3, 24);
  curbGeoA.scale(1.0, 1.0, 1.25); // elongated rounded form
  const curbA = new THREE.Mesh(curbGeoA, matSandstone);
  curbA.position.y = 0.15;
  curbA.castShadow = true;
  curbA.receiveShadow = true;
  islandAGroup.add(curbA);

  // Lush green foliage mound
  const soilGeoA = new THREE.SphereGeometry(1.9, 16, 12);
  soilGeoA.scale(1.0, 0.45, 1.22);
  const soilA = new THREE.Mesh(soilGeoA, matFoliage);
  soilA.position.y = 0.25;
  soilA.castShadow = true;
  soilA.receiveShadow = true;
  islandAGroup.add(soilA);

  // Sculpted shrub clusters
  const shrubPositionsA = [
    [-0.6, 0.55, -0.8], [0.5, 0.6, -0.5],
    [-0.3, 0.65, 0.4], [0.6, 0.55, 0.8],
    [0.0, 0.75, 0.0]
  ];
  shrubPositionsA.forEach(([sx, sy, sz], idx) => {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 8),
      idx % 2 === 0 ? matFoliage : matFoliageLight
    );
    shrub.position.set(sx, sy, sz);
    shrub.castShadow = true;
    islandAGroup.add(shrub);
  });

  // Marigold flower blossoms scattered across island A
  for (let f = 0; f < 14; f++) {
    const angle = (f / 14) * Math.PI * 2;
    const rad = 0.9 + Math.sin(f * 2.5) * 0.4;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      f % 2 === 0 ? matMarigoldOrange : matMarigoldYellow
    );
    flower.position.set(
      Math.cos(angle) * rad,
      0.55 + Math.cos(f * 3.1) * 0.15,
      Math.sin(angle) * rad * 1.2
    );
    islandAGroup.add(flower);
  }

  // Potted Tulsi Vrindavan in center of Island A
  const pot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.6), matVermilion);
  pot.position.set(0, 0.8, 0);
  pot.castShadow = true;
  islandAGroup.add(pot);

  const tulsiFoliage = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), matFoliageLight);
  tulsiFoliage.position.set(0, 1.3, 0);
  tulsiFoliage.castShadow = true;
  islandAGroup.add(tulsiFoliage);

  group.add(islandAGroup);

  // ---------------------------------------------------------------------------
  // 7. PLANTED ISLAND B (CENTER-RIGHT, +4.0, +2.0)
  // Curved planted island (~3.2 x 3.8)
  // ---------------------------------------------------------------------------
  const islandBGroup = new THREE.Group();
  islandBGroup.position.set(4.0, 0, 2.0);

  // Sandstone retaining curb
  const curbGeoB = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 20);
  curbGeoB.scale(0.95, 1.0, 1.15);
  const curbB = new THREE.Mesh(curbGeoB, matSandstone);
  curbB.position.y = 0.15;
  curbB.castShadow = true;
  curbB.receiveShadow = true;
  islandBGroup.add(curbB);

  // Foliage mound
  const soilGeoB = new THREE.SphereGeometry(1.5, 14, 10);
  soilGeoB.scale(0.95, 0.4, 1.12);
  const soilB = new THREE.Mesh(soilGeoB, matFoliageLight);
  soilB.position.y = 0.22;
  soilB.castShadow = true;
  soilB.receiveShadow = true;
  islandBGroup.add(soilB);

  // Shrub mounds
  const shrubPositionsB = [
    [-0.4, 0.5, -0.4], [0.4, 0.55, -0.2],
    [-0.1, 0.6, 0.4], [0.3, 0.5, 0.5]
  ];
  shrubPositionsB.forEach(([sx, sy, sz]) => {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), matFoliage);
    shrub.position.set(sx, sy, sz);
    shrub.castShadow = true;
    islandBGroup.add(shrub);
  });

  // Marigolds on Island B
  for (let f = 0; f < 10; f++) {
    const angle = (f / 10) * Math.PI * 2;
    const rad = 0.75 + Math.sin(f * 1.8) * 0.3;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      f % 2 === 0 ? matMarigoldOrange : matMarigoldYellow
    );
    flower.position.set(
      Math.cos(angle) * rad,
      0.5 + Math.cos(f * 2.3) * 0.1,
      Math.sin(angle) * rad * 1.1
    );
    islandBGroup.add(flower);
  }

  group.add(islandBGroup);

  // ---------------------------------------------------------------------------
  // 8. FRONT ARRIVAL RANGOLI (0, +5.5)
  // Restrained ornamental floor pattern in the arrival courtyard
  // ---------------------------------------------------------------------------
  const rangoliCenter = new THREE.Group();
  rangoliCenter.position.set(0, 0.02, 5.5);

  const mainRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.35, 32),
    new THREE.MeshBasicMaterial({ color: colors.vermilion, side: THREE.DoubleSide })
  );
  mainRing.rotation.x = -Math.PI / 2;
  rangoliCenter.add(mainRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.55, 32),
    new THREE.MeshBasicMaterial({ color: colors.sandstone, side: THREE.DoubleSide })
  );
  innerRing.rotation.x = -Math.PI / 2;
  rangoliCenter.add(innerRing);

  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 6),
      new THREE.MeshBasicMaterial({ color: colors.marigoldYellow, side: THREE.DoubleSide })
    );
    petal.rotation.x = -Math.PI / 2;
    petal.position.set(Math.cos(angle) * 0.85, 0.002, Math.sin(angle) * 0.85);
    rangoliCenter.add(petal);
  }
  group.add(rangoliCenter);

  scene.add(group);

  return {
    group,
    deliveryZoneMesh: pulseRing,
    update: (time: number) => {
      // Gentle breathing pulse on the delivery ring
      const scale = 1.0 + Math.sin(time * 3.5) * 0.06;
      pulseRing.scale.set(scale, scale, 1);
      matPulseRing.opacity = 0.5 + Math.sin(time * 3.5) * 0.25;
    },
  };
}
