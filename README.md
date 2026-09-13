# Mushak's Modak Run 🐭🪔

A genuinely 3D miniature festival diorama game for Ganesh Chaturthi, built with Three.js, TypeScript, and Vite. Guide 3D Mushak around an authentic 3D courtyard, collect modak sweets, and deliver them to the pandal before the 60-second festival round expires.

## Run Locally

```sh
npm install
npm run dev
```

Open the Vite URL (typically `http://localhost:5174` or `http://localhost:5175`).

Build for production:
```sh
npm run build
```

Run unit tests:
```sh
npm test
```

## How to Play & Controls

- **Desktop Keyboard:**
  - `W` / `A` / `S` / `D` or **Arrow Keys**: Move Mushak (camera-relative ground motion with wall sliding).
  - `Space`: **Scurry** speed burst (0.25-second dash, 3-second cooldown).
  - `P` or Pause icon: Pause/Resume.
  - Sound icon: Toggle synthesized festival audio.
- **Mobile Touch Devices:**
  - **Virtual Thumbstick** (bottom-left) for smooth analog directional movement.
  - **Scurry Action Button** (bottom-right) with cooldown indicator ring.

## Game Rules

- **Round Time:** 60 seconds per round.
- **Basket Capacity:** Mushak carries up to 6 modaks at once (miniature modaks visually fill the back basket).
- **Delivery Zone:** Accessible ground pad with ceremonial rangoli at (+7, -5) in front of the festive pandal.
- **Score:** 1 point per delivered modak. Undelivered modaks held at round end remain safe in the basket but do not score.
- **Goal:** Deliver as many of the 42 modaks as possible, or deliver all 42 before the timer expires!

## Architecture

- `src/main.ts`: Application orchestrator, game loop with delta clamping, and state machine (`LOADING` → `READY` → `PLAYING` ↔ `PAUSED` → `RESULTS`).
- `src/renderer.ts`: Three.js WebGLRenderer with ACES Filmic tone mapping, PCF soft shadows, and fixed 3/4 orthographic camera (with mobile portrait following).
- `src/courtyard.ts`: Complete 3D diorama geometry: raised terracotta plinth, carved sandstone curbs and pillars, brass samai lamps, decorative festival pandal shrine, sweet preparation stall, and planted foliage islands.
- `src/mushak.ts`: Stylized 3D mouse model with pear body, cream belly, snout, eyes, broad ears with inner surfaces, paws, curved tail, vermilion scarf, wicker basket, and walk/idle/cheer animations.
- `src/collectibles.ts`: 3D pleated cream modaks resting on banana leaf plates with floating animations and pickup effects.
- `src/movement.ts`: Ground-plane character physics with collision sliding and scurry speed burst mechanics.
- `src/map.ts`: World coordinate boundaries, obstacle box colliders, delivery zone, and 42 fixed walkable modak points.
- `src/rules.ts`: Pure rules engine (`CAPACITY`, `collect`, `deliver`, `end`, `freshRound`).
- `src/ui.ts`: Clean HTML/CSS HUD, start panel, pause overlay, results screen, and virtual touch joystick.
- `src/audio.ts`: Synthesized Web Audio API sound generator (chimes, temple bell delivery chord, scurry whoosh, gong).

## Credits & Rights

- Engine: Three.js (MIT), Vite, TypeScript.
- Geometry & Art: 100% custom procedural Three.js geometry and materials. No external models, textures, or third-party image assets required.
- Audio: Custom Web Audio API procedural synthesis.
