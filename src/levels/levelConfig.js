import { CONFIG } from '../config.js';
import { getDifficulty } from './difficulty.js';

/**
 * @typedef {Object} SpawnRule
 * @property {number} interval Sekunden zwischen zwei Spawns (Mittelwert)
 * @property {number} [delay]  Verzögerung bis zum ersten Spawn
 * @property {number} [jitter] Zufallsstreuung des Intervalls (0..1)
 * @property {boolean} [unlimited] zählt nicht gegen maxActive (für Items)
 * @property {string} [category]   'hostile' (Standard) oder 'item' – Bosskampf pausiert 'hostile'
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
 * @property {{ key: string, at: number }[]} events  Einmalige Auftritte (Sekunden nach Levelstart)
 * @property {string | null} boss      Spawn-Schlüssel des Bosses, der nach Ablauf der Zeit erscheint
 * @property {DestroyerConfig} destroyer
 * @property {TurretConfig} turret
 *
 * @typedef {Object} TurretConfig
 * @property {number} hp
 * @property {number} scoreValue
 * @property {number} fireInterval
 * @property {number} bulletSpeed
 *
 * @typedef {Object} DestroyerConfig
 * @property {number} hp
 * @property {number} scoreValue
 * @property {number} hoverY       Höhe, auf der er vor dem Spieler schwebt
 * @property {number} fireInterval Sekunden zwischen zwei Doppelsalven
 * @property {number} bulletSpeed
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
    duration: CONFIG.level.duration + n * CONFIG.level.durationIncreasePerLevel,
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
      turret: { interval: Math.max(1.4, 4.5 * density), delay: level === 1 ? 3 : 1.5, jitter: 0.35 },
      shield: { interval: difficulty.pickupInterval, delay: 7, jitter: 0.15, unlimited: true, category: 'item' },
    },
    events: [],
    // Nach Ablauf der Überlebenszeit erscheint der Zerstörer; erst sein Abschuss sichert die Zone
    boss: 'destroyer',
    turret: {
      hp: 3,
      scoreValue: 35,
      fireInterval: Math.max(0.7, 1.9 * Math.pow(0.93, n) * difficulty.enemyFireInterval),
      bulletSpeed: Math.min(210 * speed, 440),
    },
    destroyer: {
      hp: Math.round((18 + n * 6) * difficulty.destroyerHp),
      scoreValue: 250 + n * 50,
      hoverY: 175,
      fireInterval: Math.max(0.7, 1.7 * Math.pow(0.93, n) * difficulty.enemyFireInterval),
      bulletSpeed: Math.min(230 * speed, 480),
    },
  };

  const override = LEVEL_OVERRIDES[level];
  if (!override) return config;
  const spawns = { ...config.spawns };
  for (const [key, rule] of Object.entries(override.spawns ?? {})) spawns[key] = { ...spawns[key], ...rule };
  return { ...config, ...override, spawns };
}
