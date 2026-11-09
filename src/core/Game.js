import { CONFIG } from '../config.js';
import { EventBus } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { Renderer } from './Renderer.js';
import { InputManager } from '../input/InputManager.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { EnemyShip } from '../entities/EnemyShip.js';
import { Explosion } from '../effects/Explosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { Spawner } from '../systems/Spawner.js';
import { LevelManager } from '../levels/LevelManager.js';
import { MoonSurface } from '../world/MoonSurface.js';
import { HUD } from '../ui/HUD.js';
import { PALETTE } from '../graphics/palette.js';
import { SafeStorage } from '../utils/storage.js';

/** Zustände des Spielablaufs. */
export const GameState = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  LEVEL_OUTRO: 'level-outro',
  LEVEL_COMPLETE: 'level-complete',
  GAME_OVER_OUTRO: 'game-over-outro',
  GAME_OVER: 'game-over',
});

const LEVEL_OUTRO_TIME = 1.4;
const GAME_OVER_OUTRO_TIME = 1.8;

/**
 * Zentrale Spielsteuerung: verbindet Systeme, verwaltet Zustände und Sitzungsdaten.
 * Enthält bewusst keine Zeichen- oder Eingabedetails – die liegen in eigenen Modulen.
 */
export class Game {
  /**
   * @param {{ canvas: HTMLCanvasElement, stage: HTMLElement, frame: HTMLElement,
   *           screens: import('../ui/ScreenManager.js').ScreenManager }} dom
   */
  constructor({ canvas, stage, frame, screens }) {
    const { width, height } = CONFIG.world;
    this.world = { width, height };

    this.bus = new EventBus();
    this.renderer = new Renderer(canvas, { width, height, container: stage, frame });
    this.input = new InputManager(stage, this.renderer);
    this.entities = new EntityManager();
    this.background = new MoonSurface(width, height);
    this.levels = new LevelManager();
    this.hud = new HUD(width, height);
    this.screens = screens;
    this.spawner = this._createSpawner();
    this.collisions = this._createCollisions();
    this.loop = new GameLoop((dt) => this.update(dt), () => this.render());

    this.state = GameState.MENU;
    this.player = null;
    this.session = this._createSession();
    this.bestScore = Number(SafeStorage.get(CONFIG.storageKeys.bestScore, 0)) || 0;

    this._outroTimer = 0;
    this._fireBuffer = 0;
    this._damageFlash = 0;
    this._shake = { time: 0, duration: 0, intensity: 0 };
    this._reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this._bindScreens();
  }

  /* ---------------- Lebenszyklus ---------------- */

  boot() {
    this.background.speed = CONFIG.background.baseSpeed * 0.6;
    this.screens.show('start', { best: this._formatScore(this.bestScore), hasBest: this.bestScore > 0 });
    this.loop.start();
  }

  newGame() {
    this.session = this._createSession();
    this.startLevel(1);
  }

  startLevel(level) {
    this.session.level = level;
    this.session.levelKills = 0;
    this.levels.load(level);
    const cfg = this.levels.config;

    this.entities.clear();
    this.player = this.entities.add(
      new Player(this.world.width / 2, this.world.height - CONFIG.player.yOffset, { minX: 0, maxX: this.world.width }),
    );
    this.spawner.configure(cfg);
    this.background.speed = cfg.scrollSpeed;
    this._fireBuffer = 0;

    this.input.reset();
    this.input.enabled = true;
    this.screens.hide();
    this.hud.showBanner(`LEVEL ${level}`, `${cfg.duration} Sekunden überleben`);
    this._setState(GameState.PLAYING);
    this.bus.emit('level:start', { level, config: cfg });
  }

  /* ---------------- Update ---------------- */

