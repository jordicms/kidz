#!/usr/bin/env node
/**
 * Descarga los mapas de superficie de los astros (src/data/textures.manifest.json)
 * a src/assets/textures/<key>.<ext>, para empaquetarlos en la app (offline).
 * Cuando existe la textura de un astro, la app la usa en vez de la procedural.
 *
 *   node scripts/fetch-textures.mjs      (o: npm run textures)
 *
 * Genera CREDITS-textures.md con las atribuciones (Solar System Scope es CC BY 4.0).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'textures');
const manifest = JSON.parse(await readFile(join(root, 'src', 'data', 'textures.manifest.json'), 'utf8'));

await mkdir(outDir, { recursive: true });

const credits = [];
let ok = 0;
const failed = [];

for (const t of manifest.textures) {
  const base = t.url.split('?')[0];
  const ext = (base.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  try {
    const res = await fetch(t.url, { headers: { 'User-Agent': 'KidzExplora/1.0 (educational app)' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('respuesta demasiado pequeña (¿no es una imagen?)');
    await writeFile(join(outDir, `${t.key}.${ext}`), buf);
    credits.push(`- **${t.key}** — ${t.credit} (${t.license})`);
    ok++;
    console.log(`✓ ${t.key}.${ext}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed.push(t.key);
    console.warn(`✗ ${t.key}: ${e.message}\n     ${t.url}`);
  }
}

await writeFile(
  join(root, 'CREDITS-textures.md'),
  `# Créditos de las texturas de los astros\n\nDescargadas con \`scripts/fetch-textures.mjs\`. Las de Solar System Scope son CC BY 4.0: mantener la atribución.\n\n${credits.join('\n')}\n`,
);

console.log(`\nListo: ${ok} descargadas, ${failed.length} fallidas.`);
if (failed.length) console.log(`Corrige estas claves en src/data/textures.manifest.json: ${failed.join(', ')}`);
