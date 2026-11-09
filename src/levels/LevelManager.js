import { buildLevelConfig } from './levelConfig.js';

/** Hält das aktuelle Level und die verstrichene Überlebenszeit. */
export class LevelManager {
  constructor() {
    this.level = 1;
    this.elapsed = 0;
    /** @type {import('./levelConfig.js').LevelConfig} */
    this.config = buildLevelConfig(1);
  }

  /**
   * @param {number} level
   * @param {string} [difficultyId]
   */
  load(level, difficultyId) {
    this.level = level;
    this.config = buildLevelConfig(level, difficultyId);
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed = Math.min(this.elapsed + dt, this.config.duration);
  }

  get timeLeft() {
    return Math.max(0, this.config.duration - this.elapsed);
  }

  /** 0..1 */
  get progress() {
    return this.elapsed / this.config.duration;
  }

  get isComplete() {
    return this.elapsed >= this.config.duration;
  }
}
