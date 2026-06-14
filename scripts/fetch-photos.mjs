#!/usr/bin/env node
/**
 * Descarga las fotos reales definidas en src/data/photos.manifest.json a
 * src/assets/photos/<key>.<ext>, para empaquetarlas en la app (offline).
 *
 *   node scripts/fetch-photos.mjs
 *
 * Requiere Node 18+ (usa fetch global). Las descargas fallidas se listan al
 * final: solo hay que corregir esa URL en el manifiesto y volver a ejecutar.
 * Tras descargar, conviene optimizar (p. ej. con `npx @squoosh/cli` o
 * imagemagick) para que la app no engorde demasiado.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'photos');
const manifest = JSON.parse(await readFile(join(root, 'src', 'data', 'photos.manifest.json'), 'utf8'));

await mkdir(outDir, { recursive: true });

const credits = [];
let ok = 0;
const failed = [];

for (const img of manifest.images) {
  const base = img.url.split('?')[0];
  const ext = (base.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  const dest = join(outDir, `${img.key}.${ext}`);
  try {
    const res = await fetch(img.url, {
      headers: { 'User-Agent': 'KidzExplora/1.0 (educational app; contact: jordi@paynopain.com)' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('respuesta demasiado pequeña (¿no es una imagen?)');
    await writeFile(dest, buf);
    credits.push(`- **${img.key}** — ${img.credit} (${img.license})`);
    ok++;
    console.log(`✓ ${img.key}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed.push(img.key);
    console.warn(`✗ ${img.key}: ${e.message}\n     ${img.url}`);
  }
}

await writeFile(
  join(root, 'CREDITS.md'),
  `# Créditos de las imágenes\n\nDescargadas con \`scripts/fetch-photos.mjs\`. Las imágenes con licencia CC BY-SA mantienen la atribución a su autor.\n\n${credits.join('\n')}\n`,
);

console.log(`\nListo: ${ok} descargadas, ${failed.length} fallidas.`);
if (failed.length) console.log(`Corrige estas claves en src/data/photos.manifest.json y reejecuta: ${failed.join(', ')}`);
