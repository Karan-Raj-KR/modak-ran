import * as THREE from 'three';

export interface MushakCharacter {
  root: THREE.Group;
  update: (delta: number, isMoving: boolean, isScurrying: boolean, speed: number, moveAngle: number) => void;
  setBasketCount: (count: number) => void;
  triggerDeliveryCheer: () => void;
  reset: (x?: number, z?: number, rotation?: number) => void;
}

export function createMushak(scene: THREE.Scene): MushakCharacter {
  const root = new THREE.Group();

  // Curated color palette
  const colors = {
    fur: 0x788898,          // Mouse grey-blue fur
    furDark: 0x627282,
    innerEar: 0xe8a9a2,     // Warm soft pink inner ear
    creamBelly: 0xf3e4ca,   // Cream highlights
    nose: 0x3d2825,         // Dark truffle nose
    eye: 0x1a1a1a,          // Dark glossy eye
    eyeHighlight: 0xffffff,
    scarf: 0xb84d43,        // Vermilion scarf
    basket: 0xa67c52,       // Woven wicker basket
    basketRim: 0x8a623c,
    modak: 0xfbf6ea,        // Creamy modak sweet
    modakTip: 0xe8a838,     // Saffron tip
    paw: 0xe4b5ac,          // Soft paw pads
  };

  // Materials
  const matFur = new THREE.MeshStandardMaterial({
    color: colors.fur,
    roughness: 0.75,
    metalness: 0.05,
  });

  const matInnerEar = new THREE.MeshStandardMaterial({
    color: colors.innerEar,
    roughness: 0.85,
  });

  const matBelly = new THREE.MeshStandardMaterial({
    color: colors.creamBelly,
    roughness: 0.8,
  });

  const matNose = new THREE.MeshStandardMaterial({
    color: colors.nose,
    roughness: 0.4,
  });

  const matEye = new THREE.MeshBasicMaterial({
    color: colors.eye,
  });

  const matEyeHighlight = new THREE.MeshBasicMaterial({
    color: colors.eyeHighlight,
  });

  const matScarf = new THREE.MeshStandardMaterial({
    color: colors.scarf,
    roughness: 0.65,
  });

  const matBasket = new THREE.MeshStandardMaterial({
    color: colors.basket,
    roughness: 0.8,
  });

  const matBasketRim = new THREE.MeshStandardMaterial({
    color: colors.basketRim,
    roughness: 0.85,
  });

  const matModak = new THREE.MeshStandardMaterial({
    color: colors.modak,
    roughness: 0.5,
  });

  const matPaw = new THREE.MeshStandardMaterial({
    color: colors.paw,
    roughness: 0.8,
  });

  // Soft contact blob shadow on ground plane
  const shadowGeo = new THREE.PlaneGeometry(0.85, 1.25);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0a0e17,
    transparent: true,
    opacity: 0.45,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.01, 0);
  root.add(contactShadow);

  // Character body hierarchy
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.38; // Ground clearance for paws
  root.add(bodyPivot);

  // 1. Pear-shaped Body (0.6 wide, 0.58 high, 0.88 long)
  const bodyGeo = new THREE.SphereGeometry(0.38, 16, 16);
  bodyGeo.scale(0.85, 0.95, 1.25);
  const bodyMesh = new THREE.Mesh(bodyGeo, matFur);
  bodyMesh.castShadow = true;
  bodyPivot.add(bodyMesh);

  // Cream Belly Patch
  const bellyGeo = new THREE.SphereGeometry(0.32, 12, 12);
  bellyGeo.scale(0.75, 0.8, 1.1);
  const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
  bellyMesh.position.set(0, -0.06, 0.08);
  bodyPivot.add(bellyMesh);

  // 2. Head (slightly oversized, ~0.5 across)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.16, 0.45);
  bodyPivot.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
  headGeo.scale(0.95, 0.95, 1.1);
  const headMesh = new THREE.Mesh(headGeo, matFur);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Tapered Muzzle & Snout
  const snoutGeo = new THREE.ConeGeometry(0.18, 0.32, 12);
  snoutGeo.rotateX(Math.PI / 2);
  const snoutMesh = new THREE.Mesh(snoutGeo, matFur);
  snoutMesh.position.set(0, -0.06, 0.28);
  snoutMesh.castShadow = true;
  headPivot.add(snoutMesh);

  // Little cute nose tip
  const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matNose);
  noseMesh.position.set(0, -0.05, 0.45);
  headPivot.add(noseMesh);

  // Eyes with catchlight highlights
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matEye);
  eyeL.position.set(-0.16, 0.08, 0.2);
  headPivot.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matEye);
  eyeR.position.set(0.16, 0.08, 0.2);
  headPivot.add(eyeR);

  // Eye highlights
  const hLiteL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), matEyeHighlight);
  hLiteL.position.set(-0.18, 0.1, 0.23);
  headPivot.add(hLiteL);

  const hLiteR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), matEyeHighlight);
  hLiteR.position.set(0.18, 0.1, 0.23);
  headPivot.add(hLiteR);

  // Broad Ears with distinct pink inner-ear surfaces
  const earLGroup = new THREE.Group();
  earLGroup.position.set(-0.24, 0.24, 0.05);
  earLGroup.rotation.set(-0.1, -0.3, -0.2);
  headPivot.add(earLGroup);

  const earOuterGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16);
  earOuterGeo.rotateX(Math.PI / 2);
  const earOuterL = new THREE.Mesh(earOuterGeo, matFur);
  earOuterL.castShadow = true;
  earLGroup.add(earOuterL);

  const earInnerGeo = new THREE.CircleGeometry(0.14, 14);
  const earInnerL = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerL.position.z = 0.022;
  earLGroup.add(earInnerL);

  const earRGroup = new THREE.Group();
  earRGroup.position.set(0.24, 0.24, 0.05);
  earRGroup.rotation.set(-0.1, 0.3, 0.2);
  headPivot.add(earRGroup);

  const earOuterR = new THREE.Mesh(earOuterGeo, matFur);
  earOuterR.castShadow = true;
  earRGroup.add(earOuterR);

  const earInnerR = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerR.position.z = 0.022;
  earRGroup.add(earInnerR);

  // 3. Short Vermilion Scarf
  const scarfCollarGeo = new THREE.TorusGeometry(0.26, 0.06, 8, 16);
  scarfCollarGeo.rotateX(Math.PI / 2);
  const scarfCollar = new THREE.Mesh(scarfCollarGeo, matScarf);
  scarfCollar.position.set(0, 0.1, 0.32);
  bodyPivot.add(scarfCollar);

  // Animated scarf tail
  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.26), matScarf);
  scarfTail.position.set(0.18, 0.06, 0.18);
  scarfTail.rotation.set(0.3, 0.4, 0.2);
  bodyPivot.add(scarfTail);

  // 4. Curved Tube Tail (~0.9 units long)
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -0.45),
    new THREE.Vector3(0, 0.08, -0.7),
    new THREE.Vector3(0.08, 0.25, -0.9),
    new THREE.Vector3(0.15, 0.4, -1.05),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.035, 8, false);
  const tailMesh = new THREE.Mesh(tailGeo, matFur);
  tailMesh.castShadow = true;
  bodyPivot.add(tailMesh);

  // 5. Four Proportionate Paws
  const pawGeo = new THREE.SphereGeometry(0.09, 8, 8);
  pawGeo.scale(0.8, 0.7, 1.2);

  const pawFL = new THREE.Mesh(pawGeo, matPaw);
  pawFL.position.set(-0.22, -0.32, 0.25);
  root.add(pawFL);

  const pawFR = new THREE.Mesh(pawGeo, matPaw);
  pawFR.position.set(0.22, -0.32, 0.25);
  root.add(pawFR);

  const pawBL = new THREE.Mesh(pawGeo, matPaw);
  pawBL.position.set(-0.25, -0.32, -0.22);
  root.add(pawBL);

  const pawBR = new THREE.Mesh(pawGeo, matPaw);
  pawBR.position.set(0.25, -0.32, -0.22);
  root.add(pawBR);

  // 6. Woven Basket Secured on Back (~0.45 units wide)
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.32, -0.12);
  bodyPivot.add(basketGroup);

  // Basket body (conical bucket)
  const basketBodyGeo = new THREE.CylinderGeometry(0.25, 0.18, 0.3, 12, 1, true);
  const basketBody = new THREE.Mesh(basketBodyGeo, matBasket);
  basketBody.castShadow = true;
  basketGroup.add(basketBody);

  // Basket bottom
  const basketBottomGeo = new THREE.CircleGeometry(0.18, 12);
  basketBottomGeo.rotateX(Math.PI / 2);
  const basketBottom = new THREE.Mesh(basketBottomGeo, matBasket);
  basketBottom.position.y = -0.15;
  basketGroup.add(basketBottom);

  // Basket rim
  const basketRimGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 16);
  basketRimGeo.rotateX(Math.PI / 2);
  const basketRim = new THREE.Mesh(basketRimGeo, matBasketRim);
  basketRim.position.y = 0.15;
  basketRim.castShadow = true;
  basketGroup.add(basketRim);

  // 6 Mini Modaks inside basket (0 to 6 displayed based on capacity)
  const basketModaks: THREE.Mesh[] = [];
  const modakMiniGeo = new THREE.ConeGeometry(0.07, 0.11, 8);
  const bPositions: [number, number, number][] = [
    [-0.08, 0.06, -0.06],
    [0.08, 0.06, -0.06],
    [-0.08, 0.06, 0.06],
    [0.08, 0.06, 0.06],
    [0.0, 0.12, 0.0],
    [0.0, 0.16, -0.04],
  ];

  for (let i = 0; i < 6; i++) {
    const mini = new THREE.Mesh(modakMiniGeo, matModak);
    mini.position.set(bPositions[i][0], bPositions[i][1], bPositions[i][2]);
    mini.visible = false;
    basketGroup.add(mini);
    basketModaks.push(mini);
  }

  // Delivery celebration animation state
  let cheerTimer = 0;
  let walkPhase = 0;

  scene.add(root);

  return {
    root,
    update: (delta: number, isMoving: boolean, isScurrying: boolean, speed: number, moveAngle: number) => {
      // Rotation toward movement direction
      if (isMoving) {
        // Smooth spherical/angular slerp
        let diff = moveAngle - root.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        root.rotation.y += diff * Math.min(1.0, delta * 15);

        walkPhase += delta * speed * 2.8;
      }

      // Step animations
      const stepAmp = isMoving ? 0.12 : 0;
      const pawFreq = walkPhase * 2.0;

      pawFL.position.y = -0.32 + Math.max(0, Math.sin(pawFreq)) * stepAmp;
      pawFL.position.z = 0.25 + Math.cos(pawFreq) * (stepAmp * 0.8);

      pawBR.position.y = -0.32 + Math.max(0, Math.sin(pawFreq)) * stepAmp;
      pawBR.position.z = -0.22 + Math.cos(pawFreq) * (stepAmp * 0.8);

      pawFR.position.y = -0.32 + Math.max(0, Math.sin(pawFreq + Math.PI)) * stepAmp;
      pawFR.position.z = 0.25 + Math.cos(pawFreq + Math.PI) * (stepAmp * 0.8);

      pawBL.position.y = -0.32 + Math.max(0, Math.sin(pawFreq + Math.PI)) * stepAmp;
      pawBL.position.z = -0.22 + Math.cos(pawFreq + Math.PI) * (stepAmp * 0.8);

      // Body bob and breathing
      if (isMoving) {
        bodyPivot.position.y = 0.38 + Math.abs(Math.sin(pawFreq)) * 0.05;
        // Tail sway
        tailMesh.rotation.y = Math.sin(walkPhase * 1.5) * 0.35;
      } else {
        // Subtle idle breathing
        bodyPivot.position.y = 0.38 + Math.sin(Date.now() * 0.003) * 0.015;
        tailMesh.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
      }

      // Scurry posture: forward sprint lean + flutter scarf
      if (isScurrying) {
        bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, 0.25, delta * 20);
        scarfTail.rotation.z = Math.sin(Date.now() * 0.05) * 0.4 + 0.3;
      } else {
        bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, 0, delta * 12);
        scarfTail.rotation.z = THREE.MathUtils.lerp(scarfTail.rotation.z, 0.2, delta * 10);
      }

      // Delivery cheer animation
      if (cheerTimer > 0) {
        cheerTimer -= delta;
        const jumpY = Math.sin((0.4 - cheerTimer) / 0.4 * Math.PI) * 0.3;
        bodyPivot.position.y += jumpY;
        root.rotation.y += delta * 10; // little happy spin
      }
    },

    setBasketCount: (count: number) => {
      for (let i = 0; i < 6; i++) {
        basketModaks[i].visible = i < count;
      }
    },

    triggerDeliveryCheer: () => {
      cheerTimer = 0.4;
    },

    reset: (x: number = 0, z: number = 6, rotation: number = -Math.PI) => {
      root.position.set(x, 0.38, z);
      root.rotation.set(0, rotation, 0);
      bodyPivot.position.set(0, 0.38, 0);
      bodyPivot.rotation.set(0, 0, 0);
      cheerTimer = 0;
      walkPhase = 0;
      for (let i = 0; i < 6; i++) {
        basketModaks[i].visible = false;
      }
    },
  };
}
