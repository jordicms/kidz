import * as THREE from 'three';
import {
  capsule,
  ellipsoid,
  fbm3,
  hex,
  meshSDF,
  mix3,
  roundCone,
  smax,
  smin,
  sphere,
  sweep,
  type SDF,
  type Vec3,
} from '../../../utils/sdf';
import { J, mx } from './bodyShape';
import { merge, paint, tube } from './geo';
import type { Tier } from './registry';

/**
 * Esqueleto anatómico: cráneo y pelvis esculpidos con SDF, huesos largos por
 * torno (con sus cabezas articulares), columna con curvas en "S", 12 pares de
 * costillas con cartílago, manos y pies con falanges.
 */

const BONE = hex('#eee4cc');
const BONE_DARK = hex('#b9a47c');
const CARTILAGE = '#cfe0e6';

function boneColor(x: number, y: number, z: number): Vec3 {
  const n = fbm3(x * 45, y * 45, z * 45, 3);
  return mix3(BONE, BONE_DARK, n * 0.45);
}

/* ------------------------------------------------------------------ */
/* Cráneo                                                              */
/* ------------------------------------------------------------------ */

const skullSDF: SDF = (x0, y, z) => {
  const x = Math.abs(x0);
  let d = ellipsoid(x, y, z, [0, 1.5, -0.01], [0.155, 0.185, 0.185]);
  d = smin(d, ellipsoid(x, y, z, [0, 1.4, 0.09], [0.1, 0.085, 0.095]), 0.05); // maxilar
  d = smin(d, capsule(x, y, z, [0.07, 1.43, 0.14], [0.14, 1.43, 0.02], 0.016), 0.03); // pómulo
  d = smin(d, ellipsoid(x, y, z, [0, 1.535, 0.14], [0.11, 0.035, 0.05]), 0.03); // arco de las cejas
  // Mandíbula en "U" con rama ascendente.
  const jaw = sweep(x, y, z, [[0.105, 1.43, 0.0], [0.1, 1.33, 0.02], [0.075, 1.3, 0.1], [0.0, 1.29, 0.135]], [0.017, 0.019, 0.02, 0.021], 0.02);
  d = smin(d, jaw, 0.012);
  // Cuencas de los ojos, fosa nasal y hueco temporal.
  d = smax(d, -sphere(x, y, z, [0.058, 1.485, 0.165], 0.042), 0.015);
  d = smax(d, -ellipsoid(x, y, z, [0, 1.425, 0.19], [0.018, 0.034, 0.04]), 0.01);
  d = smax(d, -ellipsoid(x, y, z, [0.16, 1.44, 0.03], [0.02, 0.04, 0.05]), 0.02);
  // Hueco bajo el pómulo (entre mandíbula y cráneo).
  d = smax(d, -ellipsoid(x, y, z, [0.1, 1.37, 0.05], [0.02, 0.03, 0.04]), 0.015);
  return d;
};

function skullColor(x: number, y: number, z: number): Vec3 {
  let c = boneColor(x, y, z);
  // Dientes: franja más blanca en la línea de la boca.
  const teeth = Math.exp(-Math.pow((y - 1.355) / 0.013, 2)) * (z > 0.1 ? 1 : 0);
  c = mix3(c, hex('#fbf8ef'), teeth);
  // Separación entre dientes
  if (teeth > 0.3) c = mix3(c, BONE_DARK, 0.4 * Math.pow(Math.abs(Math.sin(Math.atan2(x, z - 0.02) * 22)), 12));
  // Suturas del cráneo
  const sut = Math.abs(noise1(x * 30 + z * 10) * 0.01 + z + 0.02 - (y - 1.6) * 0.3);
  c = mix3(c, BONE_DARK, Math.exp(-Math.pow(sut / 0.003, 2)) * 0.6 * (y > 1.58 ? 1 : 0));
  return c;
}

function noise1(t: number) {
  return Math.sin(t) * 0.5 + Math.sin(t * 2.3 + 1) * 0.3;
}

/* ------------------------------------------------------------------ */
/* Pelvis                                                              */
/* ------------------------------------------------------------------ */

