import * as THREE from 'three';
import {
  ellipsoid,
  fbm3,
  hex,
  meshSDF,
  mix3,
  noise3,
  projectToSurface,
  roundCone,
  smax,
  smin,
  smoothstep,
  sphere,
  sweep,
  type SDF,
  type Vec3,
} from '../../../utils/sdf';
import { curveOf, frame, merge, paint, toLocal, tube, variableTube, xf } from './geo';
import type { Tier } from './registry';

/**
 * Órganos esculpidos con SDF directamente en coordenadas del cuerpo, para que
 * encajen entre sí (los pulmones abrazan al corazón, el hígado bajo el
 * diafragma...). La vista de detalle los centra y escala automáticamente.
 */

const detail = (t: Tier) => (t === 'high' ? 1 : t === 'medium' ? 1.3 : 1.7);

/* ------------------------------------------------------------------ */
/* Corazón                                                             */
/* ------------------------------------------------------------------ */

// Marco local del corazón: ápex hacia abajo-izquierda-delante.
const HEART_M = frame([0.045, 0.56, 0.055], [0.25, -0.35, 0.62], 0.25);
const heartLocal = toLocal(HEART_M);

function heartLocalSDF(x: number, y: number, z: number): number {
  const lv = ellipsoid(x, y, z, [0.12, -0.05, -0.02], [0.33, 0.46, 0.34]);
  const rv = ellipsoid(x, y, z, [-0.15, 0.02, 0.1], [0.3, 0.4, 0.28]);
  const apex = roundCone(x, y, z, [0.04, -0.12, 0.02], [0.12, -0.55, 0.03], 0.3, 0.07);
  const la = ellipsoid(x, y, z, [0.14, 0.4, -0.16], [0.2, 0.16, 0.18]);
  const ra = ellipsoid(x, y, z, [-0.3, 0.3, -0.02], [0.18, 0.22, 0.2]);
  const auricle = ellipsoid(x, y, z, [-0.16, 0.42, 0.2], [0.1, 0.07, 0.08]);
  let d = smin(lv, rv, 0.12);
  d = smin(d, apex, 0.12);
  d = smin(d, la, 0.1);
  d = smin(d, ra, 0.1);
  d = smin(d, auricle, 0.06);
  // Surco interventricular (donde corre la arteria coronaria).
  d = smax(d, -roundCone(x, y, z, [-0.02, 0.32, 0.38], [0.12, -0.5, 0.2], 0.035, 0.02), 0.04);
  // Surco coronario (entre aurículas y ventrículos).
  d = smax(d, -ellipsoid(x, y, z, [-0.02, 0.2, 0.02], [0.5, 0.018, 0.4]), 0.02);
  return d;
}

const heartSDF: SDF = (x, y, z) => {
  const [lx, ly, lz] = heartLocal.map(x, y, z);
  return heartLocalSDF(lx, ly, lz) * heartLocal.s;
};

const MYO = hex('#b8313c');
const MYO_DARK = hex('#7c1a26');
const FAT = hex('#f0cf86');

function heartColor(x: number, y: number, z: number): Vec3 {
  const [lx, ly, lz] = heartLocal.map(x, y, z);
  const n = fbm3(lx * 7, ly * 7, lz * 7, 3);
  let c = mix3(MYO, MYO_DARK, n * 0.55);
  // Grasa amarillenta en los surcos (así se ve un corazón real).
  const groove = Math.exp(-Math.pow((ly - 0.2) / 0.08, 2));
  c = mix3(c, FAT, groove * 0.28 * (0.6 + n));
  // Fibras musculares en espiral
  c = mix3(c, MYO_DARK, 0.12 * (0.5 + 0.5 * Math.sin(lx * 24 + ly * 18)));
  return c;
}

