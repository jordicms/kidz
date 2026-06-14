import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import type { Dino } from '../../data/dinos';

/**
 * Modelo de un dinosaurio. Si el dino define `modelUrl`, carga ese GLB real
 * (rigged + animado) con el pipeline de drei. Si no, dibuja un dinosaurio
 * procedural low-poly para que el prototipo funcione 100% offline sin assets.
 */
export default function DinoModel({ dino, moving = true }: { dino: Dino; moving?: boolean }) {
  if (dino.modelUrl) {
    return (
      <Suspense fallback={null}>
        <GltfDino url={dino.modelUrl} moving={moving} />
      </Suspense>
    );
  }
  return dino.shape === 'ceratopsian' ? (
    <Ceratopsian dino={dino} moving={moving} />
  ) : (
    <Theropod dino={dino} moving={moving} />
  );
}

/* ------------------------------------------------------------------ */
/* Carga de modelo GLB real (Quaternius / Poly Pizza / Sketchfab CC0)  */
/* ------------------------------------------------------------------ */
function GltfDino({ url, moving }: { url: string; moving: boolean }) {
  const { scene, animations } = useGLTF(url);
  // Clona para poder mostrar el mismo modelo varias veces sin compartir estado.
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const { actions, names } = useAnimations(animations, cloned);

  useEffect(() => {
    if (!names.length) return;
    const pick =
      names.find((n) => (moving ? /walk|run/i : /idle/i).test(n)) ??
      names.find((n) => /walk|idle/i.test(n)) ??
      names[0];
    const action = actions[pick];
    action?.reset().fadeIn(0.25).play();
    return () => {
      action?.fadeOut(0.25);
    };
  }, [actions, names, moving]);

  return <primitive object={cloned} castShadow receiveShadow />;
}

/* ------------------------------------------------------------------ */
/* Dinosaurios procedurales (fallback offline)                         */
/* ------------------------------------------------------------------ */

function Body({ color, args, position, rotation }: {
  color: string;
  args: [number, number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={args} />
      <meshStandardMaterial color={color} flatShading roughness={0.95} metalness={0} />
    </mesh>
  );
}

function Box({ color, size, position, rotation }: {
  color: string;
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} flatShading roughness={0.95} />
    </mesh>
  );
}

