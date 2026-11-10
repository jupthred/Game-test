import { PALETTE, HUD_FONT } from './palette.js';
import { TAU } from '../utils/math.js';

/**
 * Zeichnet die Spielobjekte aus dem Spritesheet des gewählten Designs (assets/themes/<design>/spritesheet.png).
 *
 * Jede Entity hat einen `sprite`-Schlüssel, der hier auf eine Zeichenfunktion zeigt.
 * Die Grafiken selbst kommen aus dem Atlas; im Code bleiben nur dynamische Effekte
 * (Leuchten, Mündungsfeuer, Schildblase, Health-Balken), Schatten und Treffer-Blitze
 * werden als eingefärbte Silhouetten der Frames erzeugt.
 *
 * Frame-Namen (gleich in allen Designs, siehe assets/themes/classic/spritesheet.json):
 *   player, player_flame, player_cannon[_<boostId>], enemy, asteroid_big_N, asteroid_small_N,
 *   destroyer, turret_base, turret_head, bullet, enemy_bullet,
 *   pickup_shield, pickup_<boostId>, pickup_boost (Rückfall für Booster ohne eigenen Frame)
 */
const SPRITE_DRAWERS = new Map();

/** @type {import('./SpriteAtlas.js').SpriteAtlas | null} */
let atlas = null;

/** Muss vor dem ersten Zeichnen aufgerufen werden (siehe main.js). */
export function setSpriteAtlas(spriteAtlas) {
  atlas = spriteAtlas;
  variantCache.clear();
}

export function registerSprite(key, drawFn) {
  SPRITE_DRAWERS.set(key, drawFn);
}

export function drawSprite(ctx, entity) {
  const draw = SPRITE_DRAWERS.get(entity.sprite);
  if (draw && atlas) draw(ctx, entity);
}

const SHADOW = '#000000';
const FLASH = '#ffffff';

/** Alle Frames mit gemeinsamem Präfix (z. B. asteroid_big_0 … asteroid_big_3). */
const variantCache = new Map();
function variantsOf(prefix) {
  let list = variantCache.get(prefix);
  if (!list) {
    list = Object.keys(atlas.frames).filter((name) => name.startsWith(prefix)).sort();
    variantCache.set(prefix, list);
  }
  return list;
}

/** Lebenssymbol im HUD: der Gleiter in halber Größe, verlorene Leben als blasse Silhouette. */
export function drawLifeIcon(ctx, x, y, { filled, tint = null }) {
  if (!atlas) return;
  const color = tint ?? (filled ? null : 'rgba(238, 241, 246, 0.28)');
  atlas.draw(ctx, 'player', x, y, { scaleX: 0.5, scaleY: 0.5, tint: color });
}

/* ---------- Spieler: Weltraumgleiter ---------- */

function drawPlayer(ctx, player) {
  const roll = 1 - Math.abs(player.bank) * 0.32;
  const blinking = player.invulnerable > 0 && Math.floor(player.age * 12) % 2 === 0;

  ctx.save();
  if (blinking) ctx.globalAlpha = 0.35;

  // Schatten auf der Mondoberfläche (Licht von links oben)
  atlas.draw(ctx, 'player', player.x + 16, player.y + 26, { scaleX: roll * 0.92, scaleY: 0.92, tint: SHADOW, alpha: 0.35 });

  // Triebwerksflammen, flackernd
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ex of [-6, 6]) {
    const length = 12 + Math.random() * 10;
    atlas.draw(ctx, 'player_flame', player.x + ex * roll, player.y + 11, { scaleX: roll, scaleY: length / 22 });
  }
  ctx.restore();

  atlas.draw(ctx, 'player', player.x, player.y, { scaleX: roll });

  // Zusatzkanonen eines aktiven Boosters (alle Mündungen außer der Nase)
  if (player.boost) {
    const ending = player.boostTimeLeft < 2 && Math.floor(player.boostTimeLeft * 8) % 2 === 0;
    const frame = atlas.has(`player_cannon_${player.boost.id}`) ? `player_cannon_${player.boost.id}` : 'player_cannon';
    for (const m of player.weapon.muzzles) {
      if (m.x === 0) continue;
      atlas.draw(ctx, frame, player.x + m.x * roll, player.y + m.y, {
        scaleX: roll,
        tint: ending ? PALETTE.accentLight : null,
      });
    }
  }
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

function drawEnemy(ctx, enemy) {
  atlas.draw(ctx, 'enemy', enemy.x + 14, enemy.y + 22, { rotation: enemy.tilt, scaleX: 0.9, scaleY: 0.9, tint: SHADOW, alpha: 0.35 });
  atlas.draw(ctx, 'enemy', enemy.x, enemy.y, { rotation: enemy.tilt });
  if (enemy.hitFlash > 0) {
    atlas.draw(ctx, 'enemy', enemy.x, enemy.y, { rotation: enemy.tilt, tint: FLASH, alpha: Math.min(1, enemy.hitFlash / 0.12) });
  }

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.tilt);
  ctx.globalCompositeOperation = 'lighter';

  // Mündungsfeuer an der Bugkanone
  if (enemy.muzzleFlash > 0) {
    ctx.globalAlpha = enemy.muzzleFlash / 0.12;
    ctx.fillStyle = PALETTE.enemyGlow;
    ctx.beginPath();
    ctx.arc(0, 21, 6, 0, TAU);
    ctx.fill();
  }

  // Pulsierender Kern
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
  core.addColorStop(0, PALETTE.enemyGlow);
  core.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.globalAlpha = 0.75 + Math.sin(enemy.age * 9) * 0.25;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ---------- Asteroid ---------- */

