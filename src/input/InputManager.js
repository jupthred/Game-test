import { CONFIG } from '../config.js';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const FIRE_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

/**
 * Übersetzt Rohereignisse (Touch, Maus, Tastatur) in abstrakte Spielbefehle.
 *
 * - Wischen links/rechts (beliebiger Finger/Maus gedrückt halten) → horizontale Bewegung
 * - Kurzer Tipp/Klick → Schuss (funktioniert auch mit zweitem Finger beim Steuern)
 * - Tastatur: ←/→ bzw. A/D bewegen, Leertaste/↑/W schießt
 *
 * Die Spiellogik liest pro Frame genau einmal über consume().
 */
export class InputManager {
  /**
   * @param {HTMLElement} target Element, das die Zeigerereignisse empfängt
   * @param {import('../core/Renderer.js').Renderer} renderer
   */
  constructor(target, renderer) {
    this.target = target;
    this.renderer = renderer;
    this.enabled = false;

    this._pointers = new Map();
    this._keys = new Set();
    this._moveDelta = 0;
    this._fireQueued = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    target.addEventListener('pointerdown', this._onPointerDown);
    target.addEventListener('pointermove', this._onPointerMove);
    target.addEventListener('pointerup', this._onPointerUp);
    target.addEventListener('pointercancel', this._onPointerCancel);
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', () => this.reset());
  }

  /**
   * Liefert die gesammelten Befehle seit dem letzten Aufruf und setzt sie zurück.
   * @returns {{ moveDelta: number, axis: number, fire: boolean }}
   *   moveDelta: Wischweg in Welteinheiten, axis: Tastaturrichtung -1..1
   */
  consume() {
    const axis = (this._isAnyDown(RIGHT_KEYS) ? 1 : 0) - (this._isAnyDown(LEFT_KEYS) ? 1 : 0);
    const command = { moveDelta: this._moveDelta, axis, fire: this._fireQueued };
    this._moveDelta = 0;
    this._fireQueued = false;
    return command;
  }

  reset() {
    this._pointers.clear();
    this._keys.clear();
    this._moveDelta = 0;
    this._fireQueued = false;
  }

  _isAnyDown(keySet) {
    for (const key of keySet) if (this._keys.has(key)) return true;
    return false;
  }

  _onPointerDown(event) {
    if (!this.enabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try {
      this.target.setPointerCapture(event.pointerId);
    } catch {
      /* Pointer-Capture ist optional */
    }
    this._pointers.set(event.pointerId, {
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      startTime: performance.now(),
      maxTravel: 0,
    });
  }

  _onPointerMove(event) {
    const pointer = this._pointers.get(event.pointerId);
    if (!pointer || !this.enabled) return;
    const dx = event.clientX - pointer.lastX;
    pointer.lastX = event.clientX;
    pointer.maxTravel = Math.max(
      pointer.maxTravel,
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY),
    );
    this._moveDelta += this.renderer.cssToWorld(dx);
  }

  _onPointerUp(event) {
    const pointer = this._pointers.get(event.pointerId);
    this._pointers.delete(event.pointerId);
    if (!pointer || !this.enabled) return;
    const duration = performance.now() - pointer.startTime;
    const isTap = pointer.maxTravel <= CONFIG.input.tapMaxTravel && duration <= CONFIG.input.tapMaxDuration;
    if (isTap) this._fireQueued = true;
  }

  _onPointerCancel(event) {
    this._pointers.delete(event.pointerId);
  }

  _onKeyDown(event) {
    if (!this.enabled) return;
    const isGameKey = LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code) || FIRE_KEYS.has(event.code);
    if (!isGameKey) return;
    event.preventDefault();
    this._keys.add(event.code);
    if (FIRE_KEYS.has(event.code) && !event.repeat) this._fireQueued = true;
  }

  _onKeyUp(event) {
    this._keys.delete(event.code);
  }
}
