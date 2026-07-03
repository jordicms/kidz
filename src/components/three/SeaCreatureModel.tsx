import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SeaCreature } from '../../data/ocean';

/** Modelo procedural low-poly de una criatura marina, con su animación de nado. */
export default function SeaCreatureModel({ creature }: { creature: SeaCreature }) {
  switch (creature.shape) {
    case 'whale':
      return <Whale c1={creature.color} c2={creature.color2 ?? creature.color} />;
    case 'turtle':
      return <Turtle c1={creature.color} c2={creature.color2 ?? creature.color} />;
    case 'shark':
      return <Shark c1={creature.color} c2={creature.color2 ?? creature.color} />;
    case 'jelly':
      return <Jelly c1={creature.color} c2={creature.color2 ?? creature.color} />;
    case 'octopus':
      return <Octopus c1={creature.color} />;
    case 'angler':
    default:
      return <Angler c1={creature.color} c2={creature.color2 ?? '#8af0e8'} />;
  }
}

const mat = (color: string) => <meshStandardMaterial color={color} flatShading roughness={0.8} />;

/** Ballena: cuerpo enorme, cola que sube y baja, aletas. Mira hacia +Z. */
function Whale({ c1, c2 }: { c1: string; c2: string }) {
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.x = Math.sin(clock.elapsedTime * 1.6) * 0.35;
  });
  return (
    <group>
      <mesh castShadow>
        <capsuleGeometry args={[0.55, 1.6, 6, 12]} />
        {mat(c1)}
      </mesh>
      {/* Vientre claro */}
      <mesh position={[0, -0.18, 0.1]} scale={[0.92, 0.6, 1.5]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        {mat(c2)}
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, -0.05, 1.05]} scale={[1, 0.8, 1]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        {mat(c1)}
      </mesh>
      {/* Aletas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.6, -0.25, 0.5]} rotation={[0, 0, s * -0.5]} scale={[0.7, 0.08, 0.3]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          {mat(c1)}
        </mesh>
      ))}
      {/* Cola */}
      <group ref={tail} position={[0, 0, -1.15]}>
        <mesh position={[0, 0, -0.4]} scale={[0.3, 0.3, 0.9]}>
          <sphereGeometry args={[0.45, 10, 10]} />
          {mat(c1)}
        </mesh>
        <mesh position={[0, 0, -0.85]} rotation={[0, 0, 0]} scale={[1.1, 0.08, 0.4]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          {mat(c1)}
        </mesh>
      </group>
      {/* Ojos */}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[s * 0.35, 0.05, 1.35]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#10130a" />
        </mesh>
      ))}
    </group>
  );
}

/** Tortuga: caparazón + aletas que reman. */
function Turtle({ c1, c2 }: { c1: string; c2: string }) {
  const flippers = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 2.2) * 0.5;
    flippers[0].current && (flippers[0].current.rotation.z = 0.4 + f * 0.5);
    flippers[1].current && (flippers[1].current.rotation.z = -0.4 - f * 0.5);
  });
  return (
    <group>
      <mesh scale={[1, 0.5, 1.2]} castShadow>
        <sphereGeometry args={[0.55, 12, 10]} />
        {mat(c2)}
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[0.9, 0.5, 1.05]}>
        <sphereGeometry args={[0.55, 10, 8]} />
        {mat('#2d6b38')}
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, 0, 0.85]} castShadow>
        <sphereGeometry args={[0.2, 10, 10]} />
        {mat(c1)}
      </mesh>
      {/* Aletas delanteras (reman) */}
      {[-1, 1].map((s, i) => (
        <group key={s} ref={flippers[i]} position={[s * 0.5, 0, 0.35]}>
          <mesh position={[s * 0.35, 0, 0]} scale={[0.75, 0.07, 0.3]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            {mat(c1)}
          </mesh>
        </group>
      ))}
      {/* Aletas traseras */}
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} position={[s * 0.35, 0, -0.6]} scale={[0.4, 0.06, 0.25]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          {mat(c1)}
        </mesh>
      ))}
    </group>
  );
}

