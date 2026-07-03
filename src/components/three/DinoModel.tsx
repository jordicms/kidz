import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { Dino } from '../../data/dinos';
import { getModelUrl } from '../../utils/models';

/**
 * Modelo de un dinosaurio. Si hay un GLB para el dino (en src/assets/models o
 * vía `modelUrl`), carga ese modelo real (rigged + animado) con el pipeline de
 * drei. Si no, dibuja un dinosaurio procedural low-poly (offline, sin assets).
 */
export default function DinoModel({ dino, moving = true }: { dino: Dino; moving?: boolean }) {
  const url = dino.modelUrl ?? getModelUrl(dino.id);
  if (url) {
    return (
      <Suspense fallback={null}>
        <GltfDino url={url} moving={moving} />
      </Suspense>
    );
  }
  switch (dino.shape) {
    case 'ceratopsian':
      return <Ceratopsian dino={dino} moving={moving} />;
    case 'sauropod':
      return <Sauropod dino={dino} moving={moving} />;
    case 'stegosaur':
      return <Stegosaur dino={dino} moving={moving} />;
    case 'pterosaur':
      return <Pterosaur dino={dino} moving={moving} />;
    default:
      return <Theropod dino={dino} moving={moving} />;
  }
}

/* ------------------------------------------------------------------ */
/* Carga de modelo GLB real (Quaternius / Poly Pizza / Sketchfab CC0)  */
/* ------------------------------------------------------------------ */
function GltfDino({ url, moving }: { url: string; moving: boolean }) {
  const { scene } = useGLTF(url);
  // Los GLB con esqueleto (skinned) no se renderizan de forma fiable al
  // clonarlos, así que APLANAMOS el modelo a mallas estáticas en su pose de
  // reposo: se copia cada malla con su transformación mundial ya "horneada".
  // Siempre visible, mucho más ligero (sin mixers ni skinning por frame), y
  // la vida se la damos por código (balanceo + trote), como a los procedurales.
  const { object, fit } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const flat = new THREE.Group();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        const inst = new THREE.Mesh(m.geometry, m.material);
        inst.matrixAutoUpdate = false;
        inst.matrix.copy(m.matrixWorld);
        inst.castShadow = true;
        flat.add(inst);
      }
    });
    flat.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(flat);
    if (box.isEmpty() || !Number.isFinite(box.min.y)) {
      return { object: flat, fit: { k: 1, offset: [0, 0, 0] as [number, number, number] } };
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = size.y > 0 ? 3 / size.y : 1; // altura normalizada a ~3 unidades
    return {
      object: flat,
      fit: { k, offset: [-center.x * k, -box.min.y * k, -center.z * k] as [number, number, number] },
    };
  }, [scene]);

  // Vida procedural: trote (bote + balanceo) al moverse, respiración en reposo.
  const sway = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = sway.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (moving) {
      g.position.y = Math.abs(Math.sin(t * 6)) * 0.1;
      g.rotation.z = Math.sin(t * 6) * 0.035;
      g.rotation.x = Math.sin(t * 3) * 0.02;
    } else {
      g.position.y = Math.sin(t * 1.4) * 0.03;
      g.rotation.z = Math.sin(t * 0.9) * 0.01;
      g.rotation.x = 0;
    }
  });

  return (
    <group ref={sway}>
      <group scale={fit.k} position={fit.offset}>
        <primitive object={object} />
      </group>
    </group>
  );
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

/** Saurópodo gigante de cuello largo tipo Brachiosaurus, mirando hacia +Z. */
function Sauropod({ dino, moving }: { dino: Dino; moving: boolean }) {
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const neck = useRef<THREE.Group>(null);
  const c1 = dino.color;
  const c2 = dino.color2 ?? dino.color;

  useFrame((s) => {
    const t = s.clock.elapsedTime * 3;
    const amp = moving ? 0.28 : 0.03;
    legs[0].current && (legs[0].current.rotation.x = Math.sin(t) * amp);
    legs[3].current && (legs[3].current.rotation.x = Math.sin(t) * amp);
    legs[1].current && (legs[1].current.rotation.x = Math.sin(t + Math.PI) * amp);
    legs[2].current && (legs[2].current.rotation.x = Math.sin(t + Math.PI) * amp);
    if (neck.current) neck.current.rotation.x = Math.sin(t * 0.4) * 0.06 - 0.15;
  });

  const legPositions: [number, number, number][] = [
    [-0.7, 2.0, 1.1],
    [0.7, 2.0, 1.1],
    [-0.75, 2.0, -1.1],
    [0.75, 2.0, -1.1],
  ];

  return (
    <group>
      {/* Cuerpo enorme */}
      <Body color={c1} args={[1.0, 2.2, 6, 12]} position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Cuello largo hacia arriba-delante */}
      <group ref={neck} position={[0, 3.1, 1.1]}>
        <Body color={c1} args={[0.4, 1.6, 5, 10]} position={[0, 1.0, 0.5]} rotation={[Math.PI / 3, 0, 0]} />
        <Body color={c1} args={[0.3, 1.4, 5, 10]} position={[0, 2.4, 1.0]} rotation={[Math.PI / 3.2, 0, 0]} />
        {/* Cabeza pequeña */}
        <group position={[0, 3.4, 1.5]}>
          <Box color={c2} size={[0.4, 0.4, 0.7]} position={[0, 0, 0.2]} />
          <Eyes y={0.1} z={0.45} dx={0.18} />
        </group>
      </group>
      {/* Cola larga hacia atrás-abajo */}
      <Body color={c1} args={[0.4, 1.8, 5, 10]} position={[0, 2.2, -1.6]} rotation={[Math.PI / 2.4, 0, 0]} />
      <Body color={c1} args={[0.2, 1.6, 5, 8]} position={[0, 1.8, -2.9]} rotation={[Math.PI / 2.3, 0, 0]} />
      {/* Patas columna (delanteras más altas) */}
      {legPositions.map((p, i) => (
        <group key={i} ref={legs[i]} position={p}>
          <Box color={c1} size={[0.42, i < 2 ? 2.0 : 1.8, 0.42]} position={[0, i < 2 ? -1.0 : -0.9, 0]} />
          <Box color={c2} size={[0.46, 0.22, 0.5]} position={[0, i < 2 ? -2.0 : -1.8, 0.04]} />
        </group>
      ))}
    </group>
  );
}

