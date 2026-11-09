import { Hazard } from './Hazard.js';
import { EnemyBullet } from './EnemyBullet.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, randRange } from '../utils/math.js';

/** Max. Drehgeschwindigkeit des Turmkopfs (rad/s). */
const TURRET_TURN_SPEED = 3.2;
/** Nur feuern, wenn das Rohr höchstens so weit vom Ziel abweicht (rad). */
const TURRET_AIM_TOLERANCE = 0.18;
/** Aufladezeit vor dem Schuss (s), sichtbar als Glühen an der Mündung. */
const TURRET_CHARGE_TIME = 0.35;

/** Kürzeste Winkeldifferenz in [-π, π]. */
function angleDelta(from, to) {
  return ((to - from + Math.PI * 3) % TAU) - Math.PI;
}

/**
 * Geschützturm am Boden. Steht fest auf der Mondoberfläche und scrollt mit ihr.
 * Der Turmkopf dreht sich ständig zum Spieler und kann in alle Richtungen feuern –
 * auch nach hinten, wenn er unter dem Spieler hindurchgezogen ist.
 *
 * Typ 'ground': kollidiert nicht mit dem Gleiter (der fliegt darüber),
 * kann aber von dessen Schüssen getroffen werden.
 */
export class GroundTurret extends Hazard {
  /**
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').LevelConfig} cfg
   */
  static spawn(worldWidth, cfg) {
    const margin = 40;
    const turret = new GroundTurret(randRange(margin, worldWidth - margin), -30, cfg.turret);
    turret.vy = cfg.scrollSpeed;
    return turret;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {import('../levels/levelConfig.js').TurretConfig} stats
   */
  constructor(x, y, stats) {
    super(x, y, 18, { hp: stats.hp, scoreValue: stats.scoreValue });
    this.type = 'ground';
    this.layer = 0.5;
    this.sprite = 'groundTurret';
    this.displayHealthBar = true;

    /** Rohrrichtung: 0 = nach unten, positiv = nach rechts (wie EnemyBullet) */
    this.aim = 0;
    this.fireInterval = stats.fireInterval;
    this.bulletSpeed = stats.bulletSpeed;
    this.fireTimer = randRange(0.6, stats.fireInterval);
    this.charge = 0;
    this.recoil = 0;
    this.debrisColors = ['#9aa0a8', '#5a5f68', PALETTE.accent];
  }

  /** Mündungsposition relativ zur Turmmitte. */
  get muzzle() {
    const length = 22;
    return { x: this.x + Math.sin(this.aim) * length, y: this.y + Math.cos(this.aim) * length };
  }

  update(dt, world) {
    super.update(dt, world);
    this.recoil = Math.max(0, this.recoil - dt * 4);

    const target = world.player;
    if (!target?.alive) {
      this.charge = 0;
      return;
    }

    // Kopf dreht sich mit begrenzter Geschwindigkeit zum Spieler
    const desired = Math.atan2(target.x - this.x, target.y - this.y);
    const delta = angleDelta(this.aim, desired);
    const maxStep = TURRET_TURN_SPEED * dt;
    this.aim += Math.max(-maxStep, Math.min(maxStep, delta));

    const onScreen = this.y > 20 && this.y < world.height - 10;
    if (!onScreen) {
      this.charge = 0;
      return;
    }

    this.fireTimer -= dt;
    this.charge = Math.max(0, Math.min(1, 1 - this.fireTimer / TURRET_CHARGE_TIME));
    if (this.fireTimer > 0) return;
    if (Math.abs(delta) > TURRET_AIM_TOLERANCE) {
      // Noch nicht ausgerichtet: kurz warten, Ladung bleibt sichtbar
      this.fireTimer = 0.05;
      return;
    }

    const { x, y } = this.muzzle;
    world.spawn?.(new EnemyBullet(x, y, this.aim, this.bulletSpeed));
    this.fireTimer = this.fireInterval * randRange(0.85, 1.15);
    this.charge = 0;
    this.recoil = 1;
  }
}