function Eyes({ y, z, dx }: { y: number; z: number; dx: number }) {
  return (
    <>
      {[-dx, dx].map((x) => (
        <mesh key={x} position={[x, y, z]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#10130a" />
        </mesh>
      ))}
    </>
  );
}

/** Carnívoro bípedo tipo T-Rex, mirando hacia +Z. */
function Theropod({ dino, moving }: { dino: Dino; moving: boolean }) {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const c1 = dino.color;
  const c2 = dino.color2 ?? dino.color;

  useFrame((s) => {
    const t = s.clock.elapsedTime * 6;
    const amp = moving ? 0.6 : 0.06;
    if (legL.current) legL.current.rotation.x = Math.sin(t) * amp;
    if (legR.current) legR.current.rotation.x = Math.sin(t + Math.PI) * amp;
    if (tail.current) tail.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    if (head.current) head.current.rotation.x = Math.sin(t * 0.5) * 0.06 - 0.1;
    if (bob.current) bob.current.position.y = (moving ? Math.abs(Math.sin(t)) * 0.1 : 0) + 0.02;
  });

  return (
    <group ref={bob}>
      {/* Torso */}
      <Body color={c1} args={[0.55, 1.3, 6, 12]} position={[0, 1.7, 0.1]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Cuello + cabeza */}
      <group ref={head} position={[0, 2.1, 1.0]}>
        <Body color={c1} args={[0.28, 0.7, 5, 10]} position={[0, 0.2, 0.2]} rotation={[Math.PI / 2.4, 0, 0]} />
        <Box color={c1} size={[0.5, 0.5, 1.0]} position={[0, 0.5, 0.85]} />
        {/* Mandíbula */}
        <Box color={c2} size={[0.46, 0.18, 0.9]} position={[0, 0.28, 0.9]} />
        <Eyes y={0.62} z={1.1} dx={0.22} />
      </group>
      {/* Brazos diminutos */}
      {[-0.42, 0.42].map((x) => (
        <Box key={x} color={c2} size={[0.12, 0.12, 0.4]} position={[x, 1.7, 0.7]} rotation={[0.6, 0, 0]} />
      ))}
      {/* Cola */}
      <group ref={tail} position={[0, 1.6, -0.6]}>
        <Body color={c1} args={[0.34, 1.0, 5, 10]} position={[0, -0.1, -0.7]} rotation={[Math.PI / 2.2, 0, 0]} />
        <Body color={c1} args={[0.16, 0.9, 5, 8]} position={[0, -0.3, -1.5]} rotation={[Math.PI / 2.1, 0, 0]} />
      </group>
      {/* Patas */}
      {([['L', legL, -0.4], ['R', legR, 0.4]] as const).map(([k, ref, x]) => (
        <group key={k} ref={ref} position={[x, 1.35, 0]}>
          <Box color={c1} size={[0.34, 0.9, 0.4]} position={[0, -0.45, 0]} />
          <Box color={c2} size={[0.26, 0.8, 0.34]} position={[0, -1.15, 0.05]} rotation={[-0.3, 0, 0]} />
          <Box color={c2} size={[0.3, 0.16, 0.6]} position={[0, -1.5, 0.2]} />
        </group>
      ))}
    </group>
  );
}

/** Herbívoro cuadrúpedo con cuernos y gola tipo Triceratops, mirando hacia +Z. */
function Ceratopsian({ dino, moving }: { dino: Dino; moving: boolean }) {
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const head = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const c1 = dino.color;
  const c2 = dino.color2 ?? dino.color;

  useFrame((s) => {
    const t = s.clock.elapsedTime * 5;
    const amp = moving ? 0.4 : 0.04;
    // Patas en diagonal (delantera-izq con trasera-der, etc.)
    legs[0].current && (legs[0].current.rotation.x = Math.sin(t) * amp);
    legs[3].current && (legs[3].current.rotation.x = Math.sin(t) * amp);
    legs[1].current && (legs[1].current.rotation.x = Math.sin(t + Math.PI) * amp);
    legs[2].current && (legs[2].current.rotation.x = Math.sin(t + Math.PI) * amp);
    if (head.current) head.current.rotation.x = Math.sin(t * 0.5) * 0.05;
    if (bob.current) bob.current.position.y = (moving ? Math.abs(Math.sin(t * 2)) * 0.04 : 0) + 0.02;
  });

  const legPositions: [number, number, number][] = [
    [-0.55, 1.0, 0.8],
    [0.55, 1.0, 0.8],
    [-0.6, 1.0, -0.8],
    [0.6, 1.0, -0.8],
  ];

  return (
    <group ref={bob}>
      {/* Cuerpo */}
      <Body color={c1} args={[0.7, 1.6, 6, 12]} position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Cabeza con gola y cuernos */}
      <group ref={head} position={[0, 1.35, 1.2]}>
        <Box color={c1} size={[0.7, 0.6, 0.9]} position={[0, 0, 0.3]} />
        {/* Pico */}
        <Box color={c2} size={[0.3, 0.3, 0.4]} position={[0, -0.1, 0.85]} />
        {/* Gola (escudo) */}
        <mesh position={[0, 0.25, -0.25]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.95, 0.6, 0.18, 12]} />
          <meshStandardMaterial color={c2} flatShading roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
        {/* Dos cuernos largos */}
        {[-0.28, 0.28].map((x) => (
          <mesh key={x} position={[x, 0.35, 0.55]} rotation={[0.5, 0, 0]} castShadow>
            <coneGeometry args={[0.09, 0.7, 8]} />
            <meshStandardMaterial color="#efe6d2" flatShading />
          </mesh>
        ))}
        {/* Cuerno del morro */}
        <mesh position={[0, 0.1, 0.8]} rotation={[0.2, 0, 0]} castShadow>
          <coneGeometry args={[0.08, 0.35, 8]} />
          <meshStandardMaterial color="#efe6d2" flatShading />
        </mesh>
        <Eyes y={0.12} z={0.7} dx={0.32} />
      </group>
      {/* Cola corta */}
      <Body color={c1} args={[0.22, 0.9, 5, 8]} position={[0, 1.1, -1.3]} rotation={[Math.PI / 2.2, 0, 0]} />
      {/* Patas columna */}
      {legPositions.map((p, i) => (
        <group key={i} ref={legs[i]} position={p}>
          <Box color={c1} size={[0.32, 0.7, 0.32]} position={[0, -0.35, 0]} />
          <Box color={c2} size={[0.34, 0.18, 0.4]} position={[0, -0.72, 0.04]} />
        </group>
      ))}
    </group>
  );
}
