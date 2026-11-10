# Mondgleiter

Arcade-Shooter in der Draufsicht. Ein Weltraumgleiter fliegt über eine automatisch scrollende Mondlandschaft. Von oben kommen Asteroiden und feindliche Raumschiffe, die auf den Spieler schießen. Ein Schild fängt je nach Schwierigkeit 10 bis 4 Treffer ab, bevor ein Leben verloren geht; danach ist es wieder voll. Etwa alle 10 Sekunden fällt ein Schild-Item herab, das 5 Schildpunkte auflädt (bei vollem Schild gibt es 50 Bonuspunkte). Wer die Überlebenszeit schafft (30 Sekunden in Level 1, jedes weitere Level 2 Sekunden mehr) und danach den Zerstörer besiegt, schafft das Level. Danach wird es schneller und dichter, endlos, bis alle drei Leben weg sind.

Erster Entwurf mit einfachen Vektorgrafiken als Platzhalter. Reines HTML und JavaScript (ES-Module), keine Abhängigkeiten.

## Schwierigkeit

Im Startbildschirm wählt man zwischen vier Stufen. Leben (3) sind überall gleich, das Schild hat pro Stufe 2 Ladungen weniger.

| Stufe        | Schild | Tempo | Gegnerdichte | Gegnerbeschuss | Schild-Item alle | Zerstörer-HP | Punkte |
|--------------|--------|-------|--------------|----------------|------------------|--------------|--------|
| Leicht       | 10     | ×0,85 | weniger      | seltener       | 7 s              | ×0,7         | ×0,75  |
| Mittel       | 8      | ×1    | normal       | normal         | 10 s             | ×1           | ×1     |
| Schwer       | 6      | ×1,2  | mehr         | häufiger       | 14 s             | ×1,3         | ×1,5   |
| Brutalschwer | 4      | ×1,4  | viel mehr    | doppelt so oft | 20 s             | ×1,7         | ×2,5   |

## Geschütztürme

Geschütztürme stehen auf der Mondoberfläche und scrollen mit ihr. Der Turmkopf dreht sich ständig zum Gleiter (mit begrenzter Drehgeschwindigkeit) und feuert in jede Richtung, also auch seitwärts und nach hinten, wenn der Turm schon unter dem Gleiter durchgezogen ist. Vor jedem Schuss glüht die Mündung auf. Ein Turm hält 3 Treffer aus; der Balken darüber hat ein Segment pro Treffer. Der Gleiter fliegt über die Türme hinweg, Rammen ist also nicht möglich. Werte stehen in `levelConfig.js` unter `turret` und `spawns.turret`. Während des Bosskampfes kommen keine neuen Türme.

## Der Zerstörer

Jedes Level hat zwei Phasen:

1. **Überleben:** 30 Sekunden lang (jedes weitere Level 2 Sekunden länger, einstellbar über `durationIncreasePerLevel` in `config.js`) kommen Asteroiden, Feindschiffe und Schild-Items.
2. **Bosskampf:** Ist die Zeit abgelaufen, erscheint der Zerstörer. Ab jetzt kommen keine neuen Asteroiden und Feindschiffe mehr, Schild-Items fallen weiter. Der Zerstörer schwebt vor dem Spieler hin und her und feuert mit Vorwarnung aus zwei Kanonen gleichzeitig. Über ihm sitzt ein Health-Balken mit Trefferpunkten, der von Rot über Orange nach Hellgelb wechselt. Statt des Timers steht oben „ZERSTÖRER BESIEGEN“.

Erst sein Abschuss sichert die Zone und beendet das Level (250 Punkte + 50 pro Level, mal Stufenfaktor). Werte stehen in `levelConfig.js` unter `destroyer`; mit `boss: null` entfällt der Bosskampf für ein Level. Der Spawner pausiert dafür alle Kanäle der Kategorie `hostile` (`spawner.setCategoryActive`).

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
    Asteroid.js, EnemyShip.js   EnemyShip schießt über world.spawn()
    EnemyBullet.js        Gegnerschuss (Typ 'enemyBullet')
    ShieldPickup.js       Schild-Item (Typ 'pickup')
    Destroyer.js          Boss: Anflug → Schweben mit Doppelsalven → Rückzug
    GroundTurret.js       Geschützturm am Boden (Typ 'ground'), dreht sich zum Spieler
  effects/                Explosion, FloatingText (rein visuell)
  systems/
    CollisionSystem.js    Regeln nach Entity-Typ (z. B. bullet ↔ hazard)
    Spawner.js            Zeitgesteuertes Erzeugen registrierter Gegnertypen
  levels/
    levelConfig.js        Schwierigkeitskurve + optionale Level-Overrides
    difficulty.js         Schwierigkeitsstufen (Leicht/Mittel/Schwer) als Multiplikatoren
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

**Sound, Statistiken, Achievements:** Am `game.bus` anmelden, z. B. `game.bus.on('player:hit', …)`. Events: `state:change`, `level:start`, `level:complete`, `player:fire`, `player:hit`, `shield:hit`, `pickup:collected`, `boss:appear`, `boss:destroyed`, `difficulty:change`, `hazard:destroyed`, `game:over`.

**Schaden und Schild:** Alle Treffer laufen über `Game._damagePlayer()`. Werte wie Schildgröße, Heilung pro Item und Feuerrate der Gegner stehen in `config.js` bzw. `levelConfig.js`.

**Weitere Items:** Wie `ShieldPickup` eine Entity vom Typ `'pickup'` mit eigenem `kind` anlegen, im Spawner registrieren (in `spawns` mit `unlimited: true`) und in `Game._onPickup()` behandeln. `Player.fire()` liefert bereits ein Array, damit Mehrfachschuss ohne Umbau möglich ist.

**Besondere Level:** In `LEVEL_OVERRIDES` (levelConfig.js) Werte für einzelne Level überschreiben, etwa ein dichtes Asteroidenfeld in Level 5.

## Build-Konventionen

Der Bundler entfernt `import`/`export` und hängt die Module in Abhängigkeitsreihenfolge aneinander. Deshalb gilt: Importe einzeilig, keine `export default`, Top-Level-Namen projektweit eindeutig. Der Build bricht mit einer klaren Meldung ab, wenn das verletzt wird.