/** Estegosaurio con placas y cola con pinchos, mirando hacia +Z. */
function Stegosaur({ dino, moving }: { dino: Dino; moving: boolean }) {
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const tail = useRef<THREE.Group>(null);
  const c1 = dino.color;
  const c2 = dino.color2 ?? dino.color;

  useFrame((s) => {
    const t = s.clock.elapsedTime * 4.5;
    const amp = moving ? 0.32 : 0.03;
    legs[0].current && (legs[0].current.rotation.x = Math.sin(t) * amp);
    legs[3].current && (legs[3].current.rotation.x = Math.sin(t) * amp);
    legs[1].current && (legs[1].current.rotation.x = Math.sin(t + Math.PI) * amp);
    legs[2].current && (legs[2].current.rotation.x = Math.sin(t + Math.PI) * amp);
    if (tail.current) tail.current.rotation.y = Math.sin(t * 0.6) * 0.2;
  });

  const legPositions: [number, number, number][] = [
    [-0.5, 0.95, 0.7],
    [0.5, 0.95, 0.7],
    [-0.55, 0.95, -0.7],
    [0.55, 0.95, -0.7],
  ];
  // Placas a lo largo del lomo.
  const plateZ = [0.8, 0.45, 0.1, -0.25, -0.6];

  return (
    <group>
      {/* Cuerpo arqueado */}
      <Body color={c1} args={[0.6, 1.7, 6, 12]} position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Cabeza pequeña y baja */}
      <group position={[0, 0.95, 1.3]}>
        <Box color={c2} size={[0.35, 0.35, 0.6]} position={[0, 0, 0.2]} />
        <Eyes y={0.08} z={0.4} dx={0.16} />
      </group>
      {/* Placas (dos colores alternos) */}
      {plateZ.map((z, i) => (
        <mesh key={i} position={[0, 2.0 + (i === 2 ? 0.15 : 0), z]} rotation={[0, 0, 0]} castShadow>
          <coneGeometry args={[0.34, 0.6, 4]} />
          <meshStandardMaterial color={i % 2 ? c2 : '#d98a3a'} flatShading roughness={0.95} />
        </mesh>
      ))}
      {/* Cola con pinchos (thagomizer) */}
      <group ref={tail} position={[0, 1.2, -0.9]}>
        <Body color={c1} args={[0.28, 1.2, 5, 8]} position={[0, -0.1, -0.8]} rotation={[Math.PI / 2.2, 0, 0]} />
        {[[-0.18, 0.18] as const, [0.18, -0.18] as const].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.1, -1.5 + z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.06, 0.5, 6]} />
            <meshStandardMaterial color="#efe6d2" flatShading />
          </mesh>
        ))}
      </group>
      {/* Patas */}
      {legPositions.map((p, i) => (
        <group key={i} ref={legs[i]} position={p}>
          <Box color={c1} size={[0.3, i < 2 ? 0.5 : 0.8, 0.3]} position={[0, i < 2 ? -0.25 : -0.4, 0]} />
          <Box color={c2} size={[0.32, 0.16, 0.4]} position={[0, i < 2 ? -0.5 : -0.8, 0.03]} />
        </group>
      ))}
    </group>
  );
}

/** Reptil volador tipo Pteranodon con alas que aletean, mirando hacia +Z. */
function Pterosaur({ dino, moving }: { dino: Dino; moving: boolean }) {
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const c1 = dino.color;
  const c2 = dino.color2 ?? dino.color;

  useFrame((s) => {
    const t = s.clock.elapsedTime * (moving ? 5 : 1.5);
    const flap = Math.sin(t) * 0.6;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });

  return (
    <group>
      {/* Cuerpo */}
      <Body color={c1} args={[0.26, 0.8, 5, 10]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Cabeza con pico largo y cresta */}
      <group position={[0, 0.15, 0.6]}>
        <Box color={c1} size={[0.3, 0.3, 0.4]} position={[0, 0, 0]} />
        {/* Pico */}
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.08, 0.8, 8]} />
          <meshStandardMaterial color={c2} flatShading />
        </mesh>
        {/* Cresta hacia atrás */}
        <mesh position={[0, 0.25, -0.25]} rotation={[-0.7, 0, 0]} castShadow>
          <coneGeometry args={[0.1, 0.6, 6]} />
          <meshStandardMaterial color={c2} flatShading />
        </mesh>
        <Eyes y={0.06} z={0.2} dx={0.14} />
      </group>
      {/* Alas que aletean */}
      {([['L', wingL, -1], ['R', wingR, 1]] as const).map(([k, ref, side]) => (
        <group key={k} ref={ref} position={[side * 0.15, 0.1, 0]}>
          <mesh position={[side * 1.1, 0, -0.1]} castShadow>
            <boxGeometry args={[2.0, 0.06, 1.0]} />
            <meshStandardMaterial color={c1} flatShading roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Cola corta */}
      <Body color={c1} args={[0.1, 0.7, 5, 8]} position={[0, -0.05, -0.7]} rotation={[Math.PI / 2.1, 0, 0]} />
    </group>
  );
}
