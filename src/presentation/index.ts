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
import { createDebugOverlay } from './debug';
import { PresentationAudio } from './audio';

export async function createPresentation(
  opts: CreatePresentationOptions
): Promise<Presentation> {
  const audio = new PresentationAudio();
  const cameraSys = createCameraSystem(opts.root);
  const diorama = createDiorama(cameraSys.scene, opts.level);
  const mushak = createMushak(cameraSys.scene);
  const collectibles = createCollectibles(cameraSys.scene, opts.level);
  const hud = createHUD(opts.root, audio);
  const debug = createDebugOverlay(cameraSys.scene, opts.level);

  const deliveryTarget = opts.level.deliveryZone.position;
  hud.setTotalCollectibles(opts.level.collectibles.length);

  hud.onCommand((cmd: GameCommand) => {
    opts.onCommand(cmd);
  });

  const reducedMotionQuery =
    window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;

  let currentRoundId = -1;

  /**
   * Screen-space bearing from Mushak to the pandal, for the "return to the
   * pandal" arrow. Uses the live camera so it holds on both framings.
   */
  function pandalBearing(playerX: number, playerZ: number): number {
    const a = cameraSys.projectToScreen(playerX, playerZ);
    const b = cameraSys.projectToScreen(deliveryTarget.x, deliveryTarget.z);
    // CSS screen Y grows downward, so negate to get a conventional angle.
    return (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
  }

  return {
    render: (snapshot: GameSnapshot, events: AnyGameEvent[], delta: number) => {
      const now = performance.now() * 0.001;
      const reducedMotion = reducedMotionQuery?.matches ?? false;

      // Reset round on new round ID
      if (snapshot.roundId !== currentRoundId) {
        currentRoundId = snapshot.roundId;
        mushak.reset(snapshot.player.position.x, snapshot.player.position.z, snapshot.player.heading);
        collectibles.reset();
        diorama.reset();
      }

      diorama.update(now, delta);
      collectibles.update(now, delta);

      // Rendering follows the simulation: exactly the items the sim still
      // considers collectible are on the ground.
      collectibles.sync(snapshot.activeCollectibleIds);

      // Mushak. Y is pinned to the courtyard floor; the model is authored so
      // its feet rest at y=0.
      const px = snapshot.player.position.x;
      const pz = snapshot.player.position.z;
      mushak.root.position.x = px;
      mushak.root.position.y = 0;
      mushak.root.position.z = pz;

      const speed = Math.hypot(snapshot.player.velocity.x, snapshot.player.velocity.z);
      mushak.update(delta, speed, snapshot.player.heading, snapshot.player.movementState === 'scurrying', reducedMotion);
      mushak.setBasketCount(snapshot.cargo.count);

      cameraSys.update(px, pz);

      const basketFull = snapshot.cargo.count >= snapshot.cargo.capacity;
      diorama.setDeliveryEmphasis(basketFull && snapshot.phase === 'playing');

      // Process one-shot batch events
      for (const evt of events) {
        switch (evt.type) {
          case 'pickedUp': {
            audio.playPickup(evt.basketCount);
            collectibles.triggerPickupEffect(evt.itemId);
            const p = cameraSys.projectToScreen(evt.position.x, evt.position.z);
            hud.floatText('+1', p.x, p.y - 26, '#ffd873');
            break;
          }
          case 'delivered':
            audio.playDelivery();
            mushak.triggerDeliveryCheer();
            diorama.triggerDeliveryEffect(evt.count, !reducedMotion);
            hud.showDelivery(evt.count, evt.pointsEarned, evt.fullBasketBonus);
            break;
          case 'scurryStarted':
            audio.playScurry();
            break;
          case 'roundEnded':
            audio.playRoundEnd();
            break;
          case 'basketFull':
            // The persistent top cue already carries this message; a toast on
            // top of it would just duplicate it.
            audio.playBasketFull();
            break;
        }
      }

      hud.update(
        snapshot,
        basketFull ? pandalBearing(px, pz) : null
      );

      debug.update(snapshot);

      if (import.meta.env.DEV) {
        // Read the rendered world position of each modak holder so an automated
        // run can assert it matches the authoritative spawn position.
        (window as unknown as Record<string, unknown>).__modakVisual = {
          collectibles: opts.level.collectibles.map((c) => {
            const rendered = collectibles.renderedPosition(c.id);
            return {
              id: c.id,
              authoritative: { x: c.position.x, z: c.position.z },
              rendered,
            };
          }),
          playerRendered: {
            x: mushak.root.position.x,
            y: mushak.root.position.y,
            z: mushak.root.position.z,
          },
        };
      }

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
