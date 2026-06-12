import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { UNIVERSE_OBJECTS } from '../data/deepSpace';
import type { DeepSpaceObject } from '../data/types';
import { useApp } from '../state/store';
import { createGlowTexture } from '../utils/textures';
import { GalaxyPoints } from './GalaxyScene';

function GlowSprite({
  textureKey,
  color,
  scale,
  position = [0, 0, 0] as [number, number, number],
  opacity = 1,
}: {
  textureKey: string;
  color: string;
  scale: number;
  position?: [number, number, number];
  opacity?: number;
}) {
  const map = useMemo(() => createGlowTexture(textureKey, color), [textureKey, color]);
  return (
    <sprite scale={[scale, scale, 1]} position={position}>
      <spriteMaterial map={map} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** Nube de nebulosa: varios brillos solapados de distintos colores. */
function Nebula({ id, colors }: { id: string; colors: string[] }) {
  const puffs = useMemo(() => {
    const rand = (n: number) => (Math.sin(id.length * 31 + n * 127.1) * 43758.5453) % 1;
    return Array.from({ length: 14 }, (_, i) => ({
      pos: [rand(i) * 2.4, rand(i + 50) * 1.6, rand(i + 90) * 1.2] as [number, number, number],
      scale: 1.4 + Math.abs(rand(i + 7)) * 2.4,
      color: colors[i % colors.length],
    }));
  }, [id, colors]);
  return (
    <group>
      {puffs.map((p, i) => (
        <GlowSprite
          key={i}
          textureKey={`${id}-puff-${i % colors.length}`}
          color={p.color}
          scale={p.scale}
          position={p.pos}
          opacity={0.5}
        />
      ))}
      <GlowSprite textureKey={`${id}-core`} color="rgba(255,255,255,0.9)" scale={0.9} />
    </group>
  );
}

/** Púlsar: estrella diminuta con dos haces de luz girando como un faro. */
function PulsarVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 3.5 * delta;
  });
  const beamMaterial = (
    <meshBasicMaterial color="#9ff7ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
  );
  return (
    <group rotation={[0, 0, 0.4]}>
      <group ref={ref}>
        <mesh position={[0, 1.8, 0]}>
          <coneGeometry args={[0.45, 3.4, 16, 1, true]} />
          {beamMaterial}
        </mesh>
        <mesh position={[0, -1.8, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.45, 3.4, 16, 1, true]} />
          {beamMaterial}
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#e8ffff" />
      </mesh>
      <GlowSprite textureKey="pulsar-glow" color="rgba(120,240,255,0.9)" scale={2} />
    </group>
  );
}

/** Cúmulo de estrellas jóvenes y azules. */
function ClusterVisual() {
  const stars: [number, number, number][] = [
    [0, 0, 0],
    [1.1, 0.5, 0.2],
    [-0.9, 0.7, -0.3],
    [0.6, -0.8, 0.4],
    [-0.7, -0.5, 0.1],
    [1.4, -0.3, -0.4],
    [-0.2, 1.2, 0.3],
  ];
  return (
    <group>
      {stars.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshBasicMaterial color="#cfe4ff" />
          </mesh>
          <GlowSprite textureKey="pleiades-glow" color="rgba(130,180,255,0.9)" scale={1.3} />
        </group>
      ))}
      <GlowSprite textureKey="pleiades-haze" color="rgba(120,160,255,0.35)" scale={5} />
    </group>
  );
}

/** Cuásar: núcleo brillantísimo con dos chorros de energía. */
function QuasarVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.8 * delta;
  });
  return (
    <group ref={ref} rotation={[0.3, 0, 0.2]}>
      {[1, -1].map((dir) => (
        <mesh key={dir} position={[0, dir * 2.1, 0]}>
          <cylinderGeometry args={[0.07, 0.18, 3.6, 12]} />
          <meshBasicMaterial color="#d6b3ff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 1.4, 48]} />
        <meshBasicMaterial
          map={createGlowTexture('quasar-disk', 'rgba(220,170,255,1)')}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <GlowSprite textureKey="quasar-core" color="rgba(255,240,255,1)" scale={2.4} />
    </group>
  );
}

const VISUALS: Record<string, ReactNode> = {
  andromeda: (
    <group rotation={[0.6, 0, 0.3]} scale={0.55}>
      <GalaxyPoints count={6000} radius={6} branches={2} inside="#ffe2b0" outside="#7fb3ff" size={0.09} />
      <GlowSprite textureKey="andromeda-core" color="rgba(255,230,180,0.9)" scale={2.2} />
    </group>
  ),
  orion: <Nebula id="orion" colors={['rgba(255,110,199,0.85)', 'rgba(170,90,255,0.8)', 'rgba(90,140,255,0.75)']} />,
  cangrejo: <Nebula id="cangrejo" colors={['rgba(255,169,77,0.85)', 'rgba(255,90,70,0.8)', 'rgba(120,220,140,0.5)']} />,
  pulsar: <PulsarVisual />,
  pleyades: <ClusterVisual />,
  quasar: <QuasarVisual />,
};

function UniverseObject({ obj, position }: { obj: DeepSpaceObject; position: [number, number, number] }) {
  const openDeepSpace = useApp((s) => s.openDeepSpace);
  return (
    <group position={position}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          openDeepSpace(obj.id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {VISUALS[obj.id]}
        {/* Esfera invisible para que sea fácil de tocar con el dedo */}
        <mesh visible={false}>
          <sphereGeometry args={[2.6, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <Html center position={[0, 3.1, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={() => openDeepSpace(obj.id)}>
          <span className="chip">
            {obj.emoji} {obj.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function UniverseScene() {
  const radius = 12;
  return (
    <div className="scene-canvas">
      <Canvas camera={{ position: [0, 6, 24], fov: 55 }} dpr={[1, 2]}>
        <color attach="background" args={['#02030a']} />
        <Stars radius={180} depth={80} count={6000} factor={4} saturation={0.4} fade speed={0.8} />
        {UNIVERSE_OBJECTS.map((obj, i) => {
          const a = (i / UNIVERSE_OBJECTS.length) * Math.PI * 2;
          const y = (i % 2 === 0 ? 1 : -1) * 1.6;
          return (
            <UniverseObject
              key={obj.id}
              obj={obj}
              position={[Math.cos(a) * radius, y, Math.sin(a) * radius]}
            />
          );
        })}
        <OrbitControls enablePan={false} minDistance={8} maxDistance={45} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
    </div>
  );
}
