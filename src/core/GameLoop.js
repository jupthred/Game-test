/**
 * requestAnimationFrame-Schleife mit begrenztem Zeitschritt.
 * Der Deckel verhindert Sprünge nach Tab-Wechseln oder Rucklern.
 */
export class GameLoop {
  /**
   * @param {(dt: number) => void} update
   * @param {() => void} render
   * @param {{ maxStep?: number }} [options]
   */
  constructor(update, render, { maxStep = 1 / 20 } = {}) {
    this.update = update;
    this.render = render;
    this.maxStep = maxStep;
    this._running = false;
    this._last = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
  }

  _tick(now) {
    if (!this._running) return;
    const dt = Math.min(Math.max((now - this._last) / 1000, 0), this.maxStep);
    this._last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this._tick);
  }
}
