/**
 * Steuert die HTML-Overlays (Start, Level geschafft, Game Over).
 *
 * Markup-Konventionen:
 *   data-screen="name"     ein Bildschirm
 *   data-action="name"     Button, löst den per on(name, fn) registrierten Handler aus
 *   data-field="key"       Textinhalt wird aus show(name, { key: ... }) befüllt
 *   data-show-if="key"     nur sichtbar, wenn data[key] truthy ist
 *   input[type=radio]      Auswahl lesen/setzen über getChoice()/setChoice(), Änderungen über onChange()
 */
export class ScreenManager {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.current = null;
    this._screens = new Map();
    this._handlers = new Map();
    this._changeHandlers = new Map();

    root.querySelectorAll('[data-screen]').forEach((el) => this._screens.set(el.dataset.screen, el));
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      event.stopPropagation();
      this._handlers.get(button.dataset.action)?.();
    });
    root.addEventListener('change', (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.type === 'radio') {
        this._changeHandlers.get(input.name)?.(input.value);
      }
    });
    // Zeigerereignisse auf Overlays nicht als Spieleingabe weiterreichen
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
  }

  on(action, handler) {
    this._handlers.set(action, handler);
  }

  /** Handler für Änderungen einer Radio-Gruppe (name-Attribut). */
  onChange(groupName, handler) {
    this._changeHandlers.set(groupName, handler);
  }

  getChoice(groupName) {
    return this.root.querySelector(`input[name="${groupName}"]:checked`)?.value ?? null;
  }

  setChoice(groupName, value) {
    const input = this.root.querySelector(`input[name="${groupName}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  show(name, data = {}) {
    const screen = this._screens.get(name);
    if (!screen) throw new Error(`Unbekannter Screen: ${name}`);

    for (const [key, el] of this._screens) el.hidden = key !== name;
    this.update(name, data);
    this.root.hidden = false;
    this.current = name;
    screen.querySelector('[data-action]')?.focus({ preventScroll: true });
  }

  /** Aktualisiert Felder eines Screens, ohne ihn neu einzublenden. */
  update(name, data = {}) {
    const screen = this._screens.get(name);
    if (!screen) return;
    screen.querySelectorAll('[data-field]').forEach((el) => {
      const value = data[el.dataset.field];
      if (value !== undefined) el.textContent = String(value);
    });
    screen.querySelectorAll('[data-show-if]').forEach((el) => {
      if (el.dataset.showIf in data) el.hidden = !data[el.dataset.showIf];
    });
  }

  hide() {
    this.root.hidden = true;
    this.current = null;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
}
