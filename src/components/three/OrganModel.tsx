import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Organ } from '../../data/types';
import { HumanForm, Skeleton, Tube, type V3 } from './Anatomy';
import { getAnatomyModelUrl } from '../../utils/anatomyModels';
import GltfModel from './GltfModel';

/** Modelo de un órgano: usa el GLB anatómico real si existe; si no, procedural. */
export default function OrganModel({ organ, beating = true }: { organ: Organ; beating?: boolean }) {
  const url = getAnatomyModelUrl(organ.id);
  if (url) return <GltfModel url={url} height={1} />;
  switch (organ.id) {
    case 'pulmones':
      return <Lungs breathing={beating} />;
    case 'cerebro':
      return <Brain />;
    case 'estomago':
      return <Stomach churning={beating} />;
    case 'intestinos':
      return <Intestines />;
    case 'huesos':
      return (
        <group scale={0.34} position={[0, -0.05, 0]}>
          <Skeleton />
        </group>
      );
    case 'musculos':
      return (
        <group scale={0.34} position={[0, -0.05, 0]}>
          <HumanForm tone="#a83a3a" />
        </group>
      );
    case 'corazon':
    default:
      return <Heart beating={beating} />;
  }
}

/** Latido lub-dub: dos pulsos de escala por ciclo. */
function useBeat(ref: React.RefObject<THREE.Group | null>, beating: boolean, bpm = 90) {
  useFrame((s) => {
    if (!ref.current) return;
    if (!beating) {
      ref.current.scale.setScalar(1);
      return;
    }
    const period = 60 / bpm;
    const p = (s.clock.elapsedTime % period) / period;
    const bump = (x: number) => Math.exp(-Math.pow((p - x) / 0.06, 2));
    ref.current.scale.setScalar(1 + 0.1 * bump(0) + 0.06 * bump(0.28));
  });
}

/** Geometría de esfera con superficie arrugada (circunvoluciones del cerebro). */
function wrinkled(radius: number, freq = 20, amp = 0.03): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(radius, 40, 32);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const w = Math.sin(v.x * freq) * Math.sin(v.y * freq) * Math.sin(v.z * freq);
    v.addScaledVector(n, w * amp);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Corazón: aurículas, ventrículos y grandes vasos                     */
