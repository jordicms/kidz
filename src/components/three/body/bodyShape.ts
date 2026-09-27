import * as THREE from 'three';
import {
  cachedGeometry,
  ellipsoid,
  fbm3,
  hex,
  meshSDF,
  mix3,
  roundCone,
  smax,
  smin,
  smoothstep,
  sphere,
  type Vec3,
} from '../../../utils/sdf';

/**
 * Figura humana esculpida con SDF: una sola malla lisa (sin costuras) con
 * proporciones reales (~7,5 cabezas), en pose "A" para que los brazos no tapen
 * los órganos. Cuerpo centrado en el origen, ~3,4 u de alto, mirando a +Z.
 * El lado IZQUIERDO del niño/a es +X (así el corazón queda a la derecha de la
 * pantalla, como cuando te miras de frente a alguien).
 */

/** Articulaciones compartidas por la piel, el esqueleto, los vasos y los nervios. */
export const J = {
  headC: [0, 1.47, 0.01] as Vec3,
  chin: [0, 1.285, 0.1] as Vec3,
  neckTop: [0, 1.3, -0.012] as Vec3,
  neckBase: [0, 1.11, -0.01] as Vec3,
  shoulderL: [0.36, 0.965, -0.01] as Vec3,
  elbowL: [0.51, 0.45, -0.035] as Vec3,
  wristL: [0.615, -0.01, 0.03] as Vec3,
  handL: [0.655, -0.14, 0.045] as Vec3,
  hipL: [0.13, -0.22, 0] as Vec3,
  kneeL: [0.15, -0.96, 0.015] as Vec3,
  ankleL: [0.155, -1.6, -0.02] as Vec3,
  toeL: [0.17, -1.69, 0.16] as Vec3,
};

/** Refleja un punto del lado izquierdo (+X) al derecho. */
export const mx = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