function heartGeometry(tier: Tier) {
  const body = meshSDF(heartSDF, {
    bounds: [
      [-0.12, 0.36, -0.12],
      [0.22, 0.8, 0.2],
    ],
    cell: 0.0042 * detail(tier),
    color: heartColor,
    project: true,
  });
  const L = (pts: Vec3[]) => pts.map((p) => new THREE.Vector3(...p).applyMatrix4(HEART_M).toArray() as Vec3);
  const s = heartLocal.s;
  const parts: THREE.BufferGeometry[] = [body];
  const vessel = (pts: Vec3[], r: number, color: string, taper = 1) => parts.push(paint(tube(L(pts), r * s, 14, 10, taper), color));
  // Aorta: sube, forma el cayado y baja por detrás; con 3 ramas hacia arriba.
  vessel([[0.02, 0.28, 0.02], [0.0, 0.72, 0.04], [0.1, 0.95, -0.08], [0.3, 0.9, -0.26], [0.34, 0.5, -0.34], [0.34, 0.0, -0.34]], 0.105, '#d23a35');
  vessel([[0.04, 0.9, -0.02], [-0.01, 1.15, -0.02]], 0.04, '#d23a35');
  vessel([[0.14, 0.95, -0.1], [0.13, 1.18, -0.12]], 0.037, '#d23a35');
  vessel([[0.24, 0.93, -0.2], [0.3, 1.15, -0.22]], 0.037, '#d23a35');
  // Tronco pulmonar (sangre sin oxígeno → azul) y sus dos ramas.
  vessel([[-0.08, 0.3, 0.24], [-0.02, 0.62, 0.2], [0.02, 0.72, 0.1]], 0.09, '#4a78c8');
  vessel([[0.02, 0.72, 0.1], [-0.4, 0.74, 0.02], [-0.62, 0.66, -0.04]], 0.06, '#4a78c8');
  vessel([[0.02, 0.72, 0.1], [0.36, 0.7, -0.02], [0.6, 0.62, -0.1]], 0.06, '#4a78c8');
  // Venas cavas (azules) entrando a la aurícula derecha.
  vessel([[-0.32, 0.42, -0.04], [-0.33, 0.95, -0.06]], 0.075, '#3563b8');
  vessel([[-0.3, 0.14, -0.08], [-0.3, -0.25, -0.1]], 0.08, '#3563b8');
  // Venas pulmonares (rojas: vuelven cargadas de oxígeno).
  for (const sx of [-1, 1]) {
    vessel([[0.14, 0.42, -0.2], [0.14 + sx * 0.3, 0.46, -0.24], [0.14 + sx * 0.5, 0.42, -0.26]], 0.04, '#c2413c');
  }
  // Arterias coronarias pegadas a la superficie.
  const onSurf = (pts: Vec3[]) => pts.map((p) => projectToSurface(heartLocalSDF, p, 0.018));
  const cor1 = onSurf([[-0.02, 0.32, 0.4], [0.02, 0.1, 0.4], [0.07, -0.15, 0.34], [0.1, -0.4, 0.22], [0.12, -0.55, 0.08]]);
  const cor2 = onSurf([[-0.02, 0.24, 0.35], [-0.3, 0.2, 0.25], [-0.42, 0.1, 0.0], [-0.35, 0.05, -0.25]]);
  const cor3 = onSurf([[0.05, 0.05, 0.4], [0.3, -0.1, 0.25], [0.38, -0.25, 0.05]]);
  for (const c of [cor1, cor2, cor3]) vessel(c, 0.022, '#e0463d', 0.5);
  return merge(parts);
}

/* ------------------------------------------------------------------ */
/* Pulmones + tráquea y árbol bronquial                                */
/* ------------------------------------------------------------------ */

const heartInflated: SDF = (x, y, z) => heartSDF(x, y, z) - 0.018;

function lungSDF(side: 1 | -1): SDF {
  return (x0, y, z) => {
    const x = x0 * side; // en espacio "izquierdo" (+X)
    let d = roundCone(x, y, z, [0.1, 1.0, -0.015], [0.135, 0.6, -0.01], 0.04, 0.125);
    d = smin(d, ellipsoid(x, y, z, [0.14, 0.64, -0.01], [0.115, 0.22, 0.125]), 0.08);
    d = smin(d, ellipsoid(x, y, z, [0.15, 0.55, -0.03], [0.11, 0.1, 0.13]), 0.06);
    // Base cóncava sobre la cúpula del diafragma.
    d = smax(d, -sphere(x, y, z, [0.12, 0.18, 0.0], 0.33), 0.03);
    // Cara interna plana (mediastino).
    d = smax(d, 0.03 - x, 0.03);
    // Hueco para el corazón (más marcado en el pulmón izquierdo).
    d = smax(d, -heartInflated(x0, y, z), 0.03);
    return d;
  };
}

const LUNG = hex('#e99aa4');
const LUNG_DARK = hex('#b8616f');

