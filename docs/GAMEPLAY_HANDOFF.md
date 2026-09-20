# Gameplay Handoff — Mechanics Branch

## What Works

### Physics Engine
- **Rapier 3D** integration with kinematic character controller
- Capsule collider (radius: 0.32, halfHeight: 0.35)
- Fixed timestep simulation (1/60 second)
- Collision-aware movement with wall sliding
- Gravity and ground handling
- Snap-to-ground for smooth terrain traversal

### Movement System
- Camera-relative input (WASD/Arrows + touch)
- Diagonal normalization (no faster movement diagonally)
- Smooth acceleration (22 units/s²) and braking (30 units/s²)
- Normal speed: 4.8 units/second
- Movement basis from presentation camera

### Scurry Mechanic
- Space/touch activation
- Requires nonzero movement intent
- Locks direction at activation
- Speed: 8.5 units/second
- Duration: 0.28 seconds
- Cooldown: 2.5 seconds
- Emits `scurryStarted` event for presentation

### Cargo System
- 6-item capacity
- Full basket: 10% speed penalty
- Pickup radius: 0.75 units
- Items tracked by ID
- Prevents duplicate collection

### Traction System
- Surface zones defined in level
- Wet stone zone (65% traction)
- Affects acceleration/braking
- Emits `surfaceChanged` event

### Game Rules
- State machine: loading → ready → playing ↔ paused → results
- 60-second round timer
- 42 collectibles
- Delivery zone at (7, -5)
- Personal best persistence
- Pause on tab hide
- Clean restart across rounds
- Final-tick collection/delivery ordering documented

## Architecture

### Contract Boundary
- `src/contracts/` — Typed interfaces (frozen)
- `src/core/simulation.ts` — Authoritative game state
- `src/physics/rapier.ts` — Rapier integration
- `src/level/courtyard.ts` — Level definition
- `src/presentation/` — Placeholder for Gemini

### Data Flow
```
Presentation → onCommand(command) → Simulation
Simulation → render(snapshot, events, dt) → Presentation
```

### Events Emitted
- `pickedUp` — Item collected
- `delivered` — Basket unloaded
- `scurryStarted` — Burst activated
- `bumped` — Wall collision
- `roundEnded` — Timer expired or all delivered
- `basketFull` — Capacity reached
- `surfaceChanged` — Traction zone transition

## Tuning Values

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Normal Speed | 4.8 u/s | Responsive but not twitchy |
| Scurry Speed | 8.5 u/s | ~77% boost, feels impactful |
| Scurry Duration | 0.28s | Short burst, requires timing |
| Scurry Cooldown | 2.5s | Prevents spam, adds strategy |
| Capsule Radius | 0.32u | Fits through 1-unit gaps |
| Pickup Radius | 0.75u | Forgiving but not huge |
| Full Basket Penalty | 10% | Noticeable but not punishing |

## Physics Limitations

1. **No slope physics** — Ramps approximated as boxes
2. **No ragdoll** — Intentional kinematic control
3. **Fixed timestep** — May feel different at very low FPS
4. **Simplified碰撞** — Capsule vs static only

## Tests Written

- Capacity, pickup uniqueness, delivery uniqueness
- Timer, pause, final-tick ordering
- Clean restart across multiple rounds
- Camera-relative directional mapping
- Diagonal speed normalization
- Scurry activation, cooldown, collision
- Surface transitions
- No movement when paused
- Storage failure resilience

## How to Run

```bash
cd /Users/karanrajkr/Projects/modak
npm install
npm run dev
# Open http://localhost:5173

# Run tests
npm test

# Build for production
npm run build
```

## Requests for Gemini

1. **Presentation must call `getMovementBasis()`** to get camera-relative vectors
2. **Events are one-shot** — do not replay on subsequent frames
3. **Snapshot is read-only** — never mutate game state from presentation
4. **Dispose resources** — call `presentation.dispose()` on cleanup
5. **No input capture conflicts** — presentation owns keyboard/touch
6. **Audio via events** — use `pickedUp`, `delivered`, `scurryStarted` events

## Known Issues

1. WASM warning in Node.js tests (cosmetic)
2. Large bundle size from Rapier WASM (787KB gzipped 184KB)
3. Presentation placeholder needs full Three.js implementation
