/**
 * Verwaltet alle aktiven Entities: Aktualisieren, Zeichnen, Abfragen, Aufräumen.
 */
export class EntityManager {
  constructor() {
    this._entities = [];
  }

  /** @template T @param {T} entity @returns {T} */
  add(entity) {
    this._entities.push(entity);
    return entity;
  }

  ofType(type) {
    return this._entities.filter((e) => e.alive && e.type === type);
  }

  count(type) {
    let n = 0;
    for (const e of this._entities) if (e.alive && e.type === type) n += 1;
    return n;
  }

  update(dt, world) {
    // Index-Schleife: während des Updates hinzugefügte Entities laufen im selben Frame mit.
    for (let i = 0; i < this._entities.length; i += 1) {
      const entity = this._entities[i];
      if (entity.alive) entity.update(dt, world);
    }
    this._entities = this._entities.filter((e) => e.alive);
  }

  render(ctx) {
    const ordered = this._entities.slice().sort((a, b) => a.layer - b.layer);
    for (const entity of ordered) if (entity.alive) entity.render(ctx);
  }

  clear() {
    this._entities = [];
  }
}
