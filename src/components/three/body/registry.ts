import type * as THREE from 'three';
import { bodyGeometry, hairGeometry } from './bodyShape';

/**
 * Registro de todas las piezas anatómicas generadas por SDF. La clave es
 * serializable para que el Web Worker pueda construir la malla fuera del hilo
 * principal (sin tirones en la interfaz) y devolverla como arrays tipados.
 */
export type Tier = 'high' | 'medium' | 'low';

const builders: Record<string, (tier: Tier) => THREE.BufferGeometry> = {
  'body:skin': (t) => bodyGeometry('skin', t),
  'body:fat': (t) => bodyGeometry('fat', t),
  'body:muscle': (t) => bodyGeometry('muscle', t),
  'body:shell': (t) => bodyGeometry('shell', t),
  'body:hair': () => hairGeometry(),
};

export function registerBuilder(key: string, fn: (tier: Tier) => THREE.BufferGeometry) {
  builders[key] = fn;
}

export function buildPiece(key: string, tier: Tier): THREE.BufferGeometry {
  const b = builders[key];
  if (!b) throw new Error(`Pieza anatómica desconocida: ${key}`);
  return b(tier);
}
