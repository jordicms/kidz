import manifest from '../data/photos.manifest.json';
import lock from '../data/photos.lock.json';

/**
 * Fotos reales empaquetadas en la app (offline). Los archivos viven en
 * `src/assets/photos/<key>.<ext>` y se descargan con `scripts/fetch-photos.mjs`.
 * Aquí se resuelven en tiempo de build con import.meta.glob, de modo que la app
 * funciona aunque todavía no haya ninguna imagen (simplemente no se muestra).
 *
 * El crédito sale de `photos.lock.json` cuando la foto se resolvió buscándola:
 * ahí queda el autor y la licencia REALES del archivo elegido, en vez de un
 * texto escrito a mano que podría no corresponder.
 */

const files = import.meta.glob('../assets/photos/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urlByKey: Record<string, string> = {};
for (const path in files) {
  const key = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  urlByKey[key] = files[path];
}

const creditByKey: Record<string, string> = {};
for (const img of (manifest as { images: { key: string; credit?: string }[] }).images) {
  if (img.credit) creditByKey[img.key] = img.credit;
}
// El lock manda: lleva la atribución del archivo que se descargó de verdad.
for (const [key, entry] of Object.entries(lock as Record<string, { credit?: string; license?: string }>)) {
  const credit = [entry.credit, entry.license].filter(Boolean).join(' · ');
  if (credit) creditByKey[key] = credit;
}

export interface Photo {
  url: string;
  credit: string;
}

/** Devuelve la foto empaquetada para una clave, o null si no está disponible. */
export function getPhoto(key: string): Photo | null {
  const url = urlByKey[key];
  return url ? { url, credit: creditByKey[key] ?? '' } : null;
}
