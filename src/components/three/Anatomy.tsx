import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Anatomía procedural del cuerpo humano: figura reconocible, esqueleto,
 * sistema circulatorio (arterias rojas + venas azules), nervioso y helpers.
 * Todas las piezas comparten el mismo sistema de coordenadas (cuerpo centrado
 * en el origen, ~3,4 u de alto: pies en y≈-1.7, cabeza en y≈1.7) para que
 * órganos, huesos y vasos encajen entre sí.
 */

export type V3 = [number, number, number];

/** Anclas anatómicas compartidas (posición de cada órgano dentro del cuerpo). */
export const ANCHOR = {
  brain: [0, 1.46, 0.02] as V3,
  heart: [-0.1, 0.52, 0.16] as V3,
  lungs: [0, 0.58, 0.05] as V3,
  stomach: [0.12, 0.06, 0.2] as V3,
  intestines: [0, -0.2, 0.18] as V3,
};

function mirrorX(p: V3[]): V3[] {
  return p.map(([x, y, z]) => [-x, y, z] as V3);
}

/** Tubo liso a lo largo de una curva: vasos, nervios, tráquea, intestino. */
export function Tube({
  points,
  radius = 0.02,
  color,
  opacity = 1,
  emissive,
  emissiveIntensity = 0,
}: {
  points: V3[];
  radius?: number;
  color: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, Math.max(24, points.length * 6), radius, 8, false);
  }, [points, radius]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