/** Distancia a una mitad del cuerpo (X ≥ 0); se usa simetría para ahorrar. */
function halfBody(x: number, y: number, z: number, inset: number, muscle: boolean): number {
  // --- Cabeza y cara ---
  let head = ellipsoid(x, y, z, [0, 1.5, 0.0], [0.188, 0.215, 0.21]);
  head = smin(head, ellipsoid(x, y, z, [0, 1.36, 0.065], [0.118, 0.105, 0.125]), 0.08); // mandíbula
  head = smin(head, ellipsoid(x, y, z, [0, 1.285, 0.13], [0.045, 0.035, 0.04]), 0.04); // barbilla
  head = smin(head, ellipsoid(x, y, z, [0.095, 1.42, 0.11], [0.05, 0.045, 0.055]), 0.04); // mejillas
  head = smin(head, roundCone(x, y, z, [0, 1.5, 0.198], [0, 1.43, 0.232], 0.014, 0.028), 0.03); // nariz
  head = smin(head, ellipsoid(x, y, z, [0, 1.372, 0.195], [0.042, 0.017, 0.022]), 0.015); // labios
  head = smin(head, ellipsoid(x, y, z, [0.197, 1.465, -0.01], [0.03, 0.062, 0.045]), 0.018); // oreja
  // Cuencas de los ojos (resta suave) → los ojos se colocan aparte.
  head = smax(head, -sphere(x, y, z, [0.07, 1.5, 0.2], 0.036), 0.025);

  // --- Cuello y hombros ---
  let d = smin(head, roundCone(x, y, z, J.neckTop, J.neckBase, 0.08, 0.095), 0.06);
  const trap = roundCone(x, y, z, [0.05, 1.16, -0.035], [0.33, 1.005, -0.03], 0.08, 0.072);
  d = smin(d, trap, 0.07);
  const delt = ellipsoid(x, y, z, [0.365, 0.945, 0], [0.095, 0.11, 0.1]);

  // --- Tronco ---
  const chest = ellipsoid(x, y, z, [0, 0.74, -0.005], [0.29, 0.31, 0.165]);
  const ribs = ellipsoid(x, y, z, [0, 0.52, 0], [0.255, 0.22, 0.16]);
  const abdomen = ellipsoid(x, y, z, [0, 0.24, 0.012], [0.235, 0.28, 0.152]);
  const pelvis = ellipsoid(x, y, z, [0, -0.08, -0.01], [0.255, 0.17, 0.155]);
  const glute = ellipsoid(x, y, z, [0.1, -0.2, -0.075], [0.12, 0.13, 0.1]);
  const pec = ellipsoid(x, y, z, [0.115, 0.79, 0.085], [0.13, 0.085, 0.075]);
  let torso = smin(chest, ribs, 0.1);
  torso = smin(torso, abdomen, 0.12);
  torso = smin(torso, pelvis, 0.1);
  torso = smin(torso, glute, 0.06);
  torso = smin(torso, pec, 0.05);
  d = smin(d, torso, 0.08);
  d = smin(d, delt, 0.06);

  // --- Brazo ---
  const upper = roundCone(x, y, z, J.shoulderL, J.elbowL, 0.07, 0.052);
  const bicep = ellipsoid(x, y, z, [0.445, 0.7, 0.02], [0.058, 0.13, 0.058]);
  const fore = roundCone(x, y, z, J.elbowL, J.wristL, 0.053, 0.034);
  const foreM = ellipsoid(x, y, z, [0.54, 0.32, 0], [0.052, 0.12, 0.05]);
  const palm = ellipsoid(x, y, z, [0.64, -0.095, 0.045], [0.03, 0.068, 0.052]);
  const fingers = roundCone(x, y, z, [0.648, -0.14, 0.045], [0.66, -0.235, 0.05], 0.03, 0.022);
  const thumb = roundCone(x, y, z, [0.625, -0.06, 0.08], [0.628, -0.14, 0.11], 0.017, 0.012);
  let arm = smin(upper, bicep, 0.05);
  arm = smin(arm, fore, 0.04);
  arm = smin(arm, foreM, 0.04);
  let hand = smin(palm, fingers, 0.03);
  hand = smin(hand, thumb, 0.02);
  arm = smin(arm, hand, 0.03);
  d = smin(d, arm, 0.05);

  // --- Pierna ---
  const thigh = roundCone(x, y, z, J.hipL, J.kneeL, 0.12, 0.068);
  const quad = ellipsoid(x, y, z, [0.15, -0.5, 0.035], [0.1, 0.24, 0.09]);
  const shin = roundCone(x, y, z, J.kneeL, J.ankleL, 0.066, 0.04);
  const calf = ellipsoid(x, y, z, [0.155, -1.15, -0.035], [0.06, 0.15, 0.06]);
  let foot = roundCone(x, y, z, [0.155, -1.655, -0.035], J.toeL, 0.045, 0.036);
  foot = smax(foot, -1.728 - y, 0.012); // planta plana
  let leg = smin(thigh, quad, 0.08);
  leg = smin(leg, shin, 0.06);
  leg = smin(leg, calf, 0.05);
  leg = smin(leg, foot, 0.04);
  d = smin(d, leg, 0.085);

  // --- Definición muscular (solo capa de músculos) ---
  if (muscle) {
    // Surcos entre grupos musculares (resta suave de cápsulas finas).
    const groove = (a: Vec3, b: Vec3, r: number) => smax(d, -roundCone(x, y, z, a, b, r, r), 0.012);
    d = groove([0.0, 0.95, 0.19], [0.0, -0.05, 0.19], 0.012); // línea alba
    for (const gy of [0.43, 0.3, 0.17]) d = groove([0.0, gy, 0.175], [0.1, gy, 0.165], 0.007); // "tableta"
    d = groove([0.41, 0.84, 0.07], [0.43, 0.6, 0.06], 0.006); // deltoides/bíceps
    d = groove([0.12, -0.3, 0.12], [0.16, -0.85, 0.09], 0.007); // cuádriceps
  }
  return d + inset;
}

/** SDF del cuerpo completo. inset > 0 encoge la silueta (grasa, músculo...). */
export function bodySDF(inset = 0, muscle = false) {
  return (x: number, y: number, z: number) => halfBody(Math.abs(x), y, z, inset, muscle);
}

