import Phaser from 'phaser';
import './style.css';
import { CAPACITY, collect, deliver, end, freshRound, type Round } from './rules';
import { MAP_VERSION, modakPoints, pathsX, pathsY, walkable } from './map';

/* ────────────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────────────── */
const W = 960, H = 620, HUD_H = 40, RULES_VERSION = 'rules-v1';

/* ────────────────────────────────────────────────────────────────────────────
 * Input state (shared across scene and DOM listeners)
 * ──────────────────────────────────────────────────────────────────────────── */
const held = new Set<string>();
window.addEventListener('blur', () => held.clear());

/* ────────────────────────────────────────────────────────────────────────────
 * Synthesised sound — short original tones, only after user opts in
 * ──────────────────────────────────────────────────────────────────────────── */
let soundOn = false;
function beep(freq: number, dur = 0.12) {
  if (!soundOn) return;
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.035, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* audio context may fail on some platforms */ }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Festival colour palette
 * ──────────────────────────────────────────────────────────────────────────── */
const P = {
  indigoDeep: 0x0d0e2a,  indigo:     0x1a1c45,
  terracotta: 0xb5603a,  sandstone:  0xd4956a,
  sandLight:  0xe8c49e,  marigold:   0xf5a623,
  gold:       0xf0c040,  goldLight:  0xffe680,
  cream:      0xfff5e4,  amber:      0xf7a84b,
  flamered:   0xd94f35,  white:      0xffffff,
  darkGreen:  0x1e4a2e,  leafGreen:  0x2e7d4f,

  // Mushak body
  mouseGrey:  0x8b96b0,  mouseDark:  0x5a6178,
  mouseLight: 0xb3bccc,  earPink:    0xe8a0a0,
  dhotiBrown: 0xb54420,  dhotiGold:  0xd4a83a,
  nosePink:   0xd88888,  tailPink:   0xdba0a0,
  eyeDark:    0x1a1020,  eyeShine:   0xffffff,
  basketBrown:0x8b6532,  basketDark: 0x6b4a22,
  crownGold:  0xf0c040,  crownJewel: 0xd43030,
};

/* ────────────────────────────────────────────────────────────────────────────
 * Main scene
 * ──────────────────────────────────────────────────────────────────────────── */
class RunScene extends Phaser.Scene {
  /* ── game state ─────────────────────────────────────────────────────────── */
  private round: Round = freshRound();
  private elapsed = 0;
  private playing = false;
  private pausedForFocus = false;
  private px = 145;           // player position
  private py = 465;
  private dir = 1;            // 1 = right, –1 = left
  private walkT = 0;          // walk animation accumulator
  private best = { score: 0, finished: false, time: 60 };

  /* ── game objects ───────────────────────────────────────────────────────── */
  private mushak!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Graphics;
  private basketIndicator!: Phaser.GameObjects.Graphics;
  private fullAura!: Phaser.GameObjects.Graphics;
  private modaks: { id: number; x: number; y: number; go: Phaser.GameObjects.Container }[] = [];
  private hudBg!: Phaser.GameObjects.Graphics;
  private hudTime!: Phaser.GameObjects.Text;
  private hudBasket!: Phaser.GameObjects.Text;
  private hudDelivered!: Phaser.GameObjects.Text;
  private hudSound!: Phaser.GameObjects.Text;
  private deliveryGlow!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayBody!: Phaser.GameObjects.Text;
  private overlayHint!: Phaser.GameObjects.Text;

  /* delivery zone — accessible ground in front of the pandal (top-right) */
  private delivery = new Phaser.Geom.Rectangle(786, 105, 98, 96);

  constructor() { super('run'); }

  /* ─────────────────────── PRELOAD ─────────────────────────────────────── */
  preload() {
    this.load.image('courtyard', '/assets/courtyard.jpg');
  }

