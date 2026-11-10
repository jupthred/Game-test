import { drawSprite } from '../graphics/Sprites.js';

/**
 * Basisklasse aller Spielobjekte.
 *
 * - `type` steuert Kollisionsregeln und Abfragen ('player', 'hazard', 'bullet', 'effect')
 * - `layer` steuert die Zeichenreihenfolge (klein = hinten)
 * - `sprite` wählt die Zeichenfunktion aus graphics/Sprites.js (zeichnet Frames aus dem Spritesheet)
 */
export class Entity {
  constructor(x, y, radius = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.alive = true;
    this.type = 'entity';
    this.layer = 0;
    this.sprite = null;
  }

  /** Radius für Kollisionsprüfungen (kann kleiner als der sichtbare Radius sein). */
  get hitRadius() {
    return this.radius;
  }

  /**
   * @param {number} dt Sekunden seit letztem Frame
   * @param {{ width: number, height: number }} world
   */
  // eslint-disable-next-line no-unused-vars
  update(dt, world) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx) {
    drawSprite(ctx, this);
  }

  kill() {
    this.alive = false;
  }
}
