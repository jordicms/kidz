import * as THREE from 'three';
import { cachedGeometry, type Vec3 } from '../../../utils/sdf';
import { mx } from './bodyShape';
import { curveOf, merge, variableTube } from './geo';
import { SPINE } from './skeleton';

/**
 * Redes del cuerpo como mapas: arterias (del corazón hacia fuera), venas (de
 * vuelta al corazón), nervios (del cerebro hacia fuera) y el recorrido
 * digestivo. Cada tubo lleva uv.x = distancia recorrida desde su origen, así
 * el material de flujo hace avanzar los pulsos en el sentido correcto.
 */

type Path = { pts: Vec3[]; r: number; taper?: number };

/** Ramitas laterales deterministas para que la red parezca un mapa real. */
function sprout(paths: Path[], seed: number, count: number, len: number): Path[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out: Path[] = [];
  for (const p of paths) {
    if (p.r < 0.005) continue;
    const curve = curveOf(p.pts);
    for (let i = 0; i < count; i++) {
      const t = 0.25 + rnd() * 0.7;
      const a = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(tan).normalize();
      const b = a.clone().addScaledVector(side, len * 0.35).addScaledVector(tan, len * 0.45);
      const c = b.clone().addScaledVector(side, len * 0.25).addScaledVector(tan, len * 0.7);
      const d = c.clone().addScaledVector(side, len * 0.1).addScaledVector(tan, len * 0.5);
      out.push({ pts: [a.toArray() as Vec3, b.toArray() as Vec3, c.toArray() as Vec3, d.toArray() as Vec3], r: p.r * 0.5, taper: 0.3 });
    }
  }
  return out;
}

function build(paths: Path[]): THREE.BufferGeometry {
  const parts = paths.map((p) => {
    const curve = curveOf(p.pts);
    const taper = p.taper ?? 0.55;
    const segs = Math.max(12, Math.round(curve.getLength() * 90));
    return variableTube(curve, (u) => p.r * (1 - (1 - taper) * u), segs, 7, { caps: true });
  });
  return merge(parts, true);
}

const both = (list: Path[]): Path[] => [...list, ...list.map((p) => ({ ...p, pts: p.pts.map(mx) }))];

/* ------------------------------------------------------------------ */
/* Arterias                                                            */
/* ------------------------------------------------------------------ */

export const AORTA: Vec3[] = [
  [0.035, 0.62, 0.07],
  [0.02, 0.74, 0.04],
  [0.03, 0.8, -0.03],
  [0.03, 0.72, -0.085],
  [0.02, 0.45, -0.08],
  [0.01, 0.15, -0.055],
  [0.0, -0.1, -0.035],
];

function arteryPaths(): Path[] {
  const main: Path[] = [{ pts: AORTA, r: 0.022, taper: 0.7 }];
  const side = both([
    { pts: [[0.02, 0.79, -0.01], [0.045, 1.0, 0.015], [0.058, 1.22, 0.045], [0.07, 1.36, 0.08], [0.1, 1.52, 0.06]], r: 0.011 }, // carótida
    { pts: [[0.058, 1.22, 0.045], [0.12, 1.38, 0.0], [0.13, 1.56, -0.04]], r: 0.005 }, // temporal
    { pts: [[0.03, 0.79, -0.02], [0.2, 0.93, 0.01], [0.37, 0.91, 0.015], [0.46, 0.66, 0.025], [0.51, 0.45, 0.005], [0.575, 0.2, 0.05], [0.615, 0.0, 0.055], [0.64, -0.1, 0.07], [0.655, -0.2, 0.065]], r: 0.01 }, // brazo
    { pts: [[0.51, 0.45, 0.005], [0.545, 0.2, -0.0], [0.6, 0.0, 0.02]], r: 0.005 }, // cubital
    { pts: [[0.0, -0.1, -0.035], [0.09, -0.2, 0.035], [0.14, -0.45, 0.075], [0.155, -0.75, 0.04], [0.15, -0.96, -0.035], [0.16, -1.25, -0.02], [0.16, -1.55, 0.01], [0.17, -1.68, 0.1]], r: 0.012 }, // pierna
    { pts: [[0.012, 0.16, -0.06], [0.09, 0.155, -0.09]], r: 0.005 }, // renal
  ]);
  const center: Path[] = [
    { pts: [[0.0, 0.12, -0.05], [0.0, 0.02, 0.03], [-0.02, -0.12, 0.08]], r: 0.006 }, // mesentérica
    { pts: [[0.01, 0.3, -0.07], [0.06, 0.28, 0.02], [0.12, 0.22, 0.08]], r: 0.005 }, // tronco celíaco → estómago
  ];
  const all = [...main, ...side, ...center];
  return [...all, ...sprout(all, 11, 3, 0.07)];
}

