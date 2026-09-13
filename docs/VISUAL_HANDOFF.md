# Visual Handoff — Modak Run 3D Redesign

## 1. What Was Redesigned

### Complete Overhaul of the Visual Experience
1. **Courtyard Paving & Ground:**
   - Completely eliminated the thick beige grout lines and checkerboard square tiles that dominated the previous composition.
   - Built a seamless, fine-grain terracotta courtyard slab with subtle running sandstone bands that naturally guide player navigation.
   - Added a low-traction wet stone area near the preparation stall with realistic water specular sheen.
   - Grounded the diorama on a shallow, beveled sandstone plinth with soft ambient perimeter contact shadows, eliminating the thick floating slab look.

2. **Hero 3D Mushak:**
   - Scaled the character up by ~1.32x for prominent readability and charm at normal camera distance.
   - Modeled with pear-shaped body, cream belly patch, tapered snout with whiskers, dark nose tip, visible glossy eyes with bright highlights, and broad ears with soft pink inner surfaces.
   - Four distinct running paws with animated stride cadence.
   - Dynamic vermilion scarf with animated flutter tails.
   - Curved tube tail with playful follow-through oscillation.
   - Woven backpack basket displaying 0 to 6 miniature 3D modaks that update live with basket capacity.
   - Scurry forward sprint lean and celebratory delivery jump.

3. **Pandal Landmark:**
   - Multi-tiered stepped sandstone sanctuary base.
   - 4 carved temple pillars with square plinths, fluted columns, and golden lotus capitals.
   - Draped fabric canopy in rich indigo with gold embroidery fringe and a golden kalash pinnacle spire.
   - Flowing marigold garland strings (toran) draped between columns.
   - Sanctum framed devotional arch with warm golden background and oil lamp glow.
   - Low brass offering table holding modak trays.
   - Clear delivery zone with intricate vermilion rangoli, gold floral inlays, and an animated pulsing beacon ring.

4. **Preparation Stall:**
   - Timber framework with corner posts and joinery.
   - Striped scalloped fabric awning.
   - Wooden service counter with polished brass sweet thalis and preparation mounds.
   - Warm hanging oil lantern.

5. **Sculpted Realistic Plants (No "Broccoli" Spheres):**
   - Sculpted curved banana palm fronds with distinct natural arching leaves.
   - Potted sacred Tulsi vrindavan pedestal with detailed foliage.
   - Detailed marigold bushes with individual green stems and dual-tone saffron/gold flower heads.

6. **Unified Festival HUD (Replaced Dashboard Cards):**
   - Completely removed the separate floating dark pill cards.
   - Replaced with a unified, elegant festival header bar: integrated timer, delivered modak counter with custom vector modak icon, 6 ornamental modak basket pips, sound toggle, pause button, and circular scurry cooldown meter.
   - Polished start screen with gold shimmer "Let's Play" button, discoverable control legend, and clean results overlay.

---

## 2. Preview URL & Command

- **Local Preview URL:** [http://localhost:5175/](http://localhost:5175/)
- **Command:** `npm run dev -- --port 5174` (or `npm run dev`)

---

## 3. Architecture & Contracts

- `src/presentation/`:
  - `camera.ts`: Orthographic camera and lighting system.
  - `diorama.ts`: Courtyard geometry, pandal, stall, vegetation, and lamps.
  - `mushak.ts`: 3D stylized mouse character with procedural animations.
  - `collectibles.ts`: 3D pleated modak sweets on leaf plates.
  - `hud.ts`: Coordinated festival HUD and modal overlays.
  - `audio.ts`: Web Audio API sound design.
  - `index.ts`: Master factory implementing `createPresentation`.
- `src/world/index.ts`: Authoritative boundary bounds, colliders, and 42 modak coordinates.
- `src/contracts/presentation.ts`: Snapshot, event, and command interfaces.

---

## 4. Verification Performed

| Check | Tool / Command | Result |
|---|---|---|
| Unit tests | `npm test` (`rules.test.ts` & `map.test.ts`) | **PASSED** |
| Presentation tests | `npx tsx tests/presentation/visual.test.ts` | **PASSED** (42 modaks verified) |
| Strict TypeScript | `tsc --noEmit` | **PASSED** (zero errors) |
| Production bundle | `npm run build` | **PASSED** (Vite builds cleanly) |
| Dev server HTTP response | `curl -I http://localhost:5175/` | **PASSED** (HTTP 200 OK) |
| Module serving | `curl` for each presentation module | **PASSED** |

---

## 5. Performance Observations

- **Draw calls:** Optimized via shared materials (`matSandstone`, `matTerracotta`, `matIndigo`, `matBrass`, etc.) across all diorama elements.
- **Lighting:** One shadow-casting key directional light, ambient fill, and subtle point accents. No heavy multi-point shadow cascades.
- **Shadow map:** 2048x2048 PCF soft shadow map capped for crisp miniature set aesthetics.
- **Memory allocations:** Zero per-frame geometry or material allocations in render loops.

---

## 6. Assets & Licenses

- 100% original procedural geometry and materials built with Three.js (MIT).
- No copyrighted textures, audio files, or external models used.
- Web Audio API procedural synthesis for all sound cues.
