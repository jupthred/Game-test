/**
 * Fehlertoleranter Zugriff auf localStorage.
 * In privaten Fenstern oder Sandboxen kann der Zugriff werfen – das Spiel läuft dann ohne Speicherung.
 */
export const SafeStorage = Object.freeze({
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Speicherung nicht verfügbar – bewusst ignoriert. */
    }
  },
});
