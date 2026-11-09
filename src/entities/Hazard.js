import { Entity } from './Entity.js';

/**
 * Basis für alles, was dem Spieler schadet und abgeschossen werden kann.
 * Neue Gegnertypen erben hiervon und werden im Spawner registriert.
 * Typ 'hazard' kollidiert mit dem Spieler; Bodenziele setzen type = 'ground'.
 */
export class Hazard extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {{ hp?: number, scoreValue?: number }} [options]
   */
  constructor(x, y, radius, { hp = 1, scoreValue = 10 } = {}) {
    super(x, y, radius);
    this.type = 'hazard';
    this.layer = 1;
    this.hp = hp;
    this.maxHp = hp;
    this.scoreValue = scoreValue;
    this.hitFlash = 0;
    this.age = 0;
    /** Farben für die Explosion, von Unterklassen überschreibbar. */
    this.debrisColors = ['#ffffff'];
  }

  /** @returns {boolean} true, wenn das Objekt zerstört wurde */
  takeDamage(amount = 1) {
    this.hp -= amount;
    this.hitFlash = 0.12;
    return this.hp <= 0;
  }

  update(dt, world) {
    super.update(dt, world);
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.y - this.radius > world.height + 30) this.kill();
  }
}
