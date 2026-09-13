import * as THREE from 'three';
import { DELIVERY_ZONE } from '../world';
import {
  createSandstoneTexture,
  createTerracottaTexture,
  createRangoliTexture,
} from './textures';

export interface DioramaInstance {
  group: THREE.Group;
  update: (time: number) => void;
  triggerDeliveryEffect: (count: number) => void;
}

export function createDiorama(scene: THREE.Scene): DioramaInstance {
  const group = new THREE.Group();

  // Curated color palette matching the approved visual specification
  const colors = {
    sandstoneWarm: 0xe5cba6,
    sandstoneBorder: 0xd4b58e,
    sandstoneDark: 0xb59368,
    terracottaInlay: 0xaa482f,
    wetStone: 0x1c1715,
    indigoFabric: 0x222a55,
    goldZari: 0xebb434,
    brassMetal: 0xdca631,
    vermilion: 0xb53628,
    marigoldYellow: 0xf5be3d,
    marigoldOrange: 0xeb7022,
    foliageBanana: 0x3d7446,
    foliageStem: 0x285430,
    flowerOrange: 0xfa6823,
    flowerWhite: 0xfffcf2,
    timberWood: 0x483220,
    lanternAmber: 0xffa434,
  };

  // Reusable High-Quality Materials
  const texSandstone = createSandstoneTexture();
  const texTerracotta = createTerracottaTexture();
  const texRangoli = createRangoliTexture();

  const matSandstone = new THREE.MeshStandardMaterial({
    map: texSandstone,
    roughness: 0.78,
    metalness: 0.03,
  });

  const matSandstoneBorder = new THREE.MeshStandardMaterial({
    color: colors.sandstoneBorder,
    roughness: 0.72,
    metalness: 0.05,
  });

  const matSandstoneDark = new THREE.MeshStandardMaterial({
    color: colors.sandstoneDark,
    roughness: 0.8,
    metalness: 0.05,
  });

  const matTerracottaInlay = new THREE.MeshStandardMaterial({
    map: texTerracotta,
    roughness: 0.75,
  });

  const matWetPuddle = new THREE.MeshStandardMaterial({
    color: colors.wetStone,
    roughness: 0.05,
    metalness: 0.65,
  });

  const matIndigo = new THREE.MeshStandardMaterial({
    color: colors.indigoFabric,
    roughness: 0.58,
  });

  const matGold = new THREE.MeshStandardMaterial({
    color: colors.goldZari,
    roughness: 0.28,
    metalness: 0.9,
  });

  const matBrass = new THREE.MeshStandardMaterial({
    color: colors.brassMetal,
    roughness: 0.32,
    metalness: 0.85,
  });

  const matVermilion = new THREE.MeshStandardMaterial({
    color: colors.vermilion,
    roughness: 0.65,
  });

  const matMarigoldYellow = new THREE.MeshStandardMaterial({
    color: colors.marigoldYellow,
    roughness: 0.6,
  });

  const matMarigoldOrange = new THREE.MeshStandardMaterial({
    color: colors.marigoldOrange,
    roughness: 0.6,
  });

  const matBananaLeaf = new THREE.MeshStandardMaterial({
    color: colors.foliageBanana,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });

  const matFoliageDeep = new THREE.MeshStandardMaterial({
    color: colors.foliageStem,
    roughness: 0.75,
  });

  const matFlowerOrange = new THREE.MeshStandardMaterial({
    color: colors.flowerOrange,
    roughness: 0.5,
  });

  const matFlowerWhite = new THREE.MeshStandardMaterial({
    color: colors.flowerWhite,
    roughness: 0.5,
  });

  const matTimber = new THREE.MeshStandardMaterial({
    color: colors.timberWood,
    roughness: 0.75,
  });

  const matLanternGlow = new THREE.MeshBasicMaterial({
    color: colors.lanternAmber,
  });

  // ---------------------------------------------------------------------------
  // 1. COURTYARD GROUND & INLAID CURVED TERRACOTTA BANDS
  // ---------------------------------------------------------------------------
  // Generous sandstone courtyard pavement (34 x 26) covering entire viewport
  const floorGeo = new THREE.BoxGeometry(34.0, 0.2, 26.0);
  const mainFloor = new THREE.Mesh(floorGeo, matSandstone);
  mainFloor.position.set(0, -0.1, 0);
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Curved concentric terracotta inlay bands in the stone floor matching reference
  // Band 1: Large sweeping circular ribbon around the delivery area (radius ~4.2)
  const arcInlay1 = new THREE.Mesh(
    new THREE.RingGeometry(3.6, 4.25, 48, 1, Math.PI * 0.42, Math.PI * 0.98),
    matTerracottaInlay
  );
  arcInlay1.rotation.x = -Math.PI / 2;
  arcInlay1.position.set(DELIVERY_ZONE.x, 0.006, DELIVERY_ZONE.z);
  arcInlay1.receiveShadow = true;
  group.add(arcInlay1);

  // Band 2: Concentric ring around the circular delivery rangoli (radius ~2.1)
  const arcInlay2 = new THREE.Mesh(
    new THREE.RingGeometry(1.95, 2.35, 48),
    matTerracottaInlay
  );
  arcInlay2.rotation.x = -Math.PI / 2;
  arcInlay2.position.set(DELIVERY_ZONE.x, 0.007, DELIVERY_ZONE.z);
  arcInlay2.receiveShadow = true;
  group.add(arcInlay2);

  // Band 3: Curved sweeping ribbon leading from arrival path toward center plaza
  const curvePts: THREE.Vector3[] = [];
  for (let t = 0; t <= 24; t++) {
    const frac = t / 24;
    const px = THREE.MathUtils.lerp(-1.2, 4.8, frac) + Math.sin(frac * Math.PI) * 1.6;
    const pz = THREE.MathUtils.lerp(7.2, -1.2, frac);
    curvePts.push(new THREE.Vector3(px, 0.008, pz));
  }
  const curvePath = new THREE.CatmullRomCurve3(curvePts);
  const ribbonGeo = new THREE.TubeGeometry(curvePath, 24, 0.22, 4, false);
  ribbonGeo.scale(1.0, 0.04, 1.0);
  const ribbonMesh = new THREE.Mesh(ribbonGeo, matTerracottaInlay);
  ribbonMesh.receiveShadow = true;
  group.add(ribbonMesh);

  // ---------------------------------------------------------------------------
  // 2. REFLECTIVE WET-STONE PUDDLE (BOTTOM-LEFT: X: -5.2, Z: 2.2)
  // ---------------------------------------------------------------------------
  const puddleShape = new THREE.Shape();
  puddleShape.absellipse(-5.0, 2.2, 2.9, 2.1, 0, Math.PI * 2, false, 0);
  const puddleGeo = new THREE.ShapeGeometry(puddleShape, 36);
  const puddle = new THREE.Mesh(puddleGeo, matWetPuddle);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.012;
  puddle.receiveShadow = true;
  group.add(puddle);

  // Warm light right over the puddle creating gleaming golden reflections
  const puddleGlow = new THREE.PointLight(0xffa838, 2.2, 7.0, 1.6);
  puddleGlow.position.set(-5.0, 1.4, 2.0);
  group.add(puddleGlow);

  // ---------------------------------------------------------------------------
  // 3. REAR RIVERSIDE BALUSTRADE & PERIMETER WALLS
  // ---------------------------------------------------------------------------
  const balustradeGroup = new THREE.Group();
  balustradeGroup.position.set(0, 0, -9.8);

  const railBase = new THREE.Mesh(new THREE.BoxGeometry(32.0, 0.35, 0.45), matSandstoneBorder);
  railBase.position.y = 0.175;
  railBase.castShadow = true;
  railBase.receiveShadow = true;
  balustradeGroup.add(railBase);

  for (let bx = -15.0; bx <= 15.0; bx += 0.85) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), matSandstone);
    post.position.set(bx, 0.55, 0);
    post.castShadow = true;
    balustradeGroup.add(post);
  }

  const railTop = new THREE.Mesh(new THREE.BoxGeometry(32.0, 0.16, 0.48), matSandstoneBorder);
  railTop.position.y = 0.9;
  railTop.castShadow = true;
  balustradeGroup.add(railTop);

  group.add(balustradeGroup);

  // Left & Right boundary courtyard walls
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 24.0), matSandstoneBorder);
  wallL.position.set(-13.0, 0.6, 0);
  wallL.castShadow = true;
  wallL.receiveShadow = true;
  group.add(wallL);

  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 24.0), matSandstoneBorder);
  wallR.position.set(13.0, 0.6, 0);
  wallR.castShadow = true;
  wallR.receiveShadow = true;
  group.add(wallR);

  // ---------------------------------------------------------------------------
  // 4. GANESH PANDAL SHRINE (REAR-RIGHT: +7.0, -8.0)
  // ---------------------------------------------------------------------------
  const pandal = new THREE.Group();
  pandal.position.set(7.0, 0, -8.0);

  // Tiered Sandstone Platform
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 3.2), matSandstoneDark);
  step1.position.y = 0.15;
  step1.castShadow = true;
  step1.receiveShadow = true;
  pandal.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 2.8), matSandstone);
  step2.position.y = 0.425;
  step2.castShadow = true;
  step2.receiveShadow = true;
  pandal.add(step2);

  // Sanctuary Back Wall & Devotional Arch
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.25), matSandstoneDark);
  backWall.position.set(0, 2.0, -1.25);
  backWall.castShadow = true;
  pandal.add(backWall);

  const goldAura = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 32), matGold);
  goldAura.rotation.x = Math.PI / 2;
  goldAura.position.set(0, 2.1, -1.1);
  pandal.add(goldAura);

  // Revered Golden Ganesha Idol
  const idolGroup = new THREE.Group();
  idolGroup.position.set(0, 1.0, -0.55);

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.4, 16), matSandstone);
  altar.position.y = 0.2;
  altar.castShadow = true;
  idolGroup.add(altar);

  const idolBelly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), matGold);
  idolBelly.position.set(0, 0.65, 0);
  idolBelly.castShadow = true;
  idolGroup.add(idolBelly);

  const idolHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), matGold);
  idolHead.position.set(0, 1.05, 0.12);
  idolHead.castShadow = true;
  idolGroup.add(idolHead);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.0, 0.32),
    new THREE.Vector3(-0.08, 0.82, 0.42),
    new THREE.Vector3(-0.16, 0.72, 0.35),
    new THREE.Vector3(-0.12, 0.78, 0.28),
  ]);
  const trunkMesh = new THREE.Mesh(
    new THREE.TubeGeometry(trunkCurve, 12, 0.075, 8, false),
    matGold
  );
  idolGroup.add(trunkMesh);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 12), matGold);
  crown.position.set(0, 1.45, 0.12);
  crown.castShadow = true;
  idolGroup.add(crown);

  const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), matGold);
  earL.rotation.z = Math.PI / 2;
  earL.position.set(-0.35, 1.08, 0.08);
  idolGroup.add(earL);

  const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), matGold);
  earR.rotation.z = Math.PI / 2;
  earR.position.set(0.35, 1.08, 0.08);
  idolGroup.add(earR);

  pandal.add(idolGroup);

  // Sanctum Glow Light
  const sanctumLight = new THREE.PointLight(0xffb844, 2.5, 8.0, 1.5);
  sanctumLight.position.set(0, 2.2, -0.4);
  pandal.add(sanctumLight);

  // Four Carved Pillars
  const pillarPositions: [number, number][] = [
    [-1.85, 1.15],
    [1.85, 1.15],
    [-1.85, -1.15],
    [1.85, -1.15],
  ];

  pillarPositions.forEach(([px, pz]) => {
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.48), matSandstoneBorder);
    pBase.position.set(px, 0.45, pz);
    pBase.castShadow = true;
    pandal.add(pBase);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.6, 12), matSandstone);
    shaft.position.set(px, 1.75, pz);
    shaft.castShadow = true;
    pandal.add(shaft);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.25, 0.46), matSandstoneBorder);
    capital.position.set(px, 3.1, pz);
    capital.castShadow = true;
    pandal.add(capital);

    // Marigold Garlands wrapped around pillars
    for (let gy = 0.8; gy < 3.0; gy += 0.38) {
      const gMat = gy % 0.76 > 0.38 ? matMarigoldOrange : matMarigoldYellow;
      const gTorus = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 8, 12), gMat);
      gTorus.rotation.x = Math.PI / 2;
      gTorus.position.set(px, gy, pz);
      pandal.add(gTorus);
    }
  });

  // Indigo Pandal Canopy
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.5, 4), matIndigo);
  canopy.position.set(0, 3.95, 0);
  canopy.rotation.y = Math.PI / 4;
  canopy.castShadow = true;
  pandal.add(canopy);

  // Gold Kalash Pinnacle Spire
  const kalashSpire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), matGold);
  kalashSpire.position.set(0, 4.95, 0);
  kalashSpire.castShadow = true;
  pandal.add(kalashSpire);

  // Front Scalloped Indigo Valance
  const frontValance = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.38, 0.08), matIndigo);
  frontValance.position.set(0, 3.2, 1.22);
  pandal.add(frontValance);

  // Gold Fringe Trim
  const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(4.14, 0.06, 0.1), matGold);
  goldTrim.position.set(0, 3.0, 1.22);
  pandal.add(goldTrim);

  // Tall Brass Samai Standing Oil Lamps
  function createSamaiLamp(lx: number, lz: number): THREE.Group {
    const lampG = new THREE.Group();
    lampG.position.set(lx, 0.55, lz);

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.08, 16), matBrass);
    lampG.add(b1);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.2, 10), matBrass);
    stem.position.y = 0.65;
    stem.castShadow = true;
    lampG.add(stem);

    const dish1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.08, 16), matBrass);
    dish1.position.y = 0.85;
    lampG.add(dish1);

    const dish2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.07, 16), matBrass);
    dish2.position.y = 1.25;
    lampG.add(dish2);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), matLanternGlow);
    flame.position.y = 1.35;
    lampG.add(flame);

    const flameLight = new THREE.PointLight(0xffa834, 1.4, 4.5, 1.8);
    flameLight.position.y = 1.4;
    lampG.add(flameLight);

    return lampG;
  }

  pandal.add(createSamaiLamp(-1.4, 0.95));
  pandal.add(createSamaiLamp(1.4, 0.95));

  // Low Wooden Offering Table
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.8), matTimber);
  tableTop.position.set(0, 0.45, 0.65);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  pandal.add(tableTop);

  for (let tx = -0.7; tx <= 0.7; tx += 0.7) {
    const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.04, 16), matBrass);
    thali.position.set(tx, 0.55, 0.65);
    pandal.add(thali);

    const modakMound = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xfcf5ea, roughness: 0.4 })
    );
    modakMound.position.set(tx, 0.66, 0.65);
    pandal.add(modakMound);
  }

  group.add(pandal);

  // ---------------------------------------------------------------------------
  // 5. ACCESSIBLE RANGOLI DELIVERY PAD (X: 7.0, Z: -5.0)
  // ---------------------------------------------------------------------------
  const rangoliPad = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), new THREE.MeshBasicMaterial({
    map: texRangoli,
    transparent: true,
    opacity: 0.96,
  }));
  rangoliPad.rotation.x = -Math.PI / 2;
  rangoliPad.position.set(DELIVERY_ZONE.x, 0.016, DELIVERY_ZONE.z);
  group.add(rangoliPad);

  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: colors.goldZari,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(1.46, 1.58, 36), pulseRingMat);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.set(DELIVERY_ZONE.x, 0.018, DELIVERY_ZONE.z);
  group.add(pulseRing);

  // ---------------------------------------------------------------------------
  // 6. SWEETS PREPARATION STALL (LEFT: X: -7.0, Z: -6.8)
  // ---------------------------------------------------------------------------
  const stall = new THREE.Group();
  stall.position.set(-7.0, 0, -6.8);

  const stallCounter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.85, 2.0), matTimber);
  stallCounter.position.y = 0.425;
  stallCounter.castShadow = true;
  stallCounter.receiveShadow = true;
  stall.add(stallCounter);

  const counterLip = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 2.2), matSandstoneBorder);
  counterLip.position.y = 0.88;
  counterLip.castShadow = true;
  stall.add(counterLip);

  const frontBanner = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.45, 0.05), matVermilion);
  frontBanner.position.set(0, 0.52, 1.03);
  stall.add(frontBanner);

  const sPostPositions = [
    [-1.9, 0.9],
    [1.9, 0.9],
    [-1.9, -0.9],
    [1.9, -0.9],
  ];
  sPostPositions.forEach(([spx, spz]) => {
    const sPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), matTimber);
    sPost.position.set(spx, 1.85, spz);
    sPost.castShadow = true;
    stall.add(sPost);
  });

  const awning = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 2.4), matIndigo);
  awning.position.set(0, 2.8, 0);
  awning.rotation.x = 0.12;
  awning.castShadow = true;
  stall.add(awning);

  const awningValance = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.28, 0.06), matVermilion);
  awningValance.position.set(0, 2.65, 1.2);
  stall.add(awningValance);

  // Signboard
  const signboardGroup = new THREE.Group();
  signboardGroup.position.set(0, 2.2, 1.08);

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.06), matTimber);
  signBoard.castShadow = true;
  signboardGroup.add(signBoard);

  const signBorder = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.71, 0.04), matGold);
  signboardGroup.add(signBorder);

  const signModak = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0xfcf6eb, roughness: 0.3 })
  );
  signModak.position.set(0, 0, 0.05);
  signboardGroup.add(signModak);
  stall.add(signboardGroup);

  // Brass thalis of sweets on counter
  const thali1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 16), matBrass);
  thali1.position.set(-1.1, 0.94, 0.2);
  stall.add(thali1);

  const modakPyramid = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.42, 8),
    new THREE.MeshStandardMaterial({ color: 0xfdf7eb, roughness: 0.38 })
  );
  modakPyramid.position.set(-1.1, 1.15, 0.2);
  stall.add(modakPyramid);

  const thali2 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.38, 0.05, 16), matBrass);
  thali2.position.set(1.1, 0.94, 0.2);
  stall.add(thali2);

  const laddooPyramid = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.45, 10),
    new THREE.MeshStandardMaterial({ color: 0xf7a428, roughness: 0.55 })
  );
  laddooPyramid.position.set(1.1, 1.16, 0.2);
  stall.add(laddooPyramid);

  // Hanging Stall Lanterns
  function createHangingLantern(lx: number, lz: number): THREE.Group {
    const lg = new THREE.Group();
    lg.position.set(lx, 2.2, lz);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 8), matBrass);
    lg.add(cap);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), matLanternGlow);
    glass.position.y = -0.12;
    lg.add(glass);

    const lLight = new THREE.PointLight(0xffaa38, 2.0, 6.5, 1.6);
    lLight.position.y = -0.12;
    lLight.castShadow = true;
    lg.add(lLight);

    return lg;
  }

  stall.add(createHangingLantern(-1.8, 1.15));
  stall.add(createHangingLantern(1.8, 1.15));

  group.add(stall);

  // ---------------------------------------------------------------------------
  // 7. SCULPTED CURVED PLANTER ISLAND & TROPICAL FOLIAGE (ISLAND A: X: -3.0, Z: 0)
  // ---------------------------------------------------------------------------
  const islandA = new THREE.Group();
  islandA.position.set(-3.0, 0, 0);

  const curbGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.42, 28);
  curbGeo.scale(1.1, 1.0, 1.35);
  const curb = new THREE.Mesh(curbGeo, matSandstoneBorder);
  curb.position.y = 0.21;
  curb.castShadow = true;
  curb.receiveShadow = true;
  islandA.add(curb);

  const soilGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 24);
  soilGeo.scale(1.1, 1.0, 1.35);
  const soil = new THREE.Mesh(soilGeo, matFoliageDeep);
  soil.position.y = 0.38;
  islandA.add(soil);

  // Broad sculpted banana palm fan leaves fanning out gracefully
  function createOpenBananaLeaf(scale: number, rotY: number, tiltOut: number, bendDown: number): THREE.Group {
    const leafG = new THREE.Group();
    leafG.rotation.y = rotY;

    // Curved parabolic leaf
    const leafGeo = new THREE.PlaneGeometry(1.05 * scale, 2.9 * scale, 6, 14);
    const pos = leafGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const rawFrac = (y + 1.45 * scale) / (2.9 * scale);
      const frac = Math.max(0, Math.min(1.0, isNaN(rawFrac) ? 0.5 : rawFrac));

      const widthFactor = Math.sin(Math.pow(frac, 0.72) * Math.PI);
      pos.setX(i, x * Math.max(0.08, widthFactor));

      const archZ = Math.sin(frac * Math.PI * 0.8) * (1.1 * scale) + Math.pow(frac, 2.0) * (0.8 * bendDown);
      const archY = y * 0.8 - Math.pow(frac, 2.1) * (0.5 * bendDown);
      pos.setY(i, archY);
      pos.setZ(i, archZ);

      const vBend = (1.0 - Math.abs(x) / (0.52 * scale)) * 0.09 * scale;
      pos.setZ(i, pos.getZ(i) + vBend);
    }
    leafGeo.computeVertexNormals();

    const leafMesh = new THREE.Mesh(leafGeo, matBananaLeaf);
    leafMesh.position.set(0, 1.05 * scale, 0);
    leafMesh.rotation.x = -tiltOut;
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafG.add(leafMesh);

    return leafG;
  }

  // Gracefully flared fan arrangement matching reference image
  const leafSpreads = [
    { a: 0.1,  s: 1.45, tilt: 0.52, bend: 0.5 },
    { a: 0.65, s: 1.6,  tilt: 0.6,  bend: 0.55 },
    { a: 1.3,  s: 1.5,  tilt: 0.55, bend: 0.45 },
    { a: 2.0,  s: 1.65, tilt: 0.65, bend: 0.6 },
    { a: 2.8,  s: 1.4,  tilt: 0.5,  bend: 0.48 },
    { a: 3.5,  s: 1.55, tilt: 0.58, bend: 0.52 },
    { a: 4.3,  s: 1.6,  tilt: 0.62, bend: 0.58 },
    { a: 5.2,  s: 1.48, tilt: 0.54, bend: 0.45 },
  ];

  leafSpreads.forEach((ls) => {
    const l = createOpenBananaLeaf(ls.s, ls.a, ls.tilt, ls.bend);
    l.position.set(0, 0.38, 0);
    islandA.add(l);
  });

  // Bird-of-Paradise Flowers standing tall
  const flowerAngles = [0.8, 2.2, 3.8, 5.4];
  flowerAngles.forEach((fa) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(Math.cos(fa) * 1.05, 1.35, Math.sin(fa) * 1.25);
    fGroup.rotation.y = fa;

    for (let petal = -2; petal <= 2; petal++) {
      const pMesh = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.48, 5), matFlowerOrange);
      pMesh.position.set(petal * 0.06, Math.abs(petal) * 0.06, 0);
      pMesh.rotation.z = petal * 0.28;
      fGroup.add(pMesh);
    }
    islandA.add(fGroup);
  });

  // Stone Lattice Lantern on Planter Corner
  const stoneLamp = new THREE.Group();
  stoneLamp.position.set(1.5, 0.42, 1.8);

  const lampPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.42), matSandstoneBorder);
  stoneLamp.add(lampPedestal);

  const lampLattice = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.36), matSandstone);
  lampLattice.position.y = 0.315;
  lampLattice.castShadow = true;
  stoneLamp.add(lampLattice);

  const lampCore = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), matLanternGlow);
  lampCore.position.y = 0.315;
  stoneLamp.add(lampCore);

  const lampRoof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.26, 4), matSandstoneBorder);
  lampRoof.position.y = 0.68;
  lampRoof.rotation.y = Math.PI / 4;
  lampRoof.castShadow = true;
  stoneLamp.add(lampRoof);

  const stoneLampLight = new THREE.PointLight(0xffa834, 1.8, 6.0, 1.6);
  stoneLampLight.position.y = 0.32;
  stoneLampLight.castShadow = true;
  stoneLamp.add(stoneLampLight);

  islandA.add(stoneLamp);
  group.add(islandA);

  // ---------------------------------------------------------------------------
  // 8. RIGHT-SIDE FLOWERING PLANTER (ISLAND B: X: 4.0, Z: 2.0)
  // ---------------------------------------------------------------------------
  const islandB = new THREE.Group();
  islandB.position.set(4.0, 0, 2.0);

  const curbBGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.38, 22);
  curbBGeo.scale(1.2, 1.0, 1.0);
  const curbB = new THREE.Mesh(curbBGeo, matSandstoneBorder);
  curbB.position.y = 0.19;
  curbB.castShadow = true;
  curbB.receiveShadow = true;
  islandB.add(curbB);

  for (let s = 0; s < 18; s++) {
    const sang = (s / 18) * Math.PI * 2;
    const srad = 0.3 + (s % 4) * 0.28;
    const sx = Math.cos(sang) * srad * 1.1;
    const sz = Math.sin(sang) * srad;
    const stemH = 0.4 + (s % 3) * 0.25;

    const flowerStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, stemH, 6),
      matFoliageDeep
    );
    flowerStem.position.set(sx, 0.38 + stemH / 2, sz);
    islandB.add(flowerStem);

    const fMat = s % 2 === 0 ? matFlowerWhite : matFlowerOrange;
    const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), fMat);
    blossom.position.set(sx, 0.38 + stemH, sz);
    blossom.castShadow = true;
    islandB.add(blossom);
  }

  group.add(islandB);

  // ---------------------------------------------------------------------------
  // 9. LOWER-LEFT FOREGROUND LEAF FRAMING
  // ---------------------------------------------------------------------------
  const fgLeafGroup = new THREE.Group();
  fgLeafGroup.position.set(-2.8, 1.6, 9.8);
  fgLeafGroup.rotation.set(0.3, 0.6, -0.2);

  for (let f = 0; f < 4; f++) {
    const fLeaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.6),
      matBananaLeaf
    );
    fLeaf.position.set(f * 0.28, 0, f * 0.15);
    fLeaf.rotation.z = f * 0.18 - 0.2;
    fgLeafGroup.add(fLeaf);
  }
  group.add(fgLeafGroup);

  scene.add(group);

  let deliveryBurstTimer = 0;

  return {
    group,
    update: (time: number) => {
      const flicker1 = 1.0 + Math.sin(time * 12.0) * 0.08 + Math.cos(time * 23.0) * 0.04;
      sanctumLight.intensity = 2.5 * flicker1;
      stoneLampLight.intensity = 1.8 * flicker1;
      puddleGlow.intensity = 2.2 * flicker1;

      const pulse = 1.0 + Math.sin(time * 4.0) * 0.06;
      pulseRing.scale.set(pulse, pulse, 1);
      pulseRingMat.opacity = 0.55 + Math.sin(time * 4.0) * 0.3;

      if (deliveryBurstTimer > 0) {
        deliveryBurstTimer -= 0.016;
      }
    },
    triggerDeliveryEffect: (_count: number) => {
      deliveryBurstTimer = 1.0;
      pulseRing.scale.set(1.8, 1.8, 1);
    },
  };
}