const BOUNDS: [Vec3, Vec3] = [
  [-0.78, -1.76, -0.32],
  [0.78, 1.75, 0.34],
];

/* ------------------------------------------------------------------ */
/* Colores por vértice                                                 */
/* ------------------------------------------------------------------ */

const SKIN = hex('#e9b08c');
const SKIN_SHADE = hex('#c98468');
const BLUSH = hex('#f08a7a');
const LIP = hex('#c9625e');
const NAIL = hex('#f3c9b8');

function skinColor(x: number, y: number, z: number): Vec3 {
  const ax = Math.abs(x);
  const n = fbm3(x * 14, y * 14, z * 14, 2);
  let c = mix3(SKIN, SKIN_SHADE, 0.12 + n * 0.18);
  // Rubor en mejillas, nudillos, rodillas y codos (la piel es más fina ahí).
  const cheek = Math.exp(-(((ax - 0.1) ** 2 + (y - 1.41) ** 2 + (z - 0.14) ** 2) / 0.0018));
  const knee = Math.exp(-(((ax - 0.15) ** 2 + (y + 0.96) ** 2) / 0.004)) * smoothstep(0, 0.05, z);
  const elbow = Math.exp(-(((ax - 0.51) ** 2 + (y - 0.45) ** 2) / 0.003)) * smoothstep(0, 0.04, -z);
  const hand = smoothstep(-0.02, -0.2, y) * smoothstep(0.55, 0.62, ax) * 0.5;
  c = mix3(c, BLUSH, cheek * 0.45 + knee * 0.25 + elbow * 0.2 + hand * 0.25);
  // Labios
  const lip = Math.exp(-((x ** 2) / 0.0012 + ((y - 1.372) ** 2) / 0.00018)) * smoothstep(0.16, 0.2, z);
  c = mix3(c, LIP, lip * 0.9);
  // Sonrisa: línea curva entre los labios.
  const smile = Math.abs(y - (1.371 + 9 * x * x)) + Math.max(0, ax - 0.034) * 2;
  c = mix3(c, hex('#7a3030'), Math.exp(-Math.pow(smile / 0.0022, 2)) * smoothstep(0.17, 0.2, z));
  // Uñas (puntas de los dedos por delante)
  const nail = smoothstep(-0.2, -0.23, y) * smoothstep(0.6, 0.64, ax) * smoothstep(0.05, 0.07, z);
  c = mix3(c, NAIL, nail * 0.6);
  return c;
}

const MUSCLE = hex('#b3342f');
const MUSCLE_DARK = hex('#6e1a1a');
const TENDON = hex('#eadccb');

function muscleColor(x: number, y: number, z: number): Vec3 {
  const ax = Math.abs(x);
  const wob = fbm3(x * 20, y * 20, z * 20, 2) * 3;
  let phase: number;
  if (ax > 0.33 || y < -0.3) {
    // Extremidades: fibras a lo largo del hueso.
    const cx = y < -0.3 ? 0.15 : 0.5;
    phase = Math.atan2(z, ax - cx) * 16;
  } else if (y > 0.62 && z > 0) {
    // Pectoral: fibras en abanico hacia el hombro.
    phase = Math.atan2(y - 0.95, ax - 0.35) * 40;
  } else if (y > 1.1) {
    phase = ax * 120; // cuello
  } else {
    phase = ax * 110; // abdomen y espalda: fibras verticales
  }
  const fiber = 0.5 + 0.5 * Math.sin(phase + wob);
  let c = mix3(MUSCLE, MUSCLE_DARK, fiber * 0.28);
  // Tendones blanquecinos en muñecas, tobillos, rodillas y cuello.
  const wrist = smoothstep(0.1, -0.02, y) * smoothstep(0.54, 0.6, ax) * smoothstep(-0.18, -0.02, y);
  const ankle = smoothstep(-1.45, -1.6, y);
  const kneecap = Math.exp(-(((ax - 0.15) ** 2 + (y + 0.95) ** 2) / 0.0025)) * smoothstep(0.02, 0.07, z);
  const face = smoothstep(1.24, 1.3, y) * 0.35;
  // Línea alba y tabiques de la "tableta" del abdomen.
  const front = smoothstep(0.1, 0.15, z);
  const alba = Math.exp(-Math.pow(ax / 0.008, 2)) * front * (y < 0.62 && y > -0.1 ? 1 : 0);
  let abs = 0;
  for (const gy of [0.43, 0.3, 0.17]) abs = Math.max(abs, Math.exp(-Math.pow((y - gy) / 0.007, 2)));
  abs *= front * smoothstep(0.13, 0.08, ax);
  c = mix3(c, TENDON, Math.max(wrist, ankle * 0.85, kneecap * 0.9, face, alba * 0.8, abs * 0.7));
  return c;
}

