#!/usr/bin/env node
/**
 * Descarga las fotos reales de las fichas a src/assets/photos/<key>.<ext>,
 * para empaquetarlas en la app (offline).
 *
 *   npm run photos              # descarga lo que falte
 *   npm run photos -- --dry-run # solo dice qué elegiría, sin descargar nada
 *   npm run photos -- --force   # vuelve a descargar todo
 *   npm run photos -- --only=trex,nautilus
 *
 * Una entrada del manifiesto puede traer:
 *
 *   - `url`:    la imagen exacta. Es lo más fiable y manda sobre `search`.
 *   - `search`: términos de búsqueda. El script pregunta a la API de Wikimedia
 *               Commons, se queda con la mejor foto de licencia libre y anota
 *               en `photos.lock.json` cuál eligió, con su autor y licencia.
 *
 * Buscar en vez de fijar el nombre del archivo evita el problema de siempre:
 * los nombres de Commons se adivinan mal y daban un montón de 404. Y como la
 * atribución se saca de los metadatos reales del archivo, el crédito es el
 * correcto y no uno escrito a mano.
 *
 * El "lock" hace la descarga reproducible: una vez elegida una foto, los
 * siguientes `npm run photos` reutilizan esa misma. Para cambiar una, borra su
 * clave del lock (o pon un `url` fijo en el manifiesto) y vuelve a ejecutar.
 *
 * Requiere Node 18+ (usa fetch global). Tras descargar conviene optimizar
 * (p. ej. `npx @squoosh/cli` o imagemagick) para que la app no engorde.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'photos');
const manifestPath = join(root, 'src', 'data', 'photos.manifest.json');
const lockPath = join(root, 'src', 'data', 'photos.lock.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const lock = existsSync(lockPath) ? JSON.parse(await readFile(lockPath, 'utf8')) : {};

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map((s) => s.trim())) : null;

const UA = 'KidzExplora/1.0 (aplicación educativa infantil; contacto: jordi@paynopain.com)';
const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';

/** Licencias que podemos empaquetar en la app. */
const FREE = /(public domain|dominio p|^cc0|cc-zero|^cc[ -]by|attribution)/i;
/** Rechazadas explícitamente (uso legítimo, no comercial, con permiso…). */
const NOT_FREE = /(fair use|non-?free|nc\b|nd\b|permission)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (html) => (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/**
 * Busca en Commons y devuelve la primera imagen que sirve: mapa de bits (no
 * SVG, que suelen ser esquemas), suficientemente grande y con licencia libre.
 */
async function resolveBySearch(terms) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${terms} filetype:bitmap`,
    gsrnamespace: '6', // File:
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1000',
  });
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});
  if (!pages.length) throw new Error('la búsqueda no devolvió nada');

  // El generador de búsqueda no conserva el orden; `index` sí lo trae.
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const rejected = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    const licence = clean(meta.LicenseShortName?.value) || clean(meta.UsageTerms?.value);
    const author = clean(meta.Artist?.value) || clean(meta.Credit?.value) || 'autor desconocido';
    const name = page.title.replace(/^File:/, '');

    if (!/\.(jpe?g|png)$/i.test(name)) {
      rejected.push(`${name}: no es jpg/png`);
      continue;
    }
    if (info.width < 500) {
      rejected.push(`${name}: muy pequeña (${info.width}px)`);
      continue;
    }
    if (!licence || NOT_FREE.test(licence) || !FREE.test(licence)) {
      rejected.push(`${name}: licencia no libre (${licence || 'sin datos'})`);
      continue;
    }
    return {
      file: name,
      url: info.thumburl || info.url,
      credit: `📷 ${author}`,
      license: licence,
      page: info.descriptionurl,
      rejected,
    };
  }
  throw new Error(`ninguna imagen válida entre ${pages.length} resultados (${rejected.slice(0, 3).join('; ')})`);
}

await mkdir(outDir, { recursive: true });

const credits = [];
const chosen = [];
let ok = 0;
let skipped = 0;
const failed = [];

for (const img of manifest.images) {
  if (only && !only.has(img.key)) continue;

  const cached = lock[img.key];
  // Ya está en disco: no se vuelve a pedir (así los re-runs no provocan 429).
  const existingExt = ['jpg', 'jpeg', 'png', 'webp'].find((e) => existsSync(join(outDir, `${img.key}.${e}`)));
  if (!force && existingExt) {
    credits.push(`- **${img.key}** — ${cached?.credit ?? img.credit} (${cached?.license ?? img.license})`);
    skipped++;
    continue;
  }

  let source;
  try {
    if (img.url) {
      source = { url: img.url, credit: img.credit, license: img.license, file: img.url.split('/').pop() };
    } else if (!force && cached?.url) {
      source = cached; // ya resuelto en una ejecución anterior
    } else if (img.search) {
      await sleep(400); // amable con la API
      source = await resolveBySearch(img.search);
      console.log(`🔍 ${img.key}: "${img.search}" → ${source.file}  [${source.license}]`);
    } else {
      throw new Error('la entrada no tiene ni `url` ni `search`');
    }
  } catch (e) {
    failed.push(`${img.key} (${e.message})`);
    console.warn(`✗ ${img.key}: ${e.message}`);
    continue;
  }

  chosen.push({ key: img.key, ...source });

  if (dryRun) {
    console.log(`   (dry-run, no se descarga) ${source.url}`);
    continue;
  }

  const base = source.url.split('?')[0];
  const ext = (base.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  const dest = join(outDir, `${img.key}.${ext}`);
  try {
    await sleep(350);
    const res = await fetch(source.url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('respuesta demasiado pequeña (¿no es una imagen?)');
    await writeFile(dest, buf);
    lock[img.key] = {
      file: source.file,
      url: source.url,
      credit: source.credit,
      license: source.license,
      ...(source.page ? { page: source.page } : {}),
    };
    credits.push(`- **${img.key}** — ${source.credit} (${source.license})`);
    ok++;
    console.log(`✓ ${img.key}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed.push(`${img.key} (${e.message})`);
    console.warn(`✗ ${img.key}: ${e.message}\n     ${source.url}`);
  }
}

if (!dryRun) {
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(
    join(root, 'CREDITS.md'),
    `# Créditos de las imágenes\n\nDescargadas con \`scripts/fetch-photos.mjs\` desde Wikimedia Commons.\nLas imágenes con licencia CC BY / CC BY-SA mantienen la atribución a su autor.\n\n${credits
      .sort()
      .join('\n')}\n`,
  );
}

console.log(`\nListo: ${ok} descargadas, ${skipped} ya estaban, ${failed.length} fallidas.`);
if (failed.length) {
  console.log(`\nFallaron:\n  ${failed.join('\n  ')}`);
  console.log('\nPara arreglar una: pon un `url` fijo en src/data/photos.manifest.json (o afina su `search`) y reejecuta.');
}
if (!dryRun && chosen.length) {
  console.log('\nRevisa las elegidas en src/data/photos.lock.json; para cambiar alguna, borra su clave y reejecuta.');
}
