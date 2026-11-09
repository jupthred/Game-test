import { PALETTE } from './palette.js';
import { TAU } from '../utils/math.js';

/**
 * Dummy-Grafiken als Vektor-Zeichenfunktionen.
 *
 * Jede Entity hat einen `sprite`-Schlüssel. Um später echte Bilder/Spritesheets
 * einzusetzen, genügt es, hier eine neue Zeichenfunktion zu registrieren
 * (z. B. registerSprite('player', (ctx, e) => ctx.drawImage(img, ...))).
 */
const SPRITE_DRAWERS = new Map();

export function registerSprite(key, drawFn) {
  SPRITE_DRAWERS.set(key, drawFn);
}

export function drawSprite(ctx, entity) {
  const draw = SPRITE_DRAWERS.get(entity.sprite);
  if (draw) draw(ctx, entity);
}

/* ---------- Spieler: Weltraumgleiter ---------- */

/** Umriss des Gleiters, Nase zeigt nach oben, Ursprung = Mitte. */
export function traceGlider(ctx) {
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

function drawPlayer(ctx, player) {
  const roll = 1 - Math.abs(player.bank) * 0.32;
  const blinking = player.invulnerable > 0 && Math.floor(player.age * 12) % 2 === 0;

  ctx.save();
  ctx.translate(player.x, player.y);
  if (blinking) ctx.globalAlpha = 0.35;

  // Schatten auf der Mondoberfläche (Licht von links oben)
  ctx.save();
  ctx.translate(16, 26);
  ctx.scale(roll * 0.92, 0.92);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  traceGlider(ctx);
  ctx.fill();
  ctx.restore();

  // Triebwerksflammen
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ex of [-6, 6]) {
    const len = 12 + Math.random() * 10;
    const grd = ctx.createLinearGradient(0, 11, 0, 11 + len);
    grd.addColorStop(0, PALETTE.flame);
    grd.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(ex * roll - 3, 11);
    ctx.lineTo(ex * roll, 11 + len);
    ctx.lineTo(ex * roll + 3, 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Rumpf
  ctx.scale(roll, 1);
  const shift = player.bank * 14;
  const body = ctx.createLinearGradient(-24 + shift, 0, 24 + shift, 0);
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

  // Rückenlinie und Flügelstreifen
  ctx.strokeStyle = 'rgba(77, 40, 4, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, 9);
  ctx.lineTo(-6, 2);
  ctx.moveTo(16, 9);
  ctx.lineTo(6, 2);
  ctx.stroke();

  // Cockpit
  ctx.fillStyle = PALETTE.cockpit;
  ctx.beginPath();
  ctx.ellipse(0, -7, 3.6, 7.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(-1, -10, 1.2, 2.6, 0, 0, TAU);
  ctx.fill();

  ctx.restore();

  drawShieldBubble(ctx, player);
}

/** Schildblase um den Gleiter: Deckkraft folgt der Schildstärke, Treffer lassen sie aufleuchten. */
function drawShieldBubble(ctx, player) {
  if (player.shield <= 0 && player.shieldFlash <= 0) return;
  const ratio = player.shieldRatio;
  const flash = Math.min(1, player.shieldFlash / 0.3);
  const r = 36 + flash * 3;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = 'lighter';

  const fill = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  fill.addColorStop(0, 'rgba(79, 214, 255, 0)');
  fill.addColorStop(1, `rgba(79, 214, 255, ${0.08 + ratio * 0.14 + flash * 0.35})`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // Segmentierter Ring: ein Segment pro Schildpunkt
  const segments = player.shieldMax;
  const gap = 0.08;
  const step = TAU / segments;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < segments; i += 1) {
    const start = -Math.PI / 2 + i * step + gap / 2 + player.age * 0.6;
    const active = i < player.shield;
    ctx.strokeStyle = active ? PALETTE.shield : 'rgba(79, 214, 255, 0.12)';
    ctx.globalAlpha = active ? 0.55 + flash * 0.45 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, start + step - gap);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Feindliches Raumschiff ---------- */

function traceEnemy(ctx) {
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
}

function drawEnemy(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.tilt);

  ctx.save();
  ctx.translate(14, 22);
  ctx.scale(0.9, 0.9);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  traceEnemy(ctx);
  ctx.fill();
  ctx.restore();

  const hull = ctx.createLinearGradient(0, -18, 0, 22);
  hull.addColorStop(0, PALETTE.enemyDark);
  hull.addColorStop(0.6, PALETTE.enemy);
  hull.addColorStop(1, PALETTE.enemyDark);
  ctx.fillStyle = hull;
  traceEnemy(ctx);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2a0412';
  ctx.stroke();

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, enemy.hitFlash / 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Mündungsfeuer an der Bugkanone
  if (enemy.muzzleFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = enemy.muzzleFlash / 0.12;
    ctx.fillStyle = PALETTE.enemyGlow;
    ctx.beginPath();
    ctx.arc(0, 21, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Pulsierender Kern
  const pulse = 0.75 + Math.sin(enemy.age * 9) * 0.25;
  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
  core.addColorStop(0, PALETTE.enemyGlow);
  core.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.globalAlpha = pulse;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* ---------- Asteroid ---------- */

function traceAsteroid(ctx, shape) {
  ctx.beginPath();
  shape.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function drawAsteroid(ctx, rock) {
  const r = rock.radius;
  ctx.save();
  ctx.translate(rock.x, rock.y);

  ctx.save();
  ctx.translate(r * 0.55, r * 0.8);
  ctx.rotate(rock.rotation);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  traceAsteroid(ctx, rock.shape);
  ctx.fill();
  ctx.restore();

  ctx.rotate(rock.rotation);
  // Lichtquelle bleibt links oben, obwohl der Körper rotiert
  const lx = -r * 0.45;
  const ly = -r * 0.45;
  const cos = Math.cos(-rock.rotation);
  const sin = Math.sin(-rock.rotation);
  const gx = lx * cos - ly * sin;
  const gy = lx * sin + ly * cos;
  const fill = ctx.createRadialGradient(gx, gy, r * 0.1, 0, 0, r * 1.15);
  fill.addColorStop(0, PALETTE.rockLight);
  fill.addColorStop(0.55, PALETTE.rock);
  fill.addColorStop(1, PALETTE.rockDark);
  ctx.fillStyle = fill;
  traceAsteroid(ctx, rock.shape);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = PALETTE.rockDark;
  ctx.stroke();

  ctx.fillStyle = 'rgba(30, 25, 22, 0.45)';
  for (const c of rock.craters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, TAU);
    ctx.fill();
  }

  if (rock.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, rock.hitFlash / 0.12) * 0.8;
    ctx.fillStyle = '#ffffff';
    traceAsteroid(ctx, rock.shape);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- Gegnerisches Projektil ---------- */

function drawEnemyBullet(ctx, bullet) {
  const pulse = 1 + Math.sin(bullet.age * 30) * 0.15;
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(-bullet.angle);
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 11 * pulse);
  glow.addColorStop(0, 'rgba(255, 61, 110, 0.75)');
  glow.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 11 * pulse, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.enemyGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ---------- Schild-Item ---------- */

function traceHexagon(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 6 + (i / 6) * TAU;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawShieldPickup(ctx, item) {
  const pulse = 0.5 + Math.sin(item.age * 6) * 0.5;
  ctx.save();
  ctx.translate(item.x, item.y);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 30);
  glow.addColorStop(0, `rgba(79, 214, 255, ${0.35 + pulse * 0.25})`);
  glow.addColorStop(1, 'rgba(79, 214, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.rotate(Math.sin(item.age * 1.5) * 0.25);
  ctx.fillStyle = PALETTE.shieldDeep;
  traceHexagon(ctx, 16);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.shield;
  ctx.stroke();

  // Schild-Symbol
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
  ctx.restore();
}

/* ---------- Projektil ---------- */

function drawBullet(ctx, bullet) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 178, 63, 0.35)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(bullet.x, bullet.y);
  ctx.lineTo(bullet.x, bullet.y + 16);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.accentLight;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

registerSprite('player', drawPlayer);
registerSprite('enemy', drawEnemy);
registerSprite('asteroid', drawAsteroid);
registerSprite('bullet', drawBullet);
registerSprite('enemyBullet', drawEnemyBullet);
registerSprite('shieldPickup', drawShieldPickup);