const FAT = hex('#f4d98e');
const FAT_DARK = hex('#d9a950');

function fatColor(x: number, y: number, z: number): Vec3 {
  // Lóbulos de grasa: textura celular con ruido.
  const n = fbm3(x * 34, y * 34, z * 34, 2);
  const cells = Math.abs(Math.sin(x * 60) * Math.sin(y * 60) * Math.sin(z * 60));
  return mix3(FAT, FAT_DARK, n * 0.45 + (1 - cells) * 0.12);
}

/* ------------------------------------------------------------------ */
/* Geometrías (cacheadas)                                              */
/* ------------------------------------------------------------------ */

export type BodyLayerKind = 'skin' | 'fat' | 'muscle' | 'shell';

/** Tamaño de celda según calidad: más fino en gama alta. */
export function bodyCell(tier: 'high' | 'medium' | 'low') {
  return tier === 'high' ? 0.0135 : tier === 'medium' ? 0.017 : 0.022;
}

export function bodyGeometry(kind: BodyLayerKind, tier: 'high' | 'medium' | 'low'): THREE.BufferGeometry {
  const cell = bodyCell(tier) * (kind === 'shell' ? 1.35 : 1);
  return cachedGeometry(`body:${kind}:${cell}`, () => {
    switch (kind) {
      case 'fat':
        return meshSDF(bodySDF(0.012), { bounds: BOUNDS, cell, color: fatColor, project: true });
      case 'muscle':
        return meshSDF(bodySDF(0.009, true), { bounds: BOUNDS, cell, color: muscleColor, ao: 0.03, project: true });
      case 'shell':
        return meshSDF(bodySDF(-0.004), { bounds: BOUNDS, cell, project: true });
      case 'skin':
      default:
        return meshSDF(bodySDF(0), { bounds: BOUNDS, cell, color: skinColor, project: true });
    }
  });
}

/** Pelo: casquete sobre el cráneo con la línea del flequillo inclinada. */
export function hairGeometry(): THREE.BufferGeometry {
  return cachedGeometry('body:hair', () =>
    meshSDF(
      (x, y, z) => {
        const ax = Math.abs(x);
        let d = ellipsoid(ax, y, z, [0, 1.49, -0.008], [0.197, 0.247, 0.224]);
        // Mechones: ondulación suave en la superficie.
        d += 0.006 * Math.sin(Math.atan2(ax, z) * 14 + y * 20);
        // Línea del pelo: deja libre la cara y las orejas.
        let line = 1.585 + 0.012 * Math.sin(ax * 70) - 1.1 * Math.max(0, -z - 0.0);
        if (ax > 0.15 && z > -0.07) line = Math.max(line, 1.52); // patillas sobre las orejas // deja las orejas libres
        d = smax(d, line - y, 0.02);
        // Hueco interior (casquete, no bola maciza).
        d = smax(d, -ellipsoid(ax, y, z, [0, 1.475, 0.005], [0.182, 0.23, 0.205]), 0.01);
        return d;
      },
      {
        bounds: [
          [-0.23, 1.2, -0.26],
          [0.23, 1.77, 0.26],
        ],
        cell: 0.008,
        color: (x, y, z) => {
          const n = fbm3(x * 30, y * 60, z * 30, 2);
          return mix3(hex('#4a2c1a'), hex('#7a4a2a'), n);
        },
        project: true,
      },
    ),
  );
}
