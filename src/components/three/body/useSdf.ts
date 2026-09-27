import * as THREE from 'three';
import { buildPiece, type Tier } from './registry';
import './pieces';

/**
 * Carga de geometrías SDF con Suspense. Se generan en un Web Worker (si el
 * navegador lo permite) y se cachean para toda la sesión: la segunda vez que
 * abres una capa u órgano aparece al instante.
 */
type Entry = { promise: Promise<void>; geo?: THREE.BufferGeometry; error?: unknown };
const entries = new Map<string, Entry>();

/** Pool de workers (2–3 según núcleos): varias mallas se esculpen en paralelo. */
let pool: Worker[] | null | undefined;
let rr = 0;
let nextId = 1;
const pending = new Map<number, (d: WorkerReply) => void>();
type WorkerReply = {
  id: number;
  position?: Float32Array;
  normal?: Float32Array;
  color?: Float32Array | null;
  index?: Uint16Array | Uint32Array;
  error?: string;
};

function getWorker(): Worker | null {
  if (pool === undefined) {
    try {
      const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      const n = Math.max(1, Math.min(3, cores - 2));
      pool = Array.from({ length: n }, () => {
        const w = new Worker(new URL('../../../workers/sdfWorker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<WorkerReply>) => {
          const cb = pending.get(e.data.id);
          if (cb) {
            pending.delete(e.data.id);
            cb(e.data);
          }
        };
        w.onerror = (ev) => {
          // Si un worker falla, todo lo pendiente se construye en el hilo principal.
          console.warn('[kidz] sdf worker error', ev.message);
          pool = null;
          for (const [id, cb] of pending) {
            pending.delete(id);
            cb({ id, error: 'worker' });
          }
        };
        return w;
      });
    } catch {
      pool = null;
    }
  }
  if (!pool) return null;
  rr = (rr + 1) % pool.length;
  return pool[rr];
}

function fromReply(d: WorkerReply): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.position!, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(d.normal!, 3));
  if (d.color) g.setAttribute('color', new THREE.BufferAttribute(d.color, 3));
  g.setIndex(new THREE.BufferAttribute(d.index!, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function load(key: string, tier: Tier): Entry {
  const k = `${key}@${tier}`;
  let e = entries.get(k);
  if (e) return e;
  const entry: Entry = { promise: Promise.resolve() };
  const w = getWorker();
  entry.promise = new Promise<void>((resolve) => {
    const local = () => {
      try {
        entry.geo = buildPiece(key, tier);
      } catch (err) {
        entry.error = err;
      }
      resolve();
    };
    if (!w) {
      setTimeout(local, 0);
      return;
    }
    const id = nextId++;
    pending.set(id, (d) => {
      if (d.error || !d.position) local();
      else {
        entry.geo = fromReply(d);
        resolve();
      }
    });
    w.postMessage({ id, key, tier });
  });
  entries.set(k, entry);
  e = entry;
  return e;
}

/** Devuelve la geometría (suspende mientras se genera). */
export function useSdfGeometry(key: string, tier: Tier): THREE.BufferGeometry {
  const e = load(key, tier);
  if (e.error) throw e.error;
  if (!e.geo) throw e.promise;
  return e.geo;
}

/** Precarga piezas en segundo plano (p. ej. las capas siguientes). */
export function preloadSdf(keys: string[], tier: Tier) {
  for (const k of keys) load(k, tier);
}

/** Promesa que se resuelve cuando todas las piezas están listas. */
export function ensureSdf(keys: string[], tier: Tier): Promise<void> {
  return Promise.all(keys.map((k) => load(k, tier).promise)).then(() => undefined);
}

/** true si todas las piezas ya están generadas. */
export function sdfReady(keys: string[], tier: Tier): boolean {
  return keys.every((k) => !!entries.get(`${k}@${tier}`)?.geo);
}
