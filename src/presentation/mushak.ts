import * as THREE from 'three';
import { createWickerTexture, createSoftShadowTexture } from './textures';

export interface MushakInstance {
  root: THREE.Group;
  /**
   * `speed` is the magnitude of the player's actual ground velocity, so the
   * walk cycle only plays when Mushak really moves — not while pushing a wall.
   */
  update: (
    delta: number,
    speed: number,
    heading: number,
    scurrying: boolean,
    reducedMotion?: boolean
  ) => void;
  setBasketCount: (count: number) => void;
  triggerDeliveryCheer: () => void;
  reset: (x?: number, z?: number, rotation?: number) => void;
}

export function createMushak(scene: THREE.Scene): MushakInstance {
  const root = new THREE.Group();

  // Curated color palette matching the approved visual specification
  const colors = {
    fur: 0x8291a0,          // Expressive soft mouse grey
    innerEar: 0xf5aba4,     // Large vibrant soft pink inner ear
    creamBelly: 0xfbf6ea,   // Warm cream belly patch
    nose: 0x3d2724,         // Dark truffle nose
    eye: 0x141414,          // Glossy dark eye
    eyeHighlight: 0xffffff,
    scarf: 0xc43729,        // Bright vermilion scarf
    basketRim: 0x7a512b,    // Wicker basket rim
    modak: 0xfdf7ec,        // Cream modak sweet
    modakTip: 0xf29f27,     // Saffron tip
    paw: 0xf2bbb3,          // Soft pink paw pads
    whisker: 0xe6ecf2,
    dust: 0xe5ceb0,         // Courtyard sandstone dust
  };

  const texWicker = createWickerTexture();

  // Materials
  const matFur = new THREE.MeshStandardMaterial({
    color: colors.fur,
    roughness: 0.68,
    metalness: 0.04,
  });

  const matInnerEar = new THREE.MeshStandardMaterial({
    color: colors.innerEar,
    roughness: 0.85,
  });

  const matBelly = new THREE.MeshStandardMaterial({
    color: colors.creamBelly,
    roughness: 0.78,
  });

  const matNose = new THREE.MeshStandardMaterial({
    color: colors.nose,
    roughness: 0.35,
  });

  const matEye = new THREE.MeshBasicMaterial({
    color: colors.eye,
  });

  const matEyeHighlight = new THREE.MeshBasicMaterial({
    color: colors.eyeHighlight,
  });

  const matScarf = new THREE.MeshStandardMaterial({
    color: colors.scarf,
    roughness: 0.62,
  });

  const matBasket = new THREE.MeshStandardMaterial({
    map: texWicker,
    roughness: 0.8,
  });

  const matBasketRim = new THREE.MeshStandardMaterial({
    color: colors.basketRim,
    roughness: 0.85,
  });

  const matModak = new THREE.MeshStandardMaterial({
    color: colors.modak,
    roughness: 0.42,
  });

  const matModakTip = new THREE.MeshStandardMaterial({
    color: colors.modakTip,
    roughness: 0.45,
  });

  const matPaw = new THREE.MeshStandardMaterial({
    color: colors.paw,
    roughness: 0.8,
  });

  // Contact blob shadow on ground
  const shadowGeo = new THREE.PlaneGeometry(1.05, 1.25);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createSoftShadowTexture(),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.05, 0);
  root.add(contactShadow);

  // Scaled Hero Character Group (~1.4x for clear, expressive visual impact).
  // Lifted so the hind feet, which sit below the body in local space, land on
  // the courtyard floor when root sits at y=0.
  const characterGroup = new THREE.Group();
  characterGroup.position.y = 0.28;
  characterGroup.scale.set(1.4, 1.4, 1.4);
  root.add(characterGroup);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.42;
  characterGroup.add(bodyPivot);

  // 1. Pear-shaped Upright Body
  const bodyGeo = new THREE.SphereGeometry(0.38, 20, 20);
  bodyGeo.scale(0.85, 1.05, 0.95);
  const bodyMesh = new THREE.Mesh(bodyGeo, matFur);
  bodyMesh.castShadow = true;
  bodyPivot.add(bodyMesh);

  // Cream Belly & Chest Patch
  const bellyGeo = new THREE.SphereGeometry(0.32, 16, 16);
  bellyGeo.scale(0.74, 0.95, 0.78);
  const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
  bellyMesh.position.set(0, -0.04, 0.16);
  bodyPivot.add(bellyMesh);

  // 2. Expressive Head
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.28, 0.22);
  bodyPivot.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.32, 20, 20);
  headGeo.scale(0.96, 0.94, 1.08);
  const headMesh = new THREE.Mesh(headGeo, matFur);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Cute Tapered Snout
  const snoutGeo = new THREE.ConeGeometry(0.17, 0.32, 16);
  snoutGeo.rotateX(Math.PI / 2);
  const snoutMesh = new THREE.Mesh(snoutGeo, matFur);
  snoutMesh.position.set(0, -0.06, 0.26);
  snoutMesh.castShadow = true;
  headPivot.add(snoutMesh);

  // Nose tip
  const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), matNose);
  noseMesh.position.set(0, -0.05, 0.43);
  headPivot.add(noseMesh);

  // Whiskers
  const matWhisker = new THREE.LineBasicMaterial({
    color: colors.whisker,
    transparent: true,
    opacity: 0.75,
  });
  for (let side = -1; side <= 1; side += 2) {
    for (let i = -1; i <= 1; i++) {
      const pts = [
        new THREE.Vector3(side * 0.08, -0.06 + i * 0.02, 0.38),
        new THREE.Vector3(side * 0.35, -0.04 + i * 0.05, 0.44),
      ];
      const wGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const whiskerLine = new THREE.Line(wGeo, matWhisker);
      headPivot.add(whiskerLine);
    }
  }

  // Large Glossy Black Eyes with Catchlights
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 14), matEye);
  eyeL.position.set(-0.18, 0.1, 0.2);
  headPivot.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 14), matEye);
  eyeR.position.set(0.18, 0.1, 0.2);
  headPivot.add(eyeR);

  // Catchlight highlights
  const hLiteL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), matEyeHighlight);
  hLiteL.position.set(-0.195, 0.12, 0.245);
  headPivot.add(hLiteL);

  const hLiteR = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), matEyeHighlight);
  hLiteR.position.set(0.195, 0.12, 0.245);
  headPivot.add(hLiteR);

  // Prominent Large Rounded Ears with Soft Pink Inner Surfaces
  // Angled so the bright pink interior is clearly visible from 3/4 elevated perspective
  const earL = new THREE.Group();
  earL.position.set(-0.28, 0.28, 0.04);
  earL.rotation.set(-0.1, -0.42, -0.2);
  headPivot.add(earL);

  const earOuterGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24);
  earOuterGeo.rotateX(Math.PI / 2);
  const earMeshL = new THREE.Mesh(earOuterGeo, matFur);
  earMeshL.castShadow = true;
  earL.add(earMeshL);

  const earInnerGeo = new THREE.CircleGeometry(0.19, 20);
  const earInnerL = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerL.position.z = 0.022;
  earL.add(earInnerL);

  const earR = new THREE.Group();
  earR.position.set(0.28, 0.28, 0.04);
  earR.rotation.set(-0.1, 0.42, 0.2);
  headPivot.add(earR);

  const earMeshR = new THREE.Mesh(earOuterGeo, matFur);
  earMeshR.castShadow = true;
  earR.add(earMeshR);

  const earInnerR = new THREE.Mesh(earInnerGeo, matInnerEar);
  earInnerR.position.z = 0.022;
  earR.add(earInnerR);

  // 3. Vermilion Scarf with Dynamic Flutter Tail
  const scarfCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.08, 12, 24),
    matScarf
  );
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.set(0, 0.16, 0.16);
  bodyPivot.add(scarfCollar);

  const scarfTailPivot = new THREE.Group();
  scarfTailPivot.position.set(0.18, 0.14, -0.06);
  bodyPivot.add(scarfTailPivot);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.42), matScarf);
  scarfTail.position.set(0.05, -0.04, -0.18);
  scarfTail.rotation.set(0.2, 0.4, 0.2);
  scarfTailPivot.add(scarfTail);

  // 4. Woven Backpack Basket Strapped on Back (holding 0-6 Modaks)
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.12, -0.34);
  bodyPivot.add(basketGroup);

  const basketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.22, 0.36, 18, 1, true),
    matBasket
  );
  basketBody.castShadow = true;
  basketGroup.add(basketBody);

  const basketBottom = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), matBasketRim);
  basketBottom.rotation.x = Math.PI / 2;
  basketBottom.position.y = -0.18;
  basketGroup.add(basketBottom);

  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 10, 24), matBasketRim);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 0.18;
  basketRim.castShadow = true;
  basketGroup.add(basketRim);

  const strapGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 16, Math.PI);
  const strapL = new THREE.Mesh(strapGeo, matBasketRim);
  strapL.position.set(-0.14, 0.04, 0.14);
  strapL.rotation.y = Math.PI / 2;
  basketGroup.add(strapL);

  const strapR = new THREE.Mesh(strapGeo, matBasketRim);
  strapR.position.set(0.14, 0.04, 0.14);
  strapR.rotation.y = Math.PI / 2;
  basketGroup.add(strapR);

  // 6 Mini Modaks proudly peeking above the basket rim
  const basketModaks: THREE.Group[] = [];
  const modakPositions: [number, number, number][] = [
    [-0.1, 0.24, -0.08],
    [0.1, 0.24, -0.08],
    [-0.1, 0.24, 0.08],
    [0.1, 0.24, 0.08],
    [0.0, 0.32, 0.0],
    [0.0, 0.39, -0.04],
  ];

  for (let i = 0; i < 6; i++) {
    const miniG = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 8), matModak);
    cone.castShadow = true;
    miniG.add(cone);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), matModakTip);
    tip.position.y = 0.09;
    miniG.add(tip);

    miniG.position.set(modakPositions[i][0], modakPositions[i][1], modakPositions[i][2]);
    miniG.visible = false;
    basketGroup.add(miniG);
    basketModaks.push(miniG);
  }

  // 5. Curved Mouse Tail
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, -0.32),
    new THREE.Vector3(0, -0.1, -0.62),
    new THREE.Vector3(0.1, 0.12, -0.85),
    new THREE.Vector3(0.2, 0.32, -1.05),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 14, 0.038, 8, false);
  const tailMesh = new THREE.Mesh(tailGeo, matFur);
  tailMesh.castShadow = true;
  bodyPivot.add(tailMesh);

  // 6. Running Paws: Two Front Paws (hands) & Two Running Hind Feet
  const pawFrontGeo = new THREE.SphereGeometry(0.08, 10, 10);
  pawFrontGeo.scale(0.8, 0.7, 1.2);

  const pawFL = new THREE.Mesh(pawFrontGeo, matPaw);
  pawFL.position.set(-0.18, 0.05, 0.24);
  bodyPivot.add(pawFL);

  const pawFR = new THREE.Mesh(pawFrontGeo, matPaw);
  pawFR.position.set(0.18, 0.05, 0.24);
  bodyPivot.add(pawFR);

  // Hind running feet. FOOT_Y is the resting height in characterGroup space;
  // with the group lifted to 0.28 and scaled 1.4 this lands the feet on y≈0.04.
  const FOOT_Y = -0.17;

  const pawHindGeo = new THREE.SphereGeometry(0.095, 10, 10);
  pawHindGeo.scale(0.85, 0.65, 1.35);

  const footL = new THREE.Mesh(pawHindGeo, matPaw);
  footL.position.set(-0.16, FOOT_Y, 0.02);
  characterGroup.add(footL);

  const footR = new THREE.Mesh(pawHindGeo, matPaw);
  footR.position.set(0.16, FOOT_Y, 0.02);
  characterGroup.add(footR);

  // 7. Dust Puff Trail Particles
  const maxDust = 16;
  const dustGeo = new THREE.SphereGeometry(0.065, 6, 6);
  const dustMat = new THREE.MeshBasicMaterial({
    color: colors.dust,
    transparent: true,
    opacity: 0.6,
  });

  const dustPool: { mesh: THREE.Mesh; life: number; maxLife: number; vx: number; vy: number; vz: number }[] = [];
  for (let d = 0; d < maxDust; d++) {
    const dMesh = new THREE.Mesh(dustGeo, dustMat.clone());
    dMesh.visible = false;
    scene.add(dMesh);
    dustPool.push({
      mesh: dMesh,
      life: 0,
      maxLife: 0.45,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  let dustTimer = 0;
  function spawnDust(x: number, y: number, z: number) {
    const p = dustPool.find((item) => item.life <= 0);
    if (p) {
      p.life = p.maxLife;
      p.mesh.visible = true;
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.04, z + (Math.random() - 0.5) * 0.15);
      p.mesh.scale.set(0.6, 0.6, 0.6);
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = 0.2 + Math.random() * 0.2;
      p.vz = (Math.random() - 0.5) * 0.3;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
    }
  }

  // Animation State
  let walkPhase = 0;
  let cheerTimer = 0;
  let clock = 0;

  scene.add(root);

  return {
    root,
    update: (
      delta: number,
      speed: number,
      heading: number,
      isScurrying: boolean,
      reducedMotion = false
    ) => {
      clock += delta;

      // Driven by achieved ground speed, so Mushak stops animating when he is
      // pressed against an obstacle instead of running in place.
      const isMoving = speed > 0.45;
      const speedFrac = Math.min(1, speed / 8.5);

      if (isMoving && !reducedMotion) {
        let diff = heading - root.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        root.rotation.y += diff * Math.min(1.0, delta * 16);
      } else if (isMoving) {
        root.rotation.y = heading;
      }

      // Stride frequency scales with real speed: a crawl steps slowly, a scurry
      // blurs. Amplitude grows too, so the two never look identical.
      if (isMoving) walkPhase += delta * (3.2 + speed * 2.5);

      if (isMoving && !reducedMotion) {
        dustTimer += delta;
        const dustRate = isScurrying ? 0.045 : 0.13;
        if (dustTimer >= dustRate) {
          dustTimer = 0;
          spawnDust(root.position.x, 0, root.position.z);
        }
      } else {
        dustTimer = 0;
      }

      // Update dust particles
      dustPool.forEach((p) => {
        if (p.life > 0) {
          p.life -= delta;
          p.mesh.position.x += p.vx * delta;
          p.mesh.position.y += p.vy * delta;
          p.mesh.position.z += p.vz * delta;
          const prog = 1 - p.life / p.maxLife;
          const s = 0.6 + prog * 1.2;
          p.mesh.scale.set(s, s, s);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.5;
          if (p.life <= 0) {
            p.mesh.visible = false;
          }
        }
      });

      // Bipedal step cycles for hind feet
      const stepAmp = isMoving ? 0.1 + speedFrac * 0.1 : 0;
      const footFreq = walkPhase * 2.4;

      footL.position.y = FOOT_Y + Math.max(0, Math.sin(footFreq)) * stepAmp;
      footL.position.z = 0.02 + Math.cos(footFreq) * (stepAmp * 0.9);

      footR.position.y = FOOT_Y + Math.max(0, Math.sin(footFreq + Math.PI)) * stepAmp;
      footR.position.z = 0.02 + Math.cos(footFreq + Math.PI) * (stepAmp * 0.9);

      // Front paws pumping
      pawFL.position.z = 0.24 + Math.cos(footFreq + Math.PI) * (stepAmp * 0.45);
      pawFR.position.z = 0.24 + Math.cos(footFreq) * (stepAmp * 0.45);

      // Body vertical bobbing and forward running lean
      if (isMoving) {
        bodyPivot.position.y = 0.42 + Math.abs(Math.sin(footFreq)) * (0.03 + speedFrac * 0.05);
        bodyPivot.rotation.x = THREE.MathUtils.lerp(
          bodyPivot.rotation.x,
          isScurrying ? 0.34 : 0.14 * speedFrac + 0.06,
          Math.min(1, delta * 12)
        );
        // Tail and scarf react to motion only — the physics body is untouched.
        tailMesh.rotation.y = Math.sin(walkPhase * 1.8) * (0.25 + speedFrac * 0.3);
        scarfTailPivot.rotation.y = Math.sin(walkPhase * 2.0) * (0.3 + speedFrac * 0.3);
        scarfTail.rotation.z = 0.2 + Math.sin(walkPhase * 2.2) * (0.2 + speedFrac * 0.25);
      } else {
        // Idle breathing and subtle ear twitch
        bodyPivot.position.y = 0.42 + Math.sin(clock * 1.9) * 0.015;
        bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, 0, delta * 10);
        tailMesh.rotation.y = Math.sin(clock * 0.9) * 0.12;
        earL.rotation.z = -0.2 + Math.sin(clock * 1.7) * 0.03;
        earR.rotation.z = 0.2 - Math.sin(clock * 1.7) * 0.03;
        scarfTailPivot.rotation.y = THREE.MathUtils.lerp(scarfTailPivot.rotation.y, 0, delta * 8);
      }

      // Basket bobs gently with the stride, more when it is heavy.
      basketGroup.position.y = 0.12 + (isMoving ? Math.sin(footFreq * 0.5) * 0.012 : 0);

      // Delivery celebration hop
      if (cheerTimer > 0) {
        cheerTimer -= delta;
        const jumpY = Math.sin(((0.45 - cheerTimer) / 0.45) * Math.PI) * 0.4;
        bodyPivot.position.y += jumpY;
        if (!reducedMotion) root.rotation.y += delta * 14;
      }
    },

    setBasketCount: (count: number) => {
      for (let i = 0; i < 6; i++) {
        basketModaks[i].visible = i < count;
      }
    },

    triggerDeliveryCheer: () => {
      cheerTimer = 0.45;
    },

    reset: (x: number = 0, z: number = 6.0, rotation: number = -Math.PI) => {
      root.position.set(x, 0, z);
      root.rotation.set(0, rotation, 0);
      bodyPivot.position.set(0, 0.42, 0);
      bodyPivot.rotation.set(0, 0, 0);
      footL.position.set(-0.16, FOOT_Y, 0.02);
      footR.position.set(0.16, FOOT_Y, 0.02);
      pawFL.position.z = 0.24;
      pawFR.position.z = 0.24;
      cheerTimer = 0;
      walkPhase = 0;
      dustTimer = 0;
      for (const p of dustPool) {
        p.life = 0;
        p.mesh.visible = false;
      }
      for (let i = 0; i < 6; i++) {
        basketModaks[i].visible = false;
      }
    },
  };
}
