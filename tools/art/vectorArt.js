/**
 * Quellgrafiken für das Spritesheet.
 *
 * Jede Frame-Definition zeichnet eine statische Grafik in Welteinheiten mit dem
 * Ursprung im Drehpunkt (pivot). Der Generator (tools/generate-assets.mjs) rendert
 * alle Frames in doppelter Auflösung in assets/spritesheet.png und schreibt
 * Position, Größe und Drehpunkt nach assets/spritesheet.json.
 *
 * Nach dem Erzeugen ist die PNG-Datei die Quelle für die Grafik – sie kann in
 * jedem Bildprogramm bearbeitet werden. Diese Datei dient nur als Ausgangspunkt.
 *
 * Konventionen (müssen bei eigenen Grafiken eingehalten werden):
 *   - Spieler, Projektil des Spielers, Items: Nase/Spitze zeigt nach oben
 *   - Gegner, Zerstörer, Turmrohr, Gegnerprojektil: zeigen nach unten
 *   - Licht fällt von links oben ein
 */
import { PALETTE } from '../../src/graphics/palette.js';
import { TAU, createRng, randInt } from '../../src/utils/math.js';

/* ---------- Spieler ---------- */

function traceGlider(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(7, -8);
  ctx.lineTo(24, 10);
  ctx.lineTo(22, 16);
  ctx.lineTo(7, 11);
  ctx.lineTo(0, 15);
  ctx.lineTo(-7, 11);
  ctx.lineTo(-22, 16);
  ctx.lineTo(-24, 10);
  ctx.lineTo(-7, -8);
  ctx.closePath();
}

function drawPlayer(ctx) {
  const body = ctx.createLinearGradient(-24, 0, 24, 0);
  body.addColorStop(0, PALETTE.accentDark);
  body.addColorStop(0.45, PALETTE.accent);
  body.addColorStop(0.55, PALETTE.accentLight);
  body.addColorStop(1, PALETTE.accentDark);
  ctx.fillStyle = body;
  traceGlider(ctx);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = PALETTE.accentDeep;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(77, 40, 4, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, 9);
  ctx.lineTo(-6, 2);
  ctx.moveTo(16, 9);
  ctx.lineTo(6, 2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.cockpit;
  ctx.beginPath();
  ctx.ellipse(0, -7, 3.6, 7.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(-1, -10, 1.2, 2.6, 0, 0, TAU);
  ctx.fill();
}

/** Triebwerksflamme in voller Länge (22), wird zur Laufzeit in der Höhe skaliert. */
function drawFlame(ctx) {
  const grd = ctx.createLinearGradient(0, 0, 0, 22);
  grd.addColorStop(0, PALETTE.flame);
  grd.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(3, 0);
  ctx.closePath();
  ctx.fill();
}

/** Zusatzkanone am Flügel (Booster). Drehpunkt = Mündungsposition. */
function drawCannon(ctx) {
  ctx.fillStyle = '#2a1503';
  ctx.fillRect(-4, -9, 8, 20);
  ctx.fillStyle = '#ff9a2e';
  ctx.fillRect(-3, -9, 6, 17);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1.5, -12, 3, 4);
}

/* ---------- Feindschiff ---------- */

function drawEnemy(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(9, 7);
  ctx.lineTo(22, -2);
  ctx.lineTo(18, -18);
  ctx.lineTo(8, -9);
  ctx.lineTo(0, -14);
  ctx.lineTo(-8, -9);
  ctx.lineTo(-18, -18);
  ctx.lineTo(-22, -2);
  ctx.lineTo(-9, 7);
  ctx.closePath();
  const hull = ctx.createLinearGradient(0, -18, 0, 22);
  hull.addColorStop(0, PALETTE.enemyDark);
  hull.addColorStop(0.6, PALETTE.enemy);
  hull.addColorStop(1, PALETTE.enemyDark);
  ctx.fillStyle = hull;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2a0412';
  ctx.stroke();
}

/* ---------- Asteroiden (mehrere Varianten) ---------- */

function makeAsteroid(radius, seed) {
  const rng = createRng(seed);
  const points = randInt(8, 12, rng);
  const shape = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * TAU;
    const dist = radius * (0.78 + rng() * 0.3);
    return [Math.cos(angle) * dist, Math.sin(angle) * dist];
  });
  const craters = Array.from({ length: radius > 22 ? 3 : 2 }, () => {
    const a = rng() * TAU;
    const d = rng() * radius * 0.5;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: radius * (0.12 + rng() * 0.12) };
  });

  return (ctx) => {
    ctx.beginPath();
    shape.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    const fill = ctx.createRadialGradient(-radius * 0.45, -radius * 0.45, radius * 0.1, 0, 0, radius * 1.15);
    fill.addColorStop(0, PALETTE.rockLight);
    fill.addColorStop(0.55, PALETTE.rock);
    fill.addColorStop(1, PALETTE.rockDark);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PALETTE.rockDark;
    ctx.stroke();
    ctx.fillStyle = 'rgba(30, 25, 22, 0.45)';
    for (const c of craters) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, TAU);
      ctx.fill();
    }
  };
}

