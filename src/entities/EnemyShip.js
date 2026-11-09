import { Hazard } from './Hazard.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, randRange } from '../utils/math.js';

/**
 * Feindliches Raumschiff: sinkt nach unten und pendelt seitlich.
 * Erweiterungsidee: eigene Schüsse über ein `weapon`-Modul.
 */
export class EnemyShip extends Hazard {
  /**
   * @param {number} worldWidth
   * @param {import('../levels/levelConfig.js').LevelConfig} cfg
   */
  static spawn(worldWidth, cfg) {
    const amplitude = randRange(20, cfg.enemySwayAmplitude);
    const margin = 24 + amplitude;
    const ship = new EnemyShip(randRange(margin, worldWidth - margin), -32, amplitude);
    ship.vy = randRange(cfg.enemySpeed[0], cfg.enemySpeed[1]);
    return ship;
  }

  constructor(x, y, amplitude) {
    super(x, y, 21, { hp: 2, scoreValue: 40 });
    this.sprite = 'enemy';
    this.baseX = x;
    this.amplitude = amplitude;
    this.frequency = randRange(1.3, 2.3);
    this.phase = Math.random() * TAU;
    this.tilt = 0;
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
  }
}