function lungColor(side: 1 | -1) {
  return (x0: number, y: number, z: number): Vec3 => {
    const x = x0 * side;
    const n = fbm3(x * 40, y * 40, z * 40, 3);
    let c = mix3(LUNG, LUNG_DARK, n * 0.6);
    // Lobulillos (moteado poligonal)
    const cells = noise3(x * 90, y * 90, z * 90);
    c = mix3(c, LUNG_DARK, smoothstep(0.75, 0.95, cells) * 0.4);
    // Cisura oblicua (separa lóbulos): plano inclinado.
    const fiss = Math.abs(y - 0.6 - (z + 0.02) * 1.3 - (x - 0.12) * 0.3);
    c = mix3(c, hex('#7b3040'), Math.exp(-Math.pow(fiss / 0.006, 2)) * 0.8);
    if (side === -1) {
      // El derecho tiene 3 lóbulos: cisura horizontal.
      const h = Math.abs(y - 0.73);
      c = mix3(c, hex('#7b3040'), Math.exp(-Math.pow(h / 0.005, 2)) * 0.7 * smoothstep(-0.02, 0.05, z));
    }
    return c;
  };
}

function lungGeometry(side: 1 | -1, tier: Tier) {
  return meshSDF(lungSDF(side), {
    bounds: side === 1
      ? [[0.02, 0.4, -0.16], [0.28, 1.06, 0.14]]
      : [[-0.28, 0.4, -0.16], [-0.02, 1.06, 0.14]],
    cell: 0.0055 * detail(tier),
    color: lungColor(side),
    project: true,
  });
}

/** Tráquea con anillos de cartílago. */
function tracheaGeometry() {
  const curve = curveOf([
    [0, 1.21, 0.075],
    [0, 1.08, 0.05],
    [0, 0.95, 0.02],
    [0, 0.86, 0.0],
  ]);
  const t = variableTube(curve, (u) => 0.022 * (1 + 0.14 * Math.pow(Math.abs(Math.sin(u * Math.PI * 12)), 3)), 140, 16);
  // Laringe (nuez) arriba.
  const larynx = new THREE.SphereGeometry(0.03, 16, 12);
  larynx.scale(1, 1.2, 0.9);
  larynx.translate(0, 1.225, 0.08);
  return merge([paint(t, '#e8cfc6'), paint(larynx, '#e3bfb4')]);
}

/** Árbol bronquial recursivo, recortado al volumen de cada pulmón. */
function bronchiGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const rnd = mulberry(7);
  const grow = (a: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, inside: SDF) => {
    const b = a.clone().addScaledVector(dir, len);
    if (depth > 0 && inside(b.x, b.y, b.z) > -0.01) return;
    parts.push(paint(tube([a.toArray() as Vec3, b.toArray() as Vec3], r, 8, 4, 0.8), depth < 2 ? '#e8cfc6' : '#f0b8c0'));
    if (depth >= 4) return;
    for (let i = 0; i < 2; i++) {
      const nd = dir
        .clone()
        .add(new THREE.Vector3((rnd() - 0.5) * 1.3, (rnd() - 0.7) * 1.0, (rnd() - 0.5) * 1.3))
        .normalize();
      grow(b, nd, len * 0.72, r * 0.7, depth + 1, inside);
    }
  };
  const carina = new THREE.Vector3(0, 0.86, 0);
  for (const side of [1, -1] as const) {
    const inside = lungSDF(side);
    const hilum = new THREE.Vector3(side * 0.08, 0.76, -0.01);
    parts.push(paint(tube([carina.toArray() as Vec3, hilum.toArray() as Vec3], 0.015, 10, 6), '#e8cfc6'));
    for (const d of [
      [0.2, 0.6, 0],
      [0.5, -0.4, 0.2],
      [0.3, -0.9, -0.2],
    ]) {
      grow(hilum, new THREE.Vector3(d[0] * side, d[1], d[2]).normalize(), 0.09, 0.011, 1, inside);
    }
  }
  return merge(parts);
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Cerebro                                                             */
/* ------------------------------------------------------------------ */

function gyri(x: number, y: number, z: number) {
  // Líneas de nivel finas de un ruido deformado → surcos serpenteantes
  // (circunvoluciones con forma de "gusanitos" como en un cerebro real).
  const w = noise3(x * 16, y * 16, z * 16) * 2.2;
  const g = Math.abs(noise3(x * 48 + w, y * 48 - w, z * 48 + w) * 2 - 1);
  return 1 - smoothstep(0.0, 0.18, g);
}