/* ---------- Zerstörer ---------- */

function drawDestroyer(ctx) {
  for (const cx of [-34, 34]) {
    ctx.fillStyle = '#26121a';
    ctx.fillRect(cx - 5, 12, 10, 24);
    ctx.fillStyle = '#4a2030';
    ctx.fillRect(cx - 3, 12, 3, 24);
  }

  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(14, 30);
  ctx.lineTo(24, 30);
  ctx.lineTo(30, 18);
  ctx.lineTo(58, 8);
  ctx.lineTo(62, -10);
  ctx.lineTo(44, -30);
  ctx.lineTo(20, -26);
  ctx.lineTo(10, -40);
  ctx.lineTo(-10, -40);
  ctx.lineTo(-20, -26);
  ctx.lineTo(-44, -30);
  ctx.lineTo(-62, -10);
  ctx.lineTo(-58, 8);
  ctx.lineTo(-30, 18);
  ctx.lineTo(-24, 30);
  ctx.lineTo(-14, 30);
  ctx.closePath();
  const hull = ctx.createLinearGradient(0, -40, 0, 44);
  hull.addColorStop(0, '#2b0a17');
  hull.addColorStop(0.45, '#7d1736');
  hull.addColorStop(0.75, PALETTE.enemy);
  hull.addColorStop(1, '#2b0a17');
  ctx.fillStyle = hull;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1a030b';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(26, 3, 11, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-58, 0);
  ctx.lineTo(-22, 6);
  ctx.moveTo(58, 0);
  ctx.lineTo(22, 6);
  ctx.moveTo(-40, -22);
  ctx.lineTo(-24, -6);
  ctx.moveTo(40, -22);
  ctx.lineTo(24, -6);
  ctx.stroke();

  ctx.fillStyle = '#1a030b';
  ctx.beginPath();
  ctx.moveTo(-12, -24);
  ctx.lineTo(12, -24);
  ctx.lineTo(16, 4);
  ctx.lineTo(0, 16);
  ctx.lineTo(-16, 4);
  ctx.closePath();
  ctx.fill();
}

/* ---------- Geschützturm ---------- */

function traceOctagon(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i / 8) * TAU;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

function drawTurretBase(ctx) {
  const pad = ctx.createLinearGradient(-20, -20, 20, 20);
  pad.addColorStop(0, '#a3a8b0');
  pad.addColorStop(1, '#4b4f57');
  ctx.fillStyle = pad;
  traceOctagon(ctx, 21);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2a2d33';
  ctx.stroke();
  ctx.fillStyle = PALETTE.accent;
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + (i / 4) * TAU;
    ctx.fillRect(Math.cos(a) * 15 - 2, Math.sin(a) * 15 - 2, 4, 4);
  }
}

