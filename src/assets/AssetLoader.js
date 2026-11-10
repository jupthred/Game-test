import { SpriteAtlas } from '../graphics/SpriteAtlas.js';
import { THEMES } from './themes.js';

/** Speicherorte der Grafikdateien relativ zur index.html. */
const themeDir = (id) => `assets/themes/${id}/`;
const MOON_SURFACE_PATH = 'assets/moon-surface.png';

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} konnte nicht geladen werden (${response.status})`);
  return response.json();
}

async function loadThemeAtlas(id, embedded) {
  if (embedded) return SpriteAtlas.load(embedded.sheetImage, embedded.sheetData);
  const data = await loadJson(`${themeDir(id)}spritesheet.json`);
  return SpriteAtlas.load(`${themeDir(id)}${data.meta.image}`, data);
}

/**
 * Lädt die Spritesheets aller Designs und den Hintergrund.
 *
 * Entwicklung: aus den Dateien in assets/ (lokaler Server nötig).
 * Gebaute Einzeldatei: tools/build.mjs bettet die Dateien als data:-URIs in
 * window.__MONDGLEITER_ASSETS__ ein, damit dist/index.html ohne Server läuft.
 *
 * @returns {Promise<{ atlases: Record<string, SpriteAtlas>, moonSurface: HTMLImageElement }>}
 */
export async function loadAssets() {
  const embedded = window.__MONDGLEITER_ASSETS__;
  const [moonSurface, ...atlasList] = await Promise.all([
    loadImage(embedded?.moonSurface ?? MOON_SURFACE_PATH),
    ...THEMES.map((theme) => loadThemeAtlas(theme.id, embedded?.themes?.[theme.id])),
  ]);
  const atlases = Object.fromEntries(THEMES.map((theme, i) => [theme.id, atlasList[i]]));
  return { atlases, moonSurface };
}
