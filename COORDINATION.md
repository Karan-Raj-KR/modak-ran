# Coordination — Modak Run Dual-Workspace Development

## Workspace Structure

### Mechanics Workspace (Simulation + Physics)
- **Path:** `/Users/karanrajkr/Projects/modak`
- **Branch:** `mechanics`
- **Base Commit:** `43415f7` (shared foundation)
- **Ownership:** Simulation, physics, movement, gameplay rules, tests, build config
- **Dev Command:** `npm run dev` (port 5173)
- **Test Command:** `npm test`

### Visual Workspace (Presentation + Art)
- **Path:** `/Users/karanrajkr/Projects/modak-visuals`
- **Branch:** `visuals`
- **Base Commit:** `43415f7` (shared foundation)
- **Ownership:** Three.js presentation, canvas, camera, HTML, keyboard/touch input, audio, visual effects
- **Dev Command:** `npm run dev` (port 5174)

## Shared Foundation (Frozen)

These paths are **frozen** while both agents work:

- `src/contracts/**` — Typed interfaces (level, snapshot, events, commands, presentation)
- `src/level/**` — Level definitions (courtyard layout, colliders, collectibles)
- `COORDINATION.md` — This file

## Ownership After Shared Foundation

### Simulation Agent (Mechanics)
- `src/core/**` — Game loop, state machine, scoring
- `src/physics/**` — Rapier integration, character controller
- `src/gameplay/**` — Movement, scurry, cargo, traction
- `tests/gameplay/**` — Gameplay mechanics tests
- `src/main.ts` — Application entry point
- `package.json`, `vite.config.ts`, `tsconfig.json` — Build configuration
- `README.md` — Documentation

### Visual Agent (Gemini)
- `src/presentation/**` — Three.js scene, camera, visuals, audio
- `public/art/**` — Art assets
- `public/audio/**` — Audio assets
- `tests/presentation/**` — Visual tests
- `docs/VISUAL_HANDOFF.md` — Visual documentation

## Contract API

The presentation communicates with the simulation through:

1. **`createPresentation({ root, level, onCommand })`** — Creates the visual layer
2. **`presentation.render(snapshot, events, dt)`** — Receives read-only game state
3. **`presentation.getMovementBasis()`** — Gets camera-relative movement vectors
4. **`onCommand(command)`** — Sends user input to simulation

Commands: `start`, `pause`, `resume`, `restart`, `move`, `scurry`, `setMuted`

Events: `pickedUp`, `delivered`, `scurryStarted`, `bumped`, `roundEnded`, `basketFull`, `surfaceChanged`

## Integration Protocol

1. Each agent commits independently on their own branch
2. Do NOT modify shared paths (`src/contracts/**`, `src/level/**`, `COORDINATION.md`)
3. When both agents complete, coordinate integration on `mechanics` branch
4. The simulation agent owns final integration and dependency changes

## Preview Commands

### Mechanics Preview
```bash
cd /Users/karanrajkr/Projects/modak
npm run dev
# Open http://localhost:5173
```

### Visual Preview
```bash
cd /Users/karanrajkr/Projects/modak-visuals
npm run dev
# Open http://localhost:5174
```

### Visual Preview (Standalone)
```bash
cd /Users/karanrajkr/Projects/modak-visuals
# Open src/presentation/index.html directly in browser
```

## Status

- [x] Shared foundation committed (`43415f7`)
- [x] Visual worktree created at `../modak-visuals`
- [x] Both branches created from shared foundation
- [ ] Simulation agent: Mechanics complete
- [ ] Visual agent: Presentation complete
- [ ] Integration
