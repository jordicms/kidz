#!/usr/bin/env node
/**
 * Descarga modelos anatómicos reales (GLB) definidos en
 * src/data/anatomy.manifest.json a src/assets/anatomy/<key>.glb.
 *
 *   node scripts/fetch-anatomy.mjs        (o: npm run anatomy)
 *
 * Rellena cada `url` con un enlace DIRECTO a un .glb (ver `_fuentes` en el
 * manifiesto). La app usa el modelo real si existe y, si no, la anatomía
 * procedural. Salta lo ya descargado (usa --force para re-descargar todo).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'anatomy');
const manifest = JSON.parse(await readFile(join(root, 'src', 'data', 'anatomy.manifest.json'), 'utf8'));
const force = process.argv.includes('--force');

await mkdir(outDir, { recursive: true });

let ok = 0;
let skipped = 0;
const pending = [];
const failed = [];
const credits = [];

for (const m of manifest.models) {
  if (!m.url) {
    pending.push(m.key);
    continue;
  }
  const dest = join(outDir, `${m.key}.glb`);
  if (!force && existsSync(dest)) {
    skipped++;
    if (m.credit) credits.push(`- **${m.key}** — ${m.credit} (${m.license})`);
    continue;
  }
  try {
    const res = await fetch(m.url, { headers: { 'User-Agent': 'KidzExplora/1.0 (educational app)' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('respuesta demasiado pequeña (¿no es un .glb?)');
    await writeFile(dest, buf);
    ok++;
    if (m.credit) credits.push(`- **${m.key}** — ${m.credit} (${m.license})`);
    console.log(`✓ ${m.key}.glb  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed.push(m.key);
    console.warn(`✗ ${m.key}: ${e.message}\n     ${m.url}`);
  }
}

if (credits.length) {
  await writeFile(
    join(root, 'CREDITS-anatomy.md'),
    `# Créditos de los modelos anatómicos\n\nDescargados con \`scripts/fetch-anatomy.mjs\`. Las piezas con licencia CC BY-SA mantienen la atribución a su autor/fuente.\n\n${credits.join('\n')}\n`,
  );
}

console.log(`\nListo: ${ok} descargados, ${skipped} ya existían, ${failed.length} fallidos, ${pending.length} sin URL.`);
if (pending.length) console.log(`Rellena la url en src/data/anatomy.manifest.json para: ${pending.join(', ')}`);
