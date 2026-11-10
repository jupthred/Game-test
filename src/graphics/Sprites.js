import { PALETTE, HUD_FONT } from './palette.js';
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

  // Zusätzliche Kanonen eines aktiven Boosters (alle Mündungen außer der Nase)
  if (player.boost) {
    const ending = player.boostTimeLeft < 2 && Math.floor(player.boostTimeLeft * 8) % 2 === 0;
    for (const m of player.weapon.muzzles) {
      if (m.x === 0) continue;
      ctx.fillStyle = '#2a1503';
      ctx.fillRect(m.x - 4, m.y - 9, 8, 20);
      ctx.fillStyle = ending ? PALETTE.accentLight : player.boost.color;
      ctx.fillRect(m.x - 3, m.y - 9, 6, 17);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m.x - 1.5, m.y - 12, 3, 4);
    }
  }

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

/* ---------- Zerstörer (Boss) ---------- */

function traceDestroyerHull(ctx) {
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
}

function drawDestroyer(ctx, boss) {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.tilt);

  // Schatten (fliegt höher als kleine Gegner → größerer Versatz)
  ctx.save();
  ctx.translate(26, 40);
  ctx.scale(0.9, 0.9);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  traceDestroyerHull(ctx);
  ctx.fill();
  ctx.restore();

  // Kanonenrohre
  for (const cannon of boss.cannons) {
    ctx.fillStyle = '#26121a';
    ctx.fillRect(cannon.x - 5, cannon.y - 22, 10, 24);
    ctx.fillStyle = '#4a2030';
    ctx.fillRect(cannon.x - 3, cannon.y - 22, 3, 24);
  }

  // Rumpf
  const hull = ctx.createLinearGradient(0, -40, 0, 44);
  hull.addColorStop(0, '#2b0a17');
  hull.addColorStop(0.45, '#7d1736');
  hull.addColorStop(0.75, PALETTE.enemy);
  hull.addColorStop(1, '#2b0a17');
  ctx.fillStyle = hull;
  traceDestroyerHull(ctx);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1a030b';
  ctx.stroke();

  if (boss.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, boss.hitFlash / 0.12) * 0.7;
    ctx.fillStyle = '#ffffff';
    traceDestroyerHull(ctx);
    ctx.fill();
    ctx.restore();
  }

  // Panzerplatten und Kommandobrücke
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

  ctx.globalCompositeOperation = 'lighter';

  // Reaktorkern, pulsiert schneller, je stärker beschädigt
  const damage = 1 - boss.hp / boss.maxHp;
  const pulse = 0.65 + Math.sin(boss.age * (6 + damage * 14)) * 0.35;
  const core = ctx.createRadialGradient(0, -4, 0, 0, -4, 16);
  core.addColorStop(0, PALETTE.enemyGlow);
  core.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.globalAlpha = pulse;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -4, 16, 0, TAU);
  ctx.fill();

  // Aufladen und Mündungsfeuer an beiden Kanonen
  for (const cannon of boss.cannons) {
    const glow = Math.max(boss.charge, boss.muzzleFlash / 0.15);
    if (glow <= 0) continue;
    ctx.globalAlpha = glow;
    const g = ctx.createRadialGradient(cannon.x, cannon.y + 2, 0, cannon.x, cannon.y + 2, 6 + glow * 8);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, PALETTE.enemyGlow);
    g.addColorStop(1, 'rgba(255, 61, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cannon.x, cannon.y + 2, 6 + glow * 8, 0, TAU);
    ctx.fill();
  }

  // Triebwerke oben (fliegt "rückwärts" ins Bild)
  ctx.globalAlpha = 0.8;
  for (const ex of [-30, 30]) {
    const len = 8 + Math.random() * 6;
    const flame = ctx.createLinearGradient(0, -30, 0, -30 - len);
    flame.addColorStop(0, PALETTE.enemyGlow);
    flame.addColorStop(1, 'rgba(255, 61, 110, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(ex - 5, -30);
    ctx.lineTo(ex, -30 - len);
    ctx.lineTo(ex + 5, -30);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  drawBossHealthBar(ctx, boss);
}

/** Health-Balken über dem Boss: Name, Segmentbalken, Trefferpunkte. Färbt sich bei wenig HP gelb/weiß. */
function drawBossHealthBar(ctx, boss) {
  if (boss.isRetreating) return;
  const width = 124;
  const height = 8;
  const x = boss.x - width / 2;
  const y = boss.y - 66;
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const color = ratio > 0.5 ? PALETTE.enemy : ratio > 0.25 ? PALETTE.accent : PALETTE.accentLight;

  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 13, 0.75)';
  ctx.fillRect(x - 3, y - 15, width + 6, height + 19);

  ctx.font = `700 9px ${HUD_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'left';
  ctx.fillText(boss.displayName.toUpperCase(), x, y - 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`${Math.max(0, boss.hp)}/${boss.maxHp}`, x + width, y - 4);

  ctx.fillStyle = 'rgba(238, 241, 246, 0.15)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : color;
  ctx.fillRect(x, y, width * ratio, height);

  // Segmentlinien alle 10 % für bessere Lesbarkeit
  ctx.fillStyle = 'rgba(5, 7, 13, 0.6)';
  for (let i = 1; i < 10; i += 1) ctx.fillRect(x + (width * i) / 10 - 0.5, y, 1, height);
  ctx.restore();
}

/* ---------- Geschützturm am Boden ---------- */

function drawGroundTurret(ctx, turret) {
  ctx.save();
  ctx.translate(turret.x, turret.y);

  // Betonsockel (achteckig), liegt flach auf dem Boden: nur ein knapper Schlagschatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i / 8) * TAU;
    ctx.lineTo(Math.cos(a) * 21 + 3, Math.sin(a) * 21 + 4);
  }
  ctx.closePath();
  ctx.fill();

  const pad = ctx.createLinearGradient(-20, -20, 20, 20);
  pad.addColorStop(0, '#a3a8b0');
  pad.addColorStop(1, '#4b4f57');
  ctx.fillStyle = pad;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i / 8) * TAU;
    ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2a2d33';
  ctx.stroke();

  // Warnmarkierungen an vier Ecken
  ctx.fillStyle = PALETTE.accent;
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + (i / 4) * TAU;
    ctx.fillRect(Math.cos(a) * 15 - 2, Math.sin(a) * 15 - 2, 4, 4);
  }

  if (turret.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, turret.hitFlash / 0.12) * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Drehbarer Turmkopf mit Rohr (Rohr zeigt in Zielrichtung)
  ctx.rotate(-turret.aim);
  const back = turret.recoil * 4;
  ctx.fillStyle = '#25282e';
  ctx.fillRect(-3.5, 4 - back, 7, 19);
  ctx.fillStyle = '#5e636c';
  ctx.fillRect(-1.5, 4 - back, 2, 19);

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

  // Sensorauge zeigt ebenfalls in Zielrichtung
  ctx.fillStyle = PALETTE.enemyGlow;
  ctx.beginPath();
  ctx.arc(0, 5, 2, 0, TAU);
  ctx.fill();

  // Aufladen an der Mündung
  if (turret.charge > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = turret.charge;
    const glow = ctx.createRadialGradient(0, 24 - back, 0, 0, 24 - back, 4 + turret.charge * 6);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(1, 'rgba(255, 61, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 24 - back, 4 + turret.charge * 6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  drawUnitHealthBar(ctx, turret, 36, turret.y - 32);
}

/**
 * Kleiner Health-Balken mit einem Segment pro Trefferpunkt (für normale Gegner).
 * @param {number} width Gesamtbreite
 * @param {number} y Oberkante
 */
export function drawUnitHealthBar(ctx, unit, width, y) {
  const segments = unit.maxHp;
  const gap = 2;
  const segW = (width - gap * (segments - 1)) / segments;
  const x = unit.x - width / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 13, 0.7)';
  ctx.fillRect(x - 2, y - 2, width + 4, 8);
  for (let i = 0; i < segments; i += 1) {
    const filled = i < unit.hp;
    ctx.fillStyle = filled ? (unit.hitFlash > 0 ? '#ffffff' : unit.hp === 1 ? PALETTE.accent : PALETTE.enemy) : 'rgba(238, 241, 246, 0.18)';
    ctx.fillRect(x + i * (segW + gap), y, segW, 4);
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

/* ---------- Booster-Item ---------- */

/** Symbole pro Booster-ID; ohne Eintrag wird boost.shortLabel als Text gezeichnet. */
const BOOST_ICONS = new Map();

/** @param {string} boostId @param {(ctx: CanvasRenderingContext2D, boost: object) => void} drawFn */
export function registerBoostIcon(boostId, drawFn) {
  BOOST_ICONS.set(boostId, drawFn);
}

registerBoostIcon('doubleShot', (ctx) => {
  // Zwei parallele Geschosse mit Spitze
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
});

function drawBoostPickup(ctx, item) {
  const boost = item.boost;
  const pulse = 0.5 + Math.sin(item.age * 7) * 0.5;
  ctx.save();
  ctx.translate(item.x, item.y);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45 + pulse * 0.35;
  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 30);
  glow.addColorStop(0, boost.color);
  glow.addColorStop(1, 'rgba(255, 154, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Raute als Grundform (unterscheidet Booster vom sechseckigen Schild-Item)
  ctx.rotate(Math.sin(item.age * 1.8) * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fillStyle = '#3a1a02';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = boost.color;
  ctx.stroke();

  const icon = BOOST_ICONS.get(boost.id);
  if (icon) {
    icon(ctx, boost);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 11px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boost.shortLabel, 0, 1);
  }
  ctx.restore();
}

/* ---------- Projektil ---------- */

function drawBullet(ctx, bullet) {
  // Schweif entgegen der Flugrichtung (funktioniert auch für schräge Schüsse)
  const tailX = bullet.x - (bullet.vx / bullet.speed) * 16;
  const tailY = bullet.y - (bullet.vy / bullet.speed) * 16;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 178, 63, 0.35)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(bullet.x, bullet.y);
  ctx.lineTo(tailX, tailY);
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
registerSprite('destroyer', drawDestroyer);
registerSprite('groundTurret', drawGroundTurret);
registerSprite('boostPickup', drawBoostPickup);
registerSprite('shieldPickup', drawShieldPickup);
