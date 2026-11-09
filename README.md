# Mondgleiter

Arcade-Shooter in der Draufsicht. Ein Weltraumgleiter fliegt über eine automatisch scrollende Mondlandschaft. Von oben kommen Asteroiden und feindliche Raumschiffe. Wer 30 Sekunden überlebt, schafft das Level. Danach wird es schneller und dichter, endlos, bis alle drei Leben weg sind.

Erster Entwurf mit einfachen Vektorgrafiken als Platzhalter. Reines HTML und JavaScript (ES-Module), keine Abhängigkeiten.

## Steuerung

| Aktion    | Touch / Maus                 | Tastatur              |
|-----------|------------------------------|-----------------------|
| Bewegen   | links/rechts wischen (ziehen) | ← → oder A / D        |
| Schießen  | tippen / klicken             | Leertaste, ↑ oder W   |

Auf dem Handy kann man mit einem Finger steuern und mit einem zweiten tippen, um gleichzeitig zu schießen.

## Starten

```bash
# Entwicklung (ES-Module brauchen einen lokalen Server)
npm run serve            # http://localhost:8080

# Einzeldatei bauen
npm run build            # → dist/index.html (per Doppelklick spielbar)
                         # → dist/mondgleiter.artifact.html (Fragment für das Artefakt)
```

## Architektur

```
src/
  main.js                 Einstiegspunkt, verdrahtet DOM und Game
  config.js               Alle Balancing-Werte (Leben, Tempo, Cooldowns …)
  core/
    Game.js               Zustandsautomat + Orchestrierung der Systeme
    GameLoop.js           requestAnimationFrame mit begrenztem Zeitschritt
    Renderer.js           Canvas-Skalierung, devicePixelRatio, Letterboxing
    EventBus.js           Pub/Sub für lose Kopplung (Sound, Stats, …)
  input/InputManager.js   Wischen, Tippen, Tastatur → abstrakte Befehle
  entities/
    Entity.js             Basisklasse (Position, Typ, Layer, Sprite)
    EntityManager.js      Update, Render, Abfragen, Aufräumen
    Player.js, Bullet.js
    Hazard.js             Basis für alles Abschießbare mit HP und Punkten
    Asteroid.js, EnemyShip.js
  effects/                Explosion, FloatingText (rein visuell)
  systems/
    CollisionSystem.js    Regeln nach Entity-Typ (z. B. bullet ↔ hazard)
    Spawner.js            Zeitgesteuertes Erzeugen registrierter Gegnertypen
  levels/
    levelConfig.js        Schwierigkeitskurve + optionale Level-Overrides
    LevelManager.js       Aktuelles Level, Restzeit
  world/MoonSurface.js    Prozedurale, nahtlos scrollende Mondtextur
  graphics/
    palette.js            Farben und HUD-Schrift
    Sprites.js            Platzhaltergrafiken, austauschbar per registerSprite()
  ui/
    HUD.js                Leben, Level, Restzeit, Punkte, Banner
    ScreenManager.js      HTML-Overlays (Start, Level geschafft, Game Over)
  utils/                  Mathe-Helfer, sicheres localStorage
tools/build.mjs           Abhängigkeitsfreier Bundler für die Einzeldatei
```

Spielzustände: `menu → playing → level-outro → level-complete → playing …` und bei 0 Leben `game-over-outro → game-over`.

## Erweitern

**Neuer Gegnertyp**
1. Klasse in `src/entities/` von `Hazard` ableiten, mit statischer `spawn(worldWidth, cfg)`-Fabrik.
2. Zeichenfunktion in `graphics/Sprites.js` per `registerSprite('name', fn)` anmelden.
3. In `Game._createSpawner()` registrieren: `spawner.register('name', cfg => Neu.spawn(this.world.width, cfg))`.
4. In `levels/levelConfig.js` unter `spawns` ein Intervall eintragen.

**Echte Grafiken statt Platzhalter:** In `Sprites.js` die Zeichenfunktion ersetzen, z. B. `registerSprite('player', (ctx, p) => ctx.drawImage(img, p.x - 24, p.y - 26, 48, 52))`. Die Spiellogik bleibt unverändert.

**Sound, Statistiken, Achievements:** Am `game.bus` anmelden, z. B. `game.bus.on('player:hit', …)`. Events: `state:change`, `level:start`, `level:complete`, `player:fire`, `player:hit`, `hazard:destroyed`, `game:over`.

**Power-ups:** Neuer Entity-Typ `'powerup'` und eine Kollisionsregel `collisions.addRule('player', 'powerup', …)`. `Player.fire()` liefert bereits ein Array, damit Mehrfachschuss ohne Umbau möglich ist.

**Besondere Level:** In `LEVEL_OVERRIDES` (levelConfig.js) Werte für einzelne Level überschreiben, etwa ein dichtes Asteroidenfeld in Level 5.

## Build-Konventionen

Der Bundler entfernt `import`/`export` und hängt die Module in Abhängigkeitsreihenfolge aneinander. Deshalb gilt: Importe einzeilig, keine `export default`, Top-Level-Namen projektweit eindeutig. Der Build bricht mit einer klaren Meldung ab, wenn das verletzt wird.
