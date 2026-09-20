import * as THREE from 'three';

export interface CameraSystem {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  update: (playerX: number, playerZ: number) => void;
  getMovementBasis: () => { forward: THREE.Vector3; right: THREE.Vector3 };
  projectToScreen: (x: number, z: number) => { x: number; y: number };
  setQuality: (level: 'high' | 'low') => void;
  render: () => void;
  dispose: () => void;
}

/**
 * Pick a starting quality tier from the device. Small-screen and low-memory
 * devices get no shadow map and a capped pixel ratio.
 */
function detectQuality(): 'high' | 'low' {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 480;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  return smallScreen || lowMemory ? 'low' : 'high';
}

export function createCameraSystem(container: HTMLElement): CameraSystem {
  const scene = new THREE.Scene();

  const width = () => container.clientWidth || window.innerWidth;
  const height = () => container.clientHeight || window.innerHeight;

  // Stable elevated three-quarter view. Pulled back and raised so Mushak, the
  // route ahead and the pandal share the frame.
  const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.5, 220);
  const baseCamPos = new THREE.Vector3(1.2, 12.4, 17.6);
  const baseLookAt = new THREE.Vector3(0.6, 0.6, -1.6);
  camera.position.copy(baseCamPos);
  camera.lookAt(baseLookAt);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width(), height());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // A small procedural dusk environment. Without it, metalness on the brass and
  // gold surfaces has nothing to reflect and they render as flat black holes.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 32;
  envCanvas.height = 64;
  const envCtx = envCanvas.getContext('2d')!;
  const envGrad = envCtx.createLinearGradient(0, 0, 0, 64);
  envGrad.addColorStop(0.0, '#241d45');
  envGrad.addColorStop(0.42, '#6b3d4a');
  envGrad.addColorStop(0.52, '#e09a54');
  envGrad.addColorStop(0.62, '#7a5340');
  envGrad.addColorStop(1.0, '#2a2226');
  envCtx.fillStyle = envGrad;
  envCtx.fillRect(0, 0, 32, 64);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  envTex.dispose();
  pmrem.dispose();

  // Insert canvas as first child under container
  container.insertBefore(renderer.domElement, container.firstChild);

  let quality: 'high' | 'low' = detectQuality();

  function applyQuality(next: 'high' | 'low') {
    quality = next;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, next === 'high' ? 2 : 1.25));
    renderer.shadowMap.enabled = next === 'high';
    renderer.shadowMap.needsUpdate = true;
    keyLight.castShadow = next === 'high';
  }

  // ---------------------------------------------------------------------------
  // GOLDEN HOUR LIGHTING
  // One shadow-casting key light plus soft fill. Lamp glow is carried by
  // emissive materials in the diorama, not by a light per lamp.
  // ---------------------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffe0bd, 0.5);
  scene.add(ambientLight);

  // Cool twilight sky bounce against warm sandstone ground.
  const hemiLight = new THREE.HemisphereLight(0x6f7fb0, 0x6a4530, 0.85);
  scene.add(hemiLight);

  // Warm low sun: long soft shadows from the right-rear.
  const keyLight = new THREE.DirectionalLight(0xffc178, 2.1);
  keyLight.position.set(16, 15, 9);
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.02;

  const d = 17;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.target.position.set(0, 0, -1);
  scene.add(keyLight);
  scene.add(keyLight.target);

  // Cool bounce from the dusk side, keeps the left of frame from going flat.
  const rimLight = new THREE.DirectionalLight(0x9a7fb8, 0.5);
  rimLight.position.set(-16, 9, -6);
  scene.add(rimLight);

  applyQuality(quality);

  function update(playerX: number, playerZ: number) {
    const portrait = height() > width();
    camera.aspect = width() / height();
    // Widen on portrait so the same courtyard reads without page scrolling.
    camera.fov = portrait ? 58 : 42;
    camera.updateProjectionMatrix();

    if (portrait) {
      // Sit lower and closer so the courtyard fills the tall frame instead of
      // leaving a broad band of empty distance above the play area.
      const tx = playerX * 0.5;
      const tz = playerZ * 0.45 - 1.6;
      camera.position.set(tx + 0.6, 11.6, tz + 14.2);
      camera.lookAt(tx + 0.2, 0.9, tz - 3.0);
    } else {
      const tx = baseLookAt.x + playerX * 0.26;
      const tz = baseLookAt.z + playerZ * 0.24;
      camera.position.set(baseCamPos.x + playerX * 0.26, baseCamPos.y, baseCamPos.z + playerZ * 0.2);
      camera.lookAt(tx, baseLookAt.y, tz);
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

  // Ground-plane point -> CSS pixel position, for HUD directional cues.
  const projVec = new THREE.Vector3();
  function projectToScreen(x: number, z: number) {
    camera.updateMatrixWorld();
    projVec.set(x, 0, z).project(camera);
    return {
      x: ((projVec.x + 1) / 2) * renderer.domElement.clientWidth,
      y: ((1 - projVec.y) / 2) * renderer.domElement.clientHeight,
    };
  }

  function onResize() {
    renderer.setSize(width(), height());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.25));
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  return {
    scene,
    camera,
    renderer,
    update,
    getMovementBasis,
    projectToScreen,
    setQuality: applyQuality,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      envRT.texture.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