const brainSDF: SDF = (x0, y, z) => {
  const x = Math.abs(x0);
  let h = ellipsoid(x, y, z, [0.068, 1.535, -0.005], [0.076, 0.1, 0.16]);
  h = smin(h, ellipsoid(x, y, z, [0.085, 1.475, 0.035], [0.055, 0.05, 0.095]), 0.04); // lóbulo temporal
  h = smin(h, ellipsoid(x, y, z, [0.06, 1.52, 0.1], [0.06, 0.07, 0.06]), 0.04); // frontal
  // Cisura longitudinal entre hemisferios.
  h = smax(h, 0.004 - x, 0.006);
  // Surcos.
  h += 0.006 * gyri(x0, y, z);
  // Cerebelo con láminas finas.
  let cb = ellipsoid(x, y, z, [0.045, 1.435, -0.1], [0.055, 0.04, 0.05]);
  cb = smin(cb, ellipsoid(x, y, z, [0, 1.43, -0.1], [0.03, 0.04, 0.05]), 0.02);
  cb += 0.0012 * Math.sin(y * 700 + z * 90);
  const stem = roundCone(x, y, z, [0, 1.46, -0.045], [0, 1.31, -0.055], 0.028, 0.019);
  let d = smin(h, cb, 0.012);
  d = smin(d, stem, 0.02);
  return d;
};

const BRAIN = hex('#efb9c2');
const BRAIN_DEEP = hex('#b9727f');

function brainColor(x: number, y: number, z: number): Vec3 {
  const inCb = y < 1.47 && z < -0.05;
  const groove = inCb ? 0.5 + 0.5 * Math.sin(y * 700 + z * 90) : gyri(x, y, z);
  let c = mix3(BRAIN, BRAIN_DEEP, groove * (inCb ? 0.35 : 0.6));
  c = mix3(c, hex('#d68f9b'), fbm3(x * 30, y * 30, z * 30, 2) * 0.25);
  // Vasitos superficiales
  const v = Math.abs(noise3(x * 14, y * 14, z * 14) * 2 - 1);
  c = mix3(c, hex('#c2414f'), Math.exp(-Math.pow(v / 0.025, 2)) * 0.45);
  return c;
}

function brainGeometry(tier: Tier) {
  return meshSDF(brainSDF, {
    bounds: [
      [-0.17, 1.28, -0.19],
      [0.17, 1.66, 0.18],
    ],
    cell: 0.0034 * detail(tier),
    color: brainColor,
    ao: 0.012,
    project: false,
  });
}

/* ------------------------------------------------------------------ */
/* Estómago + esófago + duodeno                                        */
/* ------------------------------------------------------------------ */

const STOMACH_PTS: Vec3[] = [
  [0.1, 0.33, 0.0],
  [0.15, 0.31, 0.02],
  [0.17, 0.24, 0.045],
  [0.14, 0.15, 0.07],
  [0.08, 0.1, 0.085],
  [0.02, 0.1, 0.085],
  [-0.03, 0.12, 0.08],
];
const STOMACH_R = [0.05, 0.07, 0.078, 0.07, 0.052, 0.036, 0.024];

const stomachSDF: SDF = (x, y, z) => sweep(x, y, z, STOMACH_PTS, STOMACH_R, 0.05);

function stomachColor(x: number, y: number, z: number): Vec3 {
  const n = fbm3(x * 30, y * 30, z * 30, 3);
  let c = mix3(hex('#eaa08c'), hex('#c0685c'), n * 0.5);
  // Pliegues (rugosidades) suaves
  c = mix3(c, hex('#b9584e'), 0.18 * (0.5 + 0.5 * Math.sin((x + y) * 140 + n * 6)));
  return c;
}

