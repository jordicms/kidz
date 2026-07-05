import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { UNIVERSE_OBJECTS } from '../data/deepSpace';
import type { DeepSpaceObject } from '../data/types';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import {
  createAccretionTexture,
  createFlareTexture,
  createGlowTexture,
  createSpiralHazeTexture,
} from '../utils/textures';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, IntroFly, ShootingStars, SpaceBackground } from '../components/three/SceneExtras';
import { GalaxyPoints } from './GalaxyScene';

function GlowSprite({
  textureKey,
  color,
  scale,
  scaleY,
  position = [0, 0, 0] as [number, number, number],
  opacity = 1,
  rotation = 0,
  flare = false,
}: {
  textureKey: string;
  color: string;
  scale: number;
  /** Alto distinto al ancho (filamentos alargados). */
  scaleY?: number;
  position?: [number, number, number];
  opacity?: number;
  rotation?: number;
  /** Usa la textura de estrella con picos de difracción. */
  flare?: boolean;
}) {
  const map = useMemo(
    () => (flare ? createFlareTexture(textureKey, color) : createGlowTexture(textureKey, color)),
    [textureKey, color, flare],
  );
  return (
    <sprite scale={[scale, scaleY ?? scale, 1]} position={position}>
      <spriteMaterial
        map={map}
        transparent
        opacity={opacity}
        rotation={rotation}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

/** Latido suave de escala para dar vida (cada elemento con su fase). */
function Pulse({
  speed = 1,
  amp = 0.1,
  phase = 0,
  children,
}: {
  speed?: number;
  amp?: number;
  phase?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    ref.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * speed + phase) * amp);
  });
  return <group ref={ref}>{children}</group>;
}

/** Nube de nebulosa: brillos que respiran, estrellas recién nacidas con
 *  destello, filamentos alargados y, opcionalmente, un púlsar parpadeante
 *  en el centro (la Nebulosa del Cangrejo tiene uno de verdad). */
