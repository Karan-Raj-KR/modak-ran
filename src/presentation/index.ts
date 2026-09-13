import {
  GameSnapshot,
  AnyGameEvent,
  GameCommand,
  Presentation,
  PresentationBasis,
  CreatePresentationOptions,
} from '../contracts';
import { createCameraSystem } from './camera';
import { createDiorama } from './diorama';
import { createMushak } from './mushak';
import { createCollectibles } from './collectibles';
import { createHUD } from './hud';
import { PresentationAudio } from './audio';

export async function createPresentation(
  opts: CreatePresentationOptions
): Promise<Presentation> {
  const audio = new PresentationAudio();
  const cameraSys = createCameraSystem(opts.root);
  const diorama = createDiorama(cameraSys.scene);
  const mushak = createMushak(cameraSys.scene);
  const collectibles = createCollectibles(cameraSys.scene);
  const hud = createHUD(opts.root, audio);

  hud.onCommand((cmd: GameCommand) => {
    opts.onCommand(cmd);
  });

  let currentRoundId = -1;

  return {
    render: (snapshot: GameSnapshot, events: AnyGameEvent[], delta: number) => {
      const now = performance.now() * 0.001;

      // Reset round on new round ID
      if (snapshot.roundId !== currentRoundId) {
        currentRoundId = snapshot.roundId;
        mushak.reset(snapshot.player.position.x, snapshot.player.position.z, snapshot.player.heading);
        collectibles.reset();
      }

      // Update diorama details and collectibles idle bobbing
      diorama.update(now);
      collectibles.update(now, delta);

      // Mushak visual transforms & animation
      mushak.root.position.x = snapshot.player.position.x;
      mushak.root.position.z = snapshot.player.position.z;
      const speed = Math.hypot(snapshot.player.velocity.x, snapshot.player.velocity.z);
      const isMoving = snapshot.player.movementState === 'walking' || snapshot.player.movementState === 'scurrying';
      const isScurrying = snapshot.player.movementState === 'scurrying';

      mushak.update(
        delta,
        isMoving,
        isScurrying,
        speed,
        snapshot.player.heading
      );
      mushak.setBasketCount(snapshot.cargo.count);

      // Camera follows player
      cameraSys.update(snapshot.player.position.x, snapshot.player.position.z);

      // Process one-shot batch events
      for (const evt of events) {
        switch (evt.type) {
          case 'pickedUp':
            audio.playPickup(evt.basketCount);
            collectibles.triggerPickupEffect(evt.itemId);
            break;
          case 'delivered':
            audio.playDelivery();
            mushak.triggerDeliveryCheer();
            diorama.triggerDeliveryEffect(evt.count);
            break;
          case 'scurryStarted':
            audio.playScurry();
            break;
          case 'roundEnded':
            audio.playRoundEnd();
            break;
          case 'basketFull':
            hud.showWarning('Basket Full! Deliver to Pandal');
            break;
        }
      }

      // Update UI HUD
      hud.update(snapshot);

      // Render 3D Scene
      cameraSys.render();
    },

    getMovementBasis: (): PresentationBasis => {
      const basis = cameraSys.getMovementBasis();
      return {
        right: { x: basis.right.x, y: basis.right.y, z: basis.right.z },
        forward: { x: basis.forward.x, y: basis.forward.y, z: basis.forward.z },
      };
    },

    dispose: () => {
      cameraSys.dispose();
      hud.dispose();
    },
  };
}