function stomachGeometry(tier: Tier) {
  const body = meshSDF(stomachSDF, {
    bounds: [
      [-0.07, 0.0, -0.08],
      [0.27, 0.42, 0.18],
    ],
    cell: 0.0045 * detail(tier),
    color: stomachColor,
    project: true,
  });
  const parts = [body];
  // Final del esófago (el resto es una pieza aparte, solo dentro del cuerpo).
  parts.push(paint(tube([[0.06, 0.42, -0.06], [0.1, 0.34, -0.005]], 0.017, 12, 10), '#df9f8e'));
  // Duodeno en "C".
  parts.push(paint(tube([[-0.035, 0.12, 0.08], [-0.085, 0.1, 0.06], [-0.095, 0.03, 0.05], [-0.07, -0.02, 0.05], [-0.02, -0.02, 0.05]], 0.02, 12, 10), '#e2a08c'));
  // Arterias a lo largo de las curvaturas.
  const along = (pts: Vec3[]) => pts.map((p) => projectToSurface(stomachSDF, p, 0.006));
  parts.push(paint(tube(along([[0.19, 0.28, 0.06], [0.2, 0.18, 0.1], [0.13, 0.08, 0.14], [0.03, 0.06, 0.12]]), 0.0045, 6, 10), '#c83b3b'));
  parts.push(paint(tube(along([[0.1, 0.3, 0.07], [0.1, 0.22, 0.1], [0.05, 0.16, 0.12], [-0.02, 0.14, 0.11]]), 0.004, 6, 10), '#c83b3b'));
  return merge(parts);
}

function esophagusGeometry() {
  return paint(tube([[0, 1.18, -0.02], [0.0, 0.9, -0.07], [0.02, 0.6, -0.1], [0.06, 0.42, -0.06]], 0.017, 12, 10), '#df9f8e');
}

/* ------------------------------------------------------------------ */
/* Hígado + vesícula                                                   */
/* ------------------------------------------------------------------ */

const liverSDF: SDF = (x, y, z) => {
  // Lóbulo derecho grande bajo el pulmón derecho y lóbulo izquierdo en cuña.
  let d = ellipsoid(x, y, z, [-0.11, 0.36, 0.01], [0.16, 0.1, 0.125]);
  d = smin(d, ellipsoid(x, y, z, [0.03, 0.38, 0.06], [0.12, 0.05, 0.07]), 0.06);
  // Cara superior abombada (diafragma) e inferior inclinada.
  d = smax(d, 0.265 - y + (x + 0.1) * 0.3 - z * 0.12, 0.035);
  return d;
};

function liverGeometry(tier: Tier) {
  const body = meshSDF(liverSDF, {
    bounds: [
      [-0.29, 0.2, -0.13],
      [0.17, 0.48, 0.15],
    ],
    cell: 0.005 * detail(tier),
    color: (x, y, z) => {
      const n = fbm3(x * 35, y * 35, z * 35, 3);
      let c = mix3(hex('#9a3a2e'), hex('#5e1c18'), n * 0.55);
      // Ligamento falciforme (divide los lóbulos)
      c = mix3(c, hex('#d9b08a'), Math.exp(-Math.pow((x + 0.0) / 0.006, 2)) * smoothstep(0.02, 0.08, z) * 0.7);
      return c;
    },
    project: true,
  });
  const gb = new THREE.SphereGeometry(0.022, 16, 12);
  gb.scale(1, 1.7, 1);
  gb.rotateZ(0.4);
  gb.translate(-0.075, 0.275, 0.1);
  return merge([body, paint(gb, '#5c8a3a')]);
}

/* ------------------------------------------------------------------ */
/* Riñones + uréteres + vejiga                                         */
/* ------------------------------------------------------------------ */

function kidneySDF(x0: number, y: number, z: number): number {
  const x = Math.abs(x0);
  const cy = x0 > 0 ? 0.16 : 0.13; // el derecho está un poco más bajo (por el hígado)
  let d = ellipsoid(x, y, z, [0.105, cy, -0.1], [0.034, 0.064, 0.03]);
  d = smax(d, -sphere(x, y, z, [0.062, cy, -0.09], 0.024), 0.012);
  return d;
}

function kidneysGeometry(tier: Tier) {
  const body = meshSDF(kidneySDF, {
    bounds: [
      [-0.16, 0.05, -0.15],
      [0.16, 0.25, -0.05],
    ],
    cell: 0.0035 * detail(tier),
    color: (x, y, z) => mix3(hex('#a8433a'), hex('#6e2420'), fbm3(x * 50, y * 50, z * 50, 2) * 0.5),
    project: true,
  });
  const parts = [body];
  for (const s of [1, -1]) {
    const cy = s > 0 ? 0.16 : 0.13;
    parts.push(paint(tube([[s * 0.072, cy - 0.01, -0.09], [s * 0.07, 0.0, -0.07], [s * 0.05, -0.18, -0.02], [s * 0.02, -0.27, 0.05]], 0.0045, 6, 8), '#e9d27a'));
    parts.push(paint(tube([[s * 0.075, cy + 0.005, -0.09], [s * 0.02, cy + 0.01, -0.07]], 0.007, 8, 6), '#d23a35'));
    parts.push(paint(tube([[s * 0.075, cy - 0.004, -0.085], [s * 0.025, cy - 0.006, -0.065]], 0.0075, 8, 6), '#3563b8'));
  }
  const bladder = new THREE.SphereGeometry(0.045, 20, 16);
  bladder.scale(1.1, 0.85, 0.9);
  bladder.translate(0, -0.29, 0.07);
  parts.push(paint(bladder, '#e7c07a'));
  return merge(parts);
}

