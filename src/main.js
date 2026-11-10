import { Game } from './core/Game.js';
import { ScreenManager } from './ui/ScreenManager.js';
import { loadAssets } from './assets/AssetLoader.js';

/** Einstiegspunkt: Grafiken laden, DOM verdrahten und Spiel starten. */
async function bootstrap() {
  const overlay = document.getElementById('overlay');
  let assets;
  try {
    assets = await loadAssets();
  } catch (error) {
    overlay.hidden = false;
    overlay.innerHTML = `<section class="panel"><p class="eyebrow">Fehler</p><p class="lead">Die Grafiken konnten nicht geladen werden: ${error.message}. Für die Entwicklung das Spiel über einen lokalen Server starten (npm run serve).</p></section>`;
    throw error;
  }
  const game = new Game(
    {
      canvas: document.getElementById('canvas'),
      stage: document.getElementById('stage'),
      frame: document.getElementById('game'),
      screens: new ScreenManager(overlay),
    },
    assets,
  );
  game.boot();
  // Für Debugging in der Browser-Konsole
  window.mondgleiter = game;
}

bootstrap();
