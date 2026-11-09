/**
 * Zentrale Spielkonfiguration.
 * Alle Balancing-Werte liegen hier, damit sie ohne Eingriff in die Logik
 * angepasst werden können. Level-abhängige Werte stehen in levels/levelConfig.js.
 */
export const CONFIG = Object.freeze({
  /** Logische Spielfeldgröße (Hochformat). Wird auf den Bildschirm skaliert. */
  world: Object.freeze({ width: 480, height: 800 }),

  player: Object.freeze({
    lives: 3,
    radius: 22,
    /** Abstand der Gleiter-Mitte vom unteren Rand. */
    yOffset: 120,
    /** Faktor für Wisch-Bewegung (1 = Gleiter folgt dem Finger 1:1). */
    swipeSensitivity: 1.15,
    /** Tastatur-Geschwindigkeit in px/s. */
    keyboardSpeed: 480,
    /** Wie schnell der Gleiter seiner Zielposition folgt (höher = direkter). */
    followRate: 18,
    fireCooldown: 0.14,
    /** Ein Klick während des Cooldowns wird so lange vorgemerkt (s). */
    fireBuffer: 0.16,
    invulnerableTime: 1.6,
  }),

  bullet: Object.freeze({ speed: 820, radius: 4 }),

  level: Object.freeze({ duration: 30 }),

  scoring: Object.freeze({ levelClearPerLevel: 100 }),

  background: Object.freeze({ baseSpeed: 70 }),

  input: Object.freeze({
    /** Max. Fingerweg (CSS-px) und Dauer (ms), damit eine Berührung als Tipp/Schuss gilt. */
    tapMaxTravel: 12,
    tapMaxDuration: 320,
  }),

  storageKeys: Object.freeze({ bestScore: 'mondgleiter.bestScore' }),
});
