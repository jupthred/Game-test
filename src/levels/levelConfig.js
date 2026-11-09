import { CONFIG } from '../config.js';
import { getDifficulty } from './difficulty.js';

/**
 * @typedef {Object} SpawnRule
 * @property {number} interval Sekunden zwischen zwei Spawns (Mittelwert)
 * @property {number} [delay]  Verzögerung bis zum ersten Spawn
 * @property {number} [jitter] Zufallsstreuung des Intervalls (0..1)
 * @property {boolean} [unlimited] zählt nicht gegen maxActive (für Items)
 *
 * @typedef {Object} LevelConfig
 * @property {number} level
 * @property {import('./difficulty.js').Difficulty} difficulty
 * @property {number} duration          Überlebenszeit in Sekunden
 * @property {number} speedMultiplier
 * @property {number} scrollSpeed       Geschwindigkeit der Mondlandschaft
 * @property {number} maxActive         Max. gleichzeitige Gegner
 * @property {number} bigAsteroidChance
 * @property {[number, number]} asteroidSpeed
 * @property {[number, number]} enemySpeed
 * @property {number} enemySwayAmplitude
 * @property {number} enemyFireInterval Sekunden zwischen zwei Schüssen eines Feindschiffs
 * @property {number} enemyBulletSpeed
 * @property {Record<string, SpawnRule>} spawns
 */

/**
 * Optionale, handgemachte Abweichungen für bestimmte Level,
 * z. B. { 5: { spawns: { asteroid: { interval: 0.2 } } } } für ein Asteroidenfeld.
 * Wird flach (pro Spawn-Schlüssel) über die berechnete Konfiguration gelegt.
 */
const LEVEL_OVERRIDES = {};

/**
 * Berechnet die Schwierigkeit für ein Level. Ab Level 2 wird jedes Level
 * schneller und dichter – endlos, mit Obergrenzen, damit es spielbar bleibt.
 * Die gewählte Schwierigkeitsstufe skaliert alle Werte zusätzlich.
 * @param {number} level 1-basiert
 * @param {string} [difficultyId] 'easy' | 'normal' | 'hard'
 * @returns {LevelConfig}
 */
export function buildLevelConfig(level, difficultyId) {
  const difficulty = getDifficulty(difficultyId);
  const n = level - 1;
  const speed = (1 + n * 0.14) * difficulty.speed;
  const density = Math.pow(0.85, n) * difficulty.spawnInterval;

  const config = {
    level,
    difficulty,
    duration: CONFIG.level.duration,
    speedMultiplier: speed,
    scrollSpeed: CONFIG.background.baseSpeed * speed,
    maxActive: Math.min(10 + n * 3, 40),
    bigAsteroidChance: Math.min(0.25 + n * 0.04, 0.5),
    asteroidSpeed: [130 * speed, 210 * speed],
    enemySpeed: [95 * speed, 145 * speed],
    enemySwayAmplitude: Math.min(50 + n * 10, 120),
    enemyFireInterval: Math.max(0.6, 2.2 * Math.pow(0.9, n) * difficulty.enemyFireInterval),
    enemyBulletSpeed: Math.min(250 * speed, 520),
    spawns: {
      asteroid: { interval: Math.max(0.22, 0.95 * density), delay: 0.8 },
      enemy: { interval: Math.max(0.5, 2.8 * density), delay: level === 1 ? 5 : 2.5 },
      shield: { interval: difficulty.pickupInterval, delay: 7, jitter: 0.15, unlimited: true },
    },
  };

  const override = LEVEL_OVERRIDES[level];
  if (!override) return config;
  const spawns = { ...config.spawns };
  for (const [key, rule] of Object.entries(override.spawns ?? {})) spawns[key] = { ...spawns[key], ...rule };
  return { ...config, ...override, spawns };
}
