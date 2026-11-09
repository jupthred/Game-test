/**
 * Minimaler Publish/Subscribe-Bus.
 * Systeme wie Sound, Achievements oder Analytics können sich später anhängen,
 * ohne dass die Spiellogik angepasst werden muss.
 *
 * Ausgelöste Events: state:change, level:start, level:complete, player:fire,
 * player:hit, shield:hit, difficulty:change, boss:appear, boss:destroyed, pickup:collected, hazard:destroyed, game:over
 */
export class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  /** @returns {() => void} Funktion zum Abmelden */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this._handlers.get(event)?.forEach((handler) => handler(payload));
  }
}
