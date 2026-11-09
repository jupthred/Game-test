import { Hazard } from './Hazard.js';
import { EnemyBullet } from './EnemyBullet.js';
import { CONFIG } from '../config.js';
import { PALETTE } from '../graphics/palette.js';
import { clamp } from '../utils/math.js';

/** Ablauf des Zerstörers. */
const DestroyerPhase = Object.freeze({ ENTER: 'enter', HOVER: 'hover', RETREAT: 'retreat' });

/** Wie lange die Kanonen vor einer Salve sichtbar aufladen (s). */
const CHARGE_TIME = 0.4;

/**
 * Der fiese Zerstörer: schweres Kommandoschiff, das einmal pro Level gegen Ende
 * erscheint, sich vor den Spieler setzt, dort hin und her schwebt und aus zwei
 * Kanonen gleichzeitig feuert. Endet das Level, bevor er zerstört ist, zieht er sich zurück.
 */
export class Destroyer extends Hazard {
  /**
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').LevelConfig} cfg
   */
  static spawn(worldWidth, cfg) {
    return new Destroyer(worldWidth / 2, -70, worldWidth, cfg.destroyer);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').DestroyerConfig} stats
   */
  constructor(x, y, worldWidth, stats) {
    super(x, y, 46, { hp: stats.hp, scoreValue: stats.scoreValue });
    this.sprite = 'destroyer';
    this.isBoss = true;
    this.displayName = 'Zerstörer';
    this.layer = 1.5;

    this.phase = DestroyerPhase.ENTER;
    this.hoverY = stats.hoverY;
    this.centerX = worldWidth / 2;
    this.swayAmplitude = worldWidth / 2 - 70;
    this.swayTime = 0;
    this.vy = 120;

    this.fireInterval = stats.fireInterval;
    this.bulletSpeed = stats.bulletSpeed;
    this.fireTimer = 1.0;
    this.charge = 0;
    this.muzzleFlash = 0;
    this.tilt = 0;
    /** Position der beiden Kanonenmündungen relativ zur Mitte */
    this.cannons = [{ x: -34, y: 34 }, { x: 34, y: 34 }];
    this.debrisColors = [PALETTE.enemy, PALETTE.accent, PALETTE.enemyGlow, '#ffffff'];
  }

  get hitRadius() {
    return this.radius * 0.85;
  }

  get isRetreating() {
    return this.phase === DestroyerPhase.RETREAT;
  }

  /** Abzug bei Levelende: fliegt nach oben weg, schießt nicht mehr. */
  retreat() {
    this.phase = DestroyerPhase.RETREAT;
    this.vy = -260;
    this.charge = 0;
  }

  update(dt, world) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);

    switch (this.phase) {
      case DestroyerPhase.ENTER:
        if (this.y >= this.hoverY) {
          this.y = this.hoverY;
          this.vy = 0;
          this.phase = DestroyerPhase.HOVER;
        }
        break;
      case DestroyerPhase.HOVER: {
        this.swayTime += dt;
        const previousX = this.x;
        this.x = this.centerX + Math.sin(this.swayTime * 0.75) * this.swayAmplitude;
        this.y = this.hoverY + Math.sin(this.swayTime * 2.1) * 6;
        this.tilt = clamp(((this.x - previousX) / Math.max(dt, 1e-4)) / 900, -0.12, 0.12);
        this._updateWeapons(dt, world);
        break;
      }
      case DestroyerPhase.RETREAT:
        if (this.y < -this.radius * 2) this.kill();
        break;
      default:
    }
  }

  _updateWeapons(dt, world) {
    this.fireTimer -= dt;
    this.charge = clamp(1 - this.fireTimer / CHARGE_TIME, 0, 1);
    if (this.fireTimer > 0) return;
    this.fireTimer = this.fireInterval;
    this.charge = 0;
    this.muzzleFlash = 0.15;

    // Beide Kanonen feuern gleichzeitig, jede zielt einzeln auf den Spieler
    const target = world.player;
    for (const cannon of this.cannons) {
      const mx = this.x + cannon.x;
      const my = this.y + cannon.y;
      const angle = target?.alive
        ? clamp(Math.atan2(target.x - mx, target.y - my), -CONFIG.enemyBullet.maxAimAngle, CONFIG.enemyBullet.maxAimAngle)
        : 0;
      world.spawn?.(new EnemyBullet(mx, my, angle, this.bulletSpeed));
    }
  }
}
