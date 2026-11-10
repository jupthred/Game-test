import { CONFIG } from '../config.js';
import { EventBus } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { Renderer } from './Renderer.js';
import { InputManager } from '../input/InputManager.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { EnemyShip } from '../entities/EnemyShip.js';
import { ShieldPickup } from '../entities/ShieldPickup.js';
import { Destroyer } from '../entities/Destroyer.js';
import { GroundTurret } from '../entities/GroundTurret.js';
import { Explosion } from '../effects/Explosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { Spawner } from '../systems/Spawner.js';
import { LevelManager } from '../levels/LevelManager.js';
import { MoonSurface } from '../world/MoonSurface.js';
import { HUD } from '../ui/HUD.js';
import { PALETTE } from '../graphics/palette.js';
import { SafeStorage } from '../utils/storage.js';
import { DEFAULT_DIFFICULTY, getDifficulty } from '../levels/difficulty.js';

/** Zustände des Spielablaufs. */
export const GameState = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  LEVEL_OUTRO: 'level-outro',
  LEVEL_COMPLETE: 'level-complete',
  GAME_OVER_OUTRO: 'game-over-outro',
  GAME_OVER: 'game-over',
});

const LEVEL_OUTRO_TIME = 2;
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
    /**
     * Weltkontext für Entity-Updates: Größe, Zugriff auf den Spieler
     * und spawn(), damit Entities selbst Objekte erzeugen können (z. B. Schüsse).
     */
    this.world = { width, height, player: null, spawn: (entity) => this.entities.add(entity) };

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
    /** Aktiver Boss (Zerstörer) für die HUD-Anzeige */
    this.boss = null;
    this.difficulty = getDifficulty(SafeStorage.get(CONFIG.storageKeys.difficulty, DEFAULT_DIFFICULTY));
    this.session = this._createSession();
    this.bestScore = this._loadBestScore(this.difficulty.id);

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
    this.showStartScreen();
    this.loop.start();
  }

  /** Startbildschirm mit Schwierigkeitsauswahl (auch nach Game Over erreichbar). */
  showStartScreen() {
    this.entities.clear();
    this.player = null;
    this.world.player = null;
    this.background.speed = CONFIG.background.baseSpeed * 0.6;
    this._setState(GameState.MENU);
    this.screens.setChoice('difficulty', this.difficulty.id);
    this.screens.show('start', this._startScreenData());
  }

  /** @param {string} id Schlüssel aus levels/difficulty.js */
  setDifficulty(id) {
    this.difficulty = getDifficulty(id);
    this.bestScore = this._loadBestScore(this.difficulty.id);
    SafeStorage.set(CONFIG.storageKeys.difficulty, this.difficulty.id);
    this.screens.update('start', this._startScreenData());
    this.bus.emit('difficulty:change', { difficulty: this.difficulty });
  }

  newGame() {
    this.setDifficulty(this.screens.getChoice('difficulty') ?? this.difficulty.id);
    this.session = this._createSession();
    this.startLevel(1);
  }

  startLevel(level) {
    this.session.level = level;
    this.session.levelKills = 0;
    this.levels.load(level, this.difficulty.id);
    const cfg = this.levels.config;

    this.entities.clear();
    this.player = this.entities.add(
      new Player(
        this.world.width / 2,
        this.world.height - CONFIG.player.yOffset,
        { minX: 0, maxX: this.world.width },
        { shield: this.session.shield, shieldMax: this.difficulty.shieldMax },
      ),
    );
    this.world.player = this.player;
    this.boss = null;
    this._bossFight = false;
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

    // Phase 1: Zeit überleben. Phase 2: Bosskampf – das Level endet erst mit dem Abschuss.
    if (this.state !== GameState.PLAYING || !this.levels.isComplete) return;
    if (!this.levels.config.boss) this._completeLevel();
    else if (!this._bossFight) this._startBossFight();
  }

  _startBossFight() {
    this._bossFight = true;
    // Keine neuen Asteroiden und Feindschiffe mehr, Schild-Items kommen weiter
    this.spawner.setCategoryActive('hostile', false);
    this.spawner.spawnNow(this.levels.config.boss);
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
    this._damagePlayer(player, hazard.x, hazard.y);
  }

  _onEnemyBulletHitsPlayer(player, bullet) {
    if (player.isInvulnerable) return;
    bullet.kill();
    this._damagePlayer(player, bullet.x, bullet.y);
  }

  _onPickup(player, item) {
    item.kill();
    this.entities.add(Explosion.pickup(item.x, item.y));
    if (item.kind === 'shield') {
      const healed = player.healShield(CONFIG.pickups.shieldHeal);
      this.session.shield = player.shield;
      this.hud.flashShield('heal');
      if (healed > 0) {
        this.entities.add(new FloatingText(player.x, player.y - 50, `+${healed} SCHILD`, PALETTE.shield, { size: 18, life: 1 }));
      } else {
        const bonus = CONFIG.pickups.fullShieldBonus;
        const points = this._addScore(bonus);
        this.entities.add(new FloatingText(player.x, player.y - 50, `+${points}`, PALETTE.shieldLight, { size: 18, life: 1 }));
      }
    }
    this.bus.emit('pickup:collected', { kind: item.kind, shield: player.shield });
  }

  /**
   * Zentrale Schadensbehandlung: zuerst fängt das Schild ab,
   * erst bei leerem Schild geht ein Leben verloren (danach ist das Schild wieder voll).
   */
  _damagePlayer(player, impactX, impactY) {
    if (player.absorbHit() === 'shield') {
      this.session.shield = player.shield;
      this.entities.add(Explosion.shieldImpact(impactX, impactY));
      this.hud.flashShield('hit');
      this._shakeScreen(4, 0.2);
      this.bus.emit('shield:hit', { shield: player.shield });
      if (player.shield === 0) {
        this.entities.add(new FloatingText(player.x, player.y - 50, 'SCHILD AUSGEFALLEN', PALETTE.danger, { size: 18, life: 1.2, rise: 35 }));
      }
      return;
    }

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
    player.refillShield();
    this.session.shield = player.shield;
    const label = this.session.lives === 1 ? 'LETZTES LEBEN!' : '−1 LEBEN';
    this.entities.add(new FloatingText(player.x, player.y - 46, label, PALETTE.danger, { size: 22, life: 1.3, rise: 40 }));
  }

  _onSpawn(entity) {
    this.entities.add(entity);
    if (!entity.isBoss) return;
    this.boss = entity;
    this.hud.showBanner('ZERSTÖRER', 'Besiege ihn, um die Zone zu sichern', 2.4);
    this._shakeScreen(5, 0.6);
    this.bus.emit('boss:appear', { boss: entity });
  }

  _destroyHazard(hazard, { byPlayer }) {
    hazard.kill();
    if (hazard.isBoss) {
      for (const blast of Explosion.cluster(hazard.x, hazard.y, hazard.radius)) this.entities.add(blast);
      this._shakeScreen(14, 0.8);
      this.bus.emit('boss:destroyed', { boss: hazard, byPlayer });
    } else {
      this.entities.add(Explosion.forHazard(hazard));
    }
    if (!byPlayer) return;

    if (hazard.isBoss) {
      const points = this._addScore(hazard.scoreValue);
      this.session.kills += 1;
      this.session.levelKills += 1;
      this.entities.add(
        new FloatingText(hazard.x, hazard.y, `ZERSTÖRER VERNICHTET +${points}`, PALETTE.accent, { size: 20, life: 1.8, rise: 30 }),
      );
      this.bus.emit('hazard:destroyed', { hazard });
      if (this.state === GameState.PLAYING && this._bossFight) this._completeLevel();
      return;
    }

    const points = this._addScore(hazard.scoreValue);
    this.session.kills += 1;
    this.session.levelKills += 1;
    this.entities.add(new FloatingText(hazard.x, hazard.y, `+${points}`, PALETTE.accentLight));
    this.bus.emit('hazard:destroyed', { hazard });
  }

  _completeLevel() {
    this.input.enabled = false;
    for (const hazard of this.entities.ofType('hazard')) {
      // Ein noch lebender Zerstörer zieht sich zurück, statt zu explodieren
      if (typeof hazard.retreat === 'function') hazard.retreat();
      else this._destroyHazard(hazard, { byPlayer: false });
    }
    for (const target of this.entities.ofType('ground')) this._destroyHazard(target, { byPlayer: false });
    for (const shot of this.entities.ofType('enemyBullet')) shot.kill();
    this.session.shield = this.player.shield;

    const bonus = this._addScore(CONFIG.scoring.levelClearPerLevel * this.session.level);
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
    const { score, level, kills, levelKills, lives, lastBonus, shield } = this.session;

    if (this.state === GameState.LEVEL_OUTRO) {
      this._setState(GameState.LEVEL_COMPLETE);
      this.screens.show('level-complete', {
        level,
        nextLevel: level + 1,
        score: this._formatScore(score),
        levelKills,
        lives,
        difficulty: this.difficulty.label,
        shield: `${shield}/${this.difficulty.shieldMax}`,
        bonus: this._formatScore(lastBonus),
      });
      return;
    }

    const isRecord = score > this.bestScore;
    if (isRecord) {
      this.bestScore = score;
      SafeStorage.set(this._bestScoreKey(this.difficulty.id), score);
    }
    this._setState(GameState.GAME_OVER);
    this.screens.show('game-over', {
      level,
      score: this._formatScore(score),
      kills,
      best: this._formatScore(this.bestScore),
      difficulty: this.difficulty.label,
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
        shield: this.player ? this.player.shield : this.session.shield,
        maxShield: this.difficulty.shieldMax,
        level: this.session.level,
        difficulty: this.difficulty.label,
        timeLeft: this.levels.timeLeft,
        progress: this.levels.progress,
        bossFight: this._bossFight && this.state === GameState.PLAYING,
        bossName: this.boss?.displayName ?? '',
      });
    }
  }

  /* ---------------- Aufbau & Hilfen ---------------- */

  _createSession() {
    return { score: 0, lives: CONFIG.player.lives, shield: this.difficulty.shieldMax, level: 1, kills: 0, levelKills: 0, hitsTaken: 0, lastBonus: 0 };
  }

  _createSpawner() {
    const spawner = new Spawner();
    spawner.register('asteroid', (cfg) => Asteroid.spawn(this.world.width, cfg));
    spawner.register('enemy', (cfg) => EnemyShip.spawn(this.world.width, cfg));
    spawner.register('shield', () => ShieldPickup.spawn(this.world.width));
    spawner.register('destroyer', (cfg) => Destroyer.spawn(this.world.width, cfg));
    spawner.register('turret', (cfg) => GroundTurret.spawn(this.world.width, cfg));
    spawner.onSpawn = (entity) => this._onSpawn(entity);
    spawner.countActive = () => this.entities.count('hazard');
    return spawner;
  }

  _createCollisions() {
    const collisions = new CollisionSystem(this.entities);
    collisions.addRule('bullet', 'hazard', (bullet, hazard) => this._onBulletHitsHazard(bullet, hazard));
    // Bodenziele: nur von Schüssen treffbar, der Gleiter fliegt darüber hinweg
    collisions.addRule('bullet', 'ground', (bullet, target) => this._onBulletHitsHazard(bullet, target));
    collisions.addRule('player', 'hazard', (player, hazard) => this._onPlayerHitsHazard(player, hazard));
    collisions.addRule('player', 'enemyBullet', (player, bullet) => this._onEnemyBulletHitsPlayer(player, bullet));
    collisions.addRule('player', 'pickup', (player, item) => this._onPickup(player, item));
    return collisions;
  }

  _bindScreens() {
    this.screens.on('start', () => this.newGame());
    this.screens.on('menu', () => this.showStartScreen());
    this.screens.onChange('difficulty', (id) => this.setDifficulty(id));
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

  /** Addiert Punkte mit Schwierigkeitsfaktor. @returns {number} tatsächlich vergebene Punkte */
  _addScore(basePoints) {
    const points = Math.round(basePoints * this.difficulty.scoreMultiplier);
    this.session.score += points;
    return points;
  }

  _startScreenData() {
    return {
      best: this._formatScore(this.bestScore),
      hasBest: this.bestScore > 0,
      difficulty: this.difficulty.label,
      difficultyDescription: this.difficulty.description,
      shieldMax: this.difficulty.shieldMax,
    };
  }

  _bestScoreKey(difficultyId) {
    return `${CONFIG.storageKeys.bestScore}.${difficultyId}`;
  }

  _loadBestScore(difficultyId) {
    return Number(SafeStorage.get(this._bestScoreKey(difficultyId), 0)) || 0;
  }

  _formatScore(value) {
    return Number(value).toLocaleString('de-DE');
  }
}
