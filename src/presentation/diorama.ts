import * as THREE from 'three';
import { DELIVERY_ZONE, OBSTACLES } from '../world';

export interface DioramaInstance {
  group: THREE.Group;
  update: (time: number) => void;
  triggerDeliveryEffect: (count: number) => void;
}

export function createDiorama(scene: THREE.Scene): DioramaInstance {
  const group = new THREE.Group();

  // Curated festive color palette
  const colors = {
    terracotta: 0xaa5a3a,        // Rich warm terracotta paving
    terracottaPath: 0xba6c4a,    // Slightly brighter pathway stone
    wetStone: 0x8a452a,          // Low-traction wet stone area
    sandstone: 0xe8cdab,         // Cream sandstone borders and pillars
    sandstoneDark: 0xc4a680,     // Shadowed sandstone moulding
    indigo: 0x2b3060,            // Royal festival indigo fabric
    indigoLight: 0x3d4484,
    vermilion: 0xb54338,         // Sacred vermilion
    marigoldYellow: 0xf5be3d,    // Golden yellow marigold
    marigoldOrange: 0xeb8b26,    // Vibrant saffron orange marigold
    foliageDeep: 0x264d36,       // Dense green foliage
    foliagePalm: 0x3d704d,       // Banana / palm frond green
    stemGreen: 0x477d3b,
    brassGold: 0xd9b343,         // Warm ceremonial brass
    flame: 0xffaa2b,             // Diya lamp flame
    timber: 0x543926,            // Warm wood timber
  };

  // Reusable Materials
  const matTerracotta = new THREE.MeshStandardMaterial({
    color: colors.terracotta,
    roughness: 0.82,
    metalness: 0.05,
  });

  const matTerracottaPath = new THREE.MeshStandardMaterial({
    color: colors.terracottaPath,
    roughness: 0.78,
  });

  const matWetStone = new THREE.MeshStandardMaterial({
    color: colors.wetStone,
    roughness: 0.22, // Slick, low-traction wet stone sheen
    metalness: 0.15,
  });

  const matSandstone = new THREE.MeshStandardMaterial({
    color: colors.sandstone,
    roughness: 0.75,
    metalness: 0.08,
  });

  const matSandstoneDark = new THREE.MeshStandardMaterial({
    color: colors.sandstoneDark,
    roughness: 0.8,
  });

  const matIndigo = new THREE.MeshStandardMaterial({
    color: colors.indigo,
    roughness: 0.65,
  });

  const matVermilion = new THREE.MeshStandardMaterial({
    color: colors.vermilion,
    roughness: 0.7,
  });

  const matMarigoldYellow = new THREE.MeshStandardMaterial({
    color: colors.marigoldYellow,
    roughness: 0.55,
  });

  const matMarigoldOrange = new THREE.MeshStandardMaterial({
    color: colors.marigoldOrange,
    roughness: 0.55,
  });

  const matPalmLeaf = new THREE.MeshStandardMaterial({
    color: colors.foliagePalm,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });

  const matFoliageDeep = new THREE.MeshStandardMaterial({
    color: colors.foliageDeep,
    roughness: 0.85,
  });

  const matStem = new THREE.MeshStandardMaterial({
    color: colors.stemGreen,
    roughness: 0.7,
  });

  const matBrass = new THREE.MeshStandardMaterial({
    color: colors.brassGold,
    roughness: 0.3,
    metalness: 0.85,
  });

  const matFlame = new THREE.MeshBasicMaterial({
    color: colors.flame,
  });

  const matTimber = new THREE.MeshStandardMaterial({
    color: colors.timber,
    roughness: 0.8,
  });

  // ---------------------------------------------------------------------------
  // 1. GROUND PLATFORM & REFINED PAVING (NO THICK BEIGE GROUT)
  // ---------------------------------------------------------------------------
  // Soft ambient contact shadow under courtyard plinth
  const groundShadowGeo = new THREE.PlaneGeometry(26, 22);
  const groundShadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070d,
    transparent: true,
    opacity: 0.6,
  });
  const groundShadow = new THREE.Mesh(groundShadowGeo, groundShadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.set(0, -0.22, 0);
  group.add(groundShadow);

  // Shallow beveled sandstone foundation plinth (24.6 x 0.3 x 20.6)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.3, 20.6), matSandstoneDark);
  plinth.position.set(0, -0.15, 0);
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main fine terracotta ground slab (seamless, continuous)
  const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.1, 20.0), matTerracotta);
  mainFloor.position.set(0, -0.05, 0);
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Sandstone border curbing
  const curbHeight = 0.22;
  const northCurb = new THREE.Mesh(new THREE.BoxGeometry(24, curbHeight, 0.4), matSandstone);
  northCurb.position.set(0, 0.05, -9.8);
  northCurb.receiveShadow = true;
  group.add(northCurb);

  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(24, curbHeight, 0.4), matSandstone);
  southCurb.position.set(0, 0.05, 9.8);
  southCurb.receiveShadow = true;
  group.add(southCurb);

  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.4, curbHeight, 20), matSandstone);
  westCurb.position.set(-11.8, 0.05, 0);
  westCurb.receiveShadow = true;
  group.add(westCurb);

  const eastCurb = new THREE.Mesh(new THREE.BoxGeometry(0.4, curbHeight, 20), matSandstone);
  eastCurb.position.set(11.8, 0.05, 0);
  eastCurb.receiveShadow = true;
  group.add(eastCurb);

  // Elegant sandstone paved pathways: running bands that guide navigation
  // North-South Central Walkway (X: -0.6 to +0.6)
  const nsPath = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 18.0), matTerracottaPath);
  nsPath.rotation.x = -Math.PI / 2;
  nsPath.position.set(0.6, 0.005, 0);
  nsPath.receiveShadow = true;
  group.add(nsPath);

  // East-West Walkway to Pandal (Z: -4.8 to -3.8)
  const ewPath = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 1.4), matTerracottaPath);
  ewPath.rotation.x = -Math.PI / 2;
  ewPath.position.set(2.0, 0.006, -4.3);
  ewPath.receiveShadow = true;
  group.add(ewPath);

  // Low-traction wet stone area with water sheen (near preparation stall at X: -7, Z: -3.5)
  const wetArea = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8), matWetStone);
  wetArea.rotation.x = -Math.PI / 2;
  wetArea.position.set(-7.0, 0.008, -3.5);
  wetArea.receiveShadow = true;
  group.add(wetArea);

  // ---------------------------------------------------------------------------
  // 2. PERIMETER PILLAR LAMPS (BRASS SAMAI DIYAS)
  // ---------------------------------------------------------------------------
  const lampPositions = [
    [-11.2, -9.2], [0, -9.5], [-11.2, 9.2], [11.2, 9.2],
    [-11.2, 0], [11.2, 0], [0, 9.5]
  ];

  lampPositions.forEach(([lx, lz]) => {
    const lamp = new THREE.Group();
    lamp.position.set(lx, 0, lz);

    // Carved square stone base
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), matSandstone);
    pBase.position.y = 0.175;
    pBase.castShadow = true;
    lamp.add(pBase);

    // Turned brass stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.85, 12), matBrass);
    stem.position.y = 0.75;
    stem.castShadow = true;
    lamp.add(stem);

    // Multi-tier brass diya plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.16, 0.12, 12), matBrass);
    plate.position.y = 1.2;
    plate.castShadow = true;
    lamp.add(plate);

    // Teardrop oil flame
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), matFlame);
    flame.position.y = 1.34;
    lamp.add(flame);

    group.add(lamp);
  });

  // ---------------------------------------------------------------------------
  // 3. FESTIVAL PANDAL SHRINE (UPPER-RIGHT: +7.0, -8.0)
  // ---------------------------------------------------------------------------
  const pandal = new THREE.Group();
  pandal.position.set(7.0, 0, -8.0);

  // Stepped sandstone sanctuary base
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 3.0), matSandstoneDark);
  step1.position.y = 0.125;
  step1.castShadow = true;
  step1.receiveShadow = true;
  pandal.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 2.6), matSandstone);
  step2.position.y = 0.375;
  step2.castShadow = true;
  step2.receiveShadow = true;
  pandal.add(step2);

  // Sanctuary back wall with decorative gold arch panel
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.22), matSandstoneDark);
  backWall.position.set(0, 1.7, -1.15);
  backWall.castShadow = true;
  pandal.add(backWall);

  const goldArch = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 24), matBrass);
  goldArch.rotation.x = Math.PI / 2;
  goldArch.position.set(0, 2.0, -1.02);
  pandal.add(goldArch);

  // Golden ceremonial Kalash (sanctified vessel)
  const kalashBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 16), matSandstone);
  kalashBase.position.set(0, 0.72, -0.35);
  kalashBase.castShadow = true;
  pandal.add(kalashBase);

  const kalashVessel = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), matBrass);
  kalashVessel.position.set(0, 1.15, -0.35);
  kalashVessel.castShadow = true;
  pandal.add(kalashVessel);

  const kalashSpire = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 12), matVermilion);
  kalashSpire.position.set(0, 1.6, -0.35);
  pandal.add(kalashSpire);

  // 4 Fluted pillars with bases and capitals
  const pillarPositions = [
    [-1.9, -1.05], [1.9, -1.05],
    [-1.9, 1.05], [1.9, 1.05]
  ];

  pillarPositions.forEach(([px, pz]) => {
    // Square base
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.44), matSandstoneDark);
    pBase.position.set(px, 0.6, pz);
    pandal.add(pBase);

    // Fluted cylindrical column
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.3, 12), matSandstone);
    column.position.set(px, 1.85, pz);
    column.castShadow = true;
    pandal.add(column);

    // Lotus capital & bracket
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), matBrass);
    cap.position.set(px, 3.05, pz);
    pandal.add(cap);
  });

  // Tiered Arched Fabric Canopy (Indigo with gold zari borders)
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.35, 4), matIndigo);
  canopy.position.set(0, 3.8, 0);
  canopy.rotation.y = Math.PI / 4;
  canopy.castShadow = true;
  pandal.add(canopy);

  // Scalloped gold fringe valance
  const valance = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.2, 2.7), matBrass);
  valance.position.set(0, 3.12, 0);
  pandal.add(valance);

  // Golden Pinnacle Spire (Kalash on roof peak)
  const roofSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, 0.8, 12), matBrass);
  roofSpire.position.set(0, 4.8, 0);
  pandal.add(roofSpire);

  // Marigold toran garland strings draped across front beam
  for (let g = -1.8; g <= 1.8; g += 0.25) {
    const droop = Math.sin(((g + 1.8) / 3.6) * Math.PI) * 0.22;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      Math.abs(Math.round(g * 4)) % 2 === 0 ? matMarigoldOrange : matMarigoldYellow
    );
    flower.position.set(g, 3.0 - droop, 1.15);
    pandal.add(flower);
  }

  // Low brass offering / collection table in front
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.8), matBrass);
  table.position.set(0, 0.6, 1.05);
  table.castShadow = true;
  pandal.add(table);

  // Modak offering thalis on table
  const thali1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.06, 12), matBrass);
  thali1.position.set(-0.7, 0.72, 1.05);
  pandal.add(thali1);

  const thali2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.06, 12), matBrass);
  thali2.position.set(0.7, 0.72, 1.05);
  pandal.add(thali2);

  // Dedicated warm glowing light inside shrine
  const shrineLight = new THREE.PointLight(0xffaa33, 1.4, 8);
  shrineLight.position.set(0, 2.2, 0);
  pandal.add(shrineLight);

  group.add(pandal);

  // ---------------------------------------------------------------------------
  // 4. DELIVERY ZONE PAD (+7, -5) WITH RANGOLI & BEACON
  // ---------------------------------------------------------------------------
  const deliveryPad = new THREE.Mesh(
    new THREE.PlaneGeometry(DELIVERY_ZONE.width, DELIVERY_ZONE.depth),
    matSandstone
  );
  deliveryPad.rotation.x = -Math.PI / 2;
  deliveryPad.position.set(DELIVERY_ZONE.x, 0.012, DELIVERY_ZONE.z);
  deliveryPad.receiveShadow = true;
  group.add(deliveryPad);

  // Circular vermilion rangoli border
  const rangoliRing = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.15, 36),
    new THREE.MeshBasicMaterial({ color: colors.vermilion, side: THREE.DoubleSide })
  );
  rangoliRing.rotation.x = -Math.PI / 2;
  rangoliRing.position.set(DELIVERY_ZONE.x, 0.016, DELIVERY_ZONE.z);
  group.add(rangoliRing);

  // 8 Flower petals inside rangoli
  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 8),
      new THREE.MeshBasicMaterial({ color: colors.marigoldYellow, side: THREE.DoubleSide })
    );
    petal.rotation.x = -Math.PI / 2;
    petal.position.set(
      DELIVERY_ZONE.x + Math.cos(angle) * 0.58,
      0.018,
      DELIVERY_ZONE.z + Math.sin(angle) * 0.58
    );
    group.add(petal);
  }

  // Pulsing delivery beacon ring
  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: colors.marigoldYellow,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.32, 36), beaconRingMat);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.set(DELIVERY_ZONE.x, 0.02, DELIVERY_ZONE.z);
  group.add(beaconRing);

  // ---------------------------------------------------------------------------
  // 5. PREPARATION STALL (UPPER-LEFT: -7.0, -6.8)
  // ---------------------------------------------------------------------------
  const stall = new THREE.Group();
  stall.position.set(-7.0, 0, -6.8);

  // Wood frame counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.85, 1.8), matTimber);
  counter.position.y = 0.425;
  counter.castShadow = true;
  stall.add(counter);

  // Countertop cloth runner
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.04, 1.6), matIndigo);
  cloth.position.y = 0.87;
  stall.add(cloth);

  // 4 Corner wooden posts
  const postPositions = [
    [-1.9, -0.8], [1.9, -0.8],
    [-1.9, 0.8], [1.9, 0.8]
  ];
  postPositions.forEach(([sx, sz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8), matTimber);
    post.position.set(sx, 1.25, sz);
    post.castShadow = true;
    stall.add(post);
  });

  // Scalloped fabric canopy with forward slant
  const stallAwning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 2.4), matIndigo);
  stallAwning.position.set(0, 2.55, 0);
  stallAwning.rotation.x = 0.12;
  stallAwning.castShadow = true;
  stall.add(stallAwning);

  // Awning vermilion trim
  const awningTrim = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.22, 0.06), matVermilion);
  awningTrim.position.set(0, 2.42, 1.15);
  stall.add(awningTrim);

  // Sweet preparation props on counter
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), matBrass);
  t1.position.set(-1.0, 0.92, 0.1);
  stall.add(t1);

  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), matBrass);
  t2.position.set(0.2, 0.92, -0.1);
  stall.add(t2);

  const sweetMound = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 12), matSandstone);
  sweetMound.position.set(-1.0, 1.04, 0.1);
  stall.add(sweetMound);

  const sweetMound2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 12), matMarigoldOrange);
  sweetMound2.position.set(0.2, 1.04, -0.1);
  stall.add(sweetMound2);

  // Warm hanging lantern
  const stallLantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matFlame);
  stallLantern.position.set(0, 2.2, 0.7);
  stall.add(stallLantern);

  group.add(stall);

  // ---------------------------------------------------------------------------
  // 6. SCULPTED REALISTIC VEGETATION ON ISLANDS (NO BROCCOLI LUMPS!)
  // ---------------------------------------------------------------------------

  // Helper to construct natural arched palm / banana leaves
  function createPalmFrond(length: number, width: number, archAngle: number): THREE.Group {
    const frond = new THREE.Group();
    const segs = 6;
    let prevY = 0;
    let prevZ = 0;

    for (let s = 0; s < segs; s++) {
      const frac = s / segs;
      const segLen = length / segs;
      const segWidth = Math.sin(frac * Math.PI) * width;
      const leafSeg = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, segLen), matPalmLeaf);
      leafSeg.position.set(0, prevY + segLen * 0.5 * Math.cos(frac * archAngle), prevZ + segLen * 0.5 * Math.sin(frac * archAngle));
      leafSeg.rotation.x = frac * archAngle;
      frond.add(leafSeg);

      prevY += segLen * Math.cos(frac * archAngle);
      prevZ += segLen * Math.sin(frac * archAngle);
    }
    return frond;
  }

  // Helper to create detailed marigold plant with stems & flowers
  function createMarigoldBush(flowerCount: number): THREE.Group {
    const bush = new THREE.Group();

    for (let f = 0; f < flowerCount; f++) {
      const angle = (f / flowerCount) * Math.PI * 2 + Math.sin(f) * 0.3;
      const dist = 0.3 + (f % 3) * 0.25;
      const height = 0.45 + (f % 2) * 0.2;

      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, height, 6), matStem);
      stem.position.set(Math.cos(angle) * dist, height / 2, Math.sin(angle) * dist);
      bush.add(stem);

      // Distinct marigold flower bloom
      const bloomGeo = new THREE.SphereGeometry(0.12, 10, 10);
      bloomGeo.scale(1.1, 0.8, 1.1);
      const bloom = new THREE.Mesh(bloomGeo, f % 2 === 0 ? matMarigoldOrange : matMarigoldYellow);
      bloom.position.set(Math.cos(angle) * dist, height + 0.05, Math.sin(angle) * dist);
      bloom.castShadow = true;
      bush.add(bloom);
    }
    return bush;
  }

  // Island A (West: -3.0, 0)
  const islandA = new THREE.Group();
  islandA.position.set(-3.0, 0, 0);

  // Sculpted sandstone retaining curb
  const curbA = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.3, 28), matSandstone);
  curbA.scale.set(1.0, 1.0, 1.25);
  curbA.position.y = 0.15;
  curbA.castShadow = true;
  curbA.receiveShadow = true;
  islandA.add(curbA);

  // Dark moist soil mound
  const soilA = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 12), matFoliageDeep);
  soilA.scale.set(1.0, 0.35, 1.25);
  soilA.position.y = 0.2;
  soilA.receiveShadow = true;
  islandA.add(soilA);

  // Arched banana palm fronds
  for (let p = 0; p < 6; p++) {
    const pAngle = (p / 6) * Math.PI * 2;
    const frond = createPalmFrond(1.2, 0.35, 0.9);
    frond.rotation.y = pAngle;
    frond.position.set(Math.cos(pAngle) * 0.4, 0.3, Math.sin(pAngle) * 0.5);
    islandA.add(frond);
  }

  // Marigold plants with stems
  const bushA = createMarigoldBush(12);
  bushA.position.set(0, 0.25, 0);
  islandA.add(bushA);

  // Sacred Potted Tulsi Vrindavan in center
  const tulsiPot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), matVermilion);
  tulsiPot.position.set(0, 0.6, 0);
  tulsiPot.castShadow = true;
  islandA.add(tulsiPot);

  const tulsiPlant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), matStem);
  tulsiPlant.position.set(0, 1.05, 0);
  islandA.add(tulsiPlant);

  group.add(islandA);

  // Island B (East: +4.0, +2.0)
  const islandB = new THREE.Group();
  islandB.position.set(4.0, 0, 2.0);

  const curbB = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 24), matSandstone);
  curbB.scale.set(0.95, 1.0, 1.15);
  curbB.position.y = 0.15;
  curbB.castShadow = true;
  curbB.receiveShadow = true;
  islandB.add(curbB);

  const soilB = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), matFoliageDeep);
  soilB.scale.set(0.95, 0.35, 1.15);
  soilB.position.y = 0.2;
  soilB.receiveShadow = true;
  islandB.add(soilB);

  // Arched fronds on Island B
  for (let p = 0; p < 5; p++) {
    const pAngle = (p / 5) * Math.PI * 2;
    const frond = createPalmFrond(1.0, 0.3, 0.85);
    frond.rotation.y = pAngle;
    frond.position.set(Math.cos(pAngle) * 0.3, 0.3, Math.sin(pAngle) * 0.35);
    islandB.add(frond);
  }

  const bushB = createMarigoldBush(9);
  bushB.position.set(0, 0.25, 0);
  islandB.add(bushB);

  group.add(islandB);

  // ---------------------------------------------------------------------------
  // 7. ARRIVAL COURTYARD RANGOLI (0, +5.5)
  // ---------------------------------------------------------------------------
  const rangoliArrival = new THREE.Group();
  rangoliArrival.position.set(0, 0.015, 5.5);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.35, 36),
    new THREE.MeshBasicMaterial({ color: colors.vermilion, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  rangoliArrival.add(outerRing);

  const innerGold = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.55, 36),
    new THREE.MeshBasicMaterial({ color: colors.sandstone, side: THREE.DoubleSide })
  );
  innerGold.rotation.x = -Math.PI / 2;
  rangoliArrival.add(innerGold);

  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 8),
      new THREE.MeshBasicMaterial({ color: colors.marigoldYellow, side: THREE.DoubleSide })
    );
    petal.rotation.x = -Math.PI / 2;
    petal.position.set(Math.cos(angle) * 0.85, 0.002, Math.sin(angle) * 0.85);
    rangoliArrival.add(petal);
  }
  group.add(rangoliArrival);

  scene.add(group);

  return {
    group,
    update: (time: number) => {
      // Beacon ring gentle pulse
      const pulse = 1.0 + Math.sin(time * 3.5) * 0.06;
      beaconRing.scale.set(pulse, pulse, 1);
      beaconRingMat.opacity = 0.5 + Math.sin(time * 3.5) * 0.3;
    },
    triggerDeliveryEffect: (count: number) => {
      // Warm burst on delivery
      shrineLight.intensity = 2.6;
      setTimeout(() => {
        shrineLight.intensity = 1.4;
      }, 400);
    },
  };
}
