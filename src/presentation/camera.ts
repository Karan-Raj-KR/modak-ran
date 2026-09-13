import * as THREE from 'three';

export interface CameraSystem {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  update: (playerX: number, playerZ: number) => void;
  getMovementBasis: () => { forward: THREE.Vector3; right: THREE.Vector3 };
  render: () => void;
  dispose: () => void;
}

export function createCameraSystem(container: HTMLElement): CameraSystem {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x281e3a);

  const aspect = window.innerWidth / window.innerHeight;
  // Elevated 3/4 perspective matching the approved visual specification
  const camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 200);

  // Balanced camera framing: stall on left, shrine on right, central plaza in focus
  const baseCamPos = new THREE.Vector3(0.5, 7.6, 13.8);
  const baseLookAt = new THREE.Vector3(0.3, 1.0, -0.2);
  camera.position.copy(baseCamPos);
  camera.lookAt(baseLookAt);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Insert canvas as first child under container
  container.insertBefore(renderer.domElement, container.firstChild);

  // ---------------------------------------------------------------------------
  // SCENIC SUNSET TWILIGHT BACKDROP & RIVER
  // ---------------------------------------------------------------------------
  // 1. Panoramic Sunset Sky Backdrop Mesh
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d')!;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0.0, '#1a1836'); // Zenith deep indigo
  skyGrad.addColorStop(0.25, '#2e2048'); // Twilight violet
  skyGrad.addColorStop(0.50, '#5f2f53'); // Dusk magenta
  skyGrad.addColorStop(0.70, '#a85044'); // Sunset terracotta orange
  skyGrad.addColorStop(0.86, '#d97b3a'); // Warm amber horizon
  skyGrad.addColorStop(1.0, '#f5ba63');  // Golden glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Distant glowing evening stars
  ctx.fillStyle = 'rgba(255, 255, 235, 0.8)';
  for (let s = 0; s < 50; s++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 220;
    const sr = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  // Large flat panoramic backdrop spanning the entire rear horizon
  const skyBackdropGeo = new THREE.PlaneGeometry(160, 80);
  const skyBackdropMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    depthWrite: false,
  });
  const skyBackdrop = new THREE.Mesh(skyBackdropGeo, skyBackdropMat);
  skyBackdrop.position.set(0, 24, -36);
  scene.add(skyBackdrop);

  // 2. Reflective River Plane along the back horizon
  const riverGeo = new THREE.PlaneGeometry(120, 35);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x1c2b44,
    roughness: 0.18,
    metalness: 0.82,
  });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -1.0, -22);
  scene.add(river);

  // 3. Distant Ancient Mandir Temple Silhouettes across the river
  const templeGroup = new THREE.Group();
  templeGroup.position.set(0, -0.8, -26);

  const matTemple = new THREE.MeshBasicMaterial({ color: 0x221832 });
  const matWindowDiya = new THREE.MeshBasicMaterial({ color: 0xffb73b });

  const templeDefs = [
    { x: -28, w: 5.5, h: 7.5, spireH: 4.8 },
    { x: -19, w: 4.5, h: 6.0, spireH: 4.0 },
    { x: -11, w: 3.8, h: 8.5, spireH: 5.2 },
    { x: -3,  w: 4.8, h: 6.5, spireH: 4.5 },
    { x: 5,   w: 4.0, h: 8.0, spireH: 5.0 },
    { x: 14,  w: 4.8, h: 6.2, spireH: 4.2 },
    { x: 23,  w: 5.5, h: 9.0, spireH: 5.8 },
  ];

  templeDefs.forEach((t) => {
    // Mandir sanctum body
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, 2.5), matTemple);
    body.position.set(t.x, t.h / 2, 0);
    templeGroup.add(body);

    // Carved Shikhara tower spire
    const spire = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.55, t.spireH, 4), matTemple);
    spire.position.set(t.x, t.h + t.spireH / 2, 0);
    spire.rotation.y = Math.PI / 4;
    templeGroup.add(spire);

    // Kalash pinnacle
    const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), matTemple);
    kalash.position.set(t.x, t.h + t.spireH + 0.35, 0);
    templeGroup.add(kalash);

    // Twinkling Diya window
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), matWindowDiya);
    win.position.set(t.x, t.h * 0.65, 1.3);
    templeGroup.add(win);
  });
  scene.add(templeGroup);

  // ---------------------------------------------------------------------------
  // GOLDEN HOUR SUNSET LIGHTING & ATMOSPHERE
  // ---------------------------------------------------------------------------
  // 1. Soft ambient illumination
  const ambientLight = new THREE.AmbientLight(0xffe2c4, 0.65);
  scene.add(ambientLight);

  // 2. Hemisphere light: cool twilight sky against warm sandstone ground
  const hemiLight = new THREE.HemisphereLight(0x7387b3, 0x5a3b26, 0.75);
  scene.add(hemiLight);

  // 3. Warm golden sunset directional key light casting long soft shadows
  const keyLight = new THREE.DirectionalLight(0xffcb85, 1.95);
  keyLight.position.set(10, 16, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 45;
  keyLight.shadow.bias = -0.0004;

  const d = 16;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  scene.add(keyLight);

  // 4. Subtle cool rim light from the left horizon
  const rimLight = new THREE.DirectionalLight(0xc9825b, 0.8);
  rimLight.position.set(-14, 10, -8);
  scene.add(rimLight);

  function update(playerX: number, playerZ: number) {
    const isPortrait = window.innerHeight > window.innerWidth;
    const currentAspect = window.innerWidth / window.innerHeight;
    camera.aspect = currentAspect;
    camera.fov = isPortrait ? 52 : 44;
    camera.updateProjectionMatrix();

    if (isPortrait) {
      // Follow player dynamically on portrait mobile screens
      const targetX = playerX * 0.55 + 0.2;
      const targetZ = playerZ * 0.5 - 0.5;
      camera.position.set(
        targetX + baseCamPos.x * 0.75,
        baseCamPos.y * 1.15,
        targetZ + baseCamPos.z * 0.95
      );
      camera.lookAt(targetX, 0.8, targetZ - 1.0);
    } else {
      // Dynamic tracking on landscape desktop so player is always in frame
      const targetX = baseLookAt.x + playerX * 0.35;
      const targetZ = baseLookAt.z + playerZ * 0.35;
      camera.position.set(
        baseCamPos.x + playerX * 0.35,
        baseCamPos.y,
        baseCamPos.z + playerZ * 0.28
      );
      camera.lookAt(targetX, baseLookAt.y, targetZ);
    }
  }

  // Camera-relative movement basis: Screen Up = Courtyard Forward (into screen)
  function getMovementBasis() {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    return { forward, right };
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    update(0, 0);
  }

  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    update,
    getMovementBasis,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
