import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../utils/sdf';

/**
 * Utilidades de geometría para anatomía: tubos de radio variable (vasos,
 * intestinos con haustras, tráquea con anillos), coloreado uniforme y fusión
 * de piezas en una sola malla (una llamada de dibujo por órgano).
 */

/** Pinta toda la geometría de un color (atributo `color`, lineal). */
export function paint(g: THREE.BufferGeometry, color: string | THREE.Color): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Deja solo position/normal/color (+uv opcional) e índice, para poder fusionar. */
export function clean(g: THREE.BufferGeometry, keepUv = false): THREE.BufferGeometry {
  const out = g.index ? g : g.toNonIndexed();
  for (const name of Object.keys(out.attributes)) {
    if (name === 'position' || name === 'normal' || name === 'color' || (keepUv && name === 'uv')) continue;
    out.deleteAttribute(name);
  }
  if (!out.index) {
    const idx = Array.from({ length: out.attributes.position.count }, (_, i) => i);
    out.setIndex(idx);
  }
  if (out.index && !(out.index.array instanceof Uint32Array)) {
    out.setIndex(new THREE.BufferAttribute(new Uint32Array(out.index.array), 1));
  }
  return out;
}

/** Fusiona varias piezas (todas con color). */
export function merge(parts: THREE.BufferGeometry[], keepUv = false): THREE.BufferGeometry {
  const g = mergeGeometries(parts.map((p) => clean(p, keepUv)), false);
  if (!g) throw new Error('merge failed');
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function curveOf(points: Vec3[], closed = false, tension = 0.5): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
    'catmullrom',
    tension,
  );
}

/**
 * Tubo con radio función de u∈[0,1] (y opcionalmente del ángulo). Genera uv:
 * u a lo largo (en unidades de longitud reales en `uv.x` × lengthScale) y v alrededor.
 */
export function variableTube(
  curve: THREE.Curve<THREE.Vector3>,
  radius: (u: number, angle: number) => number,
  segments = 120,
  radial = 12,
  opts: { caps?: boolean; inward?: boolean } = {},
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const M = new THREE.Vector3();
  const length = curve.getLength();
  const du = 0.5 / segments;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, P);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const t = frames.tangents[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const s = Math.sin(a);
      const c = -Math.cos(a);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize();
      const r = radius(u, a);
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      // Normal inclinada según cómo cambia el radio (anillos y haustras se iluminan bien).
      const dr = (radius(Math.min(1, u + du), a) - radius(Math.max(0, u - du), a)) / (2 * du * length);
      M.copy(N).addScaledVector(t, -dr).normalize();
      if (opts.inward) nor.push(-M.x, -M.y, -M.z);
      else nor.push(M.x, M.y, M.z);
      uv.push(u * length, j / radial);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      const c = (i + 1) * (radial + 1) + j + 1;
      const d = i * (radial + 1) + j + 1;
      if (opts.inward) idx.push(a, d, b, b, d, c);
      else idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (opts.caps) {
    const caps: THREE.BufferGeometry[] = [g];
    for (const u of [0, 1]) {
      const r = radius(u, 0);
      const s = new THREE.SphereGeometry(r, radial, Math.max(4, radial / 2));
      const p = curve.getPointAt(u);
      s.translate(p.x, p.y, p.z);
      caps.push(s);
    }
    const out = mergeGeometries(caps.map((c) => clean(c, true)), false)!;
    return out;
  }
  return g;
}

/** Tubo simple de radio constante con extremos redondeados (vasos, nervios). */
export function tube(points: Vec3[], r: number, radial = 8, segPer = 8, taper = 1): THREE.BufferGeometry {
  const curve = curveOf(points);
  return variableTube(curve, (u) => r * (1 - (1 - taper) * u), Math.max(16, points.length * segPer), radial, {
    caps: true,
  });
}

/** Aplica una matriz y devuelve la misma geometría (encadenable). */
export function xf(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  g.applyMatrix4(m);
  return g;
}

/** Matriz: traslada a `c`, rota (Euler XYZ) y escala uniforme. */
export function frame(c: Vec3, rot: Vec3, s: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...c),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(s, s, s),
  );
}

/** Convierte una matriz en una función mundo→local para evaluar SDF locales. */
export function toLocal(m: THREE.Matrix4) {
  const inv = m.clone().invert().elements;
  const s = new THREE.Vector3().setFromMatrixScale(m).x;
  return {
    s,
    map(x: number, y: number, z: number): Vec3 {
      return [
        inv[0] * x + inv[4] * y + inv[8] * z + inv[12],
        inv[1] * x + inv[5] * y + inv[9] * z + inv[13],
        inv[2] * x + inv[6] * y + inv[10] * z + inv[14],
      ];
    },
  };
}