/** Elipsoide liso reutilizable. */
function Ell({ pos, scale, r = 0.4, color, opacity = 1, rough = 0.75 }: {
  pos: V3;
  scale: V3;
  r?: number;
  color: string;
  opacity?: number;
  rough?: number;
}) {
  return (
    <mesh position={pos} scale={scale} castShadow>
      <sphereGeometry args={[r, 24, 18]} />
      <meshStandardMaterial color={color} roughness={rough} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/**
 * Figura humana reconocible (torso, cabeza, extremidades con proporciones
 * humanas). `tone` la tiñe (piel, músculo...) y `opacity` la hace fantasma.
 */
export function HumanForm({ tone = '#e9b48c', opacity = 1 }: { tone?: string; opacity?: number }) {
  const o = opacity;
  const parts: Array<{ pos: V3; scale: V3; r?: number }> = [
    // Cabeza y cuello
    { pos: [0, 1.44, 0], scale: [0.82, 0.98, 0.9], r: 0.34 },
    { pos: [0, 1.28, 0.05], scale: [0.6, 0.55, 0.6], r: 0.34 }, // mandíbula
    { pos: [0, 1.12, 0], scale: [0.42, 0.5, 0.42], r: 0.34 }, // cuello
    // Tronco
    { pos: [0, 0.62, 0], scale: [1.2, 1.05, 0.72], r: 0.42 }, // tórax
    { pos: [0, 0.18, 0], scale: [1.0, 1.0, 0.66], r: 0.38 }, // abdomen
    { pos: [0, -0.2, 0], scale: [1.15, 0.85, 0.72], r: 0.4 }, // pelvis
    // Hombros
    { pos: [-0.5, 0.92, 0], scale: [1, 1, 1], r: 0.2 },
    { pos: [0.5, 0.92, 0], scale: [1, 1, 1], r: 0.2 },
  ];
  const limbs: Array<{ a: V3; b: V3; r: number }> = [
    // Brazos (húmero + antebrazo)
    { a: [-0.52, 0.9, 0], b: [-0.62, 0.4, 0.02], r: 0.13 },
    { a: [-0.62, 0.4, 0.02], b: [-0.66, -0.08, 0.06], r: 0.11 },
    { a: [0.52, 0.9, 0], b: [0.62, 0.4, 0.02], r: 0.13 },
    { a: [0.62, 0.4, 0.02], b: [0.66, -0.08, 0.06], r: 0.11 },
    // Piernas (muslo + pantorrilla)
    { a: [-0.22, -0.42, 0], b: [-0.24, -1.02, 0.02], r: 0.17 },
    { a: [-0.24, -1.02, 0.02], b: [-0.22, -1.62, 0.02], r: 0.13 },
    { a: [0.22, -0.42, 0], b: [0.24, -1.02, 0.02], r: 0.17 },
    { a: [0.24, -1.02, 0.02], b: [0.22, -1.62, 0.02], r: 0.13 },
  ];
  const hands: V3[] = [
    [-0.68, -0.2, 0.06],
    [0.68, -0.2, 0.06],
  ];
  const feet: V3[] = [
    [-0.22, -1.68, 0.12],
    [0.22, -1.68, 0.12],
  ];

  return (
    <group>
      {parts.map((p, i) => (
        <Ell key={`p${i}`} pos={p.pos} scale={p.scale} r={p.r} color={tone} opacity={o} />
      ))}
      {limbs.map((l, i) => (
        <Limb key={`l${i}`} a={l.a} b={l.b} r={l.r} color={tone} opacity={o} />
      ))}
      {hands.map((h, i) => (
        <Ell key={`h${i}`} pos={h} scale={[0.9, 1.2, 0.5]} r={0.12} color={tone} opacity={o} />
      ))}
      {feet.map((f, i) => (
        <Ell key={`f${i}`} pos={f} scale={[0.7, 0.5, 1.5]} r={0.13} color={tone} opacity={o} />
      ))}
    </group>
  );
}

/** Segmento cónico entre dos puntos (extremidades). */
function Limb({ a, b, r, color, opacity = 1 }: { a: V3; b: V3; r: number; color: string; opacity?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const length = dir.length();
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: mid.toArray() as V3, quat: q, len: length };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <capsuleGeometry args={[r, len, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.8} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Esqueleto                                                           */
/* ------------------------------------------------------------------ */

const BONE = '#efe7d2';

function boneMat(opacity = 1) {
  return <meshStandardMaterial color={BONE} roughness={0.7} flatShading transparent={opacity < 1} opacity={opacity} />;
}

/** Esqueleto: cráneo, columna (vértebras), caja torácica, pelvis y huesos. */
export function Skeleton({ opacity = 1 }: { opacity?: number }) {
  // Costillas: pares de arcos desde la columna rodeando el pecho.
  const ribs = useMemo(() => {
    const list: V3[][] = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.86 - i * 0.1;
      const w = 0.5 - i * 0.012;
      const depth = 0.34 - i * 0.006;
      const right: V3[] = [
        [0, y, -0.14],
        [w * 0.55, y + 0.02, depth * 0.2],
        [w, y - 0.02, depth],
        [w * 0.7, y - 0.06, depth + 0.05],
        [w * 0.25, y - 0.1, depth * 0.9],
      ];
      list.push(right);
      list.push(mirrorX(right));
    }
    return list;
  }, []);

  const vertebrae = useMemo(() => Array.from({ length: 14 }, (_, i) => 1.02 - i * 0.09), []);
  const limbBones: Array<{ a: V3; b: V3; r: number }> = [
    { a: [-0.5, 0.92, 0], b: [-0.62, 0.42, 0.02], r: 0.05 },
    { a: [-0.62, 0.42, 0.02], b: [-0.66, -0.06, 0.06], r: 0.04 },
    { a: [0.5, 0.92, 0], b: [0.62, 0.42, 0.02], r: 0.05 },
    { a: [0.62, 0.42, 0.02], b: [0.66, -0.06, 0.06], r: 0.04 },
    { a: [-0.2, -0.35, 0], b: [-0.24, -1.02, 0.02], r: 0.07 },
    { a: [-0.24, -1.02, 0.02], b: [-0.22, -1.6, 0.02], r: 0.05 },
    { a: [0.2, -0.35, 0], b: [0.24, -1.02, 0.02], r: 0.07 },
    { a: [0.24, -1.02, 0.02], b: [0.22, -1.6, 0.02], r: 0.05 },
  ];

  return (
    <group>
      {/* Cráneo + mandíbula */}
      <mesh position={[0, 1.46, 0]} scale={[0.8, 0.95, 0.9]} castShadow>
        <sphereGeometry args={[0.34, 20, 16]} />
        {boneMat(opacity)}
      </mesh>
      <mesh position={[0, 1.3, 0.06]} scale={[0.6, 0.4, 0.6]} castShadow>
        <sphereGeometry args={[0.34, 16, 12]} />
        {boneMat(opacity)}
      </mesh>
      {/* Cuencas de los ojos */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 1.46, 0.28]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#2a2620" roughness={1} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      {/* Columna vertebral */}
      {vertebrae.map((y, i) => (
        <mesh key={i} position={[0, y, -0.13]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.07, 8]} />
          {boneMat(opacity)}
        </mesh>
      ))}
      {/* Esternón */}
      <mesh position={[0, 0.62, 0.34]} castShadow>
        <boxGeometry args={[0.1, 0.5, 0.04]} />
        {boneMat(opacity)}
      </mesh>
      {/* Costillas */}
      {ribs.map((r, i) => (
        <Tube key={i} points={r} radius={0.028} color={BONE} opacity={opacity} />
      ))}
      {/* Clavículas */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.26, 0.98, 0.22]} rotation={[0, 0, s * 0.2]} castShadow>
          <capsuleGeometry args={[0.03, 0.42, 4, 8]} />
          {boneMat(opacity)}
        </mesh>
      ))}
      {/* Cadera / pelvis */}
      <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.32, 0.09, 10, 20, Math.PI * 1.3]} />
        {boneMat(opacity)}
      </mesh>
      {/* Huesos de brazos y piernas */}
      {limbBones.map((b, i) => (
        <BoneLimb key={i} a={b.a} b={b.b} r={b.r} opacity={opacity} />
      ))}
    </group>
  );
}

