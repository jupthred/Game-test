/** Kreis-Kreis-Überlappung anhand von hitRadius. */
export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.hitRadius + b.hitRadius;
  return dx * dx + dy * dy < r * r;
}

/**
 * Regelbasierte Kollisionserkennung zwischen Entity-Typen.
 * Neue Interaktionen (z. B. 'player' ↔ 'powerup') werden nur als Regel ergänzt.
 */
export class CollisionSystem {
  /** @param {import('../entities/EntityManager.js').EntityManager} entities */
  constructor(entities) {
    this.entities = entities;
    this._rules = [];
  }

  /**
   * @param {string} typeA
   * @param {string} typeB
   * @param {(a: any, b: any) => void} onCollide
   */
  addRule(typeA, typeB, onCollide) {
    this._rules.push({ typeA, typeB, onCollide });
  }

  update() {
    for (const { typeA, typeB, onCollide } of this._rules) {
      const groupA = this.entities.ofType(typeA);
      const groupB = this.entities.ofType(typeB);
      for (const a of groupA) {
        for (const b of groupB) {
          if (!a.alive) break;
          if (b.alive && circlesOverlap(a, b)) onCollide(a, b);
        }
      }
    }
  }
}