function drawAsteroid(ctx, rock) {
  const variants = variantsOf(rock.big ? 'asteroid_big_' : 'asteroid_small_');
  if (!variants.length) return;
  const frame = variants[Math.floor(rock.variant * variants.length) % variants.length];
  const scale = rock.radius / atlas.radius(frame);
  const r = rock.radius;

  atlas.draw(ctx, frame, rock.x + r * 0.55, rock.y + r * 0.8, { rotation: rock.rotation, scaleX: scale, scaleY: scale, tint: SHADOW, alpha: 0.32 });
  atlas.draw(ctx, frame, rock.x, rock.y, { rotation: rock.rotation, scaleX: scale, scaleY: scale });
  if (rock.hitFlash > 0) {
    atlas.draw(ctx, frame, rock.x, rock.y, {
      rotation: rock.rotation, scaleX: scale, scaleY: scale, tint: FLASH, alpha: Math.min(1, rock.hitFlash / 0.12) * 0.8,
    });
  }
}

/* ---------- Zerstörer (Boss) ---------- */

function drawDestroyer(ctx, boss) {
  // Schatten mit größerem Versatz: fliegt höher als kleine Gegner
  atlas.draw(ctx, 'destroyer', boss.x + 26, boss.y + 40, { rotation: boss.tilt, scaleX: 0.9, scaleY: 0.9, tint: SHADOW, alpha: 0.4 });
  atlas.draw(ctx, 'destroyer', boss.x, boss.y, { rotation: boss.tilt });
  if (boss.hitFlash > 0) {
    atlas.draw(ctx, 'destroyer', boss.x, boss.y, { rotation: boss.tilt, tint: FLASH, alpha: Math.min(1, boss.hitFlash / 0.12) * 0.7 });
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.tilt);
  ctx.globalCompositeOperation = 'lighter';

  // Reaktorkern, pulsiert schneller, je stärker beschädigt
  const damage = 1 - boss.hp / boss.maxHp;
  const core = ctx.createRadialGradient(0, -4, 0, 0, -4, 16);
  core.addColorStop(0, PALETTE.enemyGlow);
  core.addColorStop(1, 'rgba(255, 61, 110, 0)');
  ctx.globalAlpha = 0.65 + Math.sin(boss.age * (6 + damage * 14)) * 0.35;
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
  // Liegt flach auf dem Boden: nur ein knapper Schlagschatten
  atlas.draw(ctx, 'turret_base', turret.x + 3, turret.y + 4, { tint: SHADOW, alpha: 0.35 });
  atlas.draw(ctx, 'turret_base', turret.x, turret.y);
  if (turret.hitFlash > 0) {
    atlas.draw(ctx, 'turret_base', turret.x, turret.y, { tint: FLASH, alpha: Math.min(1, turret.hitFlash / 0.12) * 0.7 });
  }

  // Drehbarer Turmkopf (Rohr im Frame zeigt nach unten), Rückstoß entlang des Rohrs
  const back = turret.recoil * 3;
  const hx = turret.x - Math.sin(turret.aim) * back;
  const hy = turret.y - Math.cos(turret.aim) * back;
  atlas.draw(ctx, 'turret_head', hx, hy, { rotation: -turret.aim });

  // Aufladen an der Mündung
  if (turret.charge > 0) {
    const mx = hx + Math.sin(turret.aim) * 24;
    const my = hy + Math.cos(turret.aim) * 24;
    const r = 4 + turret.charge * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = turret.charge;
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, r);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(1, 'rgba(255, 61, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

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

/* ---------- Projektile ---------- */

function drawEnemyBullet(ctx, bullet) {
  const pulse = 1 + Math.sin(bullet.age * 30) * 0.15;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  atlas.draw(ctx, 'enemy_bullet', bullet.x, bullet.y, { rotation: -bullet.angle, scaleX: pulse, scaleY: pulse });
  ctx.restore();
}

function drawBullet(ctx, bullet) {
  // Frame zeigt nach oben; entlang der Flugrichtung drehen (auch für schräge Schüsse)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  atlas.draw(ctx, 'bullet', bullet.x, bullet.y, { rotation: Math.atan2(bullet.vx, -bullet.vy) });
  ctx.restore();
}

/* ---------- Items ---------- */

function drawItemGlow(ctx, x, y, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, 6, x, y, 30);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShieldPickup(ctx, item) {
  const pulse = 0.5 + Math.sin(item.age * 6) * 0.5;
  drawItemGlow(ctx, item.x, item.y, PALETTE.shield, 0.5 + pulse * 0.35);
  atlas.draw(ctx, 'pickup_shield', item.x, item.y, { rotation: Math.sin(item.age * 1.5) * 0.25 });
}

function drawBoostPickup(ctx, item) {
  const boost = item.boost;
  const pulse = 0.5 + Math.sin(item.age * 7) * 0.5;
  const rotation = Math.sin(item.age * 1.8) * 0.2;
  drawItemGlow(ctx, item.x, item.y, boost.color, 0.45 + pulse * 0.35);

  const own = `pickup_${boost.id}`;
  if (atlas.has(own)) {
    atlas.draw(ctx, own, item.x, item.y, { rotation });
    return;
  }
  // Rückfall: leere Raute mit Kurzlabel, bis ein eigener Frame im Spritesheet existiert
  atlas.draw(ctx, 'pickup_boost', item.x, item.y, { rotation });
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 11px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(boost.shortLabel, item.x, item.y + 1);
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