/** Tiburón: cuerpo hidrodinámico, aleta dorsal y cola que barre. */
function Shark({ c1, c2 }: { c1: string; c2: string }) {
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * 3.2) * 0.45;
  });
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.35, 1.4, 6, 12]} />
        {mat(c1)}
      </mesh>
      <mesh position={[0, -0.12, 0.2]} scale={[0.85, 0.55, 1.3]}>
        <sphereGeometry args={[0.34, 10, 10]} />
        {mat(c2)}
      </mesh>
      {/* Morro */}
      <mesh position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.3, 0.6, 10]} />
        {mat(c1)}
      </mesh>
      {/* Aleta dorsal */}
      <mesh position={[0, 0.5, 0.1]} rotation={[0.25, 0, 0]} scale={[0.08, 1, 0.55]} castShadow>
        <coneGeometry args={[0.5, 1, 4]} />
        {mat(c1)}
      </mesh>
      {/* Aletas laterales */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, -0.15, 0.35]} rotation={[0, 0, s * -0.9]} scale={[0.08, 0.7, 0.35]}>
          <coneGeometry args={[0.5, 1, 4]} />
          {mat(c1)}
        </mesh>
      ))}
      {/* Cola (barre de lado a lado) */}
      <group ref={tail} position={[0, 0, -0.95]}>
        <mesh position={[0, 0.22, -0.35]} rotation={[-0.5, 0, 0]} scale={[0.07, 0.9, 0.4]}>
          <coneGeometry args={[0.5, 1, 4]} />
          {mat(c1)}
        </mesh>
        <mesh position={[0, -0.12, -0.3]} rotation={[Math.PI - 0.6, 0, 0]} scale={[0.07, 0.6, 0.35]}>
          <coneGeometry args={[0.5, 1, 4]} />
          {mat(c1)}
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[s * 0.22, 0.1, 0.95]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#10130a" />
        </mesh>
      ))}
    </group>
  );
}

/** Medusa: campana translúcida que pulsa + tentáculos ondulantes. */
function Jelly({ c1, c2 }: { c1: string; c2: string }) {
  const bell = useRef<THREE.Mesh>(null);
  const tentacles = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = 1 + Math.sin(t * 2.2) * 0.12;
    bell.current?.scale.set(p, 1.6 - p * 0.45, p);
    if (tentacles.current) tentacles.current.rotation.y = Math.sin(t * 0.7) * 0.15;
  });
  return (
    <group>
      <mesh ref={bell} castShadow>
        <sphereGeometry args={[0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={c1} transparent opacity={0.7} roughness={0.3} side={THREE.DoubleSide} emissive={c1} emissiveIntensity={0.4} />
      </mesh>
      <group ref={tentacles}>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.28, -0.55, Math.sin(a) * 0.28]} rotation={[Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2]}>
              <cylinderGeometry args={[0.02, 0.008, 1.1, 5]} />
              <meshStandardMaterial color={c2} transparent opacity={0.6} emissive={c2} emissiveIntensity={0.3} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** Pulpo: cabeza blanda + ocho tentáculos que ondulan. */
function Octopus({ c1 }: { c1: string }) {
  const arms = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    arms.current?.children.forEach((arm, i) => {
      arm.rotation.x = 0.85 + Math.sin(t * 1.8 + i) * 0.22;
    });
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} scale={[1, 1.15, 1]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        {mat(c1)}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.2, 0.28, 0.38]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color="#fff2d5" />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`p${s}`} position={[s * 0.2, 0.28, 0.44]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshStandardMaterial color="#10130a" />
        </mesh>
      ))}
      <group ref={arms}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.3, -0.15, Math.sin(a) * 0.3]} rotation={[0.85, -a, 0]}>
              <mesh position={[0, -0.35, 0]}>
                <cylinderGeometry args={[0.07, 0.02, 0.8, 6]} />
                {mat(c1)}
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** Rape abisal: cuerpo oscuro, dientes y farolillo LUMINOSO (con luz real). */
function Angler({ c1, c2 }: { c1: string; c2: string }) {
  const lure = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.7 + Math.sin(t * 3.4) * 0.3 + Math.sin(t * 9.1) * 0.12;
    if (light.current) light.current.intensity = 2.4 * pulse;
    const m = lure.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 2.2 * pulse;
    lure.current?.position.set(0, 0.72 + Math.sin(t * 1.4) * 0.04, 0.62);
  });
  return (
    <group>
      <mesh scale={[0.9, 1, 1.1]} castShadow>
        <sphereGeometry args={[0.5, 12, 12]} />
        {mat(c1)}
      </mesh>
      {/* Boca enorme con dientes */}
      <mesh position={[0, -0.08, 0.42]} rotation={[0.5, 0, 0]} scale={[0.8, 0.35, 0.5]}>
        <sphereGeometry args={[0.42, 10, 10]} />
        <meshStandardMaterial color="#1a1420" flatShading />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.25 + i * 0.1, 0.06, 0.62]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.12, 4]} />
          <meshStandardMaterial color="#e8f0f2" />
        </mesh>
      ))}
      {/* Antena + farolillo */}
      <mesh position={[0, 0.55, 0.35]} rotation={[0.7, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.55, 4]} />
        {mat(c1)}
      </mesh>
      <mesh ref={lure} position={[0, 0.72, 0.62]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.72, 0.62]} color={c2} intensity={2.4} distance={7} decay={2} />
      {/* Ojos pequeños */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.28, 0.18, 0.42]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#cfe8ea" emissive="#cfe8ea" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Cola */}
      <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]} scale={[0.08, 0.5, 0.5]}>
        <coneGeometry args={[0.5, 1, 4]} />
        {mat(c1)}
      </mesh>
    </group>
  );
}
