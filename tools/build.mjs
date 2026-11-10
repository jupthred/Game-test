/**
 * Minimaler, abhängigkeitsfreier Bundler.
 *
 * Löst die ES-Modul-Importe ab src/main.js auf, sortiert die Module topologisch,
 * entfernt import/export und bettet alles in eine einzige HTML-Datei ein:
 *   dist/index.html            – eigenständiges Dokument (Doppelklick genügt)
 *   dist/mondgleiter.artifact.html – Fragment für die Veröffentlichung als Artefakt
 *
 * Die Grafiken aus assets/ (Spritesheet + JSON, Mondtextur) werden als data:-URIs in
 * window.__MONDGLEITER_ASSETS__ eingebettet, damit die Einzeldatei ohne Server läuft.
 *
 * Konvention: keine `export default`, keine `export { … }`-Listen, Importe einzeilig,
 * Top-Level-Namen projektweit eindeutig (wird geprüft).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'src/main.js');
const IMPORT_RE = /^import\s+[^;]*?\s+from\s+['"](.+?)['"];?[ \t]*$/gm;
const DECL_RE = /^(?:export\s+)?(?:const|let|var|class|function\*?|async\s+function)\s+([A-Za-z_$][\w$]*)/gm;

async function collect(file, seen = new Set(), order = []) {
  if (seen.has(file)) return order;
  seen.add(file);
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(IMPORT_RE)) {
    await collect(path.resolve(path.dirname(file), match[1]), seen, order);
  }
  order.push({ file, source });
  return order;
}

function transform({ file, source }) {
  const rel = path.relative(ROOT, file);
  if (/^export\s+default\b/m.test(source) || /^export\s*\{/m.test(source)) {
    throw new Error(`${rel}: export default / export-Listen werden vom Build nicht unterstützt.`);
  }
  const body = source.replace(IMPORT_RE, '').replace(/^export\s+/gm, '').trim();
  return `// ---- ${rel} ----\n${body}\n`;
}

function assertUniqueNames(modules) {
  const owners = new Map();
  for (const { file, source } of modules) {
    for (const match of source.matchAll(DECL_RE)) {
      const name = match[1];
      if (owners.has(name)) {
        throw new Error(`Name "${name}" doppelt: ${path.relative(ROOT, owners.get(name))} und ${path.relative(ROOT, file)}`);
      }
      owners.set(name, file);
    }
  }
}

function between(html, open, close) {
  const start = html.indexOf(open);
  const end = html.indexOf(close, start);
  if (start < 0 || end < 0) throw new Error(`Abschnitt ${open} nicht gefunden`);
  return html.slice(start + open.length, end);
}

async function embedAssets() {
  const dir = path.join(ROOT, 'assets');
  const sheetData = JSON.parse(await readFile(path.join(dir, 'spritesheet.json'), 'utf8'));
  const dataUri = async (file) => `data:image/png;base64,${(await readFile(path.join(dir, file))).toString('base64')}`;
  const assets = {
    sheetData,
    sheetImage: await dataUri(sheetData.meta.image),
    moonSurface: await dataUri('moon-surface.png'),
  };
  // "<" maskieren, damit kein "</script>" im Inhalt das Script-Tag beendet
  return `<script>window.__MONDGLEITER_ASSETS__ = ${JSON.stringify(assets).replace(/</g, '\\u003c')};</script>`;
}

async function build() {
  const modules = await collect(ENTRY);
  assertUniqueNames(modules);
  const bundle = modules.map(transform).join('\n');
  const assetScript = await embedAssets();
  const inlineScript = `${assetScript}\n<script type="module">\n${bundle}</script>`;

  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
  const scriptTag = '<script type="module" src="src/main.js"></script>';
  if (!html.includes(scriptTag)) throw new Error('Script-Tag für src/main.js nicht gefunden');

  const standalone = html.replace(scriptTag, () => inlineScript);

  const head = between(html, '<head>', '</head>')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .trim();
  const body = between(html, '<body>', '</body>').replace(scriptTag, () => inlineScript).trim();
  const artifact = `${head}\n${body}\n`;

  await mkdir(path.join(ROOT, 'dist'), { recursive: true });
  await writeFile(path.join(ROOT, 'dist/index.html'), standalone);
  await writeFile(path.join(ROOT, 'dist/mondgleiter.artifact.html'), artifact);

  console.log(`Gebündelt: ${modules.length} Module → dist/index.html, dist/mondgleiter.artifact.html`);
}

build().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