function Nebula({
  id,
  colors,
  filaments = 0,
  stars = 3,
  strobeCore = false,
}: {
  id: string;
  colors: string[];
  filaments?: number;
  stars?: number;
  strobeCore?: boolean;
}) {
  const data = useMemo(() => {
    const seed = id.length * 7 + id.charCodeAt(0);
    const rand = (n: number) => {
      const x = Math.sin(seed * 31.7 + n * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    const puffs = Array.from({ length: 14 }, (_, i) => ({
      pos: [(rand(i) - 0.5) * 3.4, (rand(i + 50) - 0.5) * 2.4, (rand(i + 90) - 0.5) * 1.8] as [number, number, number],
      scale: 1.4 + rand(i + 7) * 2.4,
      color: colors[i % colors.length],
      speed: 0.25 + rand(i + 31) * 0.4,
      phase: rand(i + 13) * Math.PI * 2,
    }));
    const sparks = Array.from({ length: stars }, (_, i) => ({
      pos: [(rand(i + 200) - 0.5) * 1.6, (rand(i + 220) - 0.5) * 1.2, (rand(i + 240) - 0.5) * 0.9] as [number, number, number],
      scale: 0.45 + rand(i + 260) * 0.4,
      speed: 1.5 + rand(i + 280) * 2,
      phase: rand(i + 300) * Math.PI * 2,
    }));
    const fils = Array.from({ length: filaments }, (_, i) => ({
      pos: [(rand(i + 400) - 0.5) * 2.6, (rand(i + 420) - 0.5) * 2, (rand(i + 440) - 0.5) * 1.2] as [number, number, number],
      rot: rand(i + 460) * Math.PI,
      len: 1.6 + rand(i + 480) * 1.6,
      color: colors[i % colors.length],
    }));
    return { puffs, sparks, fils };
  }, [id, colors, filaments, stars]);

  return (
    <group>
      {data.puffs.map((p, i) => (
        <group key={`p${i}`} position={p.pos}>
          <Pulse speed={p.speed} amp={0.1} phase={p.phase}>
            <GlowSprite textureKey={`${id}-puff-${i % colors.length}`} color={p.color} scale={p.scale} opacity={0.5} />
          </Pulse>
        </group>
      ))}
      {data.fils.map((f, i) => (
        <GlowSprite
          key={`f${i}`}
          textureKey={`${id}-fil-${i % colors.length}`}
          color={f.color}
          scale={f.len}
          scaleY={0.08}
          rotation={f.rot}
          position={f.pos}
          opacity={0.55}
        />
      ))}
      {data.sparks.map((s, i) => (
        <group key={`s${i}`} position={s.pos}>
          <Pulse speed={s.speed} amp={0.3} phase={s.phase}>
            <GlowSprite flare textureKey={`${id}-star`} color="rgba(235,245,255,1)" scale={s.scale} />
          </Pulse>
        </group>
      ))}
      {strobeCore ? (
        <Pulse speed={9} amp={0.55}>
          <GlowSprite flare textureKey={`${id}-pulsar`} color="rgba(200,240,255,1)" scale={0.7} />
        </Pulse>
      ) : (
        <GlowSprite textureKey={`${id}-core`} color="rgba(255,255,255,0.9)" scale={0.9} />
      )}
    </group>
  );
}

/** Púlsar: faro cósmico con haces que barren, destello estroboscópico y
 *  anillos de campo magnético en contrarrotación. */
function PulsarVisual() {
  const spin = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const core = useRef<THREE.Group>(null);
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#9ff7ff',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useFrame(({ clock }, delta) => {
    if (spin.current) spin.current.rotation.y += 3.5 * delta;
    if (rings.current) rings.current.rotation.y -= 0.6 * delta;
    const flash = Math.pow((Math.sin(clock.elapsedTime * 7) + 1) / 2, 5);
    core.current?.scale.setScalar(1 + flash * 1.4);
    beamMaterial.opacity = 0.3 + flash * 0.55;
  });
  return (
    <group rotation={[0, 0, 0.4]}>
      <group ref={spin}>
        <mesh position={[0, 1.8, 0]} material={beamMaterial}>
          <coneGeometry args={[0.45, 3.4, 16, 1, true]} />
        </mesh>
        <mesh position={[0, -1.8, 0]} rotation={[Math.PI, 0, 0]} material={beamMaterial}>
          <coneGeometry args={[0.45, 3.4, 16, 1, true]} />
        </mesh>
      </group>
      <group ref={rings}>
        {[0.55, 0.78].map((r, i) => (
          <mesh key={r} rotation={[Math.PI / 2 + (i ? 0.25 : -0.15), 0, 0]}>
            <torusGeometry args={[r, 0.015, 10, 64]} />
            <meshBasicMaterial
              color="#7fe8ff"
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#e8ffff" toneMapped={false} />
      </mesh>
      <group ref={core}>
        <GlowSprite flare textureKey="pulsar-flare" color="rgba(140,240,255,1)" scale={2.2} />
      </group>
    </group>
  );
}

/** Cúmulo de estrellas jóvenes: destellos de difracción que titilan. */
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
          <Pulse speed={1.1 + (i % 4) * 0.6} amp={0.22} phase={i * 1.7}>
            <GlowSprite flare textureKey="pleiades-flare" color="rgba(205,228,255,1)" scale={1.6} />
          </Pulse>
          <GlowSprite textureKey="pleiades-glow" color="rgba(130,180,255,0.9)" scale={1.2} opacity={0.75} />
        </group>
      ))}
      <GlowSprite textureKey="pleiades-haze" color="rgba(120,160,255,0.35)" scale={5.5} />
    </group>
  );
}

