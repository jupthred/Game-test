import { Entity } from '../entities/Entity.js';
import { PALETTE } from '../graphics/palette.js';
import { TAU, pick, randRange } from '../utils/math.js';

/** Partikel-Explosion mit Druckwellenring. Rein visuell, ohne Kollision. */
export class Explosion extends Entity {
  static forHazard(hazard) {
    return new Explosion(hazard.x, hazard.y, {
      count: hazard.radius > 22 ? 28 : 18,
      colors: hazard.debrisColors,
      speed: 170,
      size: hazard.radius,
    });
  }

  static spark(x, y) {
    return new Explosion(x, y, { count: 6, colors: [PALETTE.accentLight, PALETTE.accent], speed: 110, size: 6, life: 0.3 });
  }

  static large(x, y) {
    return new Explosion(x, y, {
      count: 60,
      colors: [PALETTE.accent, PALETTE.accentLight, PALETTE.danger, '#ffffff'],
      speed: 280,
      size: 44,
      life: 1.2,
    });
  }

  constructor(x, y, { count, colors, speed, size, life = 0.75 }) {
    super(x, y, 0);
    this.type = 'effect';
    this.layer = 4;
    this.time = 0;
    this.life = life;
    this.size = size;
    this.particles = Array.from({ length: count }, () => {
      const angle = Math.random() * TAU;
      const velocity = randRange(0.25, 1) * speed;
      return {
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        r: randRange(1.2, 3.4) * (size > 20 ? 1.3 : 1),
        color: pick(colors),
      };
    });
  }

  update(dt) {
    this.time += dt;
    const drag = Math.pow(0.08, dt);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
    }
    if (this.time >= this.life) this.kill();
  }

  render(ctx) {
    const t = this.time / this.life;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';

    ctx.globalAlpha = Math.max(0, 1 - t * 2.2);
    ctx.strokeStyle = PALETTE.accentLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * (0.4 + t * 1.8), 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = Math.max(0, 1 - t);
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
