import manifest from '../data/photos.manifest.json';

/**
 * Fotos reales empaquetadas en la app (offline). Los archivos viven en
 * `src/assets/photos/<key>.<ext>` y se descargan con `scripts/fetch-photos.mjs`.
 * Aquí se resuelven en tiempo de build con import.meta.glob, de modo que la app
 * funciona aunque todavía no haya ninguna imagen (simplemente no se muestra).
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
for (const img of (manifest as { images: { key: string; credit: string }[] }).images) {
  creditByKey[img.key] = img.credit;
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
