/**
 * Modelos anatómicos reales (GLB) empaquetados, descargados con `npm run anatomy`
 * a `src/assets/anatomy/<key>.glb`. Si no existe el de una pieza, la app usa su
 * anatomía procedural. key = id del órgano (corazon, pulmones, cerebro,
 * estomago, intestinos, huesos, musculos) o `cuerpo` (figura completa).
 */
const files = import.meta.glob('../assets/anatomy/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urlByKey: Record<string, string> = {};
for (const path in files) {
  const key = path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  urlByKey[key] = files[path];
}

export function getAnatomyModelUrl(key: string): string | undefined {
  return urlByKey[key];
}
