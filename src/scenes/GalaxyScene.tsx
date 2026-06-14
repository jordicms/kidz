import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, ShootingStars } from '../components/three/SceneExtras';

/** Genera las estrellas de una galaxia espiral. */
export function generateGalaxy(
  count: number,
  radius: number,
  branches: number,
  inside: string,
  outside: string,
) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorInside = new THREE.Color(inside);
  const colorOutside = new THREE.Color(outside);
  const spin = 1.1;
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.6) * radius;
    const branchAngle = ((i % branches) / branches) * Math.PI * 2;
    const spinAngle = r * spin * 0.35;
    const randX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * r * 0.18;
    const randY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * (1 - r / radius) * 1.4;
    const randZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * r * 0.18;
    positions[i * 3] = Math.cos(branchAngle + spinAngle) * r + randX;
    positions[i * 3 + 1] = randY;
    positions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + randZ;
    const mixed = colorInside.clone().lerp(colorOutside, r / radius);
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  return { positions, colors };
}

export function GalaxyPoints({
  count = 22000,
  radius = 20,
  branches = 4,
  inside = '#ffd9a0',
  outside = '#7186e8',
  size = 0.07,
}: {
  count?: number;
  radius?: number;
  branches?: number;
  inside?: string;
  outside?: string;
  size?: number;
}) {
  const { positions, colors } = useMemo(
    () => generateGalaxy(count, radius, branches, inside, outside),
    [count, radius, branches, inside, outside],
  );
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function BlackHole() {
  const openDeepSpace = useApp((s) => s.openDeepSpace);
  const diskTexture = useMemo(() => createGlowTexture('accretion', 'rgba(255,170,70,1)'), []);
  const coreGlow = useMemo(() => createGlowTexture('bh-core', 'rgba(255,140,40,0.9)'), []);
  const diskRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (diskRef.current) diskRef.current.rotation.z += 0.6 * delta;
  });
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        openDeepSpace('sagitario-a');
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh ref={diskRef} rotation={[-Math.PI / 2.25, 0, 0]}>
        <ringGeometry args={[0.7, 2.6, 64]} />
        <meshBasicMaterial
          map={diskTexture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial map={coreGlow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.7} toneMapped={false} />
      </sprite>
      <Html center position={[0, 2.4, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={() => openDeepSpace('sagitario-a')}>
          <span className="chip">🕳️ Sagitario A* · ¡tócame!</span>
        </div>
      </Html>
    </group>
  );
}

function SunMarker() {
  const goSolar = useApp((s) => s.goSolar);
  const ref = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => createGlowTexture('sun-marker', 'rgba(255,210,100,1)'), []);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.25;
    ref.current?.scale.setScalar(s);
  });
  return (
    <group position={[8.5, 0.3, 5.2]}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          goSolar();
        }}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      <sprite scale={[1.4, 1.4, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <Html center position={[0, 1.1, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={goSolar}>
          <span className="chip">☀️ ¡Estamos aquí! Toca para volver</span>
        </div>
      </Html>
    </group>
  );
}

function RotatingGalaxy({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.015 * delta;
  });
  return (
    <group ref={ref}>
      <GalaxyPoints count={count} />
    </group>
  );
}

export default function GalaxyScene() {
  const quality = useApp((s) => s.quality);
  return (
    <div className="scene-canvas">
      <Canvas
        camera={{ position: [0, 16, 26], fov: 55 }}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias }}
      >
        <color attach="background" args={['#03040b']} />
        <Stars radius={200} depth={60} count={scaleCount(3000, quality, 600)} factor={4} saturation={0} fade />
        <RotatingGalaxy count={scaleCount(22000, quality, 7000)} />
        <BlackHole />
        <SunMarker />
        <ShootingStars count={2} radius={90} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={70} />
        <AdaptiveQuality />
        <Effects />
      </Canvas>
    </div>
  );
}