/* ------------------------------------------------------------------ */
/* Venas                                                               */
/* ------------------------------------------------------------------ */

function veinPaths(): Path[] {
  // Definidas desde la periferia HACIA el corazón (sentido del flujo).
  const side = both([
    { pts: [[0.13, 1.5, 0.06], [0.1, 1.3, 0.05], [0.09, 1.1, 0.03], [0.06, 0.93, 0.04], [-0.02, 0.84, 0.035]], r: 0.01, taper: 1.3 }, // yugular
    { pts: [[0.675, -0.2, 0.03], [0.645, -0.05, 0.01], [0.6, 0.2, 0.04], [0.545, 0.46, 0.02], [0.49, 0.66, 0.03], [0.4, 0.9, 0.03], [0.2, 0.9, 0.05], [-0.02, 0.84, 0.035]], r: 0.0085, taper: 1.5 }, // brazo
    { pts: [[0.19, -1.69, 0.08], [0.19, -1.55, 0.03], [0.19, -1.2, 0.01], [0.185, -0.96, 0.0], [0.185, -0.7, 0.05], [0.16, -0.42, 0.07], [0.1, -0.2, 0.04], [-0.018, -0.08, -0.01]], r: 0.0095, taper: 1.5 }, // pierna (femoral)
    { pts: [[0.09, 0.145, -0.085], [-0.015, 0.145, -0.04]], r: 0.0055 }, // renal
  ]);
  const cava: Path[] = [
    { pts: [[-0.018, -0.08, -0.01], [-0.025, 0.2, -0.035], [-0.03, 0.42, -0.02], [-0.02, 0.54, 0.03]], r: 0.016, taper: 1.1 }, // cava inferior
    { pts: [[-0.02, 0.84, 0.035], [-0.03, 0.72, 0.04], [-0.02, 0.6, 0.05]], r: 0.016, taper: 1 }, // cava superior
  ];
  const all = [...side, ...cava];
  return [...all, ...sprout(side, 29, 3, 0.06).map((p) => ({ ...p, pts: [...p.pts].reverse() }))];
}

/* ------------------------------------------------------------------ */
/* Nervios                                                             */
/* ------------------------------------------------------------------ */

function nervePaths(): Path[] {
  const cord = new THREE.CatmullRomCurve3(SPINE.map((p) => new THREE.Vector3(p[0], p[1], p[2] - 0.012)));
  const cordPts: Vec3[] = [[0, 1.36, -0.05], ...cord.getSpacedPoints(14).map((v) => v.toArray() as Vec3).filter((p) => p[1] < 1.3 && p[1] > -0.02)];
  const at = (y: number): Vec3 => {
    let best = cordPts[0];
    for (const p of cordPts) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p;
    return best;
  };
  const main: Path[] = [{ pts: cordPts, r: 0.009, taper: 0.6 }];
  const side = both([
    { pts: [at(1.05), [0.14, 1.0, -0.02], [0.37, 0.9, -0.01], [0.47, 0.64, -0.03], [0.52, 0.44, -0.04], [0.58, 0.2, 0.0], [0.62, -0.02, 0.03], [0.65, -0.15, 0.05], [0.66, -0.22, 0.05]], r: 0.0055 }, // brazo
    { pts: [[0.47, 0.64, -0.03], [0.53, 0.35, 0.03], [0.6, 0.05, 0.06], [0.64, -0.12, 0.08]], r: 0.004 },
    { pts: [at(0.0), [0.06, -0.12, -0.08], [0.13, -0.3, -0.07], [0.15, -0.65, -0.05], [0.15, -0.96, -0.045], [0.16, -1.3, -0.04], [0.16, -1.6, -0.02], [0.17, -1.69, 0.12]], r: 0.0065 }, // ciático
    { pts: [[0.15, -0.96, -0.045], [0.18, -1.2, 0.03], [0.17, -1.62, 0.06], [0.18, -1.7, 0.16]], r: 0.004 },
    { pts: [[0, 1.4, -0.03], [0.07, 1.4, 0.1], [0.1, 1.38, 0.16]], r: 0.004 }, // facial
    { pts: [[0, 1.45, 0.0], [0.05, 1.5, 0.12], [0.07, 1.49, 0.17]], r: 0.004 }, // óptico
  ]);
  // Nervios intercostales: salen de la médula y siguen las costillas.
  const ribs: Path[] = [];
  for (let i = 0; i < 8; i++) {
    const y = 0.9 - i * 0.07;
    const o = at(y);
    const pts: Vec3[] = [o, [0.1, y - 0.01, o[2] + 0.02], [0.22, y - 0.04, 0.0], [0.24, y - 0.07, 0.08]];
    ribs.push({ pts, r: 0.0028, taper: 0.5 }, { pts: pts.map(mx), r: 0.0028, taper: 0.5 });
  }
  const all = [...main, ...side, ...ribs];
  return [...all, ...sprout(side, 5, 3, 0.05)];
}

