import { PALETTE, HUD_FONT } from '../graphics/palette.js';
import { traceGlider } from '../graphics/Sprites.js';

/**
 * Head-up-Display auf dem Canvas: Leben, Level, Restzeit, Punkte
 * sowie Banner (Levelstart) und Warnanzeige bei Lebensverlust.
 */
export class HUD {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this._lifeFlash = 0;
    this._shieldFlash = 0;
    this._shieldFlashKind = 'hit';
    this._boostFlash = 0;
    this._banner = null;
  }

  /** @param {'hit' | 'heal'} kind */
  flashShield(kind) {
    this._shieldFlash = 0.4;
    this._shieldFlashKind = kind;
  }

  /** Kurzes Aufleuchten der Booster-Anzeige beim Einsammeln. */
  flashBoost() {
    this._boostFlash = 0.4;
  }

  /** Lässt die Lebensanzeige rot aufblinken. */
  flashLives() {
    this._lifeFlash = 1.4;
  }

  showBanner(title, subtitle = '', duration = 1.8) {
    this._banner = { title, subtitle, time: 0, duration };
  }

  update(dt) {
    this._lifeFlash = Math.max(0, this._lifeFlash - dt);
    this._shieldFlash = Math.max(0, this._shieldFlash - dt);
    this._boostFlash = Math.max(0, this._boostFlash - dt);
    if (this._banner) {
      this._banner.time += dt;
      if (this._banner.time >= this._banner.duration) this._banner = null;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ score: number, lives: number, maxLives: number, shield: number, maxShield: number,
   *           level: number, difficulty: string, timeLeft: number, progress: number,
   *           bossFight: boolean, bossName: string,
   *           boost: { label: string, color: string, timeLeft: number, duration: number } | null }} state
   */
  render(ctx, state) {
    const w = this.width;
    ctx.save();

    // Hintergrundband
    const band = ctx.createLinearGradient(0, 0, 0, 96);
    band.addColorStop(0, PALETTE.hudBand);
    band.addColorStop(1, 'rgba(5, 7, 13, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, 96);

    // Fortschritt bis Levelende
    ctx.fillStyle = 'rgba(238, 241, 246, 0.12)';
    ctx.fillRect(0, 0, w, 4);
    ctx.fillStyle = state.bossFight ? PALETTE.enemy : PALETTE.accent;
    ctx.fillRect(0, 0, w * state.progress, 4);

    ctx.textBaseline = 'alphabetic';

    // Leben
    ctx.font = `600 11px ${HUD_FONT}`;
    ctx.fillStyle = PALETTE.hudDim;
    ctx.textAlign = 'left';
    ctx.fillText('LEBEN', 18, 26);
    const flashing = this._lifeFlash > 0 && Math.floor(this._lifeFlash * 8) % 2 === 0;
    for (let i = 0; i < state.maxLives; i += 1) {
      ctx.save();
      ctx.translate(30 + i * 30, 48);
      ctx.scale(0.5, 0.5);
      traceGlider(ctx);
      if (i < state.lives) {
        ctx.fillStyle = flashing ? PALETTE.danger : PALETTE.accent;
        ctx.fill();
      } else {
        ctx.lineWidth = 3;
        ctx.strokeStyle = flashing ? PALETTE.danger : 'rgba(238, 241, 246, 0.3)';
        ctx.stroke();
      }
      ctx.restore();
    }

    this._renderShieldBar(ctx, state.shield, state.maxShield);

    // Level + Restzeit
    ctx.textAlign = 'center';
    ctx.font = `600 11px ${HUD_FONT}`;
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`LEVEL ${state.level} · ${state.difficulty.toUpperCase()}`, w / 2, 26);
    if (state.bossFight) {
      // Zeit abgelaufen – jetzt zählt nur noch der Abschuss
      const pulse = 0.7 + Math.sin(performance.now() / 160) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.font = `700 20px ${HUD_FONT}`;
      ctx.fillStyle = PALETTE.enemy;
      ctx.fillText(`${state.bossName.toUpperCase()} BESIEGEN`, w / 2, 52);
      ctx.globalAlpha = 1;
    } else {
      ctx.font = `700 28px ${HUD_FONT}`;
      ctx.fillStyle = state.timeLeft <= 5 ? PALETTE.accent : PALETTE.hudText;
      ctx.fillText(`${state.timeLeft.toFixed(1)}s`, w / 2, 56);
    }

    // Punkte
    ctx.textAlign = 'right';
    ctx.font = `600 11px ${HUD_FONT}`;
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('PUNKTE', w - 18, 26);
    ctx.font = `700 22px ${HUD_FONT}`;
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(state.score.toLocaleString('de-DE'), w - 18, 54);

    if (state.boost) this._renderBoost(ctx, state.boost);
    if (this._banner) this._renderBanner(ctx);
    ctx.restore();
  }


  /** Aktiver Booster rechts unter den Punkten: Name, Restzeit, ablaufender Balken. */
  _renderBoost(ctx, boost) {
    const barW = 110;
    const x = this.width - 18 - barW;
    const y = 68;
    const ratio = Math.max(0, boost.timeLeft / boost.duration);
    const ending = boost.timeLeft < 2 && Math.floor(boost.timeLeft * 8) % 2 === 0;

    ctx.fillStyle = 'rgba(238, 241, 246, 0.14)';
    ctx.fillRect(x, y, barW, 6);
    ctx.fillStyle = this._boostFlash > 0 || ending ? '#ffffff' : boost.color;
    ctx.fillRect(x + barW * (1 - ratio), y, barW * ratio, 6);

    ctx.font = `600 10px ${HUD_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = boost.color;
    ctx.fillText(`${boost.label.toUpperCase()} ${Math.ceil(boost.timeLeft)}s`, this.width - 18, y + 20);
  }

  /** Segmentierte Schildanzeige unter den Leben. */
  _renderShieldBar(ctx, shield, maxShield) {
    const x = 18;
    const y = 68;
    const segW = 9;
    const gap = 2;
    const low = shield <= Math.max(1, Math.floor(maxShield * 0.3));
    const flash = this._shieldFlash > 0;

    ctx.font = `600 10px ${HUD_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = low ? PALETTE.danger : PALETTE.hudDim;
    ctx.fillText(`SCHILD ${shield}/${maxShield}`, x, y + 20);

    for (let i = 0; i < maxShield; i += 1) {
      const filled = i < shield;
      if (filled) {
        if (flash) ctx.fillStyle = this._shieldFlashKind === 'heal' ? PALETTE.shieldLight : '#ffffff';
        else ctx.fillStyle = low ? PALETTE.danger : PALETTE.shield;
      } else {
        ctx.fillStyle = 'rgba(238, 241, 246, 0.14)';
      }
      ctx.fillRect(x + i * (segW + gap), y, segW, 6);
    }
  }

  _renderBanner(ctx) {
    const { title, subtitle, time, duration } = this._banner;
    const fadeIn = Math.min(1, time / 0.2);
    const fadeOut = Math.min(1, (duration - time) / 0.4);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const y = this.height * 0.4;

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = `700 46px ${HUD_FONT}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(5, 7, 13, 0.7)';
    ctx.strokeText(title, this.width / 2, y);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText(title, this.width / 2, y);
    if (subtitle) {
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeText(subtitle, this.width / 2, y + 32);
      ctx.fillStyle = PALETTE.hudText;
      ctx.fillText(subtitle, this.width / 2, y + 32);
    }
    ctx.globalAlpha = 1;
  }
}