  /* ─────────────────────── CREATE ──────────────────────────────────────── */
  create() {
    this.loadBest();

    /* layer 0: courtyard background */
    this.add.image(W / 2, H / 2, 'courtyard').setDisplaySize(W, H).setDepth(0);

    /* layer 1: atmosphere overlay — subtle warm vignette */
    this.drawAtmosphere();

    /* layer 2: path-brightening overlay so walkable areas read clearly */
    this.drawPathOverlay();

    /* layer 3: delivery zone pulsing glow */
    this.deliveryGlow = this.add.graphics().setDepth(3);

    /* layer 4: decorative diyas along path edges */
    this.drawDiyas();

    /* layer 4: garden island border accents (collision geometry matches) */
    this.drawIslandBorders();

    /* layer 5: modak collectibles — placed during startRound */

    /* layer 6: shadow under Mushak */
    this.shadow = this.add.graphics().setDepth(6);

    /* layer 7: basket-full aura */
    this.fullAura = this.add.graphics().setDepth(7);

    /* layer 8: Mushak character (drawn with canvas graphics) */
    this.mushak = this.add.graphics().setDepth(8);

    /* layer 9: basket count above Mushak */
    this.basketIndicator = this.add.graphics().setDepth(9);

    /* layer 20–21: HUD */
    this.buildHud();

    /* layer 28–30: overlay screens */
    this.overlay = this.add.graphics().setDepth(28);
    const overlayFont = '"Outfit", "Segoe UI", Arial, sans-serif';
    this.overlayTitle = this.add.text(W / 2, H / 2 - 70, '', {
      fontFamily: overlayFont, fontSize: '32px', color: '#f0c040',
      fontStyle: 'bold', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(29);
    this.overlayBody = this.add.text(W / 2, H / 2 + 10, '', {
      fontFamily: overlayFont, fontSize: '19px', color: '#fff5e4',
      align: 'center', lineSpacing: 10,
    }).setOrigin(0.5).setDepth(29);
    this.overlayHint = this.add.text(W / 2, H / 2 + 90, '', {
      fontFamily: overlayFont, fontSize: '15px', color: '#f5a623',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(29);

    /* input: keyboard */
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const k = this.mapKey(e.key);
      if (k) { e.preventDefault(); held.add(k); }
    });
    this.input.keyboard?.on('keyup', (e: KeyboardEvent) => {
      const k = this.mapKey(e.key);
      if (k) held.delete(k);
    });

    /* input: click / tap to start / resume */
    this.input.on('pointerdown', () => {
      if (!this.playing && !this.pausedForFocus) this.startRound();
    });

    /* input: touch d-pad */
    this.buildTouchControls();

    /* visibility change → pause */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) {
        this.pausedForFocus = true;
        this.playing = false;
        held.clear();
        this.showPause();
      }
    });

