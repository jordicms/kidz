import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { DINOS, ERA_COLORS, type Dino } from '../data/dinos';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import DinoModel from '../components/three/DinoModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

/** Un árbol low-poly (copa cónica + tronco). */
function Tree({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1, 6]} />
        <meshStandardMaterial color="#7a5230" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.7, 1.6, 7]} />
        <meshStandardMaterial color="#3f7d3a" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <coneGeometry args={[0.5, 1.1, 7]} />
        <meshStandardMaterial color="#4a9046" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

/** Dinosaurio paseando en círculo por la isla; al tocarlo se abre su ficha. */
function WalkingDino({ dino }: { dino: Dino }) {
  const group = useRef<THREE.Group>(null);
  const angle = useRef(dino.scene.path.phase ?? 0);
  const speed = useApp((s) => s.speed);
  const openDino = useApp((s) => s.openDino);

  useFrame((state, delta) => {
    angle.current += dino.scene.path.speed * speed * delta * 0.18;
    const r = dino.scene.path.radius;
    const a = angle.current;
    const g = group.current;
    if (!g) return;
    const baseH = dino.scene.path.height ?? 0;
    // Los voladores cabecean suavemente arriba/abajo.
    const h = baseH + (dino.fly ? Math.sin(state.clock.elapsedTime * 1.2) * 0.6 : 0);
    g.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    // Mira en la dirección del movimiento (tangente al círculo).
    const sign = Math.sign(dino.scene.path.speed) || 1;
    g.rotation.y = Math.atan2(-Math.sin(a) * sign, Math.cos(a) * sign);
    // Ligera inclinación al volar.
    g.rotation.z = dino.fly ? Math.sin(state.clock.elapsedTime * 1.2) * 0.12 : 0;
  });

  return (
    <group ref={group}>
      <group
        scale={dino.scene.scale}
        onClick={(e) => {
          e.stopPropagation();
          openDino(dino.id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <DinoModel dino={dino} moving={speed > 0} />
      </group>
      <Html center position={[0, dino.heightM * dino.scene.scale + 0.8, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={() => openDino(dino.id)}>
          <span className="chip">
            {dino.emoji} {dino.name.split(' ')[0]}
            <i className="era-pill" style={{ background: ERA_COLORS[dino.era] }}>
              {dino.era}
            </i>
          </span>
        </div>
      </Html>
    </group>
  );
}

function Island() {
  return (
    <group>
      {/* Tierra de la isla */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <cylinderGeometry args={[18, 20, 1, 48]} />
        <meshStandardMaterial color="#5fa052" flatShading roughness={1} />
      </mesh>
      {/* Playa */}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <cylinderGeometry args={[20, 21, 0.9, 48]} />
        <meshStandardMaterial color="#e6d59a" flatShading roughness={1} />
      </mesh>
      {/* Volcán al fondo */}
      <group position={[-9, 0, -9]}>
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[4, 5, 20]} />
          <meshStandardMaterial color="#6b5648" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 4.7, 0]}>
          <coneGeometry args={[1.2, 1, 16]} />
          <meshStandardMaterial color="#ff7a30" emissive="#ff5a1a" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Mar con olas suaves (desplazamiento de vértices por seno). */
function Water() {
  const quality = useApp((s) => s.quality);
  const seg = quality.tier === 'high' ? 48 : quality.tier === 'medium' ? 32 : 14;
  const geo = useMemo(() => new THREE.PlaneGeometry(170, 170, seg, seg), [seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.12 + t) * 0.28 + Math.cos(y * 0.18 + t * 0.8) * 0.28);
    }
    pos.needsUpdate = true;
    if (quality.tier === 'high') geo.computeVertexNormals();
  });

  return (
    <mesh geometry={geo} position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color="#2b86c5" transparent opacity={0.92} roughness={0.35} metalness={0.1} flatShading />
    </mesh>
  );
}

/** Nubes low-poly que se desplazan lentamente (se omiten en gama baja). */
function Clouds() {
  const ref = useRef<THREE.Group>(null);
  const quality = useApp((s) => s.quality);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += 0.012 * d;
  });
  if (quality.tier === 'low') return null;
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    const r = 16 + ((i * 7) % 9);
    return { key: i, pos: [Math.cos(a) * r, 13 + (i % 3) * 2, Math.sin(a) * r] as [number, number, number] };
  });
  return (
    <group ref={ref}>
      {clouds.map((c) => (
        <group key={c.key} position={c.pos}>
          {[[0, 0, 0], [1.6, -0.2, 0.3], [-1.5, -0.1, -0.2]].map((p, j) => (
            <mesh key={j} position={p as [number, number, number]}>
              <sphereGeometry args={[1.3, 8, 8]} />
              <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function DinoIslandScene() {
  const quality = useApp((s) => s.quality);
  const trees = useMemo(() => {
    const n = scaleCount(16, quality, 6);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.6;
      const r = 4 + ((i * 37) % 12);
      return {
        key: i,
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        scale: 0.8 + ((i * 13) % 7) / 10,
      };
    });
  }, [quality]);

  return (
    <div className="scene-canvas">
      <Canvas
        shadows={quality.tier !== 'low'}
        camera={{ position: [0, 12, 26], fov: 55 }}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias }}
      >
        <Sky sunPosition={[10, 6, -8]} turbidity={6} rayleigh={1.2} />
        <fog attach="fog" args={['#bcdcf5', 45, 90]} />
        <hemisphereLight args={['#bcdcf5', '#5fa052', 0.7]} />
        <directionalLight
          position={[10, 16, 4]}
          intensity={2.2}
          color="#fff4e0"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <Island />
        <Water />
        <Clouds />
        {trees.map((t) => (
          <Tree key={t.key} position={t.position} scale={t.scale} />
        ))}
        {DINOS.map((d) => (
          <WalkingDino key={d.id} dino={d} />
        ))}
        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI * 0.49}
          target={[0, 1, 0]}
        />
        <AdaptiveQuality />
        <Effects />
      </Canvas>
    </div>
  );
}
