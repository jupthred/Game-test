import { Hazard } from './Hazard.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, clamp, randInt, randRange } from '../utils/math.js';

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
    this.shape = Asteroid.createShape(radius);
    this.craters = Array.from({ length: big ? 3 : 2 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.5;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: randRange(radius * 0.12, radius * 0.24) };
    });
    this.debrisColors = [PALETTE.rockLight, PALETTE.rock, PALETTE.accent];
  }

  static createShape(radius) {
    const points = randInt(8, 12);
    return Array.from({ length: points }, (_, i) => {
      const angle = (i / points) * TAU;
      const dist = radius * randRange(0.78, 1.08);
      return [Math.cos(angle) * dist, Math.sin(angle) * dist];
    });
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
