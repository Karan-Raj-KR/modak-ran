import * as THREE from 'three';

export interface MushakInstance {
  root: THREE.Group;
  update: (
    delta: number,
    isMoving: boolean,
    isScurrying: boolean,
    speed: number,
    moveAngle: number
  ) => void;
  setBasketCount: (count: number) => void;
  triggerDeliveryCheer: () => void;
  reset: (x?: number, z?: number, rotation?: number) => void;
}

export function createMushak(scene: THREE.Scene): MushakInstance {
  const root = new THREE.Group();

  // Curated color palette
  const colors = {
    fur: 0x7c8c9e,          // Mouse grey-blue fur
    innerEar: 0xefa7a0,     // Soft pink inner ear
    creamBelly: 0xf5ebd7,   // Warm cream belly patch
    nose: 0x332220,         // Dark truffle nose
    eye: 0x141414,          // Glossy dark eye
    eyeHighlight: 0xffffff,
    scarf: 0xb53e33,        // Vermilion scarf
    basket: 0x9e7347,       // Woven wicker basket
    basketRim: 0x825b33,
    modak: 0xfbf6ea,        // Modak sweet
    paw: 0xebb4ab,          // Soft paw pads
    whisker: 0xdde3ea,
  };

  // Materials
  const matFur = new THREE.MeshStandardMaterial({
    color: colors.fur,
    roughness: 0.72,
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
    roughness: 0.82,
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

  // Contact blob shadow on ground
  const shadowGeo = new THREE.PlaneGeometry(1.1, 1.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x070b14,
    transparent: true,
    opacity: 0.5,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.012, 0);
  root.add(contactShadow);

  // Scaled Hero Character Body Hierarchy (~1.3x scaled for visual impact)
  const scaleFactor = 1.32;
  const characterGroup = new THREE.Group();
  characterGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
  root.add(characterGroup);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.38;
  characterGroup.add(bodyPivot);

  // 1. Pear-shaped Body (smooth, cute form)
  const bodyGeo = new THREE.SphereGeometry(0.38, 20, 20);
  bodyGeo.scale(0.88, 0.96, 1.28);
  const bodyMesh = new THREE.Mesh(bodyGeo, matFur);
  bodyMesh.castShadow = true;
  bodyPivot.add(bodyMesh);

  // Cream Belly Patch
  const bellyGeo = new THREE.SphereGeometry(0.32, 16, 16);
  bellyGeo.scale(0.78, 0.82, 1.12);
  const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
  bellyMesh.position.set(0, -0.06, 0.08);
  bodyPivot.add(bellyMesh);

  // 2. Head (Expressive, cute proportions)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.18, 0.46);
  bodyPivot.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.31, 20, 20);
  headGeo.scale(0.96, 0.95, 1.12);
  const headMesh = new THREE.Mesh(headGeo, matFur);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Tapered Snout
  const snoutGeo = new THREE.ConeGeometry(0.18, 0.34, 16);
  snoutGeo.rotateX(Math.PI / 2);
  const snoutMesh = new THREE.Mesh(snoutGeo, matFur);
  snoutMesh.position.set(0, -0.06, 0.3);
  snoutMesh.castShadow = true;
  headPivot.add(snoutMesh);

  // Nose tip
  const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), matNose);
  noseMesh.position.set(0, -0.05, 0.48);
  headPivot.add(noseMesh);

  // Whiskers
  const matWhisker = new THREE.LineBasicMaterial({ color: colors.whisker, transparent: true, opacity: 0.6 });
  for (let w = -1; w <= 1; w += 2) {
    for (let i = -1; i <= 1; i++) {
      const pts = [
        new THREE.Vector3(w * 0.08, -0.06 + i * 0.02, 0.42),
        new THREE.Vector3(w * 0.28, -0.05 + i * 0.04, 0.44),
      ];
      const wGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const whiskerLine = new THREE.Line(wGeo, matWhisker);
      headPivot.add(whiskerLine);
    }
  }

  // Large Glossy Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 12), matEye);
  eyeL.position.set(-0.17, 0.09, 0.22);
  headPivot.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 12), matEye);
  eyeR.position.set(0.17, 0.09, 0.22);
  headPivot.add(eyeR);

  // White Eye Catchlights
  const hLiteL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), matEyeHighlight);
  hLiteL.position.set(-0.19, 0.11, 0.26);
  headPivot.add(hLiteL);

  const hLiteR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), matEyeHighlight);
  hLiteR.position.set(0.19, 0.11, 0.26);
  headPivot.add(hLiteR);

  // Broad Rounded Ears with Soft Pink Inner Surfaces
  const earL = new THREE.Group();
  earL.position.set(-0.25, 0.25, 0.06);
  earL.rotation.set(-0.1, -0.28, -0.2);
  headPivot.add(earL);

  const earOuterGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20);
  earOuterGeo.rotateX(Math.PI / 2);
  const earMeshL = new THREE.Mesh(earOuterGeo, matFur);
  earMeshL.castShadow = true;
  earL.add(earMeshL);

  const earInnerGeo = new THREE.CircleGeometry(0.15, 16);
  const earInnerL = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerL.position.z = 0.022;
  earL.add(earInnerL);

  const earR = new THREE.Group();
  earR.position.set(0.25, 0.25, 0.06);
  earR.rotation.set(-0.1, 0.28, 0.2);
  headPivot.add(earR);

  const earMeshR = new THREE.Mesh(earOuterGeo, matFur);
  earMeshR.castShadow = true;
  earR.add(earMeshR);

  const earInnerR = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerR.position.z = 0.022;
  earR.add(earInnerR);

  // 3. Vermilion Scarf with Animated Flutter Tails
  const scarfCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.07, 10, 20),
    matScarf
  );
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.set(0, 0.11, 0.32);
  bodyPivot.add(scarfCollar);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.3), matScarf);
  scarfTail.position.set(0.2, 0.07, 0.18);
  scarfTail.rotation.set(0.3, 0.4, 0.2);
  bodyPivot.add(scarfTail);

  // 4. Curved Tube Tail with follow-through
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -0.46),
    new THREE.Vector3(0, 0.1, -0.72),
    new THREE.Vector3(0.09, 0.28, -0.92),
    new THREE.Vector3(0.16, 0.44, -1.08),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 14, 0.038, 10, false);
  const tailMesh = new THREE.Mesh(tailGeo, matFur);
  tailMesh.castShadow = true;
  bodyPivot.add(tailMesh);

  // 5. Four Running Paws
  const pawGeo = new THREE.SphereGeometry(0.095, 10, 10);
  pawGeo.scale(0.8, 0.7, 1.2);

  const pawFL = new THREE.Mesh(pawGeo, matPaw);
  pawFL.position.set(-0.23, -0.32, 0.26);
  characterGroup.add(pawFL);

  const pawFR = new THREE.Mesh(pawGeo, matPaw);
  pawFR.position.set(0.23, -0.32, 0.26);
  characterGroup.add(pawFR);

  const pawBL = new THREE.Mesh(pawGeo, matPaw);
  pawBL.position.set(-0.26, -0.32, -0.23);
  characterGroup.add(pawBL);

  const pawBR = new THREE.Mesh(pawGeo, matPaw);
  pawBR.position.set(0.26, -0.32, -0.23);
  characterGroup.add(pawBR);

  // 6. Woven Backpack Basket Carrying 0-6 Miniature Modaks
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.34, -0.14);
  bodyPivot.add(basketGroup);

  const basketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.19, 0.32, 16, 1, true),
    matBasket
  );
  basketBody.castShadow = true;
  basketGroup.add(basketBody);

  const basketBottom = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), matBasket);
  basketBottom.rotation.x = Math.PI / 2;
  basketBottom.position.y = -0.16;
  basketGroup.add(basketBottom);

  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 20), matBasketRim);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 0.16;
  basketRim.castShadow = true;
  basketGroup.add(basketRim);

  // 6 Mini Modaks inside basket
  const basketModaks: THREE.Mesh[] = [];
  const miniGeo = new THREE.ConeGeometry(0.08, 0.13, 8);
  const bPositions: [number, number, number][] = [
    [-0.09, 0.06, -0.07],
    [0.09, 0.06, -0.07],
    [-0.09, 0.06, 0.07],
    [0.09, 0.06, 0.07],
    [0.0, 0.13, 0.0],
    [0.0, 0.18, -0.03],
  ];

  for (let i = 0; i < 6; i++) {
    const mini = new THREE.Mesh(miniGeo, matModak);
    mini.position.set(bPositions[i][0], bPositions[i][1], bPositions[i][2]);
    mini.visible = false;
    basketGroup.add(mini);
    basketModaks.push(mini);
  }

  // Animation State
  let walkPhase = 0;
  let cheerTimer = 0;

  scene.add(root);

  return {
    root,
    update: (
      delta: number,
      isMoving: boolean,
      isScurrying: boolean,
      speed: number,
      moveAngle: number
    ) => {
      // Smooth rotation toward movement direction
      if (isMoving) {
        let diff = moveAngle - root.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        root.rotation.y += diff * Math.min(1.0, delta * 18);

        walkPhase += delta * speed * 2.8;
      }

      // Step animations for 4 paws
      const stepAmp = isMoving ? 0.13 : 0;
      const pawFreq = walkPhase * 2.2;

      pawFL.position.y = -0.32 + Math.max(0, Math.sin(pawFreq)) * stepAmp;
      pawFL.position.z = 0.26 + Math.cos(pawFreq) * (stepAmp * 0.8);

      pawBR.position.y = -0.32 + Math.max(0, Math.sin(pawFreq)) * stepAmp;
      pawBR.position.z = -0.23 + Math.cos(pawFreq) * (stepAmp * 0.8);

      pawFR.position.y = -0.32 + Math.max(0, Math.sin(pawFreq + Math.PI)) * stepAmp;
      pawFR.position.z = 0.26 + Math.cos(pawFreq + Math.PI) * (stepAmp * 0.8);

      pawBL.position.y = -0.32 + Math.max(0, Math.sin(pawFreq + Math.PI)) * stepAmp;
      pawBL.position.z = -0.23 + Math.cos(pawFreq + Math.PI) * (stepAmp * 0.8);

      // Body vertical bobbing and breathing
      if (isMoving) {
        bodyPivot.position.y = 0.38 + Math.abs(Math.sin(pawFreq)) * 0.055;
        tailMesh.rotation.y = Math.sin(walkPhase * 1.6) * 0.4;
      } else {
        // Idle breathing and ear twitch
        bodyPivot.position.y = 0.38 + Math.sin(Date.now() * 0.003) * 0.018;
        tailMesh.rotation.y = Math.sin(Date.now() * 0.002) * 0.12;
        earL.rotation.z = -0.2 + Math.sin(Date.now() * 0.005) * 0.03;
        earR.rotation.z = 0.2 - Math.sin(Date.now() * 0.005) * 0.03;
      }

      // Scurry sprint posture
      if (isScurrying) {
        bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, 0.28, delta * 20);
        scarfTail.rotation.z = Math.sin(Date.now() * 0.05) * 0.5 + 0.35;
      } else {
        bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, 0, delta * 12);
        scarfTail.rotation.z = THREE.MathUtils.lerp(scarfTail.rotation.z, 0.2, delta * 10);
      }

      // Delivery celebration hop
      if (cheerTimer > 0) {
        cheerTimer -= delta;
        const jumpY = Math.sin(((0.4 - cheerTimer) / 0.4) * Math.PI) * 0.35;
        bodyPivot.position.y += jumpY;
        root.rotation.y += delta * 12;
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

    reset: (x: number = 0, z: number = 6.0, rotation: number = -Math.PI) => {
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
