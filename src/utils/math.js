/** Mathematische Hilfsfunktionen ohne Seiteneffekte. */

export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const randRange = (min, max, rng = Math.random) => min + (max - min) * rng();

export const randInt = (min, max, rng = Math.random) => Math.floor(randRange(min, max + 1, rng));

export const pick = (list, rng = Math.random) => list[Math.floor(rng() * list.length)];

/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * Wird für reproduzierbare Hintergründe verwendet.
 * @param {number} seed
 * @returns {() => number} Zahl in [0, 1)
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