const pelvisSDF: SDF = (x0, y, z) => {
  const x = Math.abs(x0);
  // Ala ilíaca: concha de un elipsoide recortada.
  let wing = Math.abs(ellipsoid(x, y, z, [0.1, -0.06, -0.01], [0.12, 0.11, 0.085])) - 0.009;
  wing = smax(wing, 0.07 - x, 0.02);
  wing = smax(wing, y - 0.02, 0.02);
  wing = smax(wing, -0.19 - y, 0.02);
  wing = smax(wing, z - 0.05, 0.02);
  // Anillo: acetábulo → pubis y → isquion.
  const pubis = sweep(x, y, z, [[0.12, -0.21, 0.0], [0.08, -0.25, 0.06], [0.0, -0.27, 0.08]], [0.025, 0.018, 0.02], 0.02);
  const isch = sweep(x, y, z, [[0.12, -0.21, 0.0], [0.1, -0.28, -0.03], [0.05, -0.3, 0.03], [0.02, -0.28, 0.07]], [0.025, 0.022, 0.014, 0.012], 0.02);
  const sacrum = roundCone(x, y, z, [0, -0.08, -0.1], [0, -0.26, -0.085], 0.05, 0.015);
  let d = smin(wing, pubis, 0.03);
  d = smin(d, isch, 0.02);
  d = smin(d, sacrum, 0.03);
  d = smin(d, ellipsoid(x, y, z, [0.05, -0.1, -0.09], [0.05, 0.05, 0.03]), 0.03); // articulación sacroilíaca
  // Acetábulo (hueco para la cabeza del fémur).
  d = smax(d, -sphere(x, y, z, [J.hipL[0] + 0.02, J.hipL[1], J.hipL[2]], 0.03), 0.01);
  return d;
};

/* ------------------------------------------------------------------ */
/* Huesos largos por torno                                             */
/* ------------------------------------------------------------------ */

/** Hueso largo entre a y b: diáfisis fina y epífisis abultadas en los extremos. */
function longBone(a: Vec3, b: Vec3, r: number, headA = 1.8, headB = 1.7): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const pts: THREE.Vector2[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const endA = Math.exp(-Math.pow(t / 0.09, 2));
    const endB = Math.exp(-Math.pow((1 - t) / 0.09, 2));
    let rad = r * (1 + (headA - 1) * endA + (headB - 1) * endB + 0.1 * Math.sin(t * Math.PI));
    if (i === 0 || i === N) rad = 0.0001;
    else if (i === 1 || i === N - 1) rad *= 0.75;
    pts.push(new THREE.Vector2(rad, t * len));
  }
  const g = new THREE.LatheGeometry(pts, 14);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyQuaternion(q);
  g.translate(va.x, va.y, va.z);
  return g;
}