/* ------------------------------------------------------------------ */
/* Tubo digestivo (recorrido de la comida)                             */
/* ------------------------------------------------------------------ */

export const DIGESTIVE_ROUTE: Vec3[] = [
  [0, 1.36, 0.14],
  [0, 1.3, 0.05],
  [0, 1.18, -0.02],
  [0.0, 0.9, -0.07],
  [0.02, 0.6, -0.1],
  [0.06, 0.42, -0.06],
  [0.12, 0.32, 0.02],
  [0.16, 0.24, 0.05],
  [0.13, 0.14, 0.08],
  [0.04, 0.1, 0.09],
  [-0.06, 0.1, 0.07],
  [-0.09, 0.03, 0.05],
  [-0.02, -0.02, 0.06],
  [0.08, -0.06, 0.1],
  [-0.08, -0.12, 0.1],
  [0.08, -0.18, 0.1],
  [-0.12, -0.24, 0.08],
  [-0.165, 0.02, 0.06],
  [-0.02, 0.06, 0.11],
  [0.17, 0.09, 0.06],
  [0.17, -0.22, 0.05],
  [0.02, -0.33, 0.02],
  [0.0, -0.38, -0.02],
];

/** Ruta del aire: nariz → tráquea → bronquio izquierdo → alvéolos. */
export const AIR_ROUTE: Vec3[] = [
  [0, 1.43, 0.22],
  [0, 1.4, 0.12],
  [0, 1.3, 0.07],
  [0, 1.21, 0.075],
  [0, 1.05, 0.045],
  [0, 0.88, 0.005],
  [0.08, 0.76, -0.01],
  [0.14, 0.66, 0.0],
  [0.17, 0.56, 0.02],
];

/** Circuito de la sangre: corazón → pulmones → corazón → cuerpo (mano) → corazón. */
export const BLOOD_ROUTE: Vec3[] = [
  [0.02, 0.56, 0.1],
  [0.0, 0.66, 0.1],
  [0.12, 0.7, 0.03],
  [0.18, 0.68, 0.0],
  [0.12, 0.62, -0.03],
  [0.06, 0.58, 0.02],
  [0.035, 0.62, 0.07],
  [0.02, 0.74, 0.04],
  [0.03, 0.8, -0.03],
  [0.2, 0.93, 0.01],
  [0.37, 0.91, 0.015],
  [0.51, 0.45, 0.005],
  [0.615, 0.0, 0.055],
  [0.645, -0.14, 0.06],
  [0.63, -0.05, 0.02],
  [0.525, 0.46, 0.045],
  [0.38, 0.9, 0.05],
  [0.2, 0.9, 0.05],
  [-0.02, 0.84, 0.035],
  [-0.02, 0.6, 0.05],
  [0.02, 0.56, 0.1],
];

export function arteriesGeometry() {
  return cachedGeometry('net:arteries', () => build(arteryPaths()));
}
export function veinsGeometry() {
  return cachedGeometry('net:veins', () => build(veinPaths()));
}
export function nervesGeometry() {
  return cachedGeometry('net:nerves', () => build(nervePaths()));
}
