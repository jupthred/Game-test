import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { CONFIG } from '../config.js';
import { clamp, lerp } from '../utils/math.js';
import { resolveWeapon } from '../boosts/boostTypes.js';

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
    /** Aktiver Waffen-Booster (boosts/boostTypes.js) und Restlaufzeit */
    this.boost = null;
    this.boostTimeLeft = 0;
    /** Aktuelle Waffe = Standardwaffe + Booster */
    this.weapon = resolveWeapon(null);
  }

  /**
   * Aktiviert einen Booster. Derselbe Booster erneut eingesammelt setzt die Zeit zurück,
   * ein anderer ersetzt den aktiven (immer nur einer gleichzeitig).
   * @param {import('../boosts/boostTypes.js').BoostType} boost
   * @param {number} [timeLeft] Restzeit, z. B. beim Übernehmen ins nächste Level
   */
  applyBoost(boost, timeLeft = boost.duration) {
    this.boost = boost;
    this.boostTimeLeft = timeLeft;
    this.weapon = resolveWeapon(boost);
  }

  /** @returns {import('../boosts/boostTypes.js').BoostType | null} der beendete Booster */
  clearBoost() {
    const ended = this.boost;
    this.boost = null;
    this.boostTimeLeft = 0;
    this.weapon = resolveWeapon(null);
    return ended;
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

  /** @returns {Bullet[]} Ein Geschoss pro Mündung der aktuellen Waffe */
  fire() {
    const weapon = this.weapon;
    this.cooldown = CONFIG.player.fireCooldown * weapon.cooldownMultiplier;
    const speed = CONFIG.bullet.speed * weapon.speedMultiplier;
    return weapon.muzzles.map(
      (m) => new Bullet(this.x + m.x, this.y + m.y, { angle: m.angle ?? 0, speed, damage: weapon.damage }),
    );
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

    // Booster läuft ab; Game prüft boostExpired und meldet das Ende
    this.boostExpired = false;
    if (this.boost) {
      this.boostTimeLeft -= dt;
      if (this.boostTimeLeft <= 0) {
        this.clearBoost();
        this.boostExpired = true;
      }
    }
  }
}