function ball(c: Vec3, r: number, s: Vec3 = [1, 1, 1]) {
  const g = new THREE.SphereGeometry(r, 16, 12);
  g.scale(...s);
  g.translate(...c);
  return g;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Brazo, mano, pierna y pie de un lado (el izquierdo, +X). */
function limbBones(): THREE.BufferGeometry[] {
  const bone = '#ede2c8';
  const g: THREE.BufferGeometry[] = [];
  const P = (geo: THREE.BufferGeometry, c = bone) => g.push(paint(geo, c));
  // Brazo
  P(ball(add3(J.shoulderL, [-0.01, 0.0, 0]), 0.034));
  P(longBone(add3(J.shoulderL, [0, -0.02, 0]), J.elbowL, 0.018, 1.7, 2.0));
  P(longBone(add3(J.elbowL, [0.008, -0.01, 0.012]), add3(J.wristL, [0.004, 0, 0.016]), 0.011, 1.8, 1.5)); // radio
  P(longBone(add3(J.elbowL, [-0.004, -0.005, -0.012]), add3(J.wristL, [-0.006, 0, -0.012]), 0.01, 2.0, 1.3)); // cúbito
  // Mano: carpo + metacarpos + falanges
  P(ball(add3(J.wristL, [0.008, -0.035, 0.01]), 0.022, [0.8, 1, 1.3]));
  const knuckles: Vec3[] = [];
  for (let f = 0; f < 4; f++) {
    const off = -0.024 + f * 0.016;
    const base: Vec3 = [0.63 + off * 0.1, -0.055, 0.045 + off];
    const k: Vec3 = [0.645 + off * 0.15, -0.14, 0.05 + off * 1.1];
    knuckles.push(k);
    P(tube([base, k], 0.0045, 6, 3, 0.8));
    const tip: Vec3 = [0.655 + off * 0.18, -0.225 + Math.abs(off) * 0.6, 0.055 + off * 1.15];
    P(tube([k, lerp3(k, tip, 0.5)], 0.0042, 6, 3, 0.85));
    P(tube([lerp3(k, tip, 0.52), tip], 0.0036, 6, 3, 0.7));
  }
  P(tube([[0.615, -0.05, 0.07], [0.622, -0.1, 0.1], [0.625, -0.14, 0.115]], 0.005, 6, 4, 0.7)); // pulgar
  // Pierna
  const head = add3(J.hipL, [0.012, 0, 0]);
  P(ball(head, 0.032));
  P(tube([head, [0.165, -0.26, -0.005]], 0.017, 10, 4)); // cuello del fémur
  P(ball([0.18, -0.25, -0.01], 0.024)); // trocánter
  P(longBone([0.17, -0.26, 0], J.kneeL, 0.022, 1.3, 2.1));
  P(ball(add3(J.kneeL, [0, 0.01, 0.045]), 0.022, [1, 1.1, 0.5])); // rótula
  P(longBone(add3(J.kneeL, [-0.003, -0.02, 0]), J.ankleL, 0.019, 2.0, 1.4)); // tibia
  P(longBone(add3(J.kneeL, [0.028, -0.04, -0.012]), add3(J.ankleL, [0.025, -0.01, -0.01]), 0.008, 1.6, 1.8)); // peroné
  // Pie: tarso + metatarsos + dedos
  P(ball(add3(J.ankleL, [0, -0.05, -0.02]), 0.03, [0.9, 0.9, 1.4]));
  P(ball(add3(J.ankleL, [0.005, -0.075, 0.05]), 0.028, [1, 0.8, 1.3]));
  for (let t = 0; t < 5; t++) {
    const off = -0.028 + t * 0.014;
    const base: Vec3 = [0.155 + off, -1.7, 0.07];
    const k: Vec3 = [0.158 + off * 1.2, -1.72, 0.14];
    const tip: Vec3 = [0.16 + off * 1.25, -1.725, 0.175 - Math.abs(off) * 0.6];
    P(tube([base, k], 0.0065 - Math.abs(off) * 0.05, 6, 3, 0.8));
    P(tube([k, tip], 0.005 - Math.abs(off) * 0.04, 6, 3, 0.8));
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Columna, costillas, esternón, clavículas, escápulas                 */
/* ------------------------------------------------------------------ */

/** Curva de la columna (en "S"): lordosis cervical y lumbar, cifosis dorsal. */
export const SPINE: Vec3[] = [
  [0, 1.31, -0.035],
  [0, 1.15, -0.05],
  [0, 0.95, -0.1],
  [0, 0.7, -0.125],
  [0, 0.45, -0.11],
  [0, 0.2, -0.075],
  [0, 0.0, -0.07],
  [0, -0.1, -0.09],
];

function spineBones(): THREE.BufferGeometry[] {
  const curve = new THREE.CatmullRomCurve3(SPINE.map((p) => new THREE.Vector3(...p)));
  const g: THREE.BufferGeometry[] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const size = i < 7 ? 0.018 : i < 19 ? 0.024 : 0.032; // cervical, dorsal, lumbar
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.clone().negate());
    const body = new THREE.CylinderGeometry(size, size * 1.05, size * 1.05, 14);
    body.applyQuaternion(q);
    body.translate(p.x, p.y, p.z);
    g.push(paint(body, '#ede2c8'));
    // Disco intervertebral (cartílago azulado)
    const disc = new THREE.CylinderGeometry(size * 0.96, size * 0.96, size * 0.3, 14);
    disc.applyQuaternion(q);
    const pd = curve.getPointAt(Math.min(1, t + 0.5 / n));
    disc.translate(pd.x, pd.y, pd.z);
    g.push(paint(disc, CARTILAGE));
    // Apófisis espinosa (hacia atrás y abajo) y transversas.
    g.push(paint(tube([[p.x, p.y, p.z - size * 0.7], [p.x, p.y - size * 0.8, p.z - size * 2.3]], size * 0.28, 6, 3, 0.6), '#e6d9bd'));
    g.push(paint(tube([[p.x - size * 1.8, p.y, p.z - size * 0.9], [p.x + size * 1.8, p.y, p.z - size * 0.9]], size * 0.22, 6, 3), '#e6d9bd'));
  }
  return g;
}

function ribBones(): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [];
  const spine = new THREE.CatmullRomCurve3(SPINE.map((p) => new THREE.Vector3(...p)));
  for (let i = 0; i < 12; i++) {
    const y0 = 0.95 - i * 0.052;
    const sp = spine.getPoint(0.2 + i * 0.022);
    const width = 0.13 + Math.sin(((i + 1) / 12) * Math.PI * 0.85) * 0.13;
    const depth = 0.11 + Math.sin(((i + 1) / 12) * Math.PI * 0.8) * 0.045;
    const front = i < 7 ? 1 : i < 10 ? 0.86 : 0.55; // costillas verdaderas, falsas y flotantes
    const pts: Vec3[] = [];
    const N = 9;
    for (let k = 0; k <= N; k++) {
      const th = 0.25 + (k / N) * (Math.PI * 0.86 * front);
      pts.push([Math.sin(th) * width, y0 - (k / N) * 0.1 * (1 + i * 0.06), sp.z + 0.02 + (1 - Math.cos(th)) * 0.5 * (depth + 0.03)]);
    }
    pts.unshift([0.02, y0 + 0.01, sp.z - 0.005]);
    const rib = paint(tube(pts, 0.0085 - i * 0.00015, 7, 5), '#ece0c3');
    g.push(rib, paint(tube(pts.map(mx), 0.0085 - i * 0.00015, 7, 5), '#ece0c3'));
    // Cartílago costal hasta el esternón (costillas 1–10).
    if (i < 10) {
      const end = pts[pts.length - 1];
      const target: Vec3 = i < 7 ? [0.025, 0.93 - i * 0.052, 0.14] : [0.05 + (i - 7) * 0.03, 0.57 - (i - 7) * 0.035, 0.13];
      const cart: Vec3[] = [end, lerp3(end, target, 0.5), target];
      g.push(paint(tube(cart, 0.0065, 6, 4), CARTILAGE), paint(tube(cart.map(mx), 0.0065, 6, 4), CARTILAGE));
    }
  }
  // Esternón (manubrio + cuerpo + xifoides)
  const st = new THREE.CapsuleGeometry(0.022, 0.3, 4, 10);
  st.scale(1, 1, 0.4);
  st.translate(0, 0.78, 0.145);
  g.push(paint(st, '#ede2c8'));
  g.push(paint(tube([[0, 0.6, 0.145], [0, 0.55, 0.14]], 0.008, 6, 3, 0.4), '#e6d9bd'));
  // Clavículas en "S"
  const clav: Vec3[] = [[0.025, 0.97, 0.13], [0.12, 0.985, 0.13], [0.22, 0.99, 0.07], [0.33, 1.0, 0.0]];
  g.push(paint(tube(clav, 0.0085, 8, 6), '#ede2c8'), paint(tube(clav.map(mx), 0.0085, 8, 6), '#ede2c8'));
  // Escápulas (omóplatos)
  for (const s of [1, -1]) {
    // Triángulo aplanado (vértice hacia abajo) pegado a la espalda.
    const sc = new THREE.ConeGeometry(0.1, 0.2, 3, 1);
    sc.rotateZ(Math.PI);
    sc.scale(1, 1, 0.12);
    sc.rotateY(s * 0.35);
    sc.translate(s * 0.19, 0.8, -0.165);
    g.push(paint(sc, '#e9ddc2'));
    g.push(paint(tube([[s * 0.1, 0.87, -0.19], [s * 0.3, 0.93, -0.12], [s * 0.34, 0.97, -0.04]], 0.009, 6, 4), '#e9ddc2')); // espina y acromion
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

const detail = (t: Tier) => (t === 'high' ? 1 : t === 'medium' ? 1.3 : 1.7);

export function skeletonGeometry(tier: Tier): THREE.BufferGeometry {
  const skull = meshSDF(skullSDF, {
    bounds: [
      [-0.19, 1.25, -0.22],
      [0.19, 1.71, 0.22],
    ],
    cell: 0.0042 * detail(tier),
    color: skullColor,
    ao: 0.03,
    project: true,
  });
  const pelvis = meshSDF(pelvisSDF, {
    bounds: [
      [-0.25, -0.34, -0.16],
      [0.25, 0.08, 0.12],
    ],
    cell: 0.0045 * detail(tier),
    color: boneColor,
    ao: 0.03,
    project: true,
  });
  const limbs = limbBones();
  const mirrored = limbs.map((l) => l.clone().applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)));
  // La reflexión invierte el sentido de los triángulos: se corrige el índice.
  for (const m of mirrored) flipWinding(m);
  const parts = [skull, pelvis, ...spineBones(), ...ribBones(), ...limbs, ...mirrored];
  return merge(parts);
}

function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.index;
  if (!idx) {
    const pos = g.attributes.position;
    const arr: number[] = [];
    for (let i = 0; i < pos.count; i += 3) arr.push(i, i + 2, i + 1);
    g.setIndex(arr);
    return;
  }
  const a = idx.array as Uint16Array | Uint32Array;
  for (let i = 0; i < a.length; i += 3) {
    const t = a[i + 1];
    a[i + 1] = a[i + 2];
    a[i + 2] = t;
  }
  idx.needsUpdate = true;
}

export { flipWinding };