/* ------------------------------------------------------------------ */
/* Intestinos                                                          */
/* ------------------------------------------------------------------ */

/** Intestino delgado: serpentea en filas por la barriga. */
function smallIntestinePath(): Vec3[] {
  const pts: Vec3[] = [[-0.02, -0.02, 0.05]];
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const y = 0.0 - r * 0.042;
    const dir = r % 2 === 0 ? 1 : -1;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = dir * (-0.11 + t * 0.22);
      const z = 0.075 + Math.sin(t * Math.PI * 3 + r) * 0.035 + Math.cos(r * 1.7) * 0.01;
      pts.push([x, y + Math.sin(t * Math.PI * 2 + r * 0.8) * 0.014, z]);
    }
  }
  pts.push([-0.12, -0.25, 0.07]);
  return pts;
}

function intestinesGeometry() {
  const small = variableTube(curveOf(smallIntestinePath(), false, 0.5), () => 0.02, 900, 12);
  // Colon: sube por la derecha, cruza bajo el estómago y baja por la izquierda.
  const colonCurve = curveOf([
    [-0.13, -0.24, 0.06],
    [-0.16, -0.15, 0.06],
    [-0.165, 0.02, 0.06],
    [-0.14, 0.08, 0.08],
    [-0.02, 0.06, 0.11],
    [0.1, 0.07, 0.1],
    [0.17, 0.09, 0.06],
    [0.18, -0.05, 0.05],
    [0.17, -0.22, 0.05],
    [0.08, -0.3, 0.07],
    [0.02, -0.33, 0.02],
    [0.0, -0.38, -0.02],
  ]);
  const len = colonCurve.getLength();
  // Haustras: bolsitas cada ~3,5 cm (escala del cuerpo).
  const colon = variableTube(
    colonCurve,
    (u, a) => {
      const s = Math.abs(Math.sin((u * len) / 0.028 * Math.PI));
      const band = 0.5 + 0.5 * Math.cos(a * 3); // tres bandas longitudinales (tenias)
      return 0.03 * (0.86 + 0.2 * Math.pow(s, 0.6) * (0.7 + 0.3 * band)) * (u > 0.93 ? 0.8 : 1);
    },
    500,
    18,
    { caps: true },
  );
  const appendix = tube([[-0.13, -0.26, 0.06], [-0.12, -0.3, 0.07], [-0.1, -0.31, 0.08]], 0.007, 6, 6);
  return merge([paint(small, '#eba898'), paint(colon, '#d88f74'), paint(appendix, '#d88f74')]);
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

export const ORGAN_BUILDERS: Record<string, (t: Tier) => THREE.BufferGeometry> = {
  'organ:corazon': heartGeometry,
  'organ:pulmon-l': (t) => lungGeometry(1, t),
  'organ:pulmon-r': (t) => lungGeometry(-1, t),
  'organ:traquea': () => tracheaGeometry(),
  'organ:bronquios': () => bronchiGeometry(),
  'organ:cerebro': brainGeometry,
  'organ:estomago': stomachGeometry,
  'organ:esofago': () => esophagusGeometry(),
  'organ:higado': liverGeometry,
  'organ:rinones': kidneysGeometry,
  'organ:intestinos': () => intestinesGeometry(),
};

/** Piezas que componen cada órgano "tocable" de la app. */
export const ORGAN_PIECES: Record<string, string[]> = {
  corazon: ['organ:corazon'],
  pulmones: ['organ:pulmon-l', 'organ:pulmon-r', 'organ:traquea'],
  cerebro: ['organ:cerebro'],
  estomago: ['organ:estomago'],
  intestinos: ['organ:intestinos'],
  higado: ['organ:higado'],
  rinones: ['organ:rinones'],
};

export { xf };
