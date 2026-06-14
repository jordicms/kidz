#!/usr/bin/env node
/**
 * Descarga los modelos 3D (GLB) definidos en src/data/models.manifest.json a
 * src/assets/models/<key>.glb, para empaquetarlos en la app (offline). Cuando
 * existe el modelo de un dino, la app lo usa en vez del procedural.
 *
 *   node scripts/fetch-models.mjs        (o: npm run models)
 *
 * Rellena cada `url` del manifiesto con un enlace DIRECTO a un .glb (CC0). Las
 * entradas sin url se omiten. Optimiza después con gltf-transform si pesan mucho.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'models');
const manifest = JSON.parse(await readFile(join(root, 'src', 'data', 'models.manifest.json'), 'utf8'));

await mkdir(outDir, { recursive: true });

let ok = 0;
const pending = [];
const failed = [];

for (const m of manifest.models) {
  if (!m.url) {
    pending.push(m.key);
    continue;
  }
  try {
    const res = await fetch(m.url, { headers: { 'User-Agent': 'KidzExplora/1.0 (educational app)' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('respuesta demasiado pequeña (¿no es un .glb?)');
    await writeFile(join(outDir, `${m.key}.glb`), buf);
    ok++;
    console.log(`✓ ${m.key}.glb  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed.push(m.key);
    console.warn(`✗ ${m.key}: ${e.message}\n     ${m.url}`);
  }
}

console.log(`\nListo: ${ok} descargados, ${failed.length} fallidos, ${pending.length} sin URL.`);
if (pending.length) console.log(`Rellena la url en src/data/models.manifest.json para: ${pending.join(', ')}`);
