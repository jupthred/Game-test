/**
 * Waffen-Booster für den Gleiter.
 *
 * Ein Booster ist reine Datenbeschreibung: Er überschreibt für eine begrenzte Zeit
 * Teile der Standardwaffe. Die Spiellogik (Player.fire) liest nur die zusammengeführte
 * Waffe, kennt also keine einzelnen Booster.
 *
 * Einen neuen Booster hinzufügen:
 *   1. Eintrag in BOOST_TYPES (z. B. Fächerschuss über Mündungen mit `angle`,
 *      Schnellfeuer über `cooldownMultiplier`, Durchschlag über `damage`)
 *   2. optional eigene Frames im Spritesheet: `pickup_<id>` für das Item,
 *      `player_cannon_<id>` für die Zusatzkanonen (sonst Rückfall auf
 *      `pickup_boost` mit `shortLabel` bzw. `player_cannon`)
 *   3. `weight` > 0 setzen, damit er als Item erscheint
 *
 * @typedef {Object} Muzzle
 * @property {number} x       Versatz zur Gleitermitte (Welteinheiten)
 * @property {number} y       Versatz zur Gleitermitte (negativ = vorne)
 * @property {number} [angle] Schussrichtung relativ zu geradeaus (rad, positiv = rechts)
 *
 * @typedef {Object} WeaponProfile
 * @property {Muzzle[]} muzzles
 * @property {number} cooldownMultiplier  < 1 = schneller feuern
 * @property {number} speedMultiplier     Geschossgeschwindigkeit
 * @property {number} damage              Schaden pro Geschoss
 *
 * @typedef {Object} BoostType
 * @property {string} id
 * @property {string} label          Anzeige in HUD und Einblendung
 * @property {string} shortLabel     Kurzsymbol, falls kein eigenes Icon registriert ist
 * @property {number} duration       Wirkdauer in Sekunden
 * @property {string} color          Farbe von Item, HUD-Anzeige und Kanonen am Gleiter
 * @property {number} weight         relative Häufigkeit beim Item-Spawn (0 = nie)
 * @property {Partial<WeaponProfile>} weapon  überschriebene Waffenwerte
 */

/** @type {Readonly<WeaponProfile>} */
export const DEFAULT_WEAPON = Object.freeze({
  muzzles: Object.freeze([{ x: 0, y: -22, angle: 0 }]),
  cooldownMultiplier: 1,
  speedMultiplier: 1,
  damage: 1,
});

/** @type {Readonly<Record<string, BoostType>>} */
export const BOOST_TYPES = Object.freeze({
  doubleShot: Object.freeze({
    id: 'doubleShot',
    label: 'Doppelschuss',
    shortLabel: '2×',
    duration: 10,
    color: '#ff9a2e',
    weight: 1,
    weapon: Object.freeze({
      // Zwei Kanonen an den Flügeln statt einer an der Nase
      muzzles: Object.freeze([
        { x: -15, y: -4, angle: 0 },
        { x: 15, y: -4, angle: 0 },
      ]),
    }),
  }),
});

/** @returns {BoostType | null} */
export function getBoost(id) {
  return BOOST_TYPES[id] ?? null;
}

/** Waffe = Standardwaffe, überschrieben durch den aktiven Booster. */
export function resolveWeapon(boost) {
  return boost ? { ...DEFAULT_WEAPON, ...boost.weapon } : DEFAULT_WEAPON;
}

/** Wählt gewichtet zufällig einen Booster für ein Item. */
export function pickRandomBoost(rng = Math.random) {
  const pool = Object.values(BOOST_TYPES).filter((b) => b.weight > 0);
  const total = pool.reduce((sum, b) => sum + b.weight, 0);
  let roll = rng() * total;
  for (const boost of pool) {
    roll -= boost.weight;
    if (roll <= 0) return boost;
  }
  return pool[pool.length - 1];
}
