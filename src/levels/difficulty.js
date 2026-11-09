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
  }),
});

export const DEFAULT_DIFFICULTY = 'normal';

/** @returns {Difficulty} */
export function getDifficulty(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}
