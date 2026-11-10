/**
 * Grafik-Designs. Jedes Design ist ein eigenes Spritesheet unter
 * assets/themes/<id>/spritesheet.png + spritesheet.json mit denselben Frame-Namen.
 *
 * Ein neues Design hinzufügen:
 *   1. Sheet im Layout der Referenz gestalten (assets/themes/classic/spritesheet.png)
 *   2. importieren: python3 tools/import_spritesheet.py vorlage.jpg <id>
 *      (oder PNG + JSON direkt nach assets/themes/<id>/ legen)
 *   3. hier eintragen und im Startbildschirm (index.html) einen Radio-Button ergänzen
 */
export const THEMES = Object.freeze([
  Object.freeze({ id: 'comic', label: 'Comic' }),
  Object.freeze({ id: 'dark', label: 'Düster' }),
  Object.freeze({ id: 'classic', label: 'Klassik' }),
]);

export const DEFAULT_THEME = 'comic';

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES.find((theme) => theme.id === DEFAULT_THEME);
}
