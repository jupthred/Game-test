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
 */
export class Spawner {
  constructor() {
    this._factories = new Map();
    this._channels = [];
    this._levelConfig = null;
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
    }));
  }

  update(dt) {
    if (!this._levelConfig) return;
    for (const channel of this._channels) {
      channel.timer -= dt;
      if (channel.timer > 0) continue;
      channel.timer = channel.interval * randRange(1 - channel.jitter, 1 + channel.jitter);

      const factory = this._factories.get(channel.key);
      if (factory && this.countActive() < this._levelConfig.maxActive) {
        this.onSpawn(factory(this._levelConfig));
      }
    }
  }
}
