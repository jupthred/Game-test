import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

/** Projektil des Spielers. Fliegt geradeaus nach oben oder schräg (für spätere Booster). */
export class Bullet extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {{ angle?: number, speed?: number, damage?: number }} [options]
   *   angle: Abweichung von geradeaus (rad, positiv = rechts)
   */
  constructor(x, y, { angle = 0, speed = CONFIG.bullet.speed, damage = 1 } = {}) {
    super(x, y, CONFIG.bullet.radius);
    this.type = 'bullet';
    this.layer = 2;
    this.sprite = 'bullet';
    this.vx = Math.sin(angle) * speed;
    this.vy = -Math.cos(angle) * speed;
    this.speed = speed;
    this.damage = damage;
  }

  update(dt, world) {
    super.update(dt, world);
    if (this.y < -24 || this.x < -24 || this.x > world.width + 24) this.kill();
  }
}
