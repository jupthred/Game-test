/**
 * Quellgrafik für den Hintergrund: prozedurale, nahtlos vertikal kachelbare
 * Mondoberfläche (Draufsicht, Licht von links oben). Wird vom Generator nach
 * assets/moon-surface.png exportiert und danach nur noch als Bild verwendet.
 */
import { PALETTE } from '../../src/graphics/palette.js';
import { TAU, createRng } from '../../src/utils/math.js';

class MoonSurfaceArt {
  constructor(width, height, resolution) {
    this.width = width;
    this.height = height;
    this._resolution = resolution;
  }

  _generateTile(rng) {
    const S = this._resolution;
    const w = this.width * S;
    const h = this.height * S;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');

    g.fillStyle = PALETTE.regolith;
    g.fillRect(0, 0, w, h);

    // Maria: große, dunklere Basaltebenen
    for (let i = 0; i < 6; i += 1) {
      const x = rng() * w;
      const y = rng() * h;
      const r = (110 + rng() * 240) * S;
      this._wrapped(h, y, r, (yy) => {
        const grd = g.createRadialGradient(x, yy, 0, x, yy, r);
        grd.addColorStop(0, 'rgba(38, 42, 52, 0.42)');
        grd.addColorStop(1, 'rgba(38, 42, 52, 0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, yy, r, 0, TAU);
        g.fill();
      });
    }

    // Körnung des Regoliths
    for (let i = 0; i < 14000; i += 1) {
      const l = rng();
      g.fillStyle = l > 0.5 ? `rgba(255, 255, 255, ${(l - 0.5) * 0.14})` : `rgba(0, 0, 0, ${(0.5 - l) * 0.2})`;
      const size = S * (0.6 + rng() * 1.4);
      g.fillRect(rng() * w, rng() * h, size, size);
    }

    // Krater: viele kleine, wenige große (Potenzverteilung)
    for (let i = 0; i < 85; i += 1) {
      const r = S * (3 + Math.pow(rng(), 3.2) * 58);
      const x = rng() * w;
      const y = rng() * h;
      this._wrapped(h, y, r * 1.6, (yy) => this._drawCrater(g, x, yy, r));
    }

    return canvas;
  }

  /** Zeichnet ein Objekt zusätzlich oben/unten versetzt, damit die Kachel nahtlos wiederholt. */
  _wrapped(h, y, reach, draw) {
    draw(y);
    if (y - reach < 0) draw(y + h);
    if (y + reach > h) draw(y - h);
  }

  _drawCrater(g, x, y, r) {
    // Auswurfhalo
    const halo = g.createRadialGradient(x, y, r * 0.9, x, y, r * 1.6);
    halo.addColorStop(0, 'rgba(225, 228, 234, 0.12)');
    halo.addColorStop(1, 'rgba(225, 228, 234, 0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(x, y, r * 1.6, 0, TAU);
    g.fill();

    // Kraterboden mit Schattensichel links oben
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.clip();
    g.fillStyle = '#41454e';
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.fillStyle = '#80848c';
    g.beginPath();
    g.arc(x + r * 0.24, y + r * 0.24, r * 0.92, 0, TAU);
    g.fill();
    g.restore();

    // Kraterrand: beleuchtet links oben, Schatten rechts unten
    g.lineWidth = Math.max(1, r * 0.14);
    g.strokeStyle = 'rgba(232, 234, 240, 0.55)';
    g.beginPath();
    g.arc(x, y, r, Math.PI * 0.8, Math.PI * 1.7);
    g.stroke();
    g.strokeStyle = 'rgba(20, 22, 28, 0.45)';
    g.beginPath();
    g.arc(x, y, r * 1.04, -Math.PI * 0.2, Math.PI * 0.7);
    g.stroke();
  }
}

/**
 * @param {number} width  Breite in Welteinheiten
 * @param {number} height Höhe in Welteinheiten
 * @returns {HTMLCanvasElement} Kachel in width*resolution × height*resolution Pixeln
 */
export function renderMoonSurface(width, height, { seed = 1969, resolution = 2 } = {}) {
  return new MoonSurfaceArt(width, height, resolution)._generateTile(createRng(seed));
}
