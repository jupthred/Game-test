import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { CONFIG } from '../config.js';
import { clamp, lerp } from '../utils/math.js';

/**
 * Weltraumgleiter des Spielers. Bewegt sich ausschließlich auf der X-Achse.
 * Eingaben verschieben eine Zielposition, der Gleiter folgt ihr weich.
 * Ein Schild fängt Treffer ab, bevor ein Leben verloren geht.
 */
export class Player extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {{ minX: number, maxX: number }} bounds
   * @param {{ shield?: number, shieldMax?: number }} [options]
   *   shield: Startwert (wird zwischen Leveln übernommen), shieldMax: Kapazität je Schwierigkeitsstufe
   */
  constructor(x, y, bounds, { shieldMax = CONFIG.player.shieldMax, shield = shieldMax } = {}) {
    super(x, y, CONFIG.player.radius);
    this.type = 'player';
    this.layer = 3;
    this.sprite = 'player';
    this.bounds = bounds;
    this.targetX = x;
    this.bank = 0;
    this.age = 0;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.shieldMax = shieldMax;
    this.shield = clamp(shield, 0, this.shieldMax);
    /** Aufleuchten der Schildblase nach Treffer/Aufladen (s) */
    this.shieldFlash = 0;
  }

  get shieldRatio() {
    return this.shield / this.shieldMax;
  }

  /**
   * Verarbeitet einen Treffer.
   * @returns {'shield' | 'hull'} 'shield', wenn das Schild ihn abgefangen hat
   */
  absorbHit() {
    if (this.shield > 0) {
      this.shield -= 1;
      this.shieldFlash = 0.3;
      return 'shield';
    }
    return 'hull';
  }

  /** @returns {number} tatsächlich aufgeladene Schildpunkte */
  healShield(amount) {
    const before = this.shield;
    this.shield = Math.min(this.shieldMax, this.shield + amount);
    this.shieldFlash = 0.45;
    return this.shield - before;
  }

  refillShield() {
    this.shield = this.shieldMax;
  }

  /** Etwas kleiner als die Grafik – fühlt sich fairer an. */
  get hitRadius() {
    return this.radius * 0.62;
  }

  get isInvulnerable() {
    return this.invulnerable > 0;
  }

  /** Verschiebt die Zielposition um dx Welteinheiten. */
  steer(dx) {
    const margin = this.radius + 4;
    this.targetX = clamp(this.targetX + dx, this.bounds.minX + margin, this.bounds.maxX - margin);
  }

  canFire() {
    return this.alive && this.cooldown <= 0;
  }

  /** @returns {Bullet[]} Neue Projektile (Array, damit spätere Waffen-Upgrades mehrere liefern können). */
  fire() {
    this.cooldown = CONFIG.player.fireCooldown;
    return [new Bullet(this.x, this.y - this.radius)];
  }

  hit(invulnerableTime) {
    this.invulnerable = invulnerableTime;
  }

  update(dt) {
    const previousX = this.x;
    this.x += (this.targetX - this.x) * Math.min(1, dt * CONFIG.player.followRate);
    const velocity = (this.x - previousX) / Math.max(dt, 1e-4);
    this.bank = lerp(this.bank, clamp(velocity / 520, -1, 1), Math.min(1, dt * 10));

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    this.age += dt;
  }
}
