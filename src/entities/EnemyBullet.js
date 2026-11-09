import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

/** Projektil eines Feindschiffs. Fliegt geradlinig in die beim Abschuss gewählte Richtung. */
export class EnemyBullet extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} angle Richtung relativ zur Senkrechten nach unten (Radiant, positiv = nach rechts)
   * @param {number} speed px/s
   */
  constructor(x, y, angle, speed) {
    super(x, y, CONFIG.enemyBullet.radius);
    this.type = 'enemyBullet';
    this.layer = 2;
    this.sprite = 'enemyBullet';
    this.angle = angle;
    this.vx = Math.sin(angle) * speed;
    this.vy = Math.cos(angle) * speed;
    this.age = 0;
  }

  update(dt, world) {
    super.update(dt, world);
    this.age += dt;
    const m = 20;
    if (this.y > world.height + m || this.y < -m || this.x < -m || this.x > world.width + m) this.kill();
  }
}
