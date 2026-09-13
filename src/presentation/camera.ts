import * as THREE from 'three';

export interface CameraSystem {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  update: (playerX: number, playerZ: number) => void;
  getMovementBasis: () => { forward: THREE.Vector3; right: THREE.Vector3 };
  render: () => void;
  dispose: () => void;
}

export function createCameraSystem(container: HTMLElement): CameraSystem {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1320); // Atmospheric deep twilight / blue hour

  const aspect = window.innerWidth / window.innerHeight;
  const isPortrait = window.innerHeight > window.innerWidth;
  const frustumSize = isPortrait ? 23 : 19.5;

  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    200
  );

  // Isometric 3/4 camera angle framing the festival courtyard
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
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Insert canvas behind UI
  container.insertBefore(renderer.domElement, container.firstChild);

  // Lighting setup for miniature festival diorama at dusk
  // 1. Cool sky ambient fill
  const ambientLight = new THREE.AmbientLight(0xffedd5, 0.45);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x7599c4, 0x3d2919, 0.85);
  scene.add(hemiLight);

  // 2. Warm golden key light with soft shadow mapping
  const keyLight = new THREE.DirectionalLight(0xffe6b8, 1.55);
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

  // 3. Warm rim light to define silhouettes
  const rimLight = new THREE.DirectionalLight(0xc97a3a, 0.55);
  rimLight.position.set(-18, 14, -14);
  scene.add(rimLight);

  function update(playerX: number, playerZ: number) {
    const portrait = window.innerHeight > window.innerWidth;
    const currentAspect = window.innerWidth / window.innerHeight;
    const size = portrait ? 23 : 19.5;

    camera.left = (-size * currentAspect) / 2;
    camera.right = (size * currentAspect) / 2;
    camera.top = size / 2;
    camera.bottom = -size / 2;
    camera.updateProjectionMatrix();

    if (portrait) {
      // Gently follow player on portrait phones
      const targetLookAt = new THREE.Vector3(playerX * 0.45, 0, playerZ * 0.45 - 1);
      camera.position.set(
        targetLookAt.x + baseCamPos.x * 0.8,
        targetLookAt.y + baseCamPos.y * 0.8,
        targetLookAt.z + baseCamPos.z * 0.8
      );
      camera.lookAt(targetLookAt);
    } else {
      camera.position.copy(baseCamPos);
      camera.lookAt(baseLookAt);
    }
  }

  function getMovementBasis() {
    // Exact screen-horizontal RIGHT vector in world space, projected on ground plane
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    // Exact screen-vertical UP vector in world space, projected on ground plane
    const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    return { forward, right };
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