    this.showStart();
    this.renderMushak(false);
  }

  /* ─────────────────────── UPDATE LOOP ─────────────────────────────────── */
  update(_t: number, dt: number) {
    /* pulse delivery glow even when not playing */
    this.drawDeliveryGlow();

    if (!this.playing) return;

    /* movement */
    const spd = 155 * dt / 1000;
    let mx = 0, my = 0;
    if (held.has('left'))  mx -= spd;
    if (held.has('right')) mx += spd;
    if (held.has('up'))    my -= spd;
    if (held.has('down'))  my += spd;
    if (mx && my) { mx *= 0.707; my *= 0.707; }

    const moving = !!(mx || my);
    if (moving) {
      const nx = this.px + mx, ny = this.py + my;
      if (walkable(nx, ny)) { this.px = nx; this.py = ny; }
      if (mx) this.dir = mx < 0 ? -1 : 1;
      this.walkT += dt * 0.008;
    }

    this.elapsed += dt;

    /* pickups */
    this.checkPickups();

    /* delivery */
    if (Phaser.Geom.Rectangle.Contains(this.delivery, this.px, this.py)) {
      this.checkDelivery();
    }

    /* round end */
    if (this.elapsed >= 60000) {
      this.finish(false);
    } else if (this.round.collected.size === modakPoints.length && this.round.basket === 0) {
      this.finish(true);
    }

    this.renderMushak(moving);
    this.updateHud();
  }

  /* ─────────────────────── ATMOSPHERE ──────────────────────────────────── */
  private drawAtmosphere() {
    const g = this.add.graphics().setDepth(1);
    /* Top-down warm gradient overlay */
    g.fillGradientStyle(
      P.indigoDeep, P.indigoDeep, P.indigoDeep, P.indigoDeep,
      0.1, 0.1, 0.0, 0.18
    );
    g.fillRect(0, 0, W, H);
  }

  /* ─────────────────────── PATH OVERLAY ───────────────────────────────── */
  private drawPathOverlay() {
    const g = this.add.graphics().setDepth(2);
    /* Semi-transparent sandstone tint to make walkable corridors read clearly
       against the background image */
    g.fillStyle(P.sandstone, 0.08);
    /* Half-width of the walkable zone from map.ts: pathsX ±32, pathsY ±32 */
    const hw = 32;
    for (const y of pathsY) g.fillRect(50, y - hw, 870, hw * 2);
    for (const x of pathsX) g.fillRect(x - hw, HUD_H, hw * 2, H - HUD_H - 10);
  }

  /* ─────────────────────── DELIVERY ZONE GLOW ─────────────────────────── */
  private drawDeliveryGlow() {
    /* Centre of the accessible ground in front of the pandal */
    const cx = 835, cy = 155;
    const t = Date.now() * 0.003;
    const pulse = 0.5 + 0.5 * Math.sin(t);

    this.deliveryGlow.clear();
    /* Outer glow */
    this.deliveryGlow.fillStyle(P.gold, 0.10 + 0.08 * pulse);
    this.deliveryGlow.fillCircle(cx, cy, 48);
    /* Ring */
    this.deliveryGlow.lineStyle(2, P.marigold, 0.35 + 0.25 * pulse);
    this.deliveryGlow.strokeCircle(cx, cy, 42);
    /* Small offering plate icon */
    this.deliveryGlow.fillStyle(P.gold, 0.4 + 0.3 * pulse);
    this.deliveryGlow.fillEllipse(cx, cy + 3, 20, 8);
    this.deliveryGlow.fillStyle(P.cream, 0.5 + 0.3 * pulse);
    this.deliveryGlow.fillTriangle(cx - 6, cy + 2, cx + 6, cy + 2, cx, cy - 10);
  }

  /* ─────────────────────── DIYAS ──────────────────────────────────────── */
  private drawDiyas() {
    const g = this.add.graphics().setDepth(4);
    const pts: [number, number][] = [];
    for (const py of pathsY) {
      for (let dx = 75; dx < 890; dx += 85) {
        /* Skip the pandal area */
        if (dx > 780 && py < 200) continue;
        pts.push([dx, py - 30], [dx, py + 30]);
      }
    }
    for (const px of pathsX) {
      for (let dy = HUD_H + 30; dy < H - 20; dy += 75) {
        pts.push([px - 30, dy], [px + 30, dy]);
      }
    }
    for (const [fx, fy] of pts) {
      /* Diya base */
      g.fillStyle(P.terracotta, 0.7);
      g.fillEllipse(fx, fy + 1, 8, 4);
      /* Flame outer glow */
      g.fillStyle(P.amber, 0.35);
      g.fillCircle(fx, fy - 3, 5);
      /* Flame */
      g.fillStyle(P.amber, 0.75);
      g.fillTriangle(fx - 2.5, fy, fx + 2.5, fy, fx, fy - 6);
      g.fillStyle(P.goldLight, 0.9);
      g.fillTriangle(fx - 1.2, fy - 1, fx + 1.2, fy - 1, fx, fy - 5);
    }
  }

  /* ─────────────────────── GARDEN ISLAND BORDERS ──────────────────────── */
  private drawIslandBorders() {
    /* The collision-blocking areas are the regions between the paths.
       walkable() allows x ∈ (50,910), y ∈ (98,578) only when within ±32 of
       a pathX or pathY.  The islands sit between those corridors.

       Between pathY 155 and 305 (row gap): y from 187 to 273 (centre ≈ 230)
       Between pathY 305 and 465 (row gap): y from 337 to 433 (centre ≈ 385)

       Between pathX 145 and 385 (col gap): x from 177 to 353
       Between pathX 385 and 650 (col gap): x from 417 to 618
       Between pathX 650 and 835 (col gap): x from 682 to 803 */
    const islands: [number, number, number, number][] = [
      [178, 188, 174, 84],  [418, 188, 200, 84],  [683, 188, 119, 84],
      [178, 338, 174, 94],  [418, 338, 200, 94],  [683, 338, 119, 94],
    ];
    const g = this.add.graphics().setDepth(4);
    for (const [ix, iy, iw, ih] of islands) {
      /* Subtle border to reinforce the background art */
      g.lineStyle(1.5, P.marigold, 0.30);
      g.strokeRoundedRect(ix, iy, iw, ih, 10);
      /* Corner marigold dots */
      g.fillStyle(P.marigold, 0.55);
      g.fillCircle(ix + 6, iy + 6, 3);
      g.fillCircle(ix + iw - 6, iy + 6, 3);
      g.fillCircle(ix + 6, iy + ih - 6, 3);
      g.fillCircle(ix + iw - 6, iy + ih - 6, 3);
    }
  }

  /* ─────────────────────── MODAK COLLECTIBLE ──────────────────────────── */
  private createModak(mx: number, my: number): Phaser.GameObjects.Container {
    const cont = this.add.container(mx, my).setDepth(5);
    const g = this.add.graphics();

    /* Ground glow */
    g.fillStyle(P.gold, 0.15);
    g.fillCircle(0, 0, 14);

    /* Drop shadow */
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(1, 7, 16, 6);

    /* Modak body — white/cream dumpling shape */
    g.fillStyle(P.cream, 1);
    /* Bottom round part */
    g.fillCircle(0, 3, 9);
    /* Cone top */
    g.fillTriangle(-8, 4, 8, 4, 0, -13);

    /* Golden filling at tip */
    g.fillStyle(P.gold, 1);
    g.fillCircle(0, -9, 3.5);

    /* Pleating lines */
    g.lineStyle(0.8, P.sandstone, 0.5);
    g.lineBetween(-5, 6, -2.5, -10);
    g.lineBetween(0, 7, 0, -12);
    g.lineBetween(5, 6, 2.5, -10);

    /* Bottom highlight ring */
    g.lineStyle(0.8, P.goldLight, 0.4);
    g.beginPath();
    g.arc(0, 3, 9, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    cont.add(g);

    /* Gentle bobbing tween */
    this.tweens.add({
      targets: cont, y: my - 3,
      duration: 900 + Math.random() * 400,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    return cont;
  }

  /* ─────────────────────── MUSHAK (CANVAS ART) ────────────────────────── */
  private renderMushak(moving: boolean) {
    const x = this.px, y = this.py, d = this.dir;
    const bob = moving ? Math.sin(this.walkT) * 2.5 : 0;
    const lean = moving ? Math.sin(this.walkT * 2) * 0.08 : 0;

    /* ── Shadow ── */
    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillEllipse(x + 2, y + 16, 36, 10);

    /* ── Basket-full aura ── */
    this.fullAura.clear();
    if (this.round.basket >= CAPACITY) {
      const p = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
      this.fullAura.lineStyle(2.5, P.gold, 0.6 * p);
      this.fullAura.strokeCircle(x, y - 2, 32);
      this.fullAura.lineStyle(1.5, P.marigold, 0.35 * p);
      this.fullAura.strokeCircle(x, y - 2, 38);
    }

    /* ── Main body ── */
    const g = this.mushak;
    g.clear();

    /* Tail — behind body */
    g.lineStyle(2.5, P.tailPink, 0.9);
    const tx1 = x - d * 18, ty1 = y + 8;
    const tx2 = x - d * 28, ty2 = y + 2 + Math.sin(this.walkT * 1.5) * 3;
    const tx3 = x - d * 33, ty3 = y + 8 + Math.sin(this.walkT * 1.5 + 1) * 3;
    g.beginPath();
    g.moveTo(tx1, ty1);
    g.lineTo(tx2, ty2);
    g.lineTo(tx3, ty3);
    g.strokePath();

    /* Back leg */
    g.fillStyle(P.mouseGrey, 0.9);
    g.fillEllipse(x - d * 6, y + 12 - bob, 7, 5);
    /* Back foot */
    g.fillStyle(P.nosePink, 0.8);
    g.fillEllipse(x - d * 8, y + 15 - bob, 5, 3);

    /* Dhoti / cloth wrap */
    g.fillStyle(P.dhotiBrown, 1);
    g.fillEllipse(x - d * 2, y + 4 - bob, 22, 14);
    /* Gold border on dhoti */
    g.lineStyle(1.5, P.dhotiGold, 0.8);
    g.beginPath();
    g.arc(x - d * 2, y + 4 - bob, 7, Math.PI * 0.1, Math.PI * 0.9, false);
    g.strokePath();

    /* Body (plump rounded) */
    g.fillStyle(P.mouseGrey, 1);
    g.fillEllipse(x, y - 3 - bob + lean * 10, 24, 20);
    /* Belly lighter area */
    g.fillStyle(P.mouseLight, 0.7);
    g.fillEllipse(x + d * 3, y - 1 - bob, 12, 14);

    /* Front leg */
    g.fillStyle(P.mouseGrey, 0.95);
    g.fillEllipse(x + d * 8, y + 10 - bob, 6, 5);
    g.fillStyle(P.nosePink, 0.75);
    g.fillEllipse(x + d * 10, y + 13 - bob, 4, 2.5);

    /* ── Head ── */
    const hx = x + d * 10, hy = y - 14 - bob;
    g.fillStyle(P.mouseGrey, 1);
    g.fillCircle(hx, hy, 11);
    /* Lighter cheek */
    g.fillStyle(P.mouseLight, 0.6);
    g.fillCircle(hx + d * 3, hy + 2, 7);

    /* Snout */
    g.fillStyle(P.mouseLight, 0.8);
    g.fillEllipse(hx + d * 10, hy + 3, 8, 5);
    /* Nose */
    g.fillStyle(P.nosePink, 1);
    g.fillCircle(hx + d * 14, hy + 2, 3);

    /* Eye */
    g.fillStyle(P.eyeDark, 1);
    g.fillCircle(hx + d * 5, hy - 3, 3.5);
    /* Eye shine */
    g.fillStyle(P.eyeShine, 0.9);
    g.fillCircle(hx + d * 6, hy - 4, 1.5);

    /* Whiskers */
    g.lineStyle(0.8, P.mouseDark, 0.5);
    g.lineBetween(hx + d * 12, hy + 1, hx + d * 24, hy - 3);
    g.lineBetween(hx + d * 12, hy + 3, hx + d * 24, hy + 3);
    g.lineBetween(hx + d * 12, hy + 5, hx + d * 23, hy + 9);

    /* ── Ears ── */
    /* Back ear (behind head) */
    const bex = hx - d * 4, bey = hy - 12;
    g.fillStyle(P.mouseGrey, 0.85);
    g.fillEllipse(bex, bey, 9, 12);
    g.fillStyle(P.earPink, 0.6);
    g.fillEllipse(bex, bey, 5, 8);

    /* Front ear */
    const fex = hx + d * 2, fey = hy - 14;
    g.fillStyle(P.mouseGrey, 1);
    g.fillEllipse(fex, fey, 10, 14);
    g.fillStyle(P.earPink, 0.7);
    g.fillEllipse(fex, fey, 6, 9);

    /* ── Crown ── */
    const crx = hx, cry = hy - 18;
    g.fillStyle(P.crownGold, 1);
    /* Crown base */
    g.fillRoundedRect(crx - 7, cry - 2, 14, 7, 2);
    /* Crown points */
    g.fillTriangle(crx - 6, cry - 2, crx - 3, cry - 8, crx, cry - 2);
    g.fillTriangle(crx - 2, cry - 2, crx, cry - 10, crx + 2, cry - 2);
    g.fillTriangle(crx, cry - 2, crx + 3, cry - 8, crx + 6, cry - 2);
    /* Jewel */
    g.fillStyle(P.crownJewel, 1);
    g.fillCircle(crx, cry - 7, 2);

    /* ── Basket on back ── */
    const bkx = x - d * 10, bky = y - 12 - bob;
    g.fillStyle(P.basketBrown, 1);
    g.fillRoundedRect(bkx - 8, bky - 4, 16, 14, 3);
    /* Basket rim */
    g.fillStyle(P.basketDark, 1);
    g.fillRoundedRect(bkx - 9, bky - 6, 18, 4, 2);
    /* Weave lines */
    g.lineStyle(0.7, P.basketDark, 0.5);
    g.lineBetween(bkx - 6, bky, bkx + 6, bky);
    g.lineBetween(bkx - 6, bky + 4, bkx + 6, bky + 4);
    g.lineBetween(bkx - 6, bky + 8, bkx + 6, bky + 8);

    /* Modaks visible in basket */
    const bCount = Math.min(this.round.basket, 3); /* show up to 3 visible */
    for (let i = 0; i < bCount; i++) {
      g.fillStyle(P.cream, 1);
      g.fillCircle(bkx - 4 + i * 5, bky - 8, 3);
      g.fillTriangle(bkx - 6 + i * 5, bky - 7, bkx - 2 + i * 5, bky - 7, bkx - 4 + i * 5, bky - 13);
      g.fillStyle(P.gold, 1);
      g.fillCircle(bkx - 4 + i * 5, bky - 11, 1.5);
    }

    /* ── Basket count indicator (above character) ── */
    this.basketIndicator.clear();
    if (this.round.basket > 0) {
      const iy = y - 42 - bob;
      /* Background pill */
      const pillW = 28;
      this.basketIndicator.fillStyle(P.indigoDeep, 0.7);
      this.basketIndicator.fillRoundedRect(x - pillW / 2, iy - 8, pillW, 16, 6);
      this.basketIndicator.lineStyle(1, P.marigold, 0.6);
      this.basketIndicator.strokeRoundedRect(x - pillW / 2, iy - 8, pillW, 16, 6);
      /* Dots showing basket fill */
      for (let i = 0; i < CAPACITY; i++) {
        const dotX = x - 10 + i * 4;
        if (i < this.round.basket) {
          this.basketIndicator.fillStyle(P.cream, 1);
        } else {
          this.basketIndicator.fillStyle(P.cream, 0.25);
        }
        this.basketIndicator.fillCircle(dotX, iy, 1.5);
      }
    }
  }

  /* ─────────────────────── HUD ────────────────────────────────────────── */
  private buildHud() {
    const font = '"Outfit", "Segoe UI", Arial, sans-serif';

    this.hudBg = this.add.graphics().setDepth(20);
    this.hudBg.fillStyle(P.indigoDeep, 0.90);
    this.hudBg.fillRoundedRect(0, 0, W, HUD_H, { tl: 0, tr: 0, bl: 8, br: 8 });
    this.hudBg.lineStyle(1, P.marigold, 0.45);
    this.hudBg.lineBetween(0, HUD_H, W, HUD_H);

    const y = HUD_H / 2;

    /* Timer */
    this.hudTime = this.add.text(20, y, '', {
      fontFamily: font, fontSize: '18px', color: '#fff5e4', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(21);

    /* Basket */
    this.hudBasket = this.add.text(W / 2 - 80, y, '', {
      fontFamily: font, fontSize: '16px', color: '#fff5e4',
    }).setOrigin(0, 0.5).setDepth(21);

    /* Delivered count */
    this.hudDelivered = this.add.text(W / 2 + 80, y, '', {
      fontFamily: font, fontSize: '16px', color: '#fff5e4',
    }).setOrigin(0, 0.5).setDepth(21);

    /* Sound toggle */
    this.hudSound = this.add.text(W - 20, y, '🔇', {
      fontFamily: font, fontSize: '20px',
    }).setOrigin(1, 0.5).setDepth(21).setInteractive({ useHandCursor: true });

    this.hudSound.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      soundOn = !soundOn;
      this.hudSound.setText(soundOn ? '🔊' : '🔇');
    });

    this.updateHud();
  }

  private updateHud() {
    const remaining = Math.max(0, Math.ceil(60 - this.elapsed / 1000));
    const tStr = remaining.toString().padStart(2, '0');
    const isUrgent = remaining <= 10 && this.playing;

    this.hudTime.setText(`⏱  ${tStr}s`);
    this.hudTime.setColor(isUrgent ? '#ff6b5b' : '#fff5e4');
    /* Flash effect for countdown urgency */
    if (isUrgent) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      this.hudTime.setAlpha(flash ? 1 : 0.7);
    } else {
      this.hudTime.setAlpha(1);
    }

    const full = this.round.basket >= CAPACITY;
    this.hudBasket.setText(
      `📦  ${this.round.basket}/${CAPACITY}${full ? '  ⚡ DELIVER!' : ''}`
    );
    this.hudBasket.setColor(full ? '#f0c040' : '#fff5e4');

    this.hudDelivered.setText(`✅  ${this.round.delivered}/${modakPoints.length}`);
  }

  /* ─────────────────────── TOUCH CONTROLS ─────────────────────────────── */
  private buildTouchControls() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) return;

    const sz = 50, pad = 6;
    /* D-pad position: bottom-centre, low enough to avoid the play area */
    const cx = W / 2, cy = H - sz - pad - 4;
    const dirs: { d: string; label: string; ox: number; oy: number }[] = [
      { d: 'up',    label: '▲', ox: 0,          oy: -(sz + pad) },
      { d: 'down',  label: '▼', ox: 0,          oy: 0 },
      { d: 'left',  label: '◀', ox: -(sz + pad), oy: 0 },
      { d: 'right', label: '▶', ox: (sz + pad),  oy: 0 },
    ];

    for (const { d, label, ox, oy } of dirs) {
      const bx = cx + ox, by = cy + oy;
      const bg = this.add.graphics().setDepth(25);
      bg.fillStyle(P.terracotta, 0.70);
      bg.fillRoundedRect(bx - sz / 2, by - sz / 2, sz, sz, 8);
      bg.lineStyle(1.5, P.gold, 0.6);
      bg.strokeRoundedRect(bx - sz / 2, by - sz / 2, sz, sz, 8);

      this.add.text(bx, by, label, {
        fontFamily: 'Arial', fontSize: '20px', color: '#fff5e4',
      }).setOrigin(0.5).setDepth(26);

      const zone = this.add.zone(bx, by, sz, sz).setDepth(27).setInteractive();
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        held.add(d);
      });
      zone.on('pointerup',     () => held.delete(d));
      zone.on('pointerout',    () => held.delete(d));
      zone.on('pointercancel', () => held.delete(d));
    }
  }

  /* ─────────────────────── PICKUPS ────────────────────────────────────── */
  private checkPickups() {
    for (const m of this.modaks) {
      if (this.round.collected.has(m.id)) continue;
      if (Phaser.Math.Distance.Between(this.px, this.py, m.x, m.y) >= 22) continue;
      if (!collect(this.round, m.id)) continue;

      m.go.destroy();
      beep(660);

      /* Sparkle feedback */
      this.tweens.add({
        targets: this.mushak, scaleX: 1.12, scaleY: 1.12,
        duration: 60, yoyo: true, ease: 'Back.easeOut',
      });
      this.spawnSparkles(m.x, m.y);
    }
  }

  private spawnSparkles(sx: number, sy: number) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = this.add.graphics().setDepth(12).setPosition(sx, sy);
      p.fillStyle(i % 2 ? P.gold : P.marigold, 1);
      p.fillTriangle(0, -3, 2, 0, 0, 3);
      p.fillTriangle(0, -3, -2, 0, 0, 3);
      this.tweens.add({
        targets: p,
        x: sx + Math.cos(a) * 22,
        y: sy + Math.sin(a) * 22,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /* ─────────────────────── DELIVERY ───────────────────────────────────── */
  private checkDelivery() {
    const n = deliver(this.round);
    if (!n) return;
    beep(440, 0.18);
    this.cameras.main.flash(120, 240, 180, 60, false);
    this.deliveryFlourish(n);
  }

  private deliveryFlourish(count: number) {
    const cx = 835, cy = 155;
    /* Rising score text */
    const txt = this.add.text(cx, cy, `+${count}`, {
      fontFamily: '"Outfit", Arial, sans-serif',
      fontSize: '30px', color: '#f0c040', fontStyle: 'bold',
      stroke: '#0d0e2a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({
      targets: txt, y: cy - 55, alpha: 0, scale: 1.5,
      duration: 700, ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
    /* Expanding ring */
    const ring = this.add.graphics().setDepth(14);
    ring.lineStyle(2.5, P.gold, 0.9);
    ring.strokeCircle(cx, cy, 18);
    this.tweens.add({
      targets: ring, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 450, ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /* ─────────────────────── KEY MAPPING ────────────────────────────────── */
  private mapKey(k: string): string | undefined {
    const map: Record<string, string> = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    };
    return map[k];
  }

  /* ─────────────────────── OVERLAY SCREENS ────────────────────────────── */
  private showOverlay(title: string, body: string, hint: string) {
    this.overlay.clear();
    /* Full-screen dim */
    this.overlay.fillStyle(P.indigoDeep, 0.70);
    this.overlay.fillRect(0, 0, W, H);
    /* Centre card */
    const cardW = 520, cardH = 260;
    const cx = W / 2 - cardW / 2, cy = H / 2 - cardH / 2;
    this.overlay.fillStyle(P.indigo, 0.95);
    this.overlay.fillRoundedRect(cx, cy, cardW, cardH, 16);
    this.overlay.lineStyle(2, P.marigold, 0.6);
    this.overlay.strokeRoundedRect(cx, cy, cardW, cardH, 16);
    /* Gold accent line at top of card */
    this.overlay.fillStyle(P.gold, 0.8);
    this.overlay.fillRoundedRect(cx + 40, cy, cardW - 80, 3, 2);

    this.overlayTitle.setText(title).setVisible(true);
    this.overlayBody.setText(body).setVisible(true);
    this.overlayHint.setText(hint).setVisible(true);
  }

  private hideOverlay() {
    this.overlay.clear();
    this.overlayTitle.setVisible(false);
    this.overlayBody.setVisible(false);
    this.overlayHint.setVisible(false);
  }

  private showStart() {
    this.showOverlay(
      "🐭  MUSHAK'S MODAK RUN  🪔",
      'Collect modaks scattered across the courtyard\nand deliver them to the pandal.\n\nCarry up to 6 at a time — plan your route!\nYou have 60 seconds.',
      'Click or tap anywhere to start'
    );
  }

  private showPause() {
    this.showOverlay(
      '⏸  Paused',
      'Tab was hidden — round is paused.',
      'Click or tap to resume'
    );
    this.input.once('pointerdown', () => {
      this.pausedForFocus = false;
      this.playing = true;
      this.hideOverlay();
    });
  }

  /* ─────────────────────── ROUND LIFECYCLE ────────────────────────────── */
  private startRound() {
    this.round = freshRound();
    this.elapsed = 0;
    this.walkT = 0;
    this.px = 145;
    this.py = 465;
    this.playing = true;
    this.pausedForFocus = false;
    this.hideOverlay();

    /* Rebuild modak sprites */
    this.modaks.forEach(m => m.go.destroy());
    this.modaks = [];
    modakPoints.forEach(([mx, my], id) => {
      this.modaks.push({ id, x: mx, y: my, go: this.createModak(mx, my) });
    });
    this.updateHud();
  }

  private finish(complete: boolean) {
    if (!this.playing) return;
    end(this.round);
    this.playing = false;
    const secs = Math.min(60, this.elapsed / 1000);
    const better =
      this.round.delivered > this.best.score ||
      (complete && this.round.delivered === this.best.score && secs < this.best.time);
    if (better) {
      this.best = { score: this.round.delivered, finished: complete, time: secs };
      try { localStorage.setItem('mushak-best', JSON.stringify(this.best)); } catch {}
    }

    const title = complete ? '🎉  Courtyard prepared!' : '⏰  Time is up!';
    const body =
      `Delivered: ${this.round.delivered} / ${modakPoints.length} modaks\n` +
      `Best: ${this.best.score}${this.best.finished ? ` in ${this.best.time.toFixed(1)}s` : ''}\n` +
      (complete
        ? `Completed in ${secs.toFixed(1)} seconds!`
        : 'Undelivered modaks are safe for next round.');
    this.showOverlay(title, body, 'Click or tap to retry');
  }

  private loadBest() {
    try {
      const raw = localStorage.getItem('mushak-best');
      if (raw) this.best = JSON.parse(raw);
    } catch {}
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Phaser configuration
 * ──────────────────────────────────────────────────────────────────────────── */
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0d0e2a',
  scene: RunScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true },
  audio: { noAudio: true },
});

console.info(
  `Mushak's Modak Run: ${MAP_VERSION}, ${RULES_VERSION}, ${modakPoints.length} fixed reachable modaks`
);