  update(dt) {
    this.background.update(dt);
    this._updateEffects(dt);

    switch (this.state) {
      case GameState.PLAYING:
        this._updatePlaying(dt);
        break;
      case GameState.LEVEL_OUTRO:
      case GameState.GAME_OVER_OUTRO:
        this.entities.update(dt, this.world);
        this._outroTimer -= dt;
        if (this._outroTimer <= 0) this._finishOutro();
        break;
      default:
        this.entities.update(dt, this.world);
    }

    this.hud.update(dt);
  }

  _updatePlaying(dt) {
    const command = this.input.consume();
    const player = this.player;

    player.steer(command.moveDelta * CONFIG.player.swipeSensitivity + command.axis * CONFIG.player.keyboardSpeed * dt);

    if (command.fire) this._fireBuffer = CONFIG.player.fireBuffer;
    this._fireBuffer = Math.max(0, this._fireBuffer - dt);
    if (this._fireBuffer > 0 && player.canFire()) {
      this._fireBuffer = 0;
      for (const bullet of player.fire()) this.entities.add(bullet);
      this.bus.emit('player:fire');
    }

    this.levels.update(dt);
    this.spawner.update(dt);
    this.entities.update(dt, this.world);
    this.collisions.update();

    if (this.state === GameState.PLAYING && this.levels.isComplete) this._completeLevel();
  }

  _updateEffects(dt) {
    this._damageFlash = Math.max(0, this._damageFlash - dt);
    this._shake.time = Math.max(0, this._shake.time - dt);
  }

  /* ---------------- Spielereignisse ---------------- */

  _onBulletHitsHazard(bullet, hazard) {
    bullet.kill();
    if (hazard.takeDamage(bullet.damage)) {
      this._destroyHazard(hazard, { byPlayer: true });
    } else {
      this.entities.add(Explosion.spark(bullet.x, bullet.y));
    }
  }

  _onPlayerHitsHazard(player, hazard) {
    if (player.isInvulnerable) return;

    this._destroyHazard(hazard, { byPlayer: false });
    this.session.lives -= 1;
    this.session.hitsTaken += 1;
    this.hud.flashLives();
    this._damageFlash = 0.45;
    this._shakeScreen(9, 0.4);
    this.bus.emit('player:hit', { lives: this.session.lives });

    if (this.session.lives <= 0) {
      this._startGameOver();
      return;
    }
    player.hit(CONFIG.player.invulnerableTime);
    const label = this.session.lives === 1 ? 'LETZTES LEBEN!' : '−1 LEBEN';
    this.entities.add(new FloatingText(player.x, player.y - 46, label, PALETTE.danger, { size: 22, life: 1.3, rise: 40 }));
  }

  _destroyHazard(hazard, { byPlayer }) {
    hazard.kill();
    this.entities.add(Explosion.forHazard(hazard));
    if (!byPlayer) return;

    this.session.score += hazard.scoreValue;
    this.session.kills += 1;
    this.session.levelKills += 1;
    this.entities.add(new FloatingText(hazard.x, hazard.y, `+${hazard.scoreValue}`, PALETTE.accentLight));
    this.bus.emit('hazard:destroyed', { hazard });
  }

  _completeLevel() {
    this.input.enabled = false;
    for (const hazard of this.entities.ofType('hazard')) this._destroyHazard(hazard, { byPlayer: false });

    const bonus = CONFIG.scoring.levelClearPerLevel * this.session.level;
    this.session.score += bonus;
    this.session.lastBonus = bonus;
    this.entities.add(new FloatingText(this.player.x, this.player.y - 50, `+${bonus} BONUS`, PALETTE.accent, { size: 20, life: 1.3 }));
    this.hud.showBanner('ZONE GESICHERT', '', LEVEL_OUTRO_TIME);

    this._outroTimer = LEVEL_OUTRO_TIME;
    this._setState(GameState.LEVEL_OUTRO);
    this.bus.emit('level:complete', { level: this.session.level, score: this.session.score });
  }

