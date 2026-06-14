/**
 * Texturas de superficie (mapas equirectangulares) para los astros, empaquetadas
 * en la app (offline). Viven en `src/assets/textures/<id>.<ext>` y se descargan
 * con `scripts/fetch-textures.mjs`. Si no existe la textura de un astro, se usa
 * la textura procedural de siempre.
 */
const files = import.meta.glob('../assets/textures/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urlByKey: Record<string, string> = {};
for (const path in files) {
  const key = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  urlByKey[key] = files[path];
}

/** URL del mapa de superficie de un astro (por id), o undefined. */
export function getSurfaceTextureUrl(key: string): string | undefined {
  return urlByKey[key];
}
