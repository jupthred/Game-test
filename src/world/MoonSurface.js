import { PALETTE } from '../graphics/palette.js';

/**
 * Automatisch scrollende Mondlandschaft (Draufsicht).
 * Die Textur kommt aus assets/moon-surface.png (vertikal nahtlos kachelbar)
 * und wird in der Höhe des Spielfelds wiederholt verschoben.
 */
export class MoonSurface {
  /**
   * @param {number} width
   * @param {number} height
   * @param {CanvasImageSource} image nahtlos vertikal kachelbare Textur (beliebige Auflösung, Seitenverhältnis des Spielfelds)
   */
  constructor(width, height, image) {
    this.width = width;
    this.height = height;
    this.speed = 0;
    this.offset = 0;
    this._tile = image;
    this._vignette = null;
  }

  update(dt) {
    this.offset = (this.offset + this.speed * dt) % this.height;
  }

  render(ctx) {
    const y = Math.floor(this.offset * 2) / 2;
    ctx.drawImage(this._tile, 0, y, this.width, this.height);
    ctx.drawImage(this._tile, 0, y - this.height, this.width, this.height);

    ctx.fillStyle = PALETTE.surfaceShade;
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this._vignette) {
      const v = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.height * 0.25,
        this.width / 2, this.height / 2, this.height * 0.75,
      );
      v.addColorStop(0, 'rgba(0, 0, 0, 0)');
      v.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      this._vignette = v;
    }
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
