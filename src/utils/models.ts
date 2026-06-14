/**
 * Modelos 3D (GLB) empaquetados en la app (offline). Los archivos viven en
 * `src/assets/models/<key>.glb` y se descargan con `scripts/fetch-models.mjs`.
 * Se resuelven en build con import.meta.glob, así que la app funciona aunque
 * todavía no haya ningún modelo (se usa el procedural como respaldo).
 */
const files = import.meta.glob('../assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urlByKey: Record<string, string> = {};
for (const path in files) {
  const key = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  urlByKey[key] = files[path];
}

/** URL del modelo GLB para una clave (id del dino/órgano), o undefined. */
export function getModelUrl(key: string): string | undefined {
  return urlByKey[key];
}
