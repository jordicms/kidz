#!/usr/bin/env node
/**
 * Descarga sets de texturas PBR (difuso + normales + rugosidad) de Poly Haven
 * (CC0) según src/data/pbr.manifest.json, a src/assets/pbr/<key>-<mapa>.jpg.
 *
 *   node scripts/fetch-pbr.mjs        (o: npm run pbr)
 *
 * La app las aplica automáticamente si existen (src/utils/pbr.ts); sin ellas
 * usa los materiales de color plano de siempre.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'pbr');
const manifest = JSON.parse(await readFile(join(root, 'src', 'data', 'pbr.manifest.json'), 'utf8'));
const force = process.argv.includes('--force');

await mkdir(outDir, { recursive: true });

// mapa lógico → sufijo del archivo en Poly Haven
const MAPS = [
  ['diff', 'diff'],
  ['nor', 'nor_gl'],
  ['rough', 'rough'],
];

let ok = 0;
let skipped = 0;
const failed = [];
const credits = [];

for (const set of manifest.sets) {
  for (const [short, suffix] of MAPS) {
    const url = `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${set.slug}/${set.slug}_${suffix}_1k.jpg`;
    const dest = join(outDir, `${set.key}-${short}.jpg`);
    // Salta lo ya descargado (usa --force para re-descargar todo).
    if (!force && existsSync(dest)) {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'KidzExplora/1.0 (educational app)' }, redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) throw new Error('respuesta demasiado pequeña');
      await writeFile(dest, buf);
      ok++;
      console.log(`✓ ${set.key}-${short}.jpg  (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed.push(`${set.key}-${short} (${set.slug})`);
      console.warn(`✗ ${set.key}-${short}: ${e.message}\n     ${url}`);
    }
  }
  credits.push(`- **${set.key}** — \`${set.slug}\` · ${set.credit} (${set.uso})`);
}

await writeFile(
  join(root, 'CREDITS-pbr.md'),
  `# Créditos de texturas PBR\n\nDescargadas con \`scripts/fetch-pbr.mjs\` desde Poly Haven (licencia CC0, sin atribución requerida — se agradece igualmente).\n\n${credits.join('\n')}\n`,
);

console.log(`\nListo: ${ok} descargadas, ${skipped} ya existían, ${failed.length} fallidas.`);
if (failed.length) console.log(`Corrige los slugs en src/data/pbr.manifest.json: ${failed.join(', ')}`);
