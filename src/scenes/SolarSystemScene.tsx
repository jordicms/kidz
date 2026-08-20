import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, GodRays } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { SUN, PLANETS, DWARF_PLANETS, ASTEROID_BELT } from '../data/solarSystem';
import type { Body, Moon } from '../data/types';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import Controls from '../components/three/Controls';
import CelestialBody from '../components/three/CelestialBody';
import { createMoonTexture, createGlowTexture } from '../utils/textures';
import { AdaptiveQuality, ShootingStars, SpaceBackground } from '../components/three/SceneExtras';

const _hoverTarget = new THREE.Vector3();

/** Petición de vuelo de cámara hacia un astro (al tocarlo). */
type FlyRequest = { id: string; pos: THREE.Vector3; size: number } | null;
type SelectFn = (body: Body, pos: THREE.Vector3) => void;

type SceneConf = Body['scene'];

/** Radio orbital para un ángulo dado (elipse con el Sol en un foco). */
function orbitRadius(s: SceneConf, theta: number): number {
  const e = s.eccentricity ?? 0;
  return (s.distance * (1 - e * e)) / (1 + e * Math.cos(theta));
}

/** Punto 3D de la órbita: elipse con giro del perihelio e inclinación. */
function orbitPoint(s: SceneConf, theta: number): [number, number, number] {
  const r = orbitRadius(s, theta);
  let x = Math.cos(theta) * r;
  let z = Math.sin(theta) * r;
  const w = s.periapsis ?? 0;
  if (w) {
    const c = Math.cos(w);
    const sn = Math.sin(w);
    [x, z] = [x * c - z * sn, x * sn + z * c];
  }
  const inc = s.inclination ?? 0;
  if (inc) return [x, z * Math.sin(inc), z * Math.cos(inc)];
  return [x, 0, z];
}

/** Anima la escala de un grupo hacia un objetivo (feedback al pasar/tocar). */
function useHoverScale(ref: RefObject<THREE.Group | null>, hovered: RefObject<boolean>) {
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hovered.current ? 1.12 : 1;
    _hoverTarget.set(target, target, target);
    ref.current.scale.lerp(_hoverTarget, 1 - Math.pow(0.001, delta));
  });
}

