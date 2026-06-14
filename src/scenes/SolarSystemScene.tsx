import { useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import { SUN, PLANETS, DWARF_PLANETS, ASTEROID_BELT } from '../data/solarSystem';
import type { Body, Moon } from '../data/types';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import CelestialBody from '../components/three/CelestialBody';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, ShootingStars, SpaceBackground } from '../components/three/SceneExtras';

const _hoverTarget = new THREE.Vector3();

/** Anima la escala de un grupo hacia un objetivo (feedback al pasar/tocar). */
function useHoverScale(ref: RefObject<THREE.Group | null>, hovered: RefObject<boolean>) {
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hovered.current ? 1.12 : 1;
    _hoverTarget.set(target, target, target);
    ref.current.scale.lerp(_hoverTarget, 1 - Math.pow(0.001, delta));
  });
}

function BodyLabel({ body, offsetY }: { body: Body; offsetY: number }) {
  const openBody = useApp((s) => s.openBody);
  return (
    <Html center position={[0, offsetY, 0]} zIndexRange={[5, 0]}>
      <div
        className="body-label"
        onClick={(e) => {
          e.stopPropagation();
          openBody(body.id);
        }}
      >
        <span className="chip">
          {body.emoji} {body.name}
        </span>
      </div>
    </Html>
  );
}

function OrbitingMoon({ moon, speedScale }: { moon: Moon; speedScale: number }) {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(Math.random() * Math.PI * 2);
  const speed = useApp((s) => s.speed);
  useFrame((_, delta) => {
    angle.current += moon.speed * speed * speedScale * delta;
    ref.current?.position.set(
      Math.cos(angle.current) * moon.distance,
      0,
      Math.sin(angle.current) * moon.distance,
    );
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[moon.size, 16, 16]} />
        <meshStandardMaterial color={moon.color} roughness={1} />
      </mesh>
    </group>
  );
}

function OrbitingBody({ body }: { body: Body }) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const angle = useRef(body.scene.phase ?? 0);
  const speed = useApp((s) => s.speed);
  const openBody = useApp((s) => s.openBody);

  useFrame((_, delta) => {
    angle.current += body.scene.orbitSpeed * speed * delta * 0.35;
    const d = body.scene.distance;
    orbitRef.current?.position.set(Math.cos(angle.current) * d, 0, Math.sin(angle.current) * d);
    if (spinRef.current) spinRef.current.rotation.y += body.scene.rotationSpeed * speed * delta;
  });
  useHoverScale(scaleRef, hovered);

  return (
    <group ref={orbitRef} position={[body.scene.distance, 0, 0]}>
      <group
        ref={scaleRef}
        onClick={(e) => {
          e.stopPropagation();
          openBody(body.id);
        }}
        onPointerOver={() => {
          hovered.current = true;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = 'auto';
        }}
      >
        <group ref={spinRef}>
          <CelestialBody body={body} />
        </group>
      </group>
      {body.moons.map((m) => (
        <OrbitingMoon key={m.id} moon={m} speedScale={0.6} />
      ))}
      <BodyLabel body={body} offsetY={(body.scene.rings?.outer ?? body.scene.size) + 0.9} />
    </group>
  );
}

function OrbitLine({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);
  return <Line points={points} color="#5a6494" transparent opacity={0.35} lineWidth={1} />;
}

function AsteroidBelt({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null);
  const speed = useApp((s) => s.speed);
  const matrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = ASTEROID_BELT.inner + Math.random() * (ASTEROID_BELT.outer - ASTEROID_BELT.inner);
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.8, Math.sin(a) * r);
      const s = 0.04 + Math.random() * 0.1;
      dummy.scale.setScalar(s);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.012 * speed * delta;
  });

  return (
    <group ref={ref}>
      <instancedMesh
        args={[undefined, undefined, count]}
        ref={(mesh) => {
          if (!mesh) return;
          matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
          mesh.instanceMatrix.needsUpdate = true;
        }}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8a8275" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function Sun() {
  const spinRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const speed = useApp((s) => s.speed);
  const openBody = useApp((s) => s.openBody);
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += SUN.scene.rotationSpeed * speed * delta;
  });
  useHoverScale(scaleRef, hovered);
  return (
    <group>
      <group
        ref={scaleRef}
        onClick={(e) => {
          e.stopPropagation();
          openBody(SUN.id);
        }}
        onPointerOver={() => {
          hovered.current = true;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = 'auto';
        }}
      >
        <group ref={spinRef}>
          <CelestialBody body={SUN} />
        </group>
      </group>
      <BodyLabel body={SUN} offsetY={SUN.scene.size + 1.2} />
      <pointLight intensity={2.4} decay={0} color="#fff2d5" />
    </group>
  );
}

export default function SolarSystemScene() {
  const bodies = [...PLANETS, ...DWARF_PLANETS];
  const quality = useApp((s) => s.quality);
  return (
    <div className="scene-canvas">
      <Canvas
        camera={{ position: [0, 32, 54], fov: 55 }}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias }}
      >
        <color attach="background" args={['#05060f']} />
        <SpaceBackground />
        <ambientLight intensity={0.35} />
        <Stars
          radius={220}
          depth={60}
          count={scaleCount(4000, quality, 800)}
          factor={5}
          saturation={0}
          fade
          speed={0.6}
        />
        <Sun />
        {bodies.map((b) => (
          <OrbitLine key={`orbit-${b.id}`} radius={b.scene.distance} />
        ))}
        {bodies.map((b) => (
          <OrbitingBody key={b.id} body={b} />
        ))}
        <AsteroidBelt count={scaleCount(ASTEROID_BELT.count, quality, 200)} />
        <ShootingStars count={2} radius={140} />
        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={120}
          maxPolarAngle={Math.PI * 0.85}
        />
        <AdaptiveQuality />
        <Effects />
      </Canvas>
    </div>
  );
}
