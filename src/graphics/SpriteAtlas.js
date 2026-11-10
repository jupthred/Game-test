/**
 * Spritesheet mit Frame-Beschreibung im TexturePacker-ähnlichen JSON-Format:
 *
 *   { "frames": { "player": { "frame": {x,y,w,h}, "pivot": {x,y}, "radius"?: n }, … },
 *     "meta":   { "image": "spritesheet.png", "scale": 2 } }
 *
 * - frame:  Ausschnitt im Bild (Pixel)
 * - pivot:  Drehpunkt relativ zur Frame-Größe (0..1), Standard Mitte
 * - radius: optionaler Nennradius in Welteinheiten (z. B. für skalierte Asteroiden)
 * - scale:  Pixel pro Welteinheit (2 = Grafiken liegen in doppelter Auflösung vor)
 */
export class SpriteAtlas {
  /**
   * @param {string} imageSrc URL oder data:-URI des Spritesheets
   * @param {object} data geparstes JSON
   */
  static async load(imageSrc, data) {
    const image = new Image();
    image.src = imageSrc;
    await image.decode();
    return new SpriteAtlas(image, data);
  }

  constructor(image, data) {
    this.image = image;
    this.frames = data.frames ?? {};
    this.scale = data.meta?.scale ?? 1;
    this._tintCache = new Map();
  }

  has(name) {
    return name in this.frames;
  }

  /** Nennradius eines Frames (oder halbe Breite, falls nicht angegeben). */
  radius(name) {
    const f = this.frames[name];
    if (!f) return 0;
    return f.radius ?? f.frame.w / this.scale / 2;
  }

  /**
   * Zeichnet einen Frame mit dem Drehpunkt an (x, y).
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} name
   * @param {number} x
   * @param {number} y
   * @param {{ rotation?: number, scaleX?: number, scaleY?: number, alpha?: number, tint?: string }} [options]
   *   tint: zeichnet die Silhouette einfarbig (Treffer-Blitz, Schatten, leere Leben)
   */
  draw(ctx, name, x, y, { rotation = 0, scaleX = 1, scaleY = 1, alpha = 1, tint = null } = {}) {
    const f = this.frames[name];
    if (!f) return;
    const { x: fx, y: fy, w, h } = f.frame;
    const ww = w / this.scale;
    const wh = h / this.scale;
    const px = (f.pivot?.x ?? 0.5) * ww;
    const py = (f.pivot?.y ?? 0.5) * wh;

    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    if (tint) ctx.drawImage(this._tinted(name, tint), 0, 0, w, h, -px, -py, ww, wh);
    else ctx.drawImage(this.image, fx, fy, w, h, -px, -py, ww, wh);
    ctx.restore();
  }

  /** Einfarbige Silhouette eines Frames, wird pro Farbe einmal erzeugt und zwischengespeichert. */
  _tinted(name, color) {
    const key = `${name}|${color}`;
    let canvas = this._tintCache.get(key);
    if (canvas) return canvas;
    const { x, y, w, h } = this.frames[name].frame;
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.drawImage(this.image, x, y, w, h, 0, 0, w, h);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    this._tintCache.set(key, canvas);
    return canvas;
  }
}
