import * as THREE from 'three';

/**
 * Modelado orgánico con campos de distancia (SDF) + "surface nets".
 *
 * En lugar de pegar esferas y cápsulas sueltas (que dejan costuras y un aspecto
 * de muñeco), cada pieza se describe como una función de distancia combinada
 * con uniones suaves (smin). Luego se poligoniza UNA vez en una malla lisa y
 * continua con normales exactas del gradiente. Es la misma técnica que usan los
 * escultores digitales y los shaders de Inigo Quilez, pero horneada a malla
 * para que el móvil la pinte a 60 fps con materiales PBR normales.
 */

export type Vec3 = [number, number, number];
/** Función de distancia con signo: < 0 dentro, > 0 fuera. */
export type SDF = (x: number, y: number, z: number) => number;
/** Color por vértice (sRGB 0–1) a partir de la posición y la normal. */
export type ColorFn = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => Vec3;

/* ------------------------------------------------------------------ */
/* Operadores                                                          */
/* ------------------------------------------------------------------ */

/** Unión suave (polinómica). k = radio de fusión. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Intersección / resta suave. Para restar B: smax(a, -b, k). */
export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

/* ------------------------------------------------------------------ */
/* Primitivas (fórmulas de Inigo Quilez)                               */
/* ------------------------------------------------------------------ */

