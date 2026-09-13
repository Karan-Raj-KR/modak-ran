# Handoff — 2026-09-13 (visual redesign session)

**Sprint:** 16:50–17:00 IST. Local prototype in `/Users/karanrajkr/Projects/modak`.

## What changed this session

### Visual redesign of `src/main.ts`

The entire presentation layer was rewritten while preserving `rules.ts`, `map.ts`, tests, and all game logic exactly.

**Before → After:**

| Aspect | Before (rejected) | After |
|---|---|---|
| Background | Code-drawn flat rectangles (oversized yellow grid, green rectangles) | Generated courtyard illustration (`public/assets/courtyard.jpg`) — sandstone paths, garden islands, pandal with Ganesha, diyas, marigold garlands |
| Character | Grey blob (~20px ellipses, whisker lines) | Canvas-drawn expressive Mushak: round grey body, pink ears, crown with jewel, orange dhoti, whiskers, pink nose & tail, woven basket showing modaks |
| Modaks | Triangle+circle in gold | Cream-white cone-shaped modaks with golden filling tip, pleating lines, gentle bob animation |
| Pandal | "PANDAL DELIVERY" text label on a rectangle | Illustrated pandal with Ganesha visible in background art; delivery zone marked by pulsing gold glow on accessible path ground |
| HUD | Full-width text string at top ("TIME 42 DELIVERED 3/42 BASKET ●●●○○○") | Compact 40px bar: `⏱ 42s` + `📦 3/6` + `✅ 12/42` + sound emoji toggle |
| Overlays | setBackgroundColor modal with plain text | Indigo card with gold accent: title, body, hint text — distinct start/pause/finish screens |
| Touch controls | DOM buttons below canvas | In-canvas d-pad on coarse-pointer devices only |
| Feedback | Flash + scale tween | Sparkle particles on pickup, pulsing golden aura when basket full, rising "+N" text + expanding ring on delivery, flashing red timer ≤10s |
| Grid lines | Visible centre lines and stroke rects on paths | Removed; paths read from background art, with subtle sandstone overlay for brightness |

### Depth layer architecture
```
0  — courtyard background image
1  — atmosphere vignette overlay
2  — path brightening overlay
3  — delivery zone pulsing glow
4  — decorative diyas + garden island borders
5  — modak collectibles (containers with tweens)
6  — Mushak shadow
7  — basket-full aura
8  — Mushak character (canvas graphics)
9  — basket count indicator (pill with dots)
12 — sparkle particles (transient)
14–15 — delivery flourish effects (transient)
20–21 — HUD bar + text
25–27 — touch controls (touch devices only)
28–30 — overlay screens
```

### Collision / visual alignment
The garden island borders are precisely computed from `walkable()` in map.ts:
- Islands sit at the intersection of column gaps (pathX±32) and row gaps (pathY±32)
- 6 islands, coordinates verified to match collision-blocking zones within ±1px

### Files modified
- `src/main.ts` — complete rewrite of presentation (859 lines, 34KB)
- `src/style.css` — unchanged from previous session (Google Fonts, flex layout)
- `index.html` — unchanged (meta tags, preconnect)

### Files NOT modified (preserved exactly)
- `src/rules.ts` — game rules
- `src/map.ts` — path/modak coordinates + walkable function
- `tests/rules.test.ts` — rules unit tests
- `tests/map.test.ts` — map walkability tests
- `package.json`, `tsconfig.json`

## Asset status

| Asset | Format | Status | Notes |
|---|---|---|---|
| `public/assets/courtyard.jpg` | JPG 1134KB | ✅ Generated, in use | Top-down festival courtyard, paths roughly align with collision grid |
| `public/assets/mushak.jpg` | JPG 658KB | ⚠️ Generated but NOT used | Has fake checkerboard "transparency" baked into JPG — would render as square with grey checks. Character is drawn with canvas graphics instead |
| Modak collectible sprite | — | ❌ Not generated (quota) | Drawn with canvas graphics (cream cone + gold tip) |
| Pandal sprite | — | ❌ Not generated (quota) | Part of courtyard background image |

**Missing art for a future session:**
- A proper PNG Mushak sprite with real transparency (for image-based rendering instead of canvas)
- A proper PNG modak collectible sprite
- Foreground decoration overlays (garlands, lamp posts) for depth layering on top of character

## Verification performed

| Check | Result |
|---|---|
| `npm test` | ✅ Rules + 42 walkable modaks pass |
| `npx tsc --noEmit` | ✅ Strict TypeScript, zero errors |
| `npm run build` | ✅ Production Vite build succeeds |
| Dev server responds | ✅ `http://localhost:5176/` serves HTML, courtyard.jpg, main.ts all 200 |
| Browser automation screenshots | ❌ Playwright driver download fails (404 for 1.57.0-mac-arm64) |
| Manual playtesting | ❌ Not performed this session — **requires human verification** |

## What still needs human verification
1. Open `http://localhost:5176/` in a browser — check Mushak renders visibly, modaks are distinct, delivery zone is reachable
2. Play a full round — collect modaks, deliver to pandal, confirm scoring works
3. Let timer expire — confirm round-end screen and retry work
4. Test on mobile viewport — touch d-pad renders, doesn't cover routes
5. Check `public/assets/mushak.jpg` can be deleted (it's unused now)

## Submission eligibility
Organizer permission for AI assistance is **unconfirmed**. Confirm before submission.
