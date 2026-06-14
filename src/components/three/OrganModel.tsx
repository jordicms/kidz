import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Organ } from '../../data/types';

/**
 * Modelo procedural low-poly de un órgano. Por ahora el corazón (que late);
 * estructurado para añadir pulmones, cerebro, estómago, etc. (como DinoModel).
 */
export default function OrganModel({ organ, beating = true }: { organ: Organ; beating?: boolean }) {
  switch (organ.id) {
    case 'corazon':
    default:
      return <Heart color={organ.color} beating={beating} />;
  }
}

/** Latido lub-dub a ~90 ppm: dos pulsos de escala por ciclo. */
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
    ref.current.scale.setScalar(1 + 0.12 * bump(0) + 0.07 * bump(0.28));
  });
}

function Heart({ color, beating }: { color: string; beating: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useBeat(ref, beating);
  const mat = { color, flatShading: true, roughness: 0.6, metalness: 0 } as const;

  return (
    <group ref={ref}>
      {/* Dos lóbulos superiores */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.55, 20, 20]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {/* Cuerpo central */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.62, 20, 20]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Punta inferior (cono hacia abajo) */}
      <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.62, 1.1, 20]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Vasos: aorta y arterias (tubos en lo alto) */}
      <mesh position={[0, 1.15, -0.05]} rotation={[0.15, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.7, 12]} />
        <meshStandardMaterial color="#b3283c" flatShading roughness={0.6} />
      </mesh>
      <mesh position={[-0.3, 1.0, 0.1]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.5, 10]} />
        <meshStandardMaterial color="#7fa8e0" flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0.32, 1.0, 0.1]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.5, 10]} />
        <meshStandardMaterial color="#c0394d" flatShading roughness={0.6} />
      </mesh>
    </group>
  );
}
