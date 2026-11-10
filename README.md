# Mondgleiter

Arcade-Shooter in der Draufsicht. Ein Weltraumgleiter fliegt über eine automatisch scrollende Mondlandschaft. Von oben kommen Asteroiden und feindliche Raumschiffe, die auf den Spieler schießen. Ein Schild fängt je nach Schwierigkeit 10 bis 4 Treffer ab, bevor ein Leben verloren geht; danach ist es wieder voll. Etwa alle 10 Sekunden fällt ein Schild-Item herab, das 5 Schildpunkte auflädt (bei vollem Schild gibt es 50 Bonuspunkte). Wer die Überlebenszeit schafft (30 Sekunden in Level 1, jedes weitere Level 2 Sekunden mehr) und danach den Zerstörer besiegt, schafft das Level. Danach wird es schneller und dichter, endlos, bis alle drei Leben weg sind.

Erster Entwurf mit einfachen Platzhaltergrafiken in einem bearbeitbaren Spritesheet. Reines HTML und JavaScript (ES-Module), keine Abhängigkeiten zur Laufzeit.

## Schwierigkeit

Im Startbildschirm wählt man zwischen vier Stufen. Leben (3) sind überall gleich, das Schild hat pro Stufe 2 Ladungen weniger.

| Stufe        | Schild | Tempo | Gegnerdichte | Gegnerbeschuss | Schild-Item alle | Zerstörer-HP | Punkte |
|--------------|--------|-------|--------------|----------------|------------------|--------------|--------|
| Leicht       | 10     | ×0,85 | weniger      | seltener       | 7 s              | ×0,7         | ×0,75  |
| Mittel       | 8      | ×1    | normal       | normal         | 10 s             | ×1           | ×1     |
| Schwer       | 6      | ×1,2  | mehr         | häufiger       | 14 s             | ×1,3         | ×1,5   |
| Brutalschwer | 4      | ×1,4  | viel mehr    | doppelt so oft | 20 s             | ×1,7         | ×2,5   |

## Booster (Spezial-Items)

Etwa alle 16 Sekunden (erstes nach 11 s) fällt ein orangefarbenes, rautenförmiges Spezial-Item herab. Derzeit gibt es einen Booster:

- **Doppelschuss:** 10 Sekunden lang zwei Kanonen an den Flügeln statt einer an der Nase, jeder Schuss feuert doppelt.

Rechts unter den Punkten zeigt das HUD Name, Restzeit und einen ablaufenden Balken; in den letzten 2 Sekunden blinken Anzeige und Kanonen. Erneutes Einsammeln setzt die Zeit zurück. Ein laufender Booster wird mit Restzeit ins nächste Level übernommen.

**Neuen Booster anlegen** (`src/boosts/boostTypes.js`): Ein Booster überschreibt nur Werte der Standardwaffe (`muzzles` mit Position und Winkel, `cooldownMultiplier`, `speedMultiplier`, `damage`). Beispiele:

```js
spreadShot: { id: 'spreadShot', label: 'Fächerschuss', shortLabel: '3×', duration: 8, color: '#7cff6b', weight: 1,
  weapon: { muzzles: [{ x: 0, y: -22, angle: -0.25 }, { x: 0, y: -22, angle: 0 }, { x: 0, y: -22, angle: 0.25 }] } },
rapidFire:  { id: 'rapidFire',  label: 'Schnellfeuer', shortLabel: '»',  duration: 8, color: '#ffe14f', weight: 1,
  weapon: { cooldownMultiplier: 0.45 } },
```

`weight` steuert die Häufigkeit beim Item-Spawn. Das Item zeigt den Frame `pickup_<id>` aus dem Spritesheet, die Flügelkanonen optional `player_cannon_<id>`. Fehlt der Frame, erscheint eine leere Raute (`pickup_boost`) mit `shortLabel`. Events: `boost:start`, `boost:end`.

## Designs

Im Startbildschirm wählt man zwischen drei Grafik-Designs; jedes ist ein eigenes Spritesheet mit denselben Frame-Namen. Die Auswahl wird gemerkt und wirkt sofort.

| Design | Dateien | Herkunft |
|---|---|---|
| Comic (Standard) | `assets/themes/comic/` | importiert aus `assets/sources/comic.jpg` |
| Düster | `assets/themes/dark/` | importiert aus `assets/sources/dark.jpg` |
| Klassik | `assets/themes/classic/` | erzeugt aus den Vektor-Vorlagen in `tools/art/`; **Layout-Referenz** für alle anderen |

In beiden importierten Vorlagen steht an der Stelle des Spielergeschosses eine Ausweiskarte; dort wird das Geschoss aus „Klassik“ übernommen (`--keep bullet`).

