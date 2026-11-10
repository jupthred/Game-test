/**
 * Erzeugt die Grafikdateien des Designs „Klassik“ aus den Vektor-Quellgrafiken in tools/art/:
 *   assets/themes/classic/spritesheet.png   alle Spielobjekte (zugleich Layout-Referenz für andere Designs)
 *   assets/themes/classic/spritesheet.json  Frame-Positionen, Drehpunkte, Nennradien
 *   assets/moon-surface.png                 Hintergrundtextur (für alle Designs)
 *
 * Bereits vorhandene Dateien werden NICHT überschrieben, damit extern bearbeitete
 * Grafiken nicht verloren gehen. Mit --force wird alles neu erzeugt.
 *
 *   npm run assets            # nur fehlende Dateien erzeugen
 *   npm run assets -- --force # alles neu erzeugen (überschreibt Änderungen!)
 *
 * Benötigt Playwright mit Chromium.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const FORCE = process.argv.includes('--force');
const OPTIONS = { scale: 2, sheetWidth: 512, padding: 4, world: { width: 480, height: 800 } };
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };

const exists = (file) => access(file).then(() => true, () => false);

function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!file.startsWith(root)) throw new Error('outside root');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    throw new Error('Playwright nicht gefunden. Installieren mit: npm install --no-save playwright');
  }
}

async function main() {
  const targets = {
    sheetPng: path.join(ASSETS, 'themes', 'classic', 'spritesheet.png'),
    sheetJson: path.join(ASSETS, 'themes', 'classic', 'spritesheet.json'),
    moonPng: path.join(ASSETS, 'moon-surface.png'),
  };
  const missing = {};
  for (const [key, file] of Object.entries(targets)) missing[key] = FORCE || !(await exists(file));
  if (!Object.values(missing).some(Boolean)) {
    console.log('Alle Grafikdateien vorhanden – nichts zu tun (mit --force neu erzeugen).');
    return;
  }

  const { chromium } = loadPlaywright();
  const server = await serve(ROOT);
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/tools/art/render.html`);
    await page.waitForFunction(() => window.rendererReady === true);
    const result = await page.evaluate((opts) => window.renderAssets(opts), OPTIONS);

    await mkdir(path.join(ASSETS, 'themes', 'classic'), { recursive: true });
    const png = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');
    if (missing.sheetPng) await writeFile(targets.sheetPng, png(result.sheetPng));
    if (missing.sheetJson) await writeFile(targets.sheetJson, `${JSON.stringify(result.sheetData, null, 2)}\n`);
    if (missing.moonPng) await writeFile(targets.moonPng, png(result.moonPng));
    for (const [key, file] of Object.entries(targets)) {
      console.log(`${missing[key] ? 'geschrieben' : 'unverändert'}: ${path.relative(ROOT, file)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
