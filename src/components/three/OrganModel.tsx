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
    case 'pulmones':
      return <Lungs color={organ.color} breathing={beating} />;
    case 'cerebro':
      return <Brain color={organ.color} />;
    case 'estomago':
      return <Stomach color={organ.color} churning={beating} />;
    case 'huesos':
      return <Bone color={organ.color} />;
    case 'musculos':
      return <Muscle color={organ.color} flexing={beating} />;
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

/** Pulmones: dos lóbulos que se hinchan al respirar + tráquea. */
function Lungs({ color, breathing }: { color: string; breathing: boolean }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame((s) => {
    const b = breathing ? 1 + Math.sin(s.clock.elapsedTime * 1.4) * 0.12 : 1;
    left.current?.scale.set(b, b, b);
    right.current?.scale.set(b, b, b);
  });
  const lobe = (
    <>
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.42, 18, 18]} />
        <meshStandardMaterial color={color} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.5, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color={color} flatShading roughness={0.7} />
      </mesh>
    </>
  );
  return (
    <group>
      {/* Tráquea */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.7, 10]} />
        <meshStandardMaterial color="#d8b3bd" flatShading />
      </mesh>
      <group ref={left} position={[-0.42, 0.1, 0]}>{lobe}</group>
      <group ref={right} position={[0.42, 0.1, 0]}>{lobe}</group>
    </group>
  );
}

/** Cerebro: dos hemisferios bulbosos + cerebelo. */
function Brain({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.08;
  });
  const mat = { color, flatShading: true, roughness: 0.7 } as const;
  const blobs: [number, number, number, number][] = [
    [-0.28, 0.2, 0.2, 0.34], [0.28, 0.2, 0.2, 0.34], [-0.3, 0.2, -0.2, 0.32], [0.3, 0.2, -0.2, 0.32],
    [-0.15, 0.5, 0, 0.3], [0.15, 0.5, 0, 0.3], [0, 0.3, 0.35, 0.3], [0, 0.3, -0.35, 0.3],
  ];
  return (
    <group ref={ref}>
      {blobs.map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} castShadow>
          <sphereGeometry args={[b[3], 14, 14]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {/* Cerebelo */}
      <mesh position={[0, -0.05, -0.3]} castShadow>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshStandardMaterial color="#c98ac0" flatShading />
      </mesh>
      {/* Tronco */}
      <mesh position={[0, -0.4, -0.1]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.4, 10]} />
        <meshStandardMaterial color="#c98ac0" flatShading />
      </mesh>
    </group>
  );
}

/** Estómago: una bolsa curva que amasa (gira un poco). */
function Stomach({ color, churning }: { color: string; churning: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.z = churning ? Math.sin(s.clock.elapsedTime * 2) * 0.1 : 0;
  });
  const mat = { color, flatShading: true, roughness: 0.65 } as const;
  return (
    <group ref={ref} rotation={[0, 0, 0.3]}>
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.5, 18, 18]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0.18, -0.45, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Entrada (esófago) y salida (intestino) */}
      <mesh position={[-0.1, 0.5, 0]} rotation={[0, 0, 0.3]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 10]} />
        <meshStandardMaterial color="#d98a4b" flatShading />
      </mesh>
      <mesh position={[0.42, -0.6, 0]} rotation={[0, 0, 1]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 10]} />
        <meshStandardMaterial color="#d98a4b" flatShading />
      </mesh>
    </group>
  );
}

/** Hueso representativo (fémur): cilindro con dos cabezas. */
function Bone({ color }: { color: string }) {
  const mat = { color, flatShading: true, roughness: 0.8 } as const;
  return (
    <group rotation={[0, 0, 0.15]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.6, 12]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {[0.8, -0.8].map((y) =>
        [-0.16, 0.16].map((x) => (
          <mesh key={`${y}-${x}`} position={[x, y, 0]} castShadow>
            <sphereGeometry args={[0.22, 14, 14]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Músculo representativo (bíceps flexionado): dos huesos + vientre muscular. */
function Muscle({ color, flexing }: { color: string; flexing: boolean }) {
  const belly = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!belly.current) return;
    const f = flexing ? 1 + Math.abs(Math.sin(s.clock.elapsedTime * 1.6)) * 0.25 : 1;
    belly.current.scale.set(1, f, 1);
  });
  return (
    <group rotation={[0, 0, 0.4]}>
      {/* Hueso del brazo */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 10]} />
        <meshStandardMaterial color="#efe7d2" flatShading />
      </mesh>
      <mesh position={[0.25, -0.45, 0]} rotation={[0, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 10]} />
        <meshStandardMaterial color="#efe7d2" flatShading />
      </mesh>
      {/* Vientre del músculo */}
      <mesh ref={belly} position={[0, 0.1, 0.12]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} flatShading roughness={0.6} />
      </mesh>
    </group>
  );
}
