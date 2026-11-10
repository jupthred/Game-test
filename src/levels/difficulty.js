/**
 * Schwierigkeitsstufen als Multiplikatoren auf die Level-Konfiguration.
 * "Mittel" entspricht den Grundwerten. Eine weitere Stufe braucht nur einen
 * neuen Eintrag hier und einen Radio-Button im Startbildschirm.
 *
 * @typedef {Object} Difficulty
 * @property {string} id
 * @property {string} label            Anzeige im HUD und in den Overlays
 * @property {string} description      Kurztext im Startbildschirm
 * @property {number} speed            Tempo von Gegnern, Schüssen und Landschaft
 * @property {number} spawnInterval    > 1 = weniger Gegner, < 1 = mehr Gegner
 * @property {number} enemyFireInterval > 1 = Gegner schießen seltener
 * @property {number} pickupInterval   Sekunden zwischen Schild-Items
 * @property {number} scoreMultiplier  Faktor auf alle Punkte
 * @property {number} destroyerHp      Faktor auf die Trefferpunkte des Zerstörers
 * @property {number} shieldMax        Treffer, die das Schild abfängt (pro Stufe 2 weniger)
 */

/** @type {Readonly<Record<string, Difficulty>>} */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    label: 'Leicht',
    description: 'Langsamere Gegner, weniger Beschuss, öfter Schild-Items. Punkte ×0,75.',
    speed: 0.85,
    spawnInterval: 1.35,
    enemyFireInterval: 1.5,
    pickupInterval: 7,
    scoreMultiplier: 0.75,
    destroyerHp: 0.7,
    shieldMax: 10,
  }),
  normal: Object.freeze({
    id: 'normal',
    label: 'Mittel',
    description: 'Das ausgewogene Grundspiel. Punkte ×1.',
    speed: 1,
    spawnInterval: 1,
    enemyFireInterval: 1,
    pickupInterval: 10,
    scoreMultiplier: 1,
    destroyerHp: 1,
    shieldMax: 8,
  }),
  hard: Object.freeze({
    id: 'hard',
    label: 'Schwer',
    description: 'Schneller, dichter, mehr Beschuss, seltener Schild-Items. Punkte ×1,5.',
    speed: 1.2,
    spawnInterval: 0.75,
    enemyFireInterval: 0.7,
    pickupInterval: 14,
    scoreMultiplier: 1.5,
    destroyerHp: 1.3,
    shieldMax: 6,
  }),
  brutal: Object.freeze({
    id: 'brutal',
    label: 'Brutalschwer',
    description: 'Gnadenlos: extrem schnell, Gegnerschwärme, Dauerbeschuss, kaum Schild-Items. Punkte ×2,5.',
    speed: 1.4,
    spawnInterval: 0.55,
    enemyFireInterval: 0.5,
    pickupInterval: 20,
    scoreMultiplier: 2.5,
    destroyerHp: 1.7,
    shieldMax: 4,
  }),
});

export const DEFAULT_DIFFICULTY = 'normal';

/** @returns {Difficulty} */
export function getDifficulty(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}