/** Turmkopf: Drehpunkt = Kuppelmitte, Rohr zeigt nach unten. */
function drawTurretHead(ctx) {
  ctx.fillStyle = '#25282e';
  ctx.fillRect(-3.5, 4, 7, 19);
  ctx.fillStyle = '#5e636c';
  ctx.fillRect(-1.5, 4, 2, 19);
  const dome = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
  dome.addColorStop(0, '#d9604f');
  dome.addColorStop(1, '#5b1a1f');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#1f0a0c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.enemyGlow;
  ctx.beginPath();
  ctx.arc(0, 5, 2, 0, TAU);
  ctx.fill();
}

/* ---------- Projektile ---------- */

/** Spitze am Drehpunkt, Schweif nach unten. */
function drawBullet(ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 178, 63, 0.45)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 16);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.accentLight;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawEnemyBullet(ctx) {
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 11);
  glow.addColorStop(0, 'rgba(255, 61, 110, 0.75)');
  glow.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.enemyGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 6, 0, 0, TAU);
  ctx.fill();
}

/* ---------- Items ---------- */

function drawShieldPickup(ctx) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 6 + (i / 6) * TAU;
    ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.shieldDeep;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.shield;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(7, -6);
  ctx.lineTo(6, 2);
  ctx.quadraticCurveTo(4, 7, 0, 10);
  ctx.quadraticCurveTo(-4, 7, -6, 2);
  ctx.lineTo(-7, -6);
  ctx.closePath();
  ctx.fillStyle = PALETTE.shieldLight;
  ctx.fill();
  ctx.fillStyle = PALETTE.shieldDeep;
  ctx.fillRect(-1.2, -4, 2.4, 9);
  ctx.fillRect(-4.5, -0.7, 9, 2.4);
}

function drawBoostDiamond(ctx, color) {
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fillStyle = '#3a1a02';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawDoubleShotPickup(ctx) {
  drawBoostDiamond(ctx, '#ff9a2e');
  ctx.fillStyle = '#ffffff';
  for (const x of [-5, 5]) {
    ctx.beginPath();
    ctx.moveTo(x - 2.5, 8);
    ctx.lineTo(x - 2.5, -4);
    ctx.lineTo(x, -9);
    ctx.lineTo(x + 2.5, -4);
    ctx.lineTo(x + 2.5, 8);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Alle Frames des Spritesheets.
 * w/h: Größe in Welteinheiten, px/py: Drehpunkt in Welteinheiten von links oben,
 * radius (optional): Nennradius, auf den zur Laufzeit skaliert wird.
 */
export const FRAMES = [
  { name: 'player', w: 52, h: 46, px: 26, py: 28, draw: drawPlayer },
  { name: 'player_flame', w: 8, h: 24, px: 4, py: 1, draw: drawFlame },
  { name: 'player_cannon', w: 10, h: 26, px: 5, py: 13, draw: drawCannon },
  { name: 'enemy', w: 48, h: 44, px: 24, py: 20, draw: drawEnemy },
  ...[0, 1, 2, 3].map((i) => ({ name: `asteroid_big_${i}`, w: 66, h: 66, px: 33, py: 33, radius: 29, draw: makeAsteroid(29, 101 + i) })),
  ...[0, 1, 2, 3].map((i) => ({ name: `asteroid_small_${i}`, w: 38, h: 38, px: 19, py: 19, radius: 16, draw: makeAsteroid(16, 201 + i) })),
  { name: 'destroyer', w: 130, h: 90, px: 65, py: 43, draw: drawDestroyer },
  { name: 'turret_base', w: 46, h: 46, px: 23, py: 23, draw: drawTurretBase },
  { name: 'turret_head', w: 24, h: 37, px: 12, py: 12, draw: drawTurretHead },
  { name: 'bullet', w: 10, h: 22, px: 5, py: 4, draw: drawBullet },
  { name: 'enemy_bullet', w: 24, h: 24, px: 12, py: 12, draw: drawEnemyBullet },
  { name: 'pickup_shield', w: 38, h: 38, px: 19, py: 19, draw: drawShieldPickup },
  { name: 'pickup_boost', w: 38, h: 42, px: 19, py: 21, draw: (ctx) => drawBoostDiamond(ctx, '#ff9a2e') },
  { name: 'pickup_doubleShot', w: 38, h: 42, px: 19, py: 21, draw: drawDoubleShotPickup },
];
