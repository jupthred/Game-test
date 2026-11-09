import { Hazard } from './Hazard.js';
import { EnemyBullet } from './EnemyBullet.js';
import { CONFIG } from '../config.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, clamp, randRange } from '../utils/math.js';

/**
 * Feindliches Raumschiff: sinkt nach unten, pendelt seitlich und schießt
 * in Richtung des Spielers (mit begrenztem Zielwinkel).
 */
export class EnemyShip extends Hazard {
  /**
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').LevelConfig} cfg
   */
  static spawn(worldWidth, cfg) {
    const amplitude = randRange(20, cfg.enemySwayAmplitude);
    const margin = 24 + amplitude;
    const ship = new EnemyShip(randRange(margin, worldWidth - margin), -32, amplitude, {
      fireInterval: cfg.enemyFireInterval,
      bulletSpeed: cfg.enemyBulletSpeed,
    });
    ship.vy = randRange(cfg.enemySpeed[0], cfg.enemySpeed[1]);
    return ship;
  }

  constructor(x, y, amplitude, { fireInterval = 2, bulletSpeed = 260 } = {}) {
    super(x, y, 21, { hp: 2, scoreValue: 40 });
    this.sprite = 'enemy';
    this.baseX = x;
    this.amplitude = amplitude;
    this.frequency = randRange(1.3, 2.3);
    this.phase = Math.random() * TAU;
    this.tilt = 0;
    this.fireInterval = fireInterval;
    this.bulletSpeed = bulletSpeed;
    this.fireTimer = randRange(0.5, fireInterval);
    /** Kurzes Aufleuchten der Kanone vor/nach dem Schuss */
    this.muzzleFlash = 0;
    this.debrisColors = [PALETTE.enemy, PALETTE.enemyGlow, PALETTE.accent];
  }

  get hitRadius() {
    return this.radius * 0.85;
  }

  update(dt, world) {
    super.update(dt, world);
    const sway = Math.cos(this.age * this.frequency + this.phase);
    this.x = this.baseX + Math.sin(this.age * this.frequency + this.phase) * this.amplitude;
    this.tilt = -sway * 0.35 * Math.min(1, this.amplitude / 60);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this._updateWeapon(dt, world);
  }

  _updateWeapon(dt, world) {
    if (!world.spawn) return;
    // Nur im oberen Bereich schießen, damit der Spieler reagieren kann
    const inFiringZone = this.y > 30 && this.y < world.height * 0.62;
    if (!inFiringZone) return;

    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;
    this.fireTimer = this.fireInterval * randRange(0.75, 1.25);

    const target = world.player;
    const angle = target?.alive
      ? clamp(Math.atan2(target.x - this.x, target.y - this.y), -CONFIG.enemyBullet.maxAimAngle, CONFIG.enemyBullet.maxAimAngle)
      : 0;
    world.spawn(new EnemyBullet(this.x, this.y + 20, angle, this.bulletSpeed));
    this.muzzleFlash = 0.12;
  }
}