function BoneLimb({ a, b, r, opacity = 1 }: { a: V3; b: V3; r: number; opacity?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const length = dir.length();
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: mid.toArray() as V3, quat: q, len: length };
  }, [a, b]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, len, 8]} />
        {boneMat(opacity)}
      </mesh>
      {[len / 2, -len / 2].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <sphereGeometry args={[r * 1.5, 8, 8]} />
          {boneMat(opacity)}
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sistema circulatorio: arterias (rojas) + venas (azules)             */
/* ------------------------------------------------------------------ */

const ARTERY = '#c62828';
const VEIN = '#2f5fb0';

/** Red de vasos: aorta, carótidas, subclavias y sus venas, con latido. */
export function Circulatory() {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const period = 60 / 90;
    const p = (clock.elapsedTime % period) / period;
    const bump = Math.exp(-Math.pow((p - 0) / 0.06, 2)) + Math.exp(-Math.pow((p - 0.28) / 0.06, 2));
    pulse.current.scale.setScalar(1 + bump * 0.03);
  });

  // Arterias principales (rojas), lado derecho; se reflejan al izquierdo.
  const arteriesR: V3[][] = [
    // Aorta ascendente + cayado + descendente hasta la pelvis
    [[-0.05, 0.5, 0.12], [-0.02, 0.72, 0.06], [-0.02, 0.86, -0.02], [-0.02, 0.5, -0.06], [-0.02, 0.0, -0.05], [-0.02, -0.28, -0.03]],
    // Carótida al cuello y cabeza
    [[-0.02, 0.86, -0.02], [0.06, 1.05, 0.0], [0.09, 1.3, 0.03], [0.06, 1.45, 0.05]],
    // Subclavia → brazo
    [[-0.02, 0.86, -0.02], [0.34, 0.9, 0], [0.6, 0.62, 0.02], [0.64, 0.1, 0.05], [0.66, -0.15, 0.06]],
    // Ilíaca → pierna
    [[-0.02, -0.28, -0.03], [0.18, -0.42, 0], [0.24, -1.0, 0.02], [0.22, -1.55, 0.02]],
  ];
  // Venas (azules), ligeramente desplazadas hacia fuera y delante.
  const veinsR: V3[][] = [
    [[0.05, 0.5, 0.16], [0.05, 0.9, 0.06], [0.06, 0.5, 0.0], [0.05, 0.0, 0.02], [0.05, -0.28, 0.02]],
    [[0.05, 0.9, 0.06], [0.12, 1.08, 0.05], [0.13, 1.34, 0.06]],
    [[0.05, 0.9, 0.06], [0.38, 0.92, 0.04], [0.66, 0.64, 0.06], [0.7, 0.1, 0.08]],
    [[0.05, -0.28, 0.02], [0.24, -0.42, 0.04], [0.3, -1.0, 0.05], [0.27, -1.55, 0.05]],
  ];

  return (
    <group ref={pulse}>
      {arteriesR.map((p, i) => (
        <Tube key={`ar${i}`} points={p} radius={0.032 - i * 0.003} color={ARTERY} emissive={ARTERY} emissiveIntensity={0.15} />
      ))}
      {arteriesR.map((p, i) => (
        <Tube key={`al${i}`} points={mirrorX(p)} radius={0.032 - i * 0.003} color={ARTERY} emissive={ARTERY} emissiveIntensity={0.15} />
      ))}
      {veinsR.map((p, i) => (
        <Tube key={`vr${i}`} points={p} radius={0.03 - i * 0.003} color={VEIN} />
      ))}
      {veinsR.map((p, i) => (
        <Tube key={`vl${i}`} points={mirrorX(p)} radius={0.03 - i * 0.003} color={VEIN} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sistema nervioso: cerebro + médula + nervios                        */
/* ------------------------------------------------------------------ */

const NERVE = '#e8d24a';

/** Médula espinal y nervios que salen hacia las extremidades. */
export function NervousNet() {
  const spinal: V3[] = [
    [0, 1.2, -0.08],
    [0, 0.8, -0.1],
    [0, 0.3, -0.1],
    [0, -0.1, -0.08],
    [0, -0.3, -0.06],
  ];
  const branches: V3[][] = [
    [[0, 0.9, -0.1], [0.35, 0.88, 0], [0.6, 0.5, 0.03], [0.65, 0.0, 0.05]],
    [[0, -0.2, -0.07], [0.2, -0.4, 0], [0.24, -1.0, 0.02], [0.22, -1.5, 0.02]],
  ];
  return (
    <group>
      <Tube points={spinal} radius={0.035} color={NERVE} emissive={NERVE} emissiveIntensity={0.2} />
      {branches.map((b, i) => (
        <group key={i}>
          <Tube points={b} radius={0.018} color={NERVE} emissive={NERVE} emissiveIntensity={0.15} />
          <Tube points={mirrorX(b)} radius={0.018} color={NERVE} emissive={NERVE} emissiveIntensity={0.15} />
        </group>
      ))}
    </group>
  );
}

/** Envoltorio que aplica un ligero latido a cualquier contenido (arterias). */
export function Heartbeat({ bpm = 90, amp = 0.03, children }: { bpm?: number; amp?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const period = 60 / bpm;
    const p = (clock.elapsedTime % period) / period;
    const bump = Math.exp(-Math.pow((p - 0) / 0.06, 2)) + Math.exp(-Math.pow((p - 0.28) / 0.06, 2)) * 0.7;
    ref.current.scale.setScalar(1 + bump * amp);
  });
  return <group ref={ref}>{children}</group>;
}