export function sphere(x: number, y: number, z: number, c: Vec3, r: number): number {
  const dx = x - c[0];
  const dy = y - c[1];
  const dz = z - c[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

/** Elipsoide (aproximación acotada, buena cerca de la superficie). */
export function ellipsoid(x: number, y: number, z: number, c: Vec3, r: Vec3): number {
  const px = (x - c[0]) / r[0];
  const py = (y - c[1]) / r[1];
  const pz = (z - c[2]) / r[2];
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = px / r[0];
  const qy = py / r[1];
  const qz = pz / r[2];
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

/** Cápsula entre a y b. */
export function capsule(x: number, y: number, z: number, a: Vec3, b: Vec3, r: number): number {
  const pax = x - a[0];
  const pay = y - a[1];
  const paz = z - a[2];
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

/** Cono redondeado entre a (radio r1) y b (radio r2): extremidades que se estrechan. */
export function roundCone(x: number, y: number, z: number, a: Vec3, b: Vec3, r1: number, r2: number): number {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = x - a[0];
  const pay = y - a[1];
  const paz = z - a[2];
  const yv = pax * bax + pay * bay + paz * baz;
  const zv = yv - l2;
  const qx = pax * l2 - bax * yv;
  const qy = pay * l2 - bay * yv;
  const qz = paz * l2 - baz * yv;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yv * yv * l2;
  const z2 = zv * zv * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
}

/** Caja redondeada centrada en c con semiejes h. */
export function roundBox(x: number, y: number, z: number, c: Vec3, h: Vec3, r: number): number {
  const qx = Math.abs(x - c[0]) - h[0] + r;
  const qy = Math.abs(y - c[1]) - h[1] + r;
  const qz = Math.abs(z - c[2]) - h[2] + r;
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  const mz = Math.max(qz, 0);
  return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/** Barrido de esferas a lo largo de una polilínea con radio variable (tubos orgánicos). */
export function sweep(x: number, y: number, z: number, pts: Vec3[], radii: number[], k: number): number {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    d = smin(d, roundCone(x, y, z, pts[i], pts[i + 1], radii[i], radii[i + 1]), k);
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Ruido 3D (value noise suave) para texturas orgánicas                */
/* ------------------------------------------------------------------ */

function hash3(i: number, j: number, k: number): number {
  let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 0xffff) / 0xffff;
}

/** Ruido de valor 3D en [0,1] con interpolación quíntica. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
  const n000 = hash3(xi, yi, zi);
  const n100 = hash3(xi + 1, yi, zi);
  const n010 = hash3(xi, yi + 1, zi);
  const n110 = hash3(xi + 1, yi + 1, zi);
  const n001 = hash3(xi, yi, zi + 1);
  const n101 = hash3(xi + 1, yi, zi + 1);
  const n011 = hash3(xi, yi + 1, zi + 1);
  const n111 = hash3(xi + 1, yi + 1, zi + 1);
  const x00 = n000 + (n100 - n000) * u;
  const x10 = n010 + (n110 - n010) * u;
  const x01 = n001 + (n101 - n001) * u;
  const x11 = n011 + (n111 - n011) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** Suma fractal de ruido (fbm) en [0,1]. */
export function fbm3(x: number, y: number, z: number, octaves = 3): number {
  let a = 0.5;
  let f = 1;
  let s = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    s += a * noise3(x * f, y * f, z * f);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

const tmpColor = new THREE.Color();

/** Hex sRGB → tripleta sRGB 0–1. */
export function hex(h: string): Vec3 {
  tmpColor.set(h);
  const c = tmpColor.clone().convertLinearToSRGB();
  return [c.r, c.g, c.b];
}

export function mix3(a: Vec3, b: Vec3, t: number): Vec3 {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function scale3(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/* Poligonización: surface nets                                        */
/* ------------------------------------------------------------------ */

export interface MeshOptions {
  /** Caja de trabajo [min, max] en unidades de escena. */
  bounds: [Vec3, Vec3];
  /** Tamaño de celda (menor = más detalle y más coste). */
  cell: number;
  /** Color por vértice opcional. */
  color?: ColorFn;
  /** Proyecta cada vértice sobre la superficie real (bordes más nítidos). */
  project?: boolean;
  /**
   * Oclusión ambiental horneada en el color: oscurece surcos y cavidades
   * (axilas, cuencas de los ojos, circunvoluciones). Valor = distancia de muestreo.
   */
  ao?: number;
}

/**
 * Convierte un SDF en una malla indexada lisa (position, normal[, color]).
 * Salta bloques lejos de la superficie (el SDF acota la distancia), así que
 * el coste real es proporcional al área, no al volumen.
 */
export function meshSDF(sdf: SDF, opts: MeshOptions): THREE.BufferGeometry {
  const [mn, mx] = opts.bounds;
  const cell = opts.cell;
  const nx = Math.ceil((mx[0] - mn[0]) / cell) + 1;
  const ny = Math.ceil((mx[1] - mn[1]) / cell) + 1;
  const nz = Math.ceil((mx[2] - mn[2]) / cell) + 1;
  const sxy = nx * ny;
  const field = new Float32Array(nx * ny * nz);

  // 1) Muestreo con descarte por bloques (narrow band).
  const B = 4;
  const blockR = Math.sqrt(3) * (B / 2) * cell;
  for (let bz = 0; bz < nz; bz += B) {
    for (let by = 0; by < ny; by += B) {
      for (let bx = 0; bx < nx; bx += B) {
        const ex = Math.min(bx + B, nx);
        const ey = Math.min(by + B, ny);
        const ez = Math.min(bz + B, nz);
        const cx = mn[0] + ((bx + ex - 1) / 2) * cell;
        const cy = mn[1] + ((by + ey - 1) / 2) * cell;
        const cz = mn[2] + ((bz + ez - 1) / 2) * cell;
        const dc = sdf(cx, cy, cz);
        // Margen ×2: los elipsoides y las uniones suaves no son distancias exactas.
        if (Math.abs(dc) > blockR * 2 + cell) {
          for (let z = bz; z < ez; z++)
            for (let y = by; y < ey; y++) {
              const row = z * sxy + y * nx;
              for (let x = bx; x < ex; x++) field[row + x] = dc;
            }
          continue;
        }
        for (let z = bz; z < ez; z++) {
          const pz = mn[2] + z * cell;
          for (let y = by; y < ey; y++) {
            const py = mn[1] + y * cell;
            const row = z * sxy + y * nx;
            for (let x = bx; x < ex; x++) field[row + x] = sdf(mn[0] + x * cell, py, pz);
          }
        }
      }
    }
  }

  // 2) Un vértice por celda que cruza la superficie (media de los cruces de arista).
  const cx1 = nx - 1;
  const cy1 = ny - 1;
  const cz1 = nz - 1;
  const cellIndex = new Int32Array(cx1 * cy1 * cz1).fill(-1);
  const verts: number[] = [];
  const corner = new Float32Array(8);
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const OFF = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  for (let z = 0; z < cz1; z++) {
    for (let y = 0; y < cy1; y++) {
      for (let x = 0; x < cx1; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const o = OFF[c];
          const v = field[(z + o[2]) * sxy + (y + o[1]) * nx + (x + o[0])];
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let ax = 0;
        let ay = 0;
        let az = 0;
        let n = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a];
          const vb = corner[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const oa = OFF[a];
          const ob = OFF[b];
          ax += oa[0] + (ob[0] - oa[0]) * t;
          ay += oa[1] + (ob[1] - oa[1]) * t;
          az += oa[2] + (ob[2] - oa[2]) * t;
          n++;
        }
        cellIndex[z * cx1 * cy1 + y * cx1 + x] = verts.length / 3;
        verts.push(mn[0] + (x + ax / n) * cell, mn[1] + (y + ay / n) * cell, mn[2] + (z + az / n) * cell);
      }
    }
  }

  // 3) Un quad por cada arista de la rejilla que cruza la superficie.
  const indices: number[] = [];
  const cidx = (x: number, y: number, z: number) => cellIndex[z * cx1 * cy1 + y * cx1 + x];
  for (let z = 1; z < cz1; z++) {
    for (let y = 1; y < cy1; y++) {
      for (let x = 1; x < cx1; x++) {
        const v0 = field[z * sxy + y * nx + x];
        const inside = v0 < 0;
        // Arista en X: celdas que la comparten (y,z)-(y-1,z)-(y-1,z-1)-(y,z-1).
        if (inside !== field[z * sxy + y * nx + x + 1] < 0) {
          quad(cidx(x, y, z), cidx(x, y - 1, z), cidx(x, y - 1, z - 1), cidx(x, y, z - 1), inside);
        }
        if (inside !== field[z * sxy + (y + 1) * nx + x] < 0) {
          quad(cidx(x, y, z), cidx(x, y, z - 1), cidx(x - 1, y, z - 1), cidx(x - 1, y, z), inside);
        }
        if (inside !== field[(z + 1) * sxy + y * nx + x] < 0) {
          quad(cidx(x, y, z), cidx(x - 1, y, z), cidx(x - 1, y - 1, z), cidx(x, y - 1, z), inside);
        }
      }
    }
  }
  function quad(a: number, b: number, c: number, d: number, flip: boolean) {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, b, c, a, c, d);
    else indices.push(a, c, b, a, d, c);
  }

  // 4) Normales exactas por gradiente (y proyección opcional a la superficie).
  const count = verts.length / 3;
  const pos = new Float32Array(verts);
  const nor = new Float32Array(count * 3);
  const col = opts.color ? new Float32Array(count * 3) : null;
  const e = cell * 0.5;
  for (let i = 0; i < count; i++) {
    let px = pos[i * 3];
    let py = pos[i * 3 + 1];
    let pz = pos[i * 3 + 2];
    let gx = sdf(px + e, py, pz) - sdf(px - e, py, pz);
    let gy = sdf(px, py + e, pz) - sdf(px, py - e, pz);
    let gz = sdf(px, py, pz + e) - sdf(px, py, pz - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl;
    gy /= gl;
    gz /= gl;
    if (opts.project) {
      const d = sdf(px, py, pz);
      if (Math.abs(d) < cell) {
        px -= gx * d;
        py -= gy * d;
        pz -= gz * d;
        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
    }
    nor[i * 3] = gx;
    nor[i * 3 + 1] = gy;
    nor[i * 3 + 2] = gz;
    if (col && opts.color) {
      const c = opts.color(px, py, pz, gx, gy, gz);
      if (opts.ao) {
        let occ = 0;
        let w = 1;
        for (let s = 1; s <= 5; s++) {
          const h = (opts.ao * s) / 5;
          occ += (h - sdf(px + gx * h, py + gy * h, pz + gz * h)) * w;
          w *= 0.7;
        }
        const ao = Math.min(1, Math.max(0.25, 1 - (occ / opts.ao) * 0.9));
        c[0] *= ao;
        c[1] *= ao;
        c[2] *= ao;
      }
      tmpColor.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
    }
  }

  // 5) Orientación robusta: cada triángulo mira hacia donde apunta el gradiente.
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    const ux = pos[b] - pos[a];
    const uy = pos[b + 1] - pos[a + 1];
    const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a];
    const vy = pos[c + 1] - pos[a + 1];
    const vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    const dot = fx * (nor[a] + nor[b] + nor[c]) + fy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + fz * (nor[a + 2] + nor[b + 2] + nor[c + 2]);
    if (dot < 0) {
      const tmp = indices[t + 1];
      indices[t + 1] = indices[t + 2];
      indices[t + 2] = tmp;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** Proyecta un punto sobre la superficie del SDF (para pegar vasos a un órgano). */
export function projectToSurface(sdf: SDF, p: Vec3, offset = 0, iters = 6): Vec3 {
  let [x, y, z] = p;
  const e = 0.002;
  for (let i = 0; i < iters; i++) {
    const d = sdf(x, y, z) - offset;
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    x -= (gx / gl) * d;
    y -= (gy / gl) * d;
    z -= (gz / gl) * d;
  }
  return [x, y, z];
}

/** Caché global de geometrías generadas (se calculan una sola vez por sesión). */
const cache = new Map<string, THREE.BufferGeometry>();
export function cachedGeometry(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = build();
    cache.set(key, g);
  }
  return g;
}