**Neues Design aus einer Vorlage importieren:** Bild im Layout von `assets/themes/classic/spritesheet.png` gestalten (beliebige Größe, gleiche Anordnung, weißer oder transparenter Hintergrund), dann

```bash
python3 tools/import_spritesheet.py vorlage.jpg meinDesign --keep bullet
```

Das Skript (Pillow + numpy) schneidet jeden Frame an seiner Position aus, stellt den weißen Hintergrund von außen her frei (weiße Stellen innerhalb der Grafik bleiben), entfernt helle Säume und passt die Grafik in das Frame-Rechteck ein. Danach das Design in `src/assets/themes.js` und als Radio-Button in `index.html` eintragen.

## Grafiken bearbeiten

Die Spielobjekte liegen pro Design in **`assets/themes/<design>/spritesheet.png`**, der Hintergrund (für alle Designs) in **`assets/moon-surface.png`**. Beide Dateien lassen sich in jedem Bildprogramm bearbeiten (Photoshop, GIMP, Krita, Aseprite, Affinity …). Danach `npm run build` ausführen, damit die Einzeldatei die neuen Grafiken enthält; in der Entwicklung (`npm run serve`) genügt Neuladen.

**Was man wissen muss**

- Grafiken liegen in **doppelter Auflösung** vor (`meta.scale: 2` im JSON): ein Gleiter mit 52 × 46 Spieleinheiten ist im Bild 104 × 92 Pixel groß. So bleiben sie auf Retina-Displays scharf.
- Jeder Frame hat in **`spritesheet.json`** (neben der PNG) sein Rechteck (`frame: x, y, w, h` in Pixeln) und seinen **Drehpunkt** (`pivot`, 0..1 relativ zur Frame-Größe). Um diesen Punkt wird gedreht, und er liegt auf der Spielposition des Objekts.
- Innerhalb des Rechtecks frei malen. Soll eine Grafik **größer** werden, Rechteck im JSON anpassen (und in der PNG Platz schaffen). Die Trefferzonen im Spiel ändern sich dadurch nicht, sie stehen im Code.
- **Transparenz** bleibt erhalten; Schatten und weiße Treffer-Blitze erzeugt das Spiel automatisch aus der Silhouette des Frames. Schatten also nicht mitmalen.
- **Ausrichtung:** Gleiter, eigene Geschosse und Items zeigen nach **oben**; Feindschiffe, Zerstörer, Turmrohr und Gegnergeschosse nach **unten**. Licht fällt von links oben.
- Die Mondtextur muss **oben und unten nahtlos** aneinanderpassen, weil sie endlos wiederholt wird. Seitenverhältnis 480 : 800 beibehalten (z. B. 960 × 1600 Pixel).

**Frames**

| Frame | Inhalt | Hinweis |
|---|---|---|
| `player` | Gleiter | wird beim Seitwärtsflug horizontal gestaucht |
| `player_flame` | Triebwerksflamme | Drehpunkt oben, wird in der Länge flackernd skaliert |
| `player_cannon` | Flügelkanone (Doppelschuss) | optional `player_cannon_<boostId>` pro Booster |
| `enemy` | Feindschiff | |
| `asteroid_big_0…3`, `asteroid_small_0…3` | Asteroiden-Varianten | beliebig viele Varianten möglich (`_4`, `_5` …), `radius` im JSON = Nennradius |
| `destroyer` | Zerstörer inkl. Kanonen | Kanonenmündungen bei x = ±34, y = 34 (Spieleinheiten ab Drehpunkt) |
| `turret_base`, `turret_head` | Geschützturm | Kopf dreht sich um seinen Drehpunkt, Rohr zeigt im Frame nach unten |
| `bullet`, `enemy_bullet` | Geschosse | werden additiv (leuchtend) gezeichnet |
| `pickup_shield`, `pickup_doubleShot`, `pickup_boost` | Items | `pickup_boost` = Rückfall für Booster ohne eigenen Frame |

Weiterhin im Code gezeichnet werden nur Effekte und Anzeigen: Explosionen, Leuchten und Mündungsfeuer, Schildblase, Health-Balken, HUD und Texte.

