import * as THREE from 'three';
import { fbm3, noise3 } from '../../utils/sdf';
import type { JourneyCfg, StationCfg } from './config';

/**
 * Túnel del viaje: una curva suave larguísima con un radio que cambia por
 * estación (cámaras enormes como el estómago, tubos estrechos como los
 * capilares) y relieve propio de cada órgano (anillos, pliegues, haustras).
 */

export interface Tunnel {
  curve: THREE.CatmullRomCurve3;
  length: number;
  /** Inicio (en longitud de arco) de cada estación, más el final. */
  starts: number[];
  stations: StationCfg[];
  /** Radio base (sin animación) en la longitud s y ángulo a. */
  radius: (s: number, a: number) => number;
  /** Peso de cada estación en s (fundido suave en las fronteras). */
  weights: (s: number) => number[];
  /** Marco (posición, normal, binormal, tangente) en s. */
  frameAt: (s: number) => { p: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; t: THREE.Vector3 };
  /** Punto de la pared en (s, ángulo) desplazado `inset` hacia dentro, y su normal hacia dentro. */
  wall: (s: number, a: number, inset?: number) => { p: THREE.Vector3; inward: THREE.Vector3 };
  geometry: THREE.BufferGeometry;
}

const BLEND = 3.5;

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function buildTunnel(cfg: JourneyCfg, detail: number): Tunnel {
  const stations = cfg.stations;
  const starts: number[] = [0];
  for (const st of stations) starts.push(starts[starts.length - 1] + st.length);
  const total = starts[starts.length - 1];

  // Curva: avanza en Z con ondulaciones suaves (menos en las cámaras grandes).
  const pts: THREE.Vector3[] = [];
  const step = 4;
  const seed = cfg.seed;
  for (let z = -6; z <= total + 8; z += step) {
    const sway = 1 - 0.6 * wideAt(z);
    pts.push(
      new THREE.Vector3(
        Math.sin(z * 0.075 + seed) * 3.2 * sway + Math.sin(z * 0.023 + seed * 2) * 4,
        Math.cos(z * 0.058 + seed * 1.7) * 2.2 * sway,
        z,
      ),
    );
  }
  function wideAt(z: number) {
    for (let i = 0; i < stations.length; i++) {
      if (z >= starts[i] && z < starts[i + 1]) return stations[i].radius > 2.5 ? 1 : 0;
    }
    return 0;
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  // Mapa longitud de arco → u de la curva; desplazamos para que s=0 sea z≈0.
  const curveLen = curve.getLength();
  const offset = findOffset(curve, curveLen);
  const L = total;
  const uOf = (s: number) => Math.min(1, Math.max(0, (s + offset) / curveLen));

  const weights = (s: number) => {
    const w = stations.map((_, i) => {
      const a = smooth(starts[i] - BLEND, starts[i] + BLEND, s);
      const b = 1 - smooth(starts[i + 1] - BLEND, starts[i + 1] + BLEND, s);
      if (i === 0) return b;
      if (i === stations.length - 1) return a;
      return a * b;
    });
    const sum = w.reduce((x, y) => x + y, 0) || 1;
    return w.map((x) => x / sum);
  };

  const radius = (s: number, a: number) => {
    const w = weights(s);
    let r = 0;
    for (let i = 0; i < stations.length; i++) {
      if (w[i] < 1e-3) continue;
      const st = stations[i];
      let ri = st.radius;
      // Cámaras: forma de "habitación" (más anchas en el centro del tramo).
      if (st.radius > 2.5) {
        const k = (s - starts[i]) / st.length;
        ri *= 0.55 + 0.45 * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
      }
      if (st.rings) ri -= st.rings.amp * Math.pow(Math.abs(Math.cos((Math.PI * s) / st.rings.period)), 10);
      if (st.haustra) ri += st.haustra.amp * (Math.pow(Math.abs(Math.sin((Math.PI * s) / st.haustra.period)), 0.7) - 0.5);
      if (st.folds) ri -= st.folds.amp * Math.pow(Math.abs(Math.sin(a * st.folds.count * 0.5 + s * 0.15)), 5);
      r += w[i] * ri;
    }
    // Relieve orgánico general
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    r *= 0.93 + 0.14 * noise3(ca * 1.6 + 7, sa * 1.6, s * 0.35);
    return Math.max(0.35, r);
  };

  const frames = curve.computeFrenetFrames(1200, false);
  const frameAt = (s: number) => {
    const u = uOf(s);
    const i = Math.min(1200, Math.max(0, Math.round(u * 1200)));
    return { p: curve.getPointAt(u), n: frames.normals[i].clone(), b: frames.binormals[i].clone(), t: frames.tangents[i].clone() };
  };
  const wall = (s: number, a: number, inset = 0) => {
    const f = frameAt(s);
    const dir = new THREE.Vector3()
      .addScaledVector(f.n, -Math.cos(a))
      .addScaledVector(f.b, Math.sin(a))
      .normalize();
    const r = radius(s, a) - inset;
    return { p: f.p.clone().addScaledVector(dir, r), inward: dir.clone().negate() };
  };

  const geometry = buildGeometry();

  function buildGeometry() {
    const segs = Math.round((L / 0.12) * detail);
    const radial = Math.round(44 * detail);
    const pos = new Float32Array((segs + 1) * (radial + 1) * 3);
    const nor = new Float32Array(pos.length);
    const col = new Float32Array(pos.length);
    const anim = new Float32Array(pos.length);
    const uv = new Float32Array((segs + 1) * (radial + 1) * 2);
    const P = new THREE.Vector3();
    const D = new THREE.Vector3();
    const T = new THREE.Vector3();
    const cA = new THREE.Color();
    const cB = new THREE.Color();
    const cTmp = new THREE.Color();
    const stationColors = stations.map((st) => [new THREE.Color(st.color), new THREE.Color(st.color2)]);
    let k = 0;
    for (let i = 0; i <= segs; i++) {
      const s = (i / segs) * L;
      const f = frameAt(s);
      T.copy(f.t);
      const w = weights(s);
      cA.setRGB(0, 0, 0);
      cB.setRGB(0, 0, 0);
      let peri = 0;
      let beat = 0;
      let breath = 0;
      let ringW = 0;
      for (let j = 0; j < stations.length; j++) {
        cA.add(cTmp.copy(stationColors[j][0]).multiplyScalar(w[j]));
        cB.add(cTmp.copy(stationColors[j][1]).multiplyScalar(w[j]));
        peri += (stations[j].peristalsis ?? 0) * w[j];
        beat += (stations[j].beat ?? 0) * w[j];
        breath += (stations[j].breath ?? 0) * w[j];
        if (stations[j].rings) ringW += w[j] * Math.pow(Math.abs(Math.cos((Math.PI * s) / stations[j].rings!.period)), 10);
      }
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        D.set(0, 0, 0).addScaledVector(f.n, -Math.cos(a)).addScaledVector(f.b, Math.sin(a)).normalize();
        const r = radius(s, a);
        P.copy(f.p).addScaledVector(D, r);
        pos[k * 3] = P.x;
        pos[k * 3 + 1] = P.y;
        pos[k * 3 + 2] = P.z;
        // Normal hacia dentro, inclinada según varía el radio (relieve iluminado).
        const da = 0.02;
        const ds = 0.06;
        const drds = (radius(s + ds, a) - radius(s - ds, a)) / (2 * ds);
        const drda = (radius(s, a + da) - radius(s, a - da)) / (2 * da) / Math.max(0.3, r);
        const tangA = new THREE.Vector3().addScaledVector(f.n, Math.sin(a)).addScaledVector(f.b, Math.cos(a));
        const N = D.clone().addScaledVector(T, -drds).addScaledVector(tangA, -drda).normalize().negate();
        nor[k * 3] = N.x;
        nor[k * 3 + 1] = N.y;
        nor[k * 3 + 2] = N.z;
        // Color: mezcla de tonos con manchas, "venitas" y anillos más claros.
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const n = fbm3(ca * 2 + 3, sa * 2, s * 0.5, 3);
        const vein = Math.abs(noise3(ca * 3 + 11, sa * 3, s * 0.4) * 2 - 1);
        cTmp.copy(cA).lerp(cB, 0.25 + n * 0.55);
        cTmp.lerp(new THREE.Color('#5a0610'), Math.exp(-Math.pow(vein / 0.05, 2)) * 0.6);
        cTmp.lerp(new THREE.Color('#fff0ea'), ringW * 0.55);
        col[k * 3] = cTmp.r;
        col[k * 3 + 1] = cTmp.g;
        col[k * 3 + 2] = cTmp.b;
        anim[k * 3] = peri;
        anim[k * 3 + 1] = beat;
        anim[k * 3 + 2] = breath;
        uv[k * 2] = s;
        uv[k * 2 + 1] = j / radial;
        k++;
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = (i + 1) * (radial + 1) + j;
        const c = b + 1;
        const d = a + 1;
        idx.push(a, d, b, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aAnim', new THREE.BufferAttribute(anim, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  return { curve, length: L, starts, stations, radius, weights, frameAt, wall, geometry };
}

/** Longitud de arco desde el inicio de la curva hasta z = 0 (donde empieza el viaje). */
function findOffset(curve: THREE.CatmullRomCurve3, len: number) {
  const lengths = curve.getLengths(400);
  for (let i = 0; i < lengths.length; i++) {
    const p = curve.getPoint(i / 400);
    if (p.z >= 0) return lengths[i] ?? 0;
  }
  return len * 0.05;
}

/** Estación en la que está s y progreso (0–1) dentro de ella. */
export function stationAt(t: Tunnel, s: number): { i: number; k: number } {
  for (let i = 0; i < t.stations.length; i++) {
    if (s < t.starts[i + 1]) return { i, k: (s - t.starts[i]) / t.stations[i].length };
  }
  return { i: t.stations.length - 1, k: 1 };
}
