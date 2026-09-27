import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Tunnel } from './tunnel';
import { stationAt } from './tunnel';
import { rbcGeometry, type RideState } from './Travelers';

/**
 * Decorados de cada estación: todo lo que hace reconocible el sitio por el que
 * pasas (dientes, vellosidades, alvéolos, bacterias...) y los intercambios que
 * lo hacen entendible (el oxígeno entrando o saliendo del glóbulo, los
 * nutrientes pasando a la pared del intestino...).
 */

type Props = { tunnel: Tunnel; station: number; state: RideState; scale: number };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const UP = new THREE.Vector3(0, 1, 0);
/** Ángulo del túnel cuya pared mira hacia `dir` (para poner la lengua abajo, etc.). */
function angleToward(t: Tunnel, s: number, dir: THREE.Vector3) {
  const f = t.frameAt(s);
  let best = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const d = new THREE.Vector3().addScaledVector(f.n, -Math.cos(a)).addScaledVector(f.b, Math.sin(a));
    const dot = d.dot(dir);
    if (dot > bestDot) {
      bestDot = dot;
      best = a;
    }
  }
  return best;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

/** Rellena un InstancedMesh con piezas pegadas a la pared de un tramo. */
function useWallInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  t: Tunnel,
  station: number,
  count: number,
  opts: { inset: (r: () => number) => number; scale: (r: () => number) => [number, number, number]; axis?: THREE.Vector3; seed: number; range?: [number, number]; color?: (r: () => number) => THREE.Color },
) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(opts.seed);
    const s0 = t.starts[station];
    const len = t.stations[station].length;
    const [a0, a1] = opts.range ?? [0.04, 0.96];
    for (let i = 0; i < count; i++) {
      const s = s0 + len * (a0 + (a1 - a0) * r());
      const a = r() * Math.PI * 2;
      const w = t.wall(s, a, opts.inset(r));
      tmpQ.setFromUnitVectors(opts.axis ?? Y, w.inward);
      const sc = opts.scale(r);
      tmpS.set(sc[0], sc[1], sc[2]);
      tmpM.compose(w.p, tmpQ, tmpS);
      m.setMatrixAt(i, tmpM);
      if (opts.color) m.setColorAt(i, opts.color(r));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, station, count]);
}

/* ------------------------------------------------------------------ */
/* Sangre                                                              */
/* ------------------------------------------------------------------ */

