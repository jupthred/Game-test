import { randRange } from '../utils/math.js';

/**
 * Zeitgesteuertes Erzeugen von Gegnern.
 *
 * Gegnertypen werden per register(key, factory) angemeldet.
 * Die Level-Konfiguration bestimmt pro Schlüssel Intervall und Startverzögerung
 * (siehe levels/levelConfig.js → spawns). Ein neuer Gegnertyp braucht also nur:
 *   1. eine Klasse mit statischer spawn()-Fabrik
 *   2. spawner.register('neuerTyp', ...)
 *   3. einen Eintrag in spawns der Level-Konfiguration
 *
 * Kanäle mit `unlimited: true` (z. B. Items) zählen nicht gegen maxActive.
 *
 * Jeder Kanal hat eine Kategorie (`category`, Standard 'hostile'). Kategorien lassen
 * sich pausieren, z. B. stoppt der Bosskampf alle 'hostile'-Kanäle, Items kommen weiter.
 *
 * Zusätzlich gibt es einmalige Ereignisse (levelConfig.events), z. B. den Auftritt
 * des Zerstörers nach 18 Sekunden: { key: 'destroyer', at: 18 }.
 */
export class Spawner {
  constructor() {
    this._factories = new Map();
    this._channels = [];
    this._levelConfig = null;
    this._events = [];
    this._elapsed = 0;
    this._pausedCategories = new Set();
    /** Wird mit jeder neuen Entity aufgerufen. */
    this.onSpawn = () => {};
    /** Liefert die Anzahl aktiver Gegner (für das Limit maxActive). */
    this.countActive = () => 0;
  }

  register(key, factory) {
    this._factories.set(key, factory);
  }

  /** @param {import('../levels/levelConfig.js').LevelConfig} levelConfig */
  configure(levelConfig) {
    this._levelConfig = levelConfig;
    this._channels = Object.entries(levelConfig.spawns).map(([key, spawn]) => ({
      key,
      interval: spawn.interval,
      jitter: spawn.jitter ?? 0.3,
      timer: spawn.delay ?? spawn.interval,
      unlimited: spawn.unlimited ?? false,
      category: spawn.category ?? 'hostile',
    }));
    this._pausedCategories.clear();
    this._events = (levelConfig.events ?? []).map((event) => ({ ...event, done: false }));
    this._elapsed = 0;
  }

  /** Pausiert bzw. aktiviert alle Kanäle einer Kategorie. */
  setCategoryActive(category, active) {
    if (active) this._pausedCategories.delete(category);
    else this._pausedCategories.add(category);
  }

  /** Erzeugt sofort eine Entity über die registrierte Fabrik (z. B. für Bosse). */
  spawnNow(key) {
    const factory = this._factories.get(key);
    if (!factory) throw new Error(`Kein Spawn-Typ registriert: ${key}`);
    const entity = factory(this._levelConfig);
    this.onSpawn(entity);
    return entity;
  }

  update(dt) {
    if (!this._levelConfig) return;
    this._elapsed += dt;

    for (const event of this._events) {
      if (event.done || this._elapsed < event.at) continue;
      event.done = true;
      const factory = this._factories.get(event.key);
      if (factory) this.onSpawn(factory(this._levelConfig));
    }
    for (const channel of this._channels) {
      if (this._pausedCategories.has(channel.category)) continue;
      channel.timer -= dt;
      if (channel.timer > 0) continue;
      channel.timer = channel.interval * randRange(1 - channel.jitter, 1 + channel.jitter);

      const factory = this._factories.get(channel.key);
      if (factory && (channel.unlimited || this.countActive() < this._levelConfig.maxActive)) {
        this.onSpawn(factory(this._levelConfig));
      }
    }
  }
}
