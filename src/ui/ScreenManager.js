/**
 * Steuert die HTML-Overlays (Start, Level geschafft, Game Over).
 *
 * Markup-Konventionen:
 *   data-screen="name"     ein Bildschirm
 *   data-action="name"     Button, löst den per on(name, fn) registrierten Handler aus
 *   data-field="key"       Textinhalt wird aus show(name, { key: ... }) befüllt
 *   data-show-if="key"     nur sichtbar, wenn data[key] truthy ist
 */
export class ScreenManager {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.current = null;
    this._screens = new Map();
    this._handlers = new Map();

    root.querySelectorAll('[data-screen]').forEach((el) => this._screens.set(el.dataset.screen, el));
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      event.stopPropagation();
      this._handlers.get(button.dataset.action)?.();
    });
    // Zeigerereignisse auf Overlays nicht als Spieleingabe weiterreichen
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
  }

  on(action, handler) {
    this._handlers.set(action, handler);
  }

  show(name, data = {}) {
    const screen = this._screens.get(name);
    if (!screen) throw new Error(`Unbekannter Screen: ${name}`);

    for (const [key, el] of this._screens) el.hidden = key !== name;
    screen.querySelectorAll('[data-field]').forEach((el) => {
      const value = data[el.dataset.field];
      if (value !== undefined) el.textContent = String(value);
    });
    screen.querySelectorAll('[data-show-if]').forEach((el) => {
      el.hidden = !data[el.dataset.showIf];
    });

    this.root.hidden = false;
    this.current = name;
    screen.querySelector('[data-action]')?.focus({ preventScroll: true });
  }

  hide() {
    this.root.hidden = true;
    this.current = null;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
}