/* ------------------------------------------------------------------ */
function Heart({ beating }: { beating: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useBeat(ref, beating);
  const muscle = '#b02a3a';
  const musMat = { color: muscle, roughness: 0.55, flatShading: false } as const;
  return (
    <group ref={ref} rotation={[0, 0, 0.18]} scale={1.1}>
      {/* Masa ventricular (cuerpo) */}
      <mesh position={[0, -0.05, 0]} scale={[1, 1.1, 0.92]} castShadow>
        <sphereGeometry args={[0.5, 28, 24]} />
        <meshStandardMaterial {...musMat} />
      </mesh>
      {/* Punta (ápex) hacia abajo-izquierda */}
      <mesh position={[-0.12, -0.6, 0]} rotation={[0, 0, 0.25]} castShadow>
        <coneGeometry args={[0.34, 0.7, 24]} />
        <meshStandardMaterial {...musMat} />
      </mesh>
      {/* Surco entre ventrículos (línea más oscura) */}
      <mesh position={[0.02, -0.25, 0.4]} rotation={[0.2, 0, 0.2]}>
        <boxGeometry args={[0.03, 0.7, 0.06]} />
        <meshStandardMaterial color="#7e1f2c" roughness={0.6} />
      </mesh>
      {/* Aurículas (dos lóbulos superiores) */}
      <mesh position={[-0.28, 0.36, -0.02]} castShadow>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color="#9a2333" roughness={0.55} />
      </mesh>
      <mesh position={[0.28, 0.34, -0.02]} castShadow>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshStandardMaterial color="#9a2333" roughness={0.55} />
      </mesh>
      {/* Aorta (cayado) */}
      <Tube
        points={[[0, 0.4, 0], [0.02, 0.85, 0], [-0.12, 1.05, -0.02], [-0.34, 0.98, -0.05], [-0.4, 0.72, -0.05]] as V3[]}
        radius={0.1}
        color="#c62828"
      />
      {/* Tronco pulmonar */}
      <Tube points={[[-0.14, 0.45, 0.08], [-0.2, 0.9, 0.05], [-0.02, 1.02, 0.02]] as V3[]} radius={0.085} color="#5f86c0" />
      {/* Vena cava superior */}
      <Tube points={[[0.24, 0.42, -0.04], [0.28, 0.98, -0.04]] as V3[]} radius={0.07} color="#2f5fb0" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Pulmones: lóbulos + tráquea y bronquios                             */
/* ------------------------------------------------------------------ */
function Lungs({ breathing }: { breathing: boolean }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const b = breathing ? 1 + Math.sin(clock.elapsedTime * 1.3) * 0.09 : 1;
    left.current?.scale.set(b, 1, b);
    right.current?.scale.set(b, 1, b);
  });
  const lung = '#e0808f';
  const lobe = (y: number, r: number) => (
    <mesh position={[0, y, 0]} castShadow>
      <sphereGeometry args={[r, 20, 16]} />
      <meshStandardMaterial color={lung} roughness={0.7} />
    </mesh>
  );
  return (
    <group>
      {/* Tráquea + bifurcación en bronquios */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 0.7, 12]} />
        <meshStandardMaterial color="#d8b3bd" roughness={0.6} />
      </mesh>
      <Tube points={[[0, 0.62, 0], [-0.22, 0.45, 0], [-0.34, 0.3, 0]] as V3[]} radius={0.045} color="#d8b3bd" />
      <Tube points={[[0, 0.62, 0], [0.22, 0.45, 0], [0.34, 0.3, 0]] as V3[]} radius={0.045} color="#d8b3bd" />
      {/* Pulmón derecho (3 lóbulos), con muesca hacia el corazón */}
      <group ref={right} position={[-0.42, 0.25, 0]} scale-x={1}>
        <group scale={[0.85, 1.25, 0.7]}>
          {lobe(0.3, 0.33)}
          {lobe(0, 0.36)}
          {lobe(-0.32, 0.33)}
        </group>
      </group>
      {/* Pulmón izquierdo (2 lóbulos, algo más pequeño) */}
      <group ref={left} position={[0.42, 0.25, 0]}>
        <group scale={[0.8, 1.2, 0.68]}>
          {lobe(0.24, 0.32)}
          {lobe(-0.2, 0.34)}
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cerebro: hemisferios con circunvoluciones + cerebelo + tronco       */
/* ------------------------------------------------------------------ */
function Brain() {
  const geo = useMemo(() => wrinkled(0.42, 22, 0.035), []);
  const cereb = useMemo(() => wrinkled(0.2, 34, 0.02), []);
  const mat = { color: '#e8b7c0', roughness: 0.75 } as const;
  return (
    <group rotation={[0.1, 0, 0]}>
      {/* Dos hemisferios separados por la cisura */}
      <mesh geometry={geo} position={[-0.2, 0.12, 0]} scale={[0.92, 0.95, 1.15]} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={geo} position={[0.2, 0.12, 0]} scale={[0.92, 0.95, 1.15]} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Cerebelo (atrás-abajo) */}
      <mesh geometry={cereb} position={[0, -0.28, -0.34]} scale={[1.6, 0.9, 1]} castShadow>
        <meshStandardMaterial color="#d69aa6" roughness={0.8} />
      </mesh>
      {/* Tronco encefálico */}
      <mesh position={[0, -0.42, -0.18]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.4, 10]} />
        <meshStandardMaterial color="#d0949f" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Estómago: forma en J + esófago y duodeno                            */
/* ------------------------------------------------------------------ */
function Stomach({ churning }: { churning: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = churning ? Math.sin(clock.elapsedTime * 2) * 0.06 : 0;
  });
  const pink = '#d98a6a';
  return (
    <group ref={ref} rotation={[0, 0, 0.2]}>
      {/* Cuerpo del estómago (bolsa) */}
      <mesh position={[0, 0, 0]} scale={[0.9, 1.25, 0.8]} castShadow>
        <sphereGeometry args={[0.42, 24, 20]} />
        <meshStandardMaterial color={pink} roughness={0.6} />
      </mesh>
      <mesh position={[0.24, -0.42, 0]} scale={[0.7, 0.7, 0.7]} castShadow>
        <sphereGeometry args={[0.34, 20, 16]} />
        <meshStandardMaterial color={pink} roughness={0.6} />
      </mesh>
      {/* Esófago (entra por arriba) */}
      <Tube points={[[-0.12, 0.7, 0], [-0.16, 0.35, 0], [-0.1, 0.1, 0]] as V3[]} radius={0.07} color="#d8a28a" />
      {/* Duodeno (sale por abajo, curva) */}
      <Tube points={[[0.34, -0.55, 0], [0.42, -0.75, 0], [0.2, -0.85, 0.05]] as V3[]} radius={0.07} color="#d8a28a" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Intestinos: delgado enrollado + grueso en marco                     */
/* ------------------------------------------------------------------ */
function Intestines() {
  const small = useMemo(() => {
    const pts: V3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 7;
      const r = 0.34 * (1 - t * 0.55);
      pts.push([Math.cos(a) * r, -0.1 - t * 0.15 + Math.sin(a * 1.3) * 0.05, Math.sin(a) * r * 0.7 + 0.05]);
    }
    return pts;
  }, []);
  // Colon: sube por la derecha, cruza y baja por la izquierda.
  const colon: V3[] = [
    [0.42, -0.5, 0],
    [0.42, 0.28, 0],
    [0, 0.4, 0],
    [-0.42, 0.28, 0],
    [-0.42, -0.5, 0],
    [-0.1, -0.62, 0],
  ];
  return (
    <group scale={0.95}>
      <Tube points={colon} radius={0.1} color="#c98a72" />
      <Tube points={small} radius={0.075} color="#e0a58c" />
    </group>
  );
}
