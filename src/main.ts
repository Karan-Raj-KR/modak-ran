/**
 * Main entry point — wires simulation and presentation together.
 *
 * This file is the ONLY place where both simulation and presentation are imported.
 * It runs the game loop, processes commands, and bridges the two systems.
 */

import './style.css';
import { COURTYARD_LEVEL } from './level/courtyard';
import { createSimulation, CONFIG } from './core/simulation';
import { createPresentation } from './contracts/presentation';
import type { GameCommand, GameSnapshot, AnyGameEvent } from './contracts';
import type { PresentationBasis } from './contracts/presentation';

function initApp() {
  const container = document.getElementById('game');
  if (!container) throw new Error('Game container #game not found');

  // ─── Simulation ──────────────────────────────────────────────────────────
  const sim = createSimulation(COURTYARD_LEVEL);

  // ─── Presentation ────────────────────────────────────────────────────────
  let presentation: ReturnType<typeof createPresentation> extends Promise<infer R> ? R : never;
  let lastTime = performance.now();
  let accumulator = 0;

  // Command handler
  function onCommand(command: GameCommand) {
    sim.processCommand(command);
  }

  // ─── Game Loop ───────────────────────────────────────────────────────────
  async function boot() {
    // Create presentation
    presentation = await createPresentation({
      root: container!,
      level: COURTYARD_LEVEL,
      onCommand,
    });

    // Give simulation the presentation's movement basis
    const basis = presentation.getMovementBasis();
    (sim as any).setMovementBasis(basis);

    // The simulation boots in the 'ready' phase: the courtyard is fully built
    // and rendering, but the round timer only starts when Play is pressed.
    presentation.render(sim.getSnapshot(), [], 0);

    // Start render loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function gameLoop(now: number) {
    requestAnimationFrame(gameLoop);

    const frameDelta = (now - lastTime) / 1000;
    lastTime = now;

    // Clamp frame delta to prevent spiral of death
    const clampedDelta = Math.min(frameDelta, CONFIG.MAX_CATCHUP);

    // Get current snapshot to check phase
    const snapshot = sim.getSnapshot();

    // Only advance simulation when playing
    if (snapshot.phase === 'playing') {
      accumulator += clampedDelta;

      // Fixed timestep simulation
      while (accumulator >= CONFIG.FIXED_TIMESTEP) {
        sim.step(CONFIG.FIXED_TIMESTEP);
        accumulator -= CONFIG.FIXED_TIMESTEP;
      }
    }

    // Get latest snapshot and events
    const latestSnapshot = sim.getSnapshot();
    const newEvents = sim.getEvents();

    // Update presentation movement basis (in case camera moved)
    const basis = presentation.getMovementBasis();
    (sim as any).setMovementBasis(basis);

    // Render
    presentation.render(latestSnapshot, newEvents, clampedDelta);
  }

  // ─── Dev-only automation handle ──────────────────────────────────────────
  // Lets a scripted browser run drive the real command path and read the real
  // authoritative state. Compiled out of production builds.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__modak = {
      send: (command: GameCommand) => sim.processCommand(command),
      snapshot: () => sim.getSnapshot(),
      level: COURTYARD_LEVEL,
      /** Dispatch a real keyboard event through the window listeners. */
      key: (type: 'keydown' | 'keyup', code: string) => {
        window.dispatchEvent(
          new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true })
        );
      },
      click: (id: string) => (document.getElementById(id) as HTMLButtonElement | null)?.click(),
    };
  }

  // ─── Visibility Handling ─────────────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const snap = sim.getSnapshot();
      if (snap.phase === 'playing') {
        sim.processCommand({ type: 'pause' });
      }
    }
  });

  // ─── Start ───────────────────────────────────────────────────────────────
  boot().catch((err) => {
    console.error('Failed to initialize:', err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