/** Pulsos de energía que viajan por los chorros del cuásar. */
function JetPulses({ dir }: { dir: number }) {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const map = useMemo(() => createGlowTexture('jet-blob', 'rgba(230,190,255,1)'), []);
  useFrame(({ clock }) => {
    for (let i = 0; i < 3; i++) {
      const s = refs.current[i];
      if (!s) continue;
      const t = (clock.elapsedTime * 0.45 + i / 3) % 1;
      s.position.set(0, dir * (0.6 + t * 3.4), 0);
      s.scale.setScalar(0.22 + t * 0.3);
      (s.material as THREE.SpriteMaterial).opacity = (1 - t) * 0.9;
    }
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <spriteMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}

/** Cuásar: disco de acreción girando a toda velocidad, chorros con pulsos de
 *  energía viajando y núcleo con destello. */
function QuasarVisual() {
  const ref = useRef<THREE.Group>(null);
  const disk = useRef<THREE.Mesh>(null);
  const diskMap = useMemo(() => createAccretionTexture(), []);
  const diskGeo = useMemo(() => {
    const inner = 0.5;
    const outer = 1.5;
    const g = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      uv.setXY(i, (r - inner) / (outer - inner), (Math.atan2(y, x) + Math.PI) / (Math.PI * 2));
    }
    uv.needsUpdate = true;
    return g;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.5 * delta;
    if (disk.current) disk.current.rotation.z += 2.2 * delta;
  });
  return (
    <group ref={ref} rotation={[0.3, 0, 0.2]}>
      {[1, -1].map((dir) => (
        <group key={dir}>
          <mesh position={[0, dir * 2.1, 0]}>
            <cylinderGeometry args={[0.07, 0.18, 3.6, 12]} />
            <meshBasicMaterial
              color="#d6b3ff"
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <JetPulses dir={dir} />
        </group>
      ))}
      <mesh ref={disk} rotation={[-Math.PI / 2, 0, 0]} geometry={diskGeo}>
        <meshBasicMaterial
          map={diskMap}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <Pulse speed={3} amp={0.15}>
        <GlowSprite flare textureKey="quasar-flare" color="rgba(255,240,255,1)" scale={2.8} />
      </Pulse>
    </group>
  );
}

/** Andrómeda: espiral de 2 brazos con halo dibujado, girando despacio. */
function AndromedaVisual() {
  const ref = useRef<THREE.Group>(null);
  const haze = useMemo(
    () =>
      createSpiralHazeTexture('andromeda-haze', {
        branches: 2,
        inside: '#ffe2b0',
        outside: '#7fb3ff',
        accent: '#ff9ed2',
        radius: 6,
      }),
    [],
  );
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.02 * delta;
  });
  return (
    <group rotation={[0.6, 0, 0.3]} scale={0.55}>
      <group ref={ref}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[6, 48]} />
          <meshBasicMaterial
            map={haze}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <GalaxyPoints count={6000} radius={6} branches={2} inside="#ffe2b0" outside="#7fb3ff" size={0.09} />
      </group>
      <GlowSprite textureKey="andromeda-core" color="rgba(255,230,180,0.9)" scale={2.2} />
    </group>
  );
}

/** Jirones de gas lejanos que dan profundidad al fondo. */
function BackgroundWisps() {
  const wisps = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const r = 45 + ((i * 13) % 20);
        return {
          key: i,
          pos: [Math.cos(a) * r, ((i % 3) - 1) * 14, Math.sin(a) * r] as [number, number, number],
          scale: 12 + ((i * 7) % 10),
          color: ['rgba(120,90,220,0.5)', 'rgba(70,120,220,0.5)', 'rgba(220,90,180,0.4)'][i % 3],
        };
      }),
    [],
  );
  return (
    <>
      {wisps.map((w) => (
        <GlowSprite key={w.key} textureKey={`wisp-${w.key % 3}`} color={w.color} scale={w.scale} position={w.pos} opacity={0.16} />
      ))}
    </>
  );
}

const VISUALS: Record<string, ReactNode> = {
  andromeda: <AndromedaVisual />,
  orion: (
    <Nebula id="orion" colors={['rgba(255,110,199,0.85)', 'rgba(170,90,255,0.8)', 'rgba(90,140,255,0.75)']} stars={4} />
  ),
  cangrejo: (
    <Nebula
      id="cangrejo"
      colors={['rgba(255,169,77,0.85)', 'rgba(255,90,70,0.8)', 'rgba(120,220,140,0.5)']}
      filaments={12}
      stars={2}
      strobeCore
    />
  ),
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
  const quality = useApp((s) => s.quality);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);
  return (
    <div className="scene-canvas">
      <Canvas
        camera={{ position: [0, 6, 24], fov: 55 }}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias }}
      >
        <color attach="background" args={['#02030a']} />
        <SpaceBackground keys={quality.tier === 'high' ? ['universe-bg', 'stars'] : ['stars']} />
        <Stars
          radius={180}
          depth={80}
          count={scaleCount(6000, quality, 1200)}
          factor={4}
          saturation={0.4}
          fade
          speed={0.8}
        />
        <BackgroundWisps />
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
        <ShootingStars count={3} radius={60} />
        <OrbitControls
          ref={controlsRef as never}
          enablePan={false}
          minDistance={8}
          maxDistance={45}
          autoRotate
          autoRotateSpeed={0.4}
        />
        <IntroFly from={[0, 22, 55]} to={[0, 6, 24]} duration={2.6} controls={controlsRef} />
        <AdaptiveQuality />
        <Effects />
      </Canvas>
    </div>
  );
}
