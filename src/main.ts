import './style.css';
import { CAPACITY, freshRound, collect, deliver, end, Round } from './rules';
import { isInDeliveryZone } from './map';
import { GameState } from './types';
import { createRenderer } from './renderer';
import { createCourtyard } from './courtyard';
import { createMushak } from './mushak';
import { createCollectibles } from './collectibles';
import { createMovement } from './movement';
import { createInput } from './input';
import { createUI } from './ui';
import { sound } from './audio';

function initApp() {
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container element #game not found');
  }

  // 1. Initialize Renderer and Scene
  const rendererSystem = createRenderer(container);
  const { scene, render, updateCamera, getScreenVectors } = rendererSystem;

  // 2. Initialize Courtyard Diorama
  const courtyard = createCourtyard(scene);

  // 3. Initialize Mushak 3D Character
  const mushak = createMushak(scene);

  // 4. Initialize Collectibles (42 Modaks)
  const collectibles = createCollectibles(scene);

  // 5. Initialize Movement Controller
  const movement = createMovement(scene);

  // 6. Initialize UI Overlay
  const ui = createUI(container);

  // 7. Initialize Input Handling
  const input = createInput();

  // Connect Scurry trigger
  function handleScurry() {
    if (gameState === 'PLAYING') {
      movement.triggerScurry();
    }
  }
  input.onScurryTrigger(handleScurry);
  ui.onScurryButton(handleScurry);

  // 8. Game State & Round Management
  let gameState: GameState = 'READY';
  let round: Round = freshRound();
  let roundTimer = 60.0;
  let personalBest = 0;

  try {
    const savedPB = localStorage.getItem('modak_pb');
    if (savedPB) personalBest = parseInt(savedPB, 10) || 0;
  } catch {
    // Graceful fallback if localStorage is disabled
  }

  function startRound() {
    round = freshRound();
    roundTimer = 60.0;
    movement.reset(0, 6.0);
    mushak.reset(0, 6.0);
    collectibles.reset();
    input.reset();

    gameState = 'PLAYING';
    ui.setGameState(gameState);
    ui.updateHUD(roundTimer, round.delivered, round.basket, movement.state.scurryCooldown);
  }

  function finishRound() {
    gameState = 'RESULTS';
    end(round);

    if (round.delivered > personalBest) {
      personalBest = round.delivered;
      try {
        localStorage.setItem('modak_pb', String(personalBest));
      } catch {
        // ignore
      }
    }

    sound.playRoundEnd();
    ui.setGameState(gameState);
    ui.showResults(round.delivered, round.basket, personalBest);
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      ui.setGameState(gameState);
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      ui.setGameState(gameState);
    }
  }

  // Hook UI buttons
  ui.onStartGame(startRound);
  ui.onPauseToggle(togglePause);
  ui.onRestartGame(startRound);

  // Auto-pause when tab is hidden to avoid game state jumps
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'PLAYING') {
      gameState = 'PAUSED';
      ui.setGameState(gameState);
    }
  });

  // 9. Main Game Loop
  let lastTime = performance.now();

  function gameLoop(now: number) {
    requestAnimationFrame(gameLoop);

    const rawDelta = (now - lastTime) / 1000;
    lastTime = now;
    // Clamp delta to prevent big leaps on frame drops
    const delta = Math.min(rawDelta, 0.1);
    const elapsedTime = now * 0.001;

    // Update courtyard animated details (pulsing delivery ring)
    courtyard.update(elapsedTime);

    // Update collectibles idle bobbing
    collectibles.update(elapsedTime, delta);

    if (gameState === 'PLAYING') {
      // 1. Process Input
      const keyIn = input.getInput();
      const touchIn = ui.getTouchInput();
      const combinedInput = {
        x: Math.abs(touchIn.x) > 0.1 ? touchIn.x : keyIn.x,
        y: Math.abs(touchIn.y) > 0.1 ? touchIn.y : keyIn.y,
      };

      if (input.consumeScurry()) {
        movement.triggerScurry();
      }

      // 2. Update Movement & Collisions
      const screenVectors = getScreenVectors();
      movement.update(delta, combinedInput, screenVectors);

      // 3. Update Mushak Visual Position & Animation
      mushak.root.position.x = movement.state.x;
      mushak.root.position.z = movement.state.z;

      const currentSpeed = Math.hypot(movement.state.vx, movement.state.vz);
      mushak.update(
        delta,
        movement.state.isMoving,
        movement.state.isScurrying,
        currentSpeed,
        movement.state.rotation
      );

      // 4. Collectibles Pickup Check
      const canCollect = round.basket < CAPACITY;
      const pickedId = collectibles.checkPickup(movement.state.x, movement.state.z, canCollect);

      if (pickedId !== null) {
        collect(round, pickedId);
        sound.playPickup(round.basket);
        mushak.setBasketCount(round.basket);
      } else if (!canCollect) {
        // If near collectible but at capacity, show warning
        const nearAny = collectibles.checkPickup(movement.state.x, movement.state.z, true);
        if (nearAny !== null) {
          ui.showFullBasketWarning();
        }
      }

      // 5. Pandal Delivery Zone Check
      if (isInDeliveryZone(movement.state.x, movement.state.z) && round.basket > 0) {
        const deliveredCount = deliver(round);
        if (deliveredCount > 0) {
          sound.playDelivery();
          mushak.triggerDeliveryCheer();
          mushak.setBasketCount(0);

          // If all 42 modaks delivered, complete round early
          if (round.delivered >= 42) {
            finishRound();
            return;
          }
        }
      }

      // 6. Round Timer Countdown
      roundTimer = Math.max(0, roundTimer - delta);
      if (roundTimer <= 0) {
        finishRound();
        return;
      }

      // 7. Update HUD
      ui.updateHUD(roundTimer, round.delivered, round.basket, movement.state.scurryCooldown);
    } else if (gameState === 'READY' || gameState === 'PAUSED' || gameState === 'RESULTS') {
      // Idle animation when not actively playing
      mushak.update(delta, false, false, 0, movement.state.rotation);
    }

    // Camera following on mobile portrait mode
    updateCamera(movement.state.x, movement.state.z);

    // Render 3D Scene
    render();
  }

  // Set initial UI state
  ui.setGameState('READY');
  requestAnimationFrame(gameLoop);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
