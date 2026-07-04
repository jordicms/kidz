import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Texturas PBR empaquetadas (offline), descargadas con `npm run pbr` a
 * `src/assets/pbr/<key>-{diff,nor,rough}.jpg`. Si un set no existe, el hook
 * devuelve null y el material mantiene su color plano de siempre.
 */
const files = import.meta.glob('../assets/pbr/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const urlByKey: Record<string, string> = {};
for (const path in files) {
  const key = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  urlByKey[key] = files[path];
}

export interface PBRMaps {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

const cache = new Map<string, PBRMaps>();

function loadTex(url: string, repeat: number, srgb: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.anisotropy = 4;
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

/** Devuelve los mapas PBR de un set (`grass`, `rock`, `bark`...) o null. */
export function usePBR(key: string, repeat = 1): PBRMaps | null {
  const [maps, setMaps] = useState<PBRMaps | null>(() => cache.get(`${key}:${repeat}`) ?? null);

  useEffect(() => {
    const cacheKey = `${key}:${repeat}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setMaps(cached);
      return;
    }
    const diffUrl = urlByKey[`${key}-diff`];
    if (!diffUrl) {
      setMaps(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const map = await loadTex(diffUrl, repeat, true);
        const out: PBRMaps = { map };
        const norUrl = urlByKey[`${key}-nor`];
        const roughUrl = urlByKey[`${key}-rough`];
        if (norUrl) out.normalMap = await loadTex(norUrl, repeat, false);
        if (roughUrl) out.roughnessMap = await loadTex(roughUrl, repeat, false);
        cache.set(cacheKey, out);
        if (alive) setMaps(out);
      } catch {
        if (alive) setMaps(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, repeat]);

  return maps;
}
