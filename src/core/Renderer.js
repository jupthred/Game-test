/**
 * Kümmert sich um Canvas-Skalierung (Letterboxing, devicePixelRatio)
 * und die Umrechnung von Bildschirm- in Weltkoordinaten.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ width: number, height: number, container: HTMLElement, frame: HTMLElement }} options
   *   container: verfügbarer Bereich, frame: Element, das Canvas + Overlays umschließt
   */
  constructor(canvas, { width, height, container, frame }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.container = container;
    this.frame = frame;
    /** CSS-Pixel pro Welteinheit */
    this.scale = 1;
    this._pixelsPerUnit = 1;

    this.resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.resize()).observe(container);
    } else {
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    const style = getComputedStyle(this.container);
    const availW = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH = this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (availW <= 0 || availH <= 0) return;

    const scale = Math.min(availW / this.width, availH / this.height);
    const cssW = Math.floor(this.width * scale);
    const cssH = Math.floor(this.height * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.frame.style.width = `${cssW}px`;
    this.frame.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = cssW / this.width;
    this._pixelsPerUnit = this.canvas.width / this.width;
  }

  /** Setzt die Transformation zurück und liefert einen Kontext in Weltkoordinaten. */
  begin() {
    const ctx = this.ctx;
    ctx.setTransform(this._pixelsPerUnit, 0, 0, this._pixelsPerUnit, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx;
  }

  /** Rechnet eine Strecke in CSS-Pixeln in Welteinheiten um. */
  cssToWorld(distance) {
    return distance / (this.scale || 1);
  }
}
