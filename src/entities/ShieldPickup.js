import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { randRange } from '../utils/math.js';

/**
 * Schild-Item: fällt von oben herab und lädt beim Einsammeln das Schild auf.
 * Vorlage für weitere Items: eigener `kind`, eigenes Sprite, Behandlung in Game._onPickup().
 */
export class ShieldPickup extends Entity {
  /** @param {number} worldWidth */
  static spawn(worldWidth) {
    const margin = 40;
    return new ShieldPickup(randRange(margin, worldWidth - margin), -24);
  }

  constructor(x, y) {
    super(x, y, 16);
    this.type = 'pickup';
    this.kind = 'shield';
    this.layer = 2;
    this.sprite = 'shieldPickup';
    this.vy = CONFIG.pickups.fallSpeed;
    this.baseX = x;
    this.age = 0;
  }

  /** Großzügiger Einsammelradius. */
  get hitRadius() {
    return this.radius * 1.25;
  }

  update(dt, world) {
    super.update(dt, world);
    this.age += dt;
    this.x = this.baseX + Math.sin(this.age * 2.2) * 14;
    if (this.y - this.radius > world.height + 20) this.kill();
  }
}
