import { GameSnapshot, PresentationCommand, PresentationInstance } from '../contracts/presentation';
import { createCameraSystem } from './camera';
import { createDiorama } from './diorama';
import { createMushak } from './mushak';
import { createCollectibles } from './collectibles';
import { createHUD } from './hud';
import { PresentationAudio } from './audio';

export function createPresentation(container: HTMLElement): PresentationInstance {
  const audio = new PresentationAudio();
  const cameraSys = createCameraSystem(container);
  const diorama = createDiorama(cameraSys.scene);
  const mushak = createMushak(cameraSys.scene);
  const collectibles = createCollectibles(cameraSys.scene);
  const hud = createHUD(container, audio);

  // Command handlers
  let clientCommandHandler: ((cmd: PresentationCommand) => void) | null = null;
  hud.onCommand((cmd) => {
    if (clientCommandHandler) clientCommandHandler(cmd);
  });

  // Track processed event IDs to avoid replay
  const processedEventKeys = new Set<string>();
  let currentRoundId = -1;

  return {
    render: (snapshot: GameSnapshot, delta: number) => {
      const now = performance.now() * 0.001;

      // Handle round reset
      if (snapshot.roundId !== currentRoundId) {
        currentRoundId = snapshot.roundId;
        processedEventKeys.clear();
        mushak.reset(snapshot.player.x, snapshot.player.z, snapshot.player.heading);
        collectibles.reset();
      }

      // Update 3D elements
      diorama.update(now);
      collectibles.update(now, delta);

      // Mushak visual position & animation
      mushak.root.position.x = snapshot.player.x;
      mushak.root.position.z = snapshot.player.z;
      mushak.update(
        delta,
        snapshot.player.isMoving,
        snapshot.player.isScurrying,
        snapshot.player.speed,
        snapshot.player.heading
      );
      mushak.setBasketCount(snapshot.basketCount);

      // Camera follows player smoothly
      cameraSys.update(snapshot.player.x, snapshot.player.z);

      // Process new snapshot events once
      snapshot.events.forEach((evt, idx) => {
        const key = `${snapshot.roundId}-${evt.type}-${idx}`;
        if (!processedEventKeys.has(key)) {
          processedEventKeys.add(key);

          if (evt.type === 'pickup') {
            audio.playPickup(evt.basketCount);
            collectibles.triggerPickupEffect(evt.id);
          } else if (evt.type === 'delivery') {
            audio.playDelivery();
            mushak.triggerDeliveryCheer();
            diorama.triggerDeliveryEffect(evt.count);
          } else if (evt.type === 'scurry') {
            audio.playScurry();
          } else if (evt.type === 'round_end') {
            audio.playRoundEnd();
          }
        }
      });

      // Update UI HUD
      hud.update(snapshot);

      // Render 3D Scene
      cameraSys.render();
    },

    getMovementBasis: () => cameraSys.getMovementBasis(),

    onCommand: (handler: (cmd: PresentationCommand) => void) => {
      clientCommandHandler = handler;
    },

    dispose: () => {
      cameraSys.dispose();
      hud.dispose();
    },
  };
}
