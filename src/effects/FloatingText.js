import { Entity } from '../entities/Entity.js';
import { HUD_FONT } from '../graphics/palette.js';

/** Aufsteigender, verblassender Text (Punkte, "−1 LEBEN"). */
export class FloatingText extends Entity {
  constructor(x, y, text, color, { size = 16, life = 0.8, rise = 55 } = {}) {
    super(x, y, 0);
    this.type = 'effect';
    this.layer = 5;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.time = 0;
    this.vy = -rise;
  }

  update(dt, world) {
    super.update(dt, world);
    this.time += dt;
    if (this.time >= this.life) this.kill();
  }

  render(ctx) {
    const t = this.time / this.life;
    const pop = t < 0.15 ? 0.7 + (t / 0.15) * 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    ctx.font = `700 ${Math.round(this.size * pop)}px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5, 7, 13, 0.75)';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
