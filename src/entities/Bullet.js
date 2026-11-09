import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

/** Projektil des Spielers, fliegt gerade nach oben. */
export class Bullet extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.bullet.radius);
    this.type = 'bullet';
    this.layer = 2;
    this.sprite = 'bullet';
    this.vy = -CONFIG.bullet.speed;
    this.damage = 1;
  }

  update(dt, world) {
    super.update(dt, world);
    if (this.y < -24) this.kill();
  }
}