/** Otros glóbulos rojos (y algún blanco) que viajan contigo por la sangre. */
export function Companions({ tunnel, state, scale }: Omit<Props, 'station'>) {
  const n = Math.round(46 * scale);
  const rbc = useMemo(() => rbcGeometry(0.5, 28), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const white = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: n }, () => ({ off: r() * 34, a: r() * Math.PI * 2, rad: 0.25 + r() * 0.5, spin: (r() - 0.5) * 3, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize() }));
  }, [n]);
  const has = tunnel.stations.map((s) => s.decor.includes('companions'));
  const dark = new THREE.Color('#6e0a18');
  const bright = new THREE.Color('#e02a2a');
  const col = new THREE.Color();
  useFrame(({ clock }) => {
    const m = ref.current;
    const w = white.current;
    if (!m || !w) return;
    const time = clock.elapsedTime;
    let wi = 0;
    seeds.forEach((sd, i) => {
      // Se quedan atrás poco a poco: el protagonista va algo más rápido.
      const off = ((sd.off - time * 1.1) % 34 + 34) % 34 - 8;
      const s = Math.min(tunnel.length - 0.5, Math.max(0.5, state.s + off));
      const st = stationAt(tunnel, s).i;
      const f = tunnel.frameAt(s);
      const R = tunnel.radius(s, sd.a) * sd.rad;
      const p = f.p.clone().addScaledVector(f.n, -Math.cos(sd.a) * R).addScaledVector(f.b, Math.sin(sd.a) * R);
      const visible = has[st] && (off > 1.2 || off < -3.4); // nunca tapando la cámara
      tmpQ.setFromAxisAngle(sd.ax, time * sd.spin + i);
      const k = visible ? 1 : 0;
      if (i % 9 === 0) {
        tmpS.setScalar(0.55 * k);
        tmpM.compose(p, tmpQ, tmpS);
        w.setMatrixAt(wi++, tmpM);
        tmpS.setScalar(0);
        tmpM.compose(p, tmpQ, tmpS);
        m.setMatrixAt(i, tmpM);
      } else {
        tmpS.setScalar(k);
        tmpM.compose(p, tmpQ, tmpS);
        m.setMatrixAt(i, tmpM);
        // Color según el oxígeno que llevan en ese tramo.
        const o2 = st === 2 || st === 3 ? 1 : st === 1 ? 0.2 : 0.1;
        m.setColorAt(i, col.copy(dark).lerp(bright, o2));
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    w.count = wi;
    w.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={ref} args={[rbc, undefined, n]} frustumCulled={false}>
        <meshPhysicalMaterial roughness={0.4} clearcoat={0.6} sheen={0.6} sheenColor="#ff9090" />
      </instancedMesh>
      <instancedMesh ref={white} args={[undefined, undefined, Math.ceil(n / 9) + 1]} frustumCulled={false}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshPhysicalMaterial color="#f4f0ff" roughness={0.6} sheen={1} sheenColor="#d8d0ff" flatShading />
      </instancedMesh>
    </group>
  );
}

/** Válvulas del corazón: tres "puertas" que se abren con cada latido. */
export function Valves({ tunnel, station }: Props) {
  const s = tunnel.starts[station] + tunnel.stations[station].length * 0.82;
  const f = useMemo(() => tunnel.frameAt(s), [tunnel, s]);
  const flaps = useRef<(THREE.Group | null)[]>([]);
  const R = tunnel.radius(s, 0) * 0.95;
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z, f.t), [f]);
  useFrame(({ clock }) => {
    const p = (clock.elapsedTime % 0.75) / 0.75;
    const open = Math.sin(Math.min(1, p * 2.2) * Math.PI) * 1.1;
    flaps.current.forEach((g) => g && (g.rotation.x = -0.15 - open));
  });
  return (
    <group position={f.p} quaternion={q}>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation-z={(i / 3) * Math.PI * 2}>
          <group position={[0, R, 0]} ref={(g) => (flaps.current[i] = g)}>
            <mesh position={[0, -R * 0.5, 0]} scale={[R * 0.9, R * 0.55, 0.08]}>
              <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial color="#f0c8c8" roughness={0.4} clearcoat={0.6} side={THREE.DoubleSide} transparent opacity={0.9} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Bolsitas de aire (alvéolos) en la pared del capilar del pulmón. */
export function AlveoliWall({ tunnel, station, scale }: Props) {
  const n = Math.round(140 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  useWallInstances(ref, tunnel, station, n, {
    seed: 21,
    inset: (r) => -0.06 + r() * 0.04,
    scale: (r) => {
      const k = 0.12 + r() * 0.14;
      return [k, k, k];
    },
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshPhysicalMaterial color="#9fdcff" roughness={0.1} transmission={0} transparent opacity={0.55} emissive="#3a8cff" emissiveIntensity={0.6} clearcoat={1} />
    </instancedMesh>
  );
}

/** Células del cuerpo (con su núcleo) en las paredes de los capilares. */
export function TissueCells({ tunnel, station, scale }: Props) {
  const n = Math.round(110 * scale);
  const cells = useRef<THREE.InstancedMesh>(null);
  const nuclei = useRef<THREE.InstancedMesh>(null);
  const opts = {
    seed: 33,
    inset: () => 0.02,
    scale: (r: () => number): [number, number, number] => {
      const k = 0.16 + r() * 0.12;
      return [k, k * 0.35, k];
    },
    color: (r: () => number) => new THREE.Color().setHSL(0.05 + r() * 0.08, 0.7, 0.55 + r() * 0.1),
  };
  useWallInstances(cells, tunnel, station, n, opts);
  useWallInstances(nuclei, tunnel, station, n, { ...opts, inset: () => 0.05, scale: (r) => { const k = (0.16 + r() * 0.12) * 0.35; return [k, k * 0.6, k]; }, color: (r) => { r(); r(); return new THREE.Color('#7a3a8a'); } });
  return (
    <group>
      <instancedMesh ref={cells} args={[undefined, undefined, n]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshPhysicalMaterial roughness={0.5} clearcoat={0.5} sheen={0.6} transparent opacity={0.9} />
      </instancedMesh>
      <instancedMesh ref={nuclei} args={[undefined, undefined, n]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshPhysicalMaterial roughness={0.4} emissive="#401050" emissiveIntensity={0.4} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Intercambios (partículas que viajan entre el protagonista y la pared) */
/* ------------------------------------------------------------------ */

/**
 * Partículas que van de la pared al protagonista ('in') o del protagonista a
 * la pared ('out') mientras estás en la estación: así se VE el oxígeno
 * cargándose, los nutrientes absorbiéndose, etc.
 */
export function Transfer({
  tunnel,
  station,
  state,
  color,
  dir,
  count = 26,
  size = 0.07,
  label,
}: Props & { color: string; dir: 'in' | 'out'; count?: number; size?: number; label?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(station * 97 + (dir === 'in' ? 1 : 2));
    return Array.from({ length: count }, (_, i) => ({ ph: i / count, a: r() * Math.PI * 2, ds: (r() - 0.3) * 3, wall: new THREE.Vector3(), last: -1 }));
  }, [count, station, dir]);
  const labelRef = useRef<THREE.Group>(null);
  const labelDiv = useRef<HTMLDivElement>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const active = state.station === station && state.k > 0.08 && state.k < 0.95;
    const time = clock.elapsedTime;
    seeds.forEach((sd, i) => {
      if (!active) {
        tmpS.setScalar(0);
        tmpM.compose(state.pos, tmpQ.identity(), tmpS);
        m.setMatrixAt(i, tmpM);
        return;
      }
      const cycle = Math.floor(time * 0.6 + sd.ph);
      const ph = (time * 0.6 + sd.ph) % 1;
      if (cycle !== sd.last) {
        sd.last = cycle;
        sd.wall.copy(tunnel.wall(Math.min(tunnel.length, Math.max(0, state.s + sd.ds)), sd.a + cycle, 0.1).p);
      }
      const k = dir === 'in' ? ph : 1 - ph;
      const e = k * k * (3 - 2 * k);
      // Llegan a un anillo alrededor del protagonista (no todas al centro).
      const target = state.pos.clone().add(new THREE.Vector3(Math.cos(sd.a * 3), Math.sin(sd.a * 3), Math.sin(sd.a * 5)).multiplyScalar(0.55));
      const p = sd.wall.clone().lerp(target, e);
      tmpS.setScalar(size * Math.sin(ph * Math.PI) * 1.3);
      tmpM.compose(p, tmpQ.identity(), tmpS);
      m.setMatrixAt(i, tmpM);
    });
    m.instanceMatrix.needsUpdate = true;
    // (Html no hereda la visibilidad del grupo: se oculta por estilo.)
    if (labelDiv.current) labelDiv.current.style.display = active ? 'block' : 'none';
    labelRef.current?.position.copy(state.pos).add(new THREE.Vector3(0, 0.95, 0));
  });
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
      {label && (
        <group ref={labelRef}>
          <Html center zIndexRange={[6, 0]}>
            <div ref={labelDiv} className="journey-tag" style={{ borderColor: color, color, display: 'none' }}>
              {label}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Digestivo                                                           */
/* ------------------------------------------------------------------ */

/** Boca: dientes de arriba y de abajo que mastican, y la lengua. */
export function Teeth({ tunnel, station }: Props) {
  const s = tunnel.starts[station] + tunnel.stations[station].length * 0.42;
  const upA = useMemo(() => angleToward(tunnel, s, UP), [tunnel, s]);
  const top = useRef<THREE.Group>(null);
  const teeth = useMemo(() => {
    const list: { p: THREE.Vector3; q: THREE.Quaternion; top: boolean; w: number }[] = [];
    for (const isTop of [true, false]) {
      for (let i = 0; i < 12; i++) {
        const spread = (i / 11 - 0.5) * 2.3;
        const a = upA + (isTop ? 0 : Math.PI) + spread;
        const ds = Math.cos(spread) * 1.6;
        const w = tunnel.wall(s + ds, a, 0.25);
        const q = new THREE.Quaternion().setFromUnitVectors(Y, w.inward);
        list.push({ p: w.p, q, top: isTop, w: Math.abs(spread) < 0.5 ? 1.2 : 0.9 });
      }
    }
    return list;
  }, [tunnel, s, upA]);
  const downDir = useMemo(() => tunnel.wall(s, upA).inward.clone(), [tunnel, s, upA]);
  const tongue = useMemo(() => tunnel.wall(s + 2.5, upA + Math.PI, 0.9), [tunnel, s, upA]);
  const tongueRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const chew = Math.max(0, Math.sin(t * 4)) * 0.45;
    top.current?.position.copy(downDir).multiplyScalar(chew);
    if (tongueRef.current) tongueRef.current.scale.y = 0.55 + Math.sin(t * 2) * 0.05;
  });
  const tongueQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, tongue.inward), [tongue]);
  return (
    <group>
      <group ref={top}>
        {teeth.filter((x) => x.top).map((x, i) => (
          <mesh key={i} position={x.p} quaternion={x.q} scale={[0.38 * x.w, 0.6, 0.32]}>
            <capsuleGeometry args={[0.5, 0.6, 6, 12]} />
            <meshPhysicalMaterial color="#fbf8f0" roughness={0.18} clearcoat={1} />
          </mesh>
        ))}
      </group>
      {teeth.filter((x) => !x.top).map((x, i) => (
        <mesh key={i} position={x.p} quaternion={x.q} scale={[0.36 * x.w, 0.55, 0.3]}>
          <capsuleGeometry args={[0.5, 0.6, 6, 12]} />
          <meshPhysicalMaterial color="#fbf8f0" roughness={0.18} clearcoat={1} />
        </mesh>
      ))}
      <mesh ref={tongueRef} position={tongue.p} quaternion={tongueQ} scale={[1.6, 0.55, 3.2]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshPhysicalMaterial color="#e2707e" roughness={0.45} clearcoat={0.7} sheen={0.8} sheenColor="#ffb0b8" />
      </mesh>
    </group>
  );
}

/** Burbujas de jugo gástrico que suben en el estómago. */
export function Acid({ tunnel, station, scale }: Props) {
  const n = Math.round(90 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  const s0 = tunnel.starts[station];
  const len = tunnel.stations[station].length;
  const seeds = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: n }, () => ({ s: s0 + len * (0.1 + r() * 0.8), a: r() * Math.PI * 2, sp: 0.3 + r() * 0.6, ph: r(), k: 0.06 + r() * 0.14 }));
  }, [n, s0, len]);
  const bases = useMemo(() => seeds.map((sd) => tunnel.wall(sd.s, sd.a, 0.2)), [seeds, tunnel]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    seeds.forEach((sd, i) => {
      const ph = (clock.elapsedTime * sd.sp * 0.3 + sd.ph) % 1;
      const b = bases[i];
      const p = b.p.clone().addScaledVector(b.inward, ph * 2.5).addScaledVector(UP, ph * 1.2);
      tmpS.setScalar(sd.k * (1 - ph * 0.3));
      tmpM.compose(p, tmpQ.identity(), tmpS);
      m.setMatrixAt(i, tmpM);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshPhysicalMaterial color="#d8ff70" emissive="#9acc20" emissiveIntensity={0.8} transparent opacity={0.6} roughness={0.05} clearcoat={1} />
    </instancedMesh>
  );
}

/** Vellosidades del intestino delgado: miles de "deditos" que absorben. */
export function Villi({ tunnel, station, scale }: Props) {
  const n = Math.round(2200 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  useWallInstances(ref, tunnel, station, n, {
    seed: 44,
    inset: () => 0.04,
    scale: (r) => {
      const w = 0.035 + r() * 0.02;
      return [w, 0.09 + r() * 0.08, w];
    },
    color: (r) => new THREE.Color().setHSL(0.98, 0.5, 0.45 + r() * 0.1),
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <capsuleGeometry args={[1, 1.6, 4, 8]} />
      <meshPhysicalMaterial roughness={0.45} clearcoat={0.7} sheen={0.8} sheenColor="#ffd0c0" />
    </instancedMesh>
  );
}

/** Bacterias amigas del intestino grueso, con colores alegres. */
export function Bacteria({ tunnel, station, scale }: Props) {
  const n = Math.round(50 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  const s0 = tunnel.starts[station];
  const len = tunnel.stations[station].length;
  const seeds = useMemo(() => {
    const r = rng(91);
    return Array.from({ length: n }, () => ({ s: s0 + len * (0.05 + r() * 0.9), a: r() * Math.PI * 2, rad: 0.3 + r() * 0.55, ph: r() * 6, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize() }));
  }, [n, s0, len]);
  const colors = useMemo(() => ['#7ee081', '#b388ff', '#5ec8ff', '#ffd166', '#ff8fab'].map((c) => new THREE.Color(c)), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    seeds.forEach((_, i) => m.setColorAt(i, colors[i % colors.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds, colors]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    seeds.forEach((sd, i) => {
      const s = sd.s + Math.sin(t * 0.4 + sd.ph) * 0.8;
      const f = tunnel.frameAt(s);
      const R = tunnel.radius(s, sd.a) * sd.rad;
      const a = sd.a + Math.sin(t * 0.3 + sd.ph) * 0.3;
      const p = f.p.clone().addScaledVector(f.n, -Math.cos(a) * R).addScaledVector(f.b, Math.sin(a) * R);
      tmpQ.setFromAxisAngle(sd.ax, t * 0.8 + sd.ph);
      const w = 1 + Math.sin(t * 6 + sd.ph) * 0.12;
      tmpS.set(0.14 * w, 0.32 / w, 0.14 * w);
      tmpM.compose(p, tmpQ, tmpS);
      m.setMatrixAt(i, tmpM);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <capsuleGeometry args={[1, 1.5, 6, 12]} />
      <meshPhysicalMaterial roughness={0.35} clearcoat={0.8} sheen={1} emissive="#203020" emissiveIntensity={0.3} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Respiratorio                                                        */
/* ------------------------------------------------------------------ */

/** Pelitos de la nariz que atrapan el polvo. */
export function Hairs({ tunnel, station, scale }: Props) {
  const n = Math.round(420 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  useWallInstances(ref, tunnel, station, n, {
    seed: 12,
    range: [0.05, 0.7],
    inset: () => 0,
    scale: (r) => [0.03, 0.5 + r() * 0.7, 0.03],
    color: (r) => new THREE.Color().setHSL(0.07, 0.4, 0.25 + r() * 0.2),
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <coneGeometry args={[1, 1, 5]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}

/** Bifurcación de la tráquea: el tabique (carina) y los dos caminos. */
export function Fork({ tunnel, station, state }: Props) {
  const signs = useRef<(HTMLDivElement | null)[]>([]);
  useFrame(() => {
    const show = state.station === station && state.k < 0.6;
    signs.current.forEach((d) => d && (d.style.display = show ? 'block' : 'none'));
  });
  const s = tunnel.starts[station] + tunnel.stations[station].length * 0.35;
  const f = useMemo(() => tunnel.frameAt(s), [tunnel, s]);
  const R = tunnel.radius(s, 0);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z, f.t), [f]);
  // "Derecha" del túnel vista por el viajero.
  const right = useMemo(() => f.t.clone().cross(UP).normalize(), [f]);
  const pos = useMemo(() => f.p.clone().addScaledVector(right, R * 0.62), [f, right, R]);
  return (
    <group>
      <mesh position={pos} quaternion={q} scale={[R * 0.34, R * 1.1, 4.5]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshPhysicalMaterial color="#c87888" roughness={0.45} clearcoat={0.6} sheen={0.5} sheenColor="#ffc0c8" />
      </mesh>
      <group position={f.p.clone().addScaledVector(right, -R * 0.35).addScaledVector(UP, R * 0.5).addScaledVector(f.t, -3)}>
        <Html center zIndexRange={[6, 0]}>
          <div ref={(d) => { signs.current[0] = d; }} className="journey-sign" style={{ display: 'none' }}>⬅️ Pulmón izquierdo</div>
        </Html>
      </group>
      <group position={pos.clone().addScaledVector(right, R * 0.6).addScaledVector(UP, R * 0.5).addScaledVector(f.t, -3)}>
        <Html center zIndexRange={[6, 0]}>
          <div ref={(d) => { signs.current[1] = d; }} className="journey-sign dim" style={{ display: 'none' }}>Pulmón derecho ➡️</div>
        </Html>
      </group>
    </group>
  );
}

/** Sala de alvéolos: racimos de "uvas" con capilares rojos por fuera. */
export function AlveoliRoom({ tunnel, station, scale }: Props) {
  const n = Math.round(260 * scale);
  const ref = useRef<THREE.InstancedMesh>(null);
  useWallInstances(ref, tunnel, station, n, {
    seed: 64,
    range: [0.12, 0.9],
    inset: () => 0.15,
    scale: (r) => {
      const k = 0.4 + r() * 0.35;
      return [k, k, k];
    },
    color: (r) => new THREE.Color().setHSL(0.95, 0.55, 0.72 + r() * 0.1),
  });
  // Capilares: tubos rojos serpenteando por la pared.
  const caps = useMemo(() => {
    const r = rng(8);
    const s0 = tunnel.starts[station];
    const len = tunnel.stations[station].length;
    const out: THREE.TubeGeometry[] = [];
    for (let c = 0; c < 9; c++) {
      const a0 = r() * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const s = s0 + len * (0.12 + (k / 10) * 0.76);
        pts.push(tunnel.wall(s, a0 + Math.sin(k * 0.9 + c) * 0.5, 0.35).p);
      }
      out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 8, false));
    }
    return out;
  }, [tunnel, station]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, n]}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshPhysicalMaterial roughness={0.25} clearcoat={0.9} sheen={1} sheenColor="#ffe0ea" transparent opacity={0.85} />
      </instancedMesh>
      {caps.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial color="#d02a3a" emissive="#ff2030" emissiveIntensity={0.5} roughness={0.35} clearcoat={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Luz al final del túnel (salida o llegada). */
export function Exit({ tunnel }: { tunnel: Tunnel }) {
  const f = useMemo(() => tunnel.frameAt(tunnel.length - 1.5), [tunnel]);
  return (
    <group position={f.p}>
      <pointLight intensity={6} distance={18} color="#fff4e0" decay={1.5} />
      <mesh>
        <sphereGeometry args={[0.5, 24, 16]} />
        <meshBasicMaterial color="#fff6e8" toneMapped={false} />
      </mesh>
    </group>
  );
}
