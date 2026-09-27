import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { noise3 } from '../../utils/sdf';

/**
 * Los protagonistas del viaje, con carita para que los niños los sigan:
 * un glóbulo rojo (que cambia de color al cargar y soltar oxígeno), un bocado
 * de comida (que se deshace por el camino) y una burbuja de aire (que cambia
 * oxígeno por dióxido de carbono en los alvéolos).
 */

/** Estado compartido del viaje, actualizado cada frame por la escena. */
export interface RideState {
  s: number;
  station: number;
  /** Progreso 0–1 dentro de la estación. */
  k: number;
  /** Carga de oxígeno del glóbulo (0 = oscuro, 1 = rojo brillante). */
  o2: number;
  /** Cuánto queda del bocado (1 = entero). */
  food: number;
  /** Proporción de CO₂ dentro de la burbuja de aire. */
  co2: number;
  time: number;
  /** Posición del protagonista en el mundo. */
  pos: THREE.Vector3;
  /** Avance 0–1 por el minimapa del cuerpo. */
  route: number;
}

export function makeRideState(): RideState {
  return { s: 0, station: 0, k: 0, o2: 0.2, food: 1, co2: 0, time: 0, pos: new THREE.Vector3(), route: 0 };
}

/** Carita: ojos que parpadean y miran a la cámara, más una sonrisa. */
export function Face({ scale = 1, z = 0.5 }: { scale?: number; z?: number }) {
  const lids = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % 3.7;
    const blink = t > 3.55 ? 0.1 : 1;
    lids.current?.scale.set(1, blink, 1);
  });
  return (
    <group scale={scale} position={[0, 0.05, z]}>
      <group ref={lids}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.17, 0.08, 0]}>
            <mesh>
              <sphereGeometry args={[0.1, 20, 16]} />
              <meshPhysicalMaterial color="#ffffff" roughness={0.15} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0, 0.07]}>
              <sphereGeometry args={[0.052, 16, 12]} />
              <meshBasicMaterial color="#1a0f10" />
            </mesh>
            <mesh position={[0.02, 0.025, 0.11]}>
              <sphereGeometry args={[0.016, 8, 6]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, -0.1, 0.02]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.1, 0.022, 8, 20, Math.PI]} />
        <meshBasicMaterial color="#3a0a10" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Glóbulo rojo                                                        */
/* ------------------------------------------------------------------ */

/** Disco bicóncavo real (fórmula de Evans–Fung) por torno. */
export function rbcGeometry(radius = 0.5, segments = 40) {
  const pts: THREE.Vector2[] = [];
  const N = 24;
  const h = (p: number) => 0.5 * Math.sqrt(Math.max(0, 1 - p * p)) * (0.207 + 2.003 * p * p - 1.123 * p ** 4);
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    pts.push(new THREE.Vector2(Math.max(0.0001, p * radius), h(p) * radius));
  }
  for (let i = N; i >= 0; i--) {
    const p = i / N;
    pts.push(new THREE.Vector2(Math.max(0.0001, p * radius), -h(p) * radius));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

const DARK = new THREE.Color('#6e0a18');
const BRIGHT = new THREE.Color('#ff2e2e');

export function RedCell({ state }: { state: RideState }) {
  const geo = useMemo(() => rbcGeometry(0.62), []);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const body = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const c = DARK.clone().lerp(BRIGHT, state.o2);
    mat.current?.color.copy(c);
    mat.current?.emissive.copy(c).multiplyScalar(0.05 + state.o2 * 0.12);
    if (body.current) body.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.15;
  });
  return (
    <group ref={body}>
      {/* El disco mira a la cámara (eje del torno hacia +Z local) */}
      <mesh geometry={geo} rotation-x={Math.PI / 2}>
        <meshPhysicalMaterial ref={mat} roughness={0.45} clearcoat={0.35} clearcoatRoughness={0.4} sheen={0.5} sheenColor="#ff9090" />
      </mesh>
      <Face scale={0.85} z={0.2} />
      <O2Badge state={state} />
    </group>
  );
}

/** Moléculas de oxígeno "enganchadas" al glóbulo (aparecen al pasar por los pulmones). */
function O2Badge({ state }: { state: RideState }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const n = Math.round(state.o2 * 8);
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = i < n;
      const a = (i / 8) * Math.PI * 2 + clock.elapsedTime * 0.8;
      m.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.05);
    });
  });
  return (
    <group>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshBasicMaterial color="#6fd0ff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Bocado de comida                                                    */
/* ------------------------------------------------------------------ */

export function FoodBite({ state }: { state: RideState }) {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.55, 4);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = noise3(v.x * 4, v.y * 4, v.z * 4);
      v.multiplyScalar(0.85 + n * 0.35);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const g = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const solid = new THREE.Color('#c07a3a');
  const mush = new THREE.Color('#e6c070');
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const size = 0.45 + 0.55 * state.food;
    const wob = state.station >= 2 ? 0.08 : 0.02;
    g.current?.scale.set(size * (1 + Math.sin(t * 5) * wob), size * (1 + Math.cos(t * 4.3) * wob), size);
    if (g.current) g.current.rotation.z = Math.sin(t * 0.9) * 0.2;
    mat.current?.color.copy(solid).lerp(mush, 1 - state.food);
  });
  return (
    <group ref={g}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial ref={mat} roughness={0.55} clearcoat={0.6} clearcoatRoughness={0.3} sheen={0.5} sheenColor="#ffd9a0" />
      </mesh>
      <Face scale={0.9} z={0.46} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Burbuja de aire                                                     */
/* ------------------------------------------------------------------ */

export function AirBubble({ state }: { state: RideState }) {
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const g = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: 14 }, (_, i) => [Math.random() * 6.28, Math.random() * 6.28, 0.18 + Math.random() * 0.28, i]), []);
  const o2c = new THREE.Color('#5fd0ff');
  const co2c = new THREE.Color('#9a9aa8');
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.scale.set(1 + Math.sin(t * 2.2) * 0.04, 1 + Math.cos(t * 2.2) * 0.04, 1);
    dots.current.forEach((m, i) => {
      if (!m) return;
      const [a, b, r] = seeds[i];
      m.position.set(Math.cos(a + t * 0.7) * r, Math.sin(b + t * 0.9) * r, Math.sin(a + b + t * 0.5) * r * 0.6);
      const isCo2 = i / seeds.length < state.co2;
      mats.current[i]?.color.copy(isCo2 ? co2c : o2c);
    });
  });
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.62, 40, 30]} />
        <meshPhysicalMaterial color="#bfeaff" emissive="#3aa8e0" emissiveIntensity={0.35} roughness={0.05} metalness={0} transparent opacity={0.5} clearcoat={1} iridescence={1} iridescenceIOR={1.3} depthWrite={false} />
      </mesh>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(m) => (dots.current[i] = m)}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial ref={(m) => (mats.current[i] = m)} color="#5fd0ff" toneMapped={false} />
        </mesh>
      ))}
      <Face scale={0.85} z={0.55} />
    </group>
  );
}