  _startGameOver() {
    this.input.enabled = false;
    this.player.kill();
    this.entities.add(Explosion.large(this.player.x, this.player.y));
    this._shakeScreen(16, 0.7);
    this._outroTimer = GAME_OVER_OUTRO_TIME;
    this._setState(GameState.GAME_OVER_OUTRO);
  }

  _finishOutro() {
    const { score, level, kills, levelKills, lives, lastBonus } = this.session;

    if (this.state === GameState.LEVEL_OUTRO) {
      this._setState(GameState.LEVEL_COMPLETE);
      this.screens.show('level-complete', {
        level,
        nextLevel: level + 1,
        score: this._formatScore(score),
        levelKills,
        lives,
        bonus: this._formatScore(lastBonus),
      });
      return;
    }

    const isRecord = score > this.bestScore;
    if (isRecord) {
      this.bestScore = score;
      SafeStorage.set(CONFIG.storageKeys.bestScore, score);
    }
    this._setState(GameState.GAME_OVER);
    this.screens.show('game-over', {
      level,
      score: this._formatScore(score),
      kills,
      best: this._formatScore(this.bestScore),
      isRecord,
    });
    this.bus.emit('game:over', { score, level, isRecord });
  }

  /* ---------------- Rendering ---------------- */

  render() {
    const ctx = this.renderer.begin();
    this.background.render(ctx);

    const shake = this._shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.entities.render(ctx);
    ctx.restore();

    if (this._damageFlash > 0) {
      ctx.fillStyle = PALETTE.danger;
      ctx.globalAlpha = this._damageFlash * 0.55;
      ctx.fillRect(0, 0, this.world.width, this.world.height);
      ctx.globalAlpha = 1;
    }

    if (this.state !== GameState.MENU) {
      this.hud.render(ctx, {
        score: this.session.score,
        lives: Math.max(0, this.session.lives),
        maxLives: CONFIG.player.lives,
        level: this.session.level,
        timeLeft: this.levels.timeLeft,
        progress: this.levels.progress,
      });
    }
  }

  /* ---------------- Aufbau & Hilfen ---------------- */

  _createSession() {
    return { score: 0, lives: CONFIG.player.lives, level: 1, kills: 0, levelKills: 0, hitsTaken: 0, lastBonus: 0 };
  }

  _createSpawner() {
    const spawner = new Spawner();
    spawner.register('asteroid', (cfg) => Asteroid.spawn(this.world.width, cfg));
    spawner.register('enemy', (cfg) => EnemyShip.spawn(this.world.width, cfg));
    spawner.onSpawn = (entity) => this.entities.add(entity);
    spawner.countActive = () => this.entities.count('hazard');
    return spawner;
  }

  _createCollisions() {
    const collisions = new CollisionSystem(this.entities);
    collisions.addRule('bullet', 'hazard', (bullet, hazard) => this._onBulletHitsHazard(bullet, hazard));
    collisions.addRule('player', 'hazard', (player, hazard) => this._onPlayerHitsHazard(player, hazard));
    return collisions;
  }

  _bindScreens() {
    this.screens.on('start', () => this.newGame());
    this.screens.on('next-level', () => this.startLevel(this.session.level + 1));
    this.screens.on('restart', () => this.newGame());
  }

  _setState(next) {
    const previous = this.state;
    this.state = next;
    this.bus.emit('state:change', { from: previous, to: next });
  }

  _shakeScreen(intensity, duration) {
    if (this._reducedMotion) return;
    this._shake = { time: duration, duration, intensity };
  }

  _shakeOffset() {
    const { time, duration, intensity } = this._shake;
    if (time <= 0) return { x: 0, y: 0 };
    const strength = intensity * (time / duration);
    return { x: (Math.random() * 2 - 1) * strength, y: (Math.random() * 2 - 1) * strength };
  }

  _formatScore(value) {
    return Number(value).toLocaleString('de-DE');
  }
}
