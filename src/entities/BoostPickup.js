import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { randRange } from '../utils/math.js';

/**
 * Booster-Item (z. B. Doppelschuss). Fällt wie das Schild-Item herab;
 * welcher Booster es ist, bestimmt `boost` (siehe boosts/boostTypes.js).
 */
export class BoostPickup extends Entity {
  /**
   * @param {number} worldWidth
   * @param {import('../boosts/boostTypes.js').BoostType} boost
   */
  static spawn(worldWidth, boost) {
    const margin = 40;
    return new BoostPickup(randRange(margin, worldWidth - margin), -24, boost);
  }

  constructor(x, y, boost) {
    super(x, y, 16);
    this.type = 'pickup';
    this.kind = 'boost';
    this.boost = boost;
    this.layer = 2;
    this.sprite = 'boostPickup';
    this.vy = CONFIG.pickups.fallSpeed;
    this.baseX = x;
    this.age = 0;
  }

  get hitRadius() {
    return this.radius * 1.25;
  }

  update(dt, world) {
    super.update(dt, world);
    this.age += dt;
    this.x = this.baseX + Math.sin(this.age * 2.6 + 1) * 16;
    if (this.y - this.radius > world.height + 20) this.kill();
  }
}
