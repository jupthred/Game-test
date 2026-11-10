import { Hazard } from './Hazard.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, clamp, randRange } from '../utils/math.js';

/** Treibender Gesteinsbrocken. Große Asteroiden halten mehr Treffer aus. */
export class Asteroid extends Hazard {
  /**
   * Fabrik für den Spawner.
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').LevelConfig} cfg
   */
  static spawn(worldWidth, cfg) {
    const big = Math.random() < cfg.bigAsteroidChance;
    const radius = big ? randRange(26, 32) : randRange(14, 19);
    const rock = new Asteroid(randRange(radius, worldWidth - radius), -radius - 10, radius, big);
    rock.vy = randRange(cfg.asteroidSpeed[0], cfg.asteroidSpeed[1]) * (big ? 0.8 : 1);
    rock.vx = randRange(-28, 28);
    return rock;
  }

  constructor(x, y, radius, big) {
    super(x, y, radius, { hp: big ? 3 : 1, scoreValue: big ? 25 : 10 });
    this.sprite = 'asteroid';
    this.big = big;
    this.rotation = Math.random() * TAU;
    this.spin = randRange(-1.4, 1.4);
    /** Wählt eine der Asteroiden-Varianten im Spritesheet (0..1, unabhängig von deren Anzahl) */
    this.variant = Math.random();
    this.debrisColors = [PALETTE.rockLight, PALETTE.rock, PALETTE.accent];
  }

  get hitRadius() {
    return this.radius * 0.88;
  }

  update(dt, world) {
    super.update(dt, world);
    this.rotation += this.spin * dt;
    if (this.x < this.radius || this.x > world.width - this.radius) {
      this.vx *= -1;
      this.x = clamp(this.x, this.radius, world.width - this.radius);
    }
  }
}
