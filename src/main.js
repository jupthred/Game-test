import { Game } from './core/Game.js';
import { ScreenManager } from './ui/ScreenManager.js';

/** Einstiegspunkt: DOM verdrahten und Spiel starten. */
function bootstrap() {
  const game = new Game({
    canvas: document.getElementById('canvas'),
    stage: document.getElementById('stage'),
    frame: document.getElementById('game'),
    screens: new ScreenManager(document.getElementById('overlay')),
  });
  game.boot();
  // Für Debugging in der Browser-Konsole
  window.mondgleiter = game;
}

bootstrap();