function BodyLabel({ body, offsetY, onTap }: { body: Body; offsetY: number; onTap: () => void }) {
  return (
    <Html center position={[0, offsetY, 0]} zIndexRange={[5, 0]}>
      <div
        className="body-label"
        onClick={(e) => {
          e.stopPropagation();
          onTap();
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
  const texture = useMemo(() => createMoonTexture(moon.id, moon.color), [moon.id, moon.color]);
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[moon.size, 20, 20]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
    </group>
  );
}

function OrbitingBody({ body, onSelect }: { body: Body; onSelect: SelectFn }) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const angle = useRef(body.scene.phase ?? 0);
  const speed = useApp((s) => s.speed);
  const select = () => {
    const pos = new THREE.Vector3();
    orbitRef.current?.getWorldPosition(pos);
    onSelect(body, pos);
  };

  useFrame((_, delta) => {
    // Velocidad variable (2.ª ley de Kepler): más rápido cerca del Sol.
    const r = orbitRadius(body.scene, angle.current);
    const ratio = body.scene.distance / r;
    angle.current += body.scene.orbitSpeed * speed * delta * 0.35 * ratio * ratio;
    const [x, y, z] = orbitPoint(body.scene, angle.current);
    orbitRef.current?.position.set(x, y, z);
    if (spinRef.current) spinRef.current.rotation.y += body.scene.rotationSpeed * speed * delta;
  });
  useHoverScale(scaleRef, hovered);

  return (
    <group ref={orbitRef} position={[body.scene.distance, 0, 0]}>
      <group
        ref={scaleRef}
        onClick={(e) => {
          e.stopPropagation();
          select();
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
      <BodyLabel body={body} offsetY={(body.scene.rings?.outer ?? body.scene.size) + 0.9} onTap={select} />
    </group>
  );
}

function OrbitLine({ scene }: { scene: SceneConf }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      pts.push(orbitPoint(scene, (i / 160) * Math.PI * 2));
    }
    return pts;
  }, [scene]);
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

function Sun({ onSelect, onSunMesh }: { onSelect: SelectFn; onSunMesh: (m: THREE.Mesh | null) => void }) {
  const spinRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const speed = useApp((s) => s.speed);
  const select = () => onSelect(SUN, new THREE.Vector3(0, 0, 0));
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += SUN.scene.rotationSpeed * speed * delta;
  });
  useHoverScale(scaleRef, hovered);
  return (
    <group>
      {/* Fuente de los god rays: disco brillante aditivo apenas mayor que el Sol */}
      <mesh ref={onSunMesh}>
        <sphereGeometry args={[SUN.scene.size * 1.04, 32, 32]} />
        <meshBasicMaterial
          color="#ffd9a0"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group
        ref={scaleRef}
        onClick={(e) => {
          e.stopPropagation();
          select();
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
      <BodyLabel body={SUN} offsetY={SUN.scene.size + 1.2} onTap={select} />
      <pointLight intensity={2.4} decay={0} color="#fff2d5" />
    </group>
  );
}

/**
 * Director de cámara: vuelo de entrada al montar la escena y acercamiento
 * cinematográfico al astro que tocas antes de abrir su ficha.
 */
function CameraDirector({
  fly,
  controls,
  onArrived,
}: {
  fly: FlyRequest;
  controls: RefObject<{ enabled: boolean } | null>;
  onArrived: (id: string) => void;
}) {
  const camera = useThree((s) => s.camera);
  const anim = useRef<{
    mode: 'intro' | 'fly';
    t: number;
    dur: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    look: THREE.Vector3;
    id?: string;
  } | null>(null);

  // Vuelo de entrada: desde lejos hasta la posición habitual.
  useEffect(() => {
    camera.position.set(0, 72, 150);
    anim.current = {
      mode: 'intro',
      t: 0,
      dur: 2.4,
      from: camera.position.clone(),
      to: new THREE.Vector3(0, 32, 54),
      look: new THREE.Vector3(0, 0, 0),
    };
  }, [camera]);

  // Acercamiento al astro seleccionado.
  useEffect(() => {
    if (!fly) return;
    const dir = camera.position.clone().sub(fly.pos).normalize();
    const to = fly.pos.clone().addScaledVector(dir, Math.max(fly.size * 4.5, 4));
    to.y += fly.size * 1.1;
    anim.current = {
      mode: 'fly',
      t: 0,
      dur: 0.85,
      from: camera.position.clone(),
      to,
      look: fly.pos.clone(),
      id: fly.id,
    };
  }, [fly, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    if (controls.current) controls.current.enabled = false;
    a.t = Math.min(1, a.t + delta / a.dur);
    const e = a.mode === 'intro' ? 1 - Math.pow(1 - a.t, 3) : a.t * a.t * (3 - 2 * a.t);
    camera.position.lerpVectors(a.from, a.to, e);
    camera.lookAt(a.look);
    if (a.t >= 1) {
      anim.current = null;
      if (controls.current) controls.current.enabled = true;
      if (a.mode === 'fly' && a.id) onArrived(a.id);
    }
  });
  return null;
}

/** Postprocesado del sistema solar: god rays desde el Sol + bloom + ACES. */
function SolarEffects({ sun }: { sun: THREE.Mesh | null }) {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;

  if (sun) {
    return (
      <EffectComposer multisampling={quality.antialias ? 4 : 0}>
        <GodRays
          sun={sun}
          samples={quality.tier === 'high' ? 60 : 32}
          density={0.97}
          decay={0.93}
          weight={0.35}
          exposure={0.45}
          clampMax={1}
          blur
        />
        <Bloom intensity={quality.bloomIntensity} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.28} darkness={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={quality.antialias ? 4 : 0}>
      <Bloom intensity={quality.bloomIntensity} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
      <Vignette eskil={false} offset={0.28} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/** Cometa en órbita muy elíptica; su cola apunta siempre en contra del Sol. */
function Comet() {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const angle = useRef(1.2);
  const speed = useApp((s) => s.speed);
  const openDeepSpace = useApp((s) => s.openDeepSpace);
  const coma = useMemo(() => createGlowTexture('comet-coma', 'rgba(200,235,255,1)'), []);
  const scene = useMemo<SceneConf>(
    () => ({ size: 0.5, distance: 46, orbitSpeed: 0.55, rotationSpeed: 0, eccentricity: 0.66, periapsis: 2.4, inclination: 0.5 }),
    [],
  );
  const dir = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, -1, 0), []);

  useFrame((_, delta) => {
    const r = orbitRadius(scene, angle.current);
    const ratio = scene.distance / r;
    angle.current += scene.orbitSpeed * speed * delta * 0.35 * ratio * ratio;
    const [x, y, z] = orbitPoint(scene, angle.current);
    group.current?.position.set(x, y, z);
    dir.set(x, y, z).normalize(); // dirección "en contra del Sol"
    quat.setFromUnitVectors(up, dir);
    tail.current?.quaternion.copy(quat);
  });

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        openDeepSpace('cometa');
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#dff0ff" emissive="#bfe0ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <sprite scale={[1.5, 1.5, 1]}>
        <spriteMaterial map={coma} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={tail}>
        {/* Cola de iones (azulada, larga y recta) */}
        <mesh position={[0, -3.2, 0]}>
          <coneGeometry args={[0.95, 6.4, 16, 1, true]} />
          <meshBasicMaterial color="#9fd6ff" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        {/* Cola de polvo (más blanca y corta) */}
        <mesh position={[0.15, -1.9, 0.1]} rotation={[0, 0, 0.18]}>
          <coneGeometry args={[0.55, 3.6, 12, 1, true]} />
          <meshBasicMaterial color="#ffe9c8" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <BodyLabel body={{ id: 'cometa', name: 'Cometa', emoji: '☄️' } as unknown as Body} offsetY={1} onTap={() => openDeepSpace('cometa')} />
    </group>
  );
}

export default function SolarSystemScene() {
  const bodies = [...PLANETS, ...DWARF_PLANETS];
  const quality = useApp((s) => s.quality);
  const openBody = useApp((s) => s.openBody);
  const [fly, setFly] = useState<FlyRequest>(null);
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);

  const onSelect: SelectFn = (body, pos) => setFly({ id: body.id, pos, size: body.scene.size });

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
        <Sun onSelect={onSelect} onSunMesh={setSunMesh} />
        {bodies.map((b) => (
          <OrbitLine key={`orbit-${b.id}`} scene={b.scene} />
        ))}
        {bodies.map((b) => (
          <OrbitingBody key={b.id} body={b} onSelect={onSelect} />
        ))}
        <AsteroidBelt count={scaleCount(ASTEROID_BELT.count, quality, 200)} />
        <Comet />
        {/* Lluvia de meteoritos: estrellas fugaces frecuentes cruzando el cielo */}
        <ShootingStars count={quality.tier === 'low' ? 3 : 6} radius={120} />
        <Controls
          ref={controlsRef as never}
          minDistance={8}
          maxDistance={160}
          maxPolarAngle={Math.PI * 0.85}
        />
        <CameraDirector fly={fly} controls={controlsRef} onArrived={openBody} />
        <AdaptiveQuality />
        <SolarEffects sun={quality.tier !== 'low' ? sunMesh : null} />
      </Canvas>
    </div>
  );
}
