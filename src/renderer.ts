import * as THREE from 'three';

export interface RendererSystem {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  updateCamera: (playerX?: number, playerZ?: number) => void;
  render: () => void;
  dispose: () => void;
  getScreenVectors: () => { forward: THREE.Vector3; right: THREE.Vector3 };
}

export function createRenderer(container: HTMLElement): RendererSystem {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111827); // Dark blue hour background

  const aspect = window.innerWidth / window.innerHeight;
  const isPortrait = window.innerHeight > window.innerWidth;
  const frustumSize = isPortrait ? 22 : 18;

  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    200
  );

  // Isometric-style 3/4 fixed camera angle looking down into scene
  // Default camera position: (18, 23, 27) aiming at (0, 0, -1)
  const baseCamPos = new THREE.Vector3(18, 23, 27);
  const baseLookAt = new THREE.Vector3(0, 0, -1);
  camera.position.copy(baseCamPos);
  camera.lookAt(baseLookAt);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(renderer.domElement);

  // Lighting setup for miniature festival diorama at blue hour
  // 1. Cool ambient / hemisphere fill
  const hemiLight = new THREE.HemisphereLight(0x6b8db5, 0x3d2817, 0.75);
  scene.add(hemiLight);

  // 2. Warm directional key light casting crisp, soft diorama shadows
  const keyLight = new THREE.DirectionalLight(0xffecd0, 1.4);
  keyLight.position.set(16, 26, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 70;
  keyLight.shadow.bias = -0.0004;

  const shadowD = 18;
  keyLight.shadow.camera.left = -shadowD;
  keyLight.shadow.camera.right = shadowD;
  keyLight.shadow.camera.top = shadowD;
  keyLight.shadow.camera.bottom = -shadowD;
  scene.add(keyLight);

  // 3. Subtle warm rim light to define silhouettes from the opposite corner
  const rimLight = new THREE.DirectionalLight(0xb57842, 0.45);
  rimLight.position.set(-18, 14, -14);
  scene.add(rimLight);

  // Dynamic camera update for mobile portrait following
  function updateCamera(playerX: number = 0, playerZ: number = 0) {
    const portrait = window.innerHeight > window.innerWidth;
    const currentAspect = window.innerWidth / window.innerHeight;
    const size = portrait ? 16 : 18;

    camera.left = (-size * currentAspect) / 2;
    camera.right = (size * currentAspect) / 2;
    camera.top = size / 2;
    camera.bottom = -size / 2;
    camera.updateProjectionMatrix();

    if (portrait) {
      // Gently follow player on portrait phones, keeping heading fixed
      const targetLookAt = new THREE.Vector3(playerX * 0.5, 0, playerZ * 0.5 - 1);
      camera.position.set(
        targetLookAt.x + baseCamPos.x * 0.75,
        targetLookAt.y + baseCamPos.y * 0.75,
        targetLookAt.z + baseCamPos.z * 0.75
      );
      camera.lookAt(targetLookAt);
    } else {
      camera.position.copy(baseCamPos);
      camera.lookAt(baseLookAt);
    }
  }

  // Calculate screen-relative ground forward and right vectors
  function getScreenVectors() {
    // Camera forward projected on ground XZ plane
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    // Camera right projected on ground XZ plane
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    // In Three.js, camDir points into screen (-Z in view space).
    // So "Screen UP" on the ground plane is camDir.
    // "Screen RIGHT" on the ground plane is -camRight.
    return {
      forward: camDir,
      right: camRight.negate(),
    };
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    updateCamera();
  }

  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    updateCamera,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
    getScreenVectors,
  };
}