**Neu erzeugen:** `npm run assets` erzeugt fehlende Dateien des Designs „Klassik“ und den Hintergrund aus den Vektor-Vorlagen in `tools/art/` (braucht Playwright). Vorhandene Dateien bleiben unangetastet; `npm run assets -- --force` überschreibt sie – **dabei gehen eigene Änderungen verloren**.

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
    BoostPickup.js        Spezial-Item, trägt einen Booster aus boosts/boostTypes.js
  boosts/boostTypes.js    Standardwaffe + Booster als Daten (Doppelschuss, …)
  effects/                Explosion, FloatingText (rein visuell)
  systems/
    CollisionSystem.js    Regeln nach Entity-Typ (z. B. bullet ↔ hazard)
    Spawner.js            Zeitgesteuertes Erzeugen registrierter Gegnertypen
  levels/
    levelConfig.js        Schwierigkeitskurve + optionale Level-Overrides
    difficulty.js         Schwierigkeitsstufen (Leicht/Mittel/Schwer) als Multiplikatoren
    LevelManager.js       Aktuelles Level, Restzeit
  world/MoonSurface.js    Scrollt die Mondtextur assets/moon-surface.png
  assets/AssetLoader.js   Lädt die Spritesheets aller Designs + Mondtextur (bzw. eingebettete Daten im Build)
  assets/themes.js        Liste der Designs
  graphics/
    palette.js            Farben und HUD-Schrift
    SpriteAtlas.js        Frames aus dem Spritesheet zeichnen (Drehpunkt, Skalierung, Einfärben)
    Sprites.js            Zeichnet jede Entity aus ihren Frames + dynamische Effekte
  ui/
    HUD.js                Leben, Level, Restzeit, Punkte, Banner
    ScreenManager.js      HTML-Overlays (Start, Level geschafft, Game Over)
  utils/                  Mathe-Helfer, sicheres localStorage
assets/
  themes/<design>/        spritesheet.png (bearbeitbar) + spritesheet.json pro Design
  sources/                Original-Vorlagen der importierten Designs
  moon-surface.png        Hintergrund (bearbeitbar)
tools/
  build.mjs               Abhängigkeitsfreier Bundler, bettet assets/ in die Einzeldatei ein
  generate-assets.mjs     Erzeugt das Design „Klassik“ + Hintergrund aus tools/art/
  import_spritesheet.py   Importiert eine Vorlage (z. B. JPEG) als neues Design
  art/                    Vektor-Vorlagen, aus denen das erste Spritesheet entstanden ist
```

Spielzustände: `menu → playing → level-outro → level-complete → playing …` und bei 0 Leben `game-over-outro → game-over`.

## Erweitern

**Neuer Gegnertyp**
1. Klasse in `src/entities/` von `Hazard` ableiten, mit statischer `spawn(worldWidth, cfg)`-Fabrik.
2. Grafik als neuen Frame ins Spritesheet (siehe „Grafiken bearbeiten“) und in `graphics/Sprites.js` per `registerSprite('name', fn)` eine Zeichenfunktion anmelden, die `atlas.draw(ctx, 'frame', x, y)` aufruft.
3. In `Game._createSpawner()` registrieren: `spawner.register('name', cfg => Neu.spawn(this.world.width, cfg))`.
4. In `levels/levelConfig.js` unter `spawns` ein Intervall eintragen.

**Echte Grafiken statt Platzhalter:** Einfach `assets/themes/<design>/spritesheet.png` übermalen oder ein neues Design importieren, siehe oben. Code muss dafür nicht angefasst werden.

**Sound, Statistiken, Achievements:** Am `game.bus` anmelden, z. B. `game.bus.on('player:hit', …)`. Events: `state:change`, `level:start`, `level:complete`, `player:fire`, `player:hit`, `shield:hit`, `pickup:collected`, `boss:appear`, `boss:destroyed`, `difficulty:change`, `hazard:destroyed`, `game:over`.

**Schaden und Schild:** Alle Treffer laufen über `Game._damagePlayer()`. Werte wie Schildgröße, Heilung pro Item und Feuerrate der Gegner stehen in `config.js` bzw. `levelConfig.js`.

**Weitere Items:** Wie `ShieldPickup` eine Entity vom Typ `'pickup'` mit eigenem `kind` anlegen, im Spawner registrieren (in `spawns` mit `unlimited: true`) und in `Game._onPickup()` behandeln. `Player.fire()` liefert bereits ein Array, damit Mehrfachschuss ohne Umbau möglich ist.

**Besondere Level:** In `LEVEL_OVERRIDES` (levelConfig.js) Werte für einzelne Level überschreiben, etwa ein dichtes Asteroidenfeld in Level 5.

## Build-Konventionen

Der Bundler entfernt `import`/`export` und hängt die Module in Abhängigkeitsreihenfolge aneinander. Deshalb gilt: Importe einzeilig, keine `export default`, Top-Level-Namen projektweit eindeutig. Der Build bricht mit einer klaren Meldung ab, wenn das verletzt wird.
