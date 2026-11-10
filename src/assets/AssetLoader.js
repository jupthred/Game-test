import { SpriteAtlas } from '../graphics/SpriteAtlas.js';

/** Speicherorte der Grafikdateien relativ zur index.html. */
const ASSET_PATHS = Object.freeze({
  sheetData: 'assets/spritesheet.json',
  moonSurface: 'assets/moon-surface.png',
});

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

/**
 * Lädt Spritesheet und Hintergrund.
 *
 * Entwicklung: aus den Dateien in assets/ (lokaler Server nötig).
 * Gebaute Einzeldatei: tools/build.mjs bettet die Dateien als data:-URIs in
 * window.__MONDGLEITER_ASSETS__ ein, damit dist/index.html ohne Server läuft.
 *
 * @returns {Promise<{ atlas: SpriteAtlas, moonSurface: HTMLImageElement }>}
 */
export async function loadAssets() {
  const embedded = window.__MONDGLEITER_ASSETS__;

  const sheetData = embedded?.sheetData ?? (await fetch(ASSET_PATHS.sheetData).then((r) => {
    if (!r.ok) throw new Error(`${ASSET_PATHS.sheetData} konnte nicht geladen werden (${r.status})`);
    return r.json();
  }));
  const sheetBase = ASSET_PATHS.sheetData.slice(0, ASSET_PATHS.sheetData.lastIndexOf('/') + 1);
  const sheetImage = embedded?.sheetImage ?? `${sheetBase}${sheetData.meta.image}`;
  const moonSrc = embedded?.moonSurface ?? ASSET_PATHS.moonSurface;

  const [atlas, moonSurface] = await Promise.all([SpriteAtlas.load(sheetImage, sheetData), loadImage(moonSrc)]);
  return { atlas, moonSurface };
}
