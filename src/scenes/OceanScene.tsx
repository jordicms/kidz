import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CREATURES, ZONES, type SeaCreature } from '../data/ocean';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import SeaCreatureModel from '../components/three/SeaCreatureModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { wantsWebGPU, webGPURenderer } from '../utils/renderer';

const DEPTH_MAX = 140;
/** Metros → unidades de escena (hacia abajo). */
const Y = (m: number) => -m * 0.32;

const SURFACE = new THREE.Color('#2b86c5');
const TWILIGHT = new THREE.Color('#123a6b');
const ABYSS = new THREE.Color('#02060f');
const _bg = new THREE.Color();

/** Cámara que desciende suavemente hasta la profundidad elegida, y entorno
 *  (color de fondo, niebla y luz) que se apaga con la profundidad. */
function DepthRig({ depth, sun }: { depth: number; sun: React.RefObject<THREE.DirectionalLight | null> }) {
  const { camera, scene } = useThree();
  const current = useRef(0);
  const fog = useMemo(() => new THREE.Fog('#2b86c5', 10, 55), []);

  useFrame((_, delta) => {
    current.current = THREE.MathUtils.damp(current.current, depth, 2.2, delta);
    const y = Y(current.current);
    camera.position.set(0, y + 1.2, 13);
    camera.lookAt(0, y, 0);

    // Fondo y niebla: del azul soleado al negro abisal
    const t = Math.min(1, current.current / 100);
    if (t < 0.5) _bg.lerpColors(SURFACE, TWILIGHT, t * 2);
    else _bg.lerpColors(TWILIGHT, ABYSS, (t - 0.5) * 2);
    scene.background = _bg;
    fog.color.copy(_bg);
    fog.near = 8 - t * 3;
    fog.far = 55 - t * 22;
    scene.fog = fog;

    if (sun.current) sun.current.intensity = Math.max(0.06, 1.8 * (1 - t * 1.15));
  });
  return null;
}

/** Rayos de sol que atraviesan el agua cerca de la superficie. */
function SunRays() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    const fade = THREE.MathUtils.clamp(1 - -camera.position.y / 14, 0, 1);
    ref.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = fade * (0.05 + 0.035 * Math.sin(clock.elapsedTime * 0.7 + i * 1.9));
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-6 + i * 3, -6, -2 - (i % 3)]} rotation={[0, 0, 0.22]}>
          <cylinderGeometry args={[0.4, 1.6, 20, 8, 1, true]} />
          <meshBasicMaterial color="#dff2ff" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Burbujas subiendo por toda la columna de agua. */
function Bubbles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const map = useMemo(() => createGlowTexture('bubble', 'rgba(220,240,255,0.9)'), []);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 9;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = -Math.random() * 46;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    return p;
  }, [count]);

  useFrame((_, delta) => {
    const geo = ref.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * (0.7 + (i % 5) * 0.18);
      if (y > 0.5) y = -46;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={map} size={0.14} sizeAttenuation transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Criatura nadando en círculo a su profundidad; al tocarla se abre su ficha. */
function Swimmer({ creature }: { creature: SeaCreature }) {
  const group = useRef<THREE.Group>(null);
  const angle = useRef(creature.scene.phase ?? 0);
  const openSea = useApp((s) => s.openSea);

  useFrame(({ clock }, delta) => {
    angle.current += creature.scene.speed * delta * 0.35;
    const a = angle.current;
    const r = creature.scene.radius;
    const g = group.current;
    if (!g) return;
    g.position.set(Math.cos(a) * r, Y(creature.depthM) + Math.sin(clock.elapsedTime * 0.8 + r) * 0.4, Math.sin(a) * r);
    const sign = Math.sign(creature.scene.speed) || 1;
    g.rotation.y = Math.atan2(-Math.sin(a) * sign, Math.cos(a) * sign);
    g.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.06;
  });

  return (
    <group ref={group}>
      <group
        scale={creature.scene.scale}
        onClick={(e) => {
          e.stopPropagation();
          openSea(creature.id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <SeaCreatureModel creature={creature} />
        <mesh visible={false}>
          <sphereGeometry args={[1.6, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <Html center position={[0, creature.scene.scale * 1.4 + 0.7, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={() => openSea(creature.id)}>
          <span className="chip">
            {creature.emoji} {creature.name.replace('El ', '').replace('La ', '')}
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function OceanScene() {
  const quality = useApp((s) => s.quality);
  const [depth, setDepth] = useState(5);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const zone = depth < 50 ? ZONES[0] : depth < 100 ? ZONES[1] : ZONES[2];
  // Experimental: ?gpu=1 activa WebGPU en esta escena (sin postprocesado aún).
  const useGPU = useMemo(() => wantsWebGPU(), []);

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas
          camera={{ position: [0, 1.2, 13], fov: 55 }}
          dpr={quality.dpr}
          gl={useGPU ? (webGPURenderer as never) : { antialias: quality.antialias }}
        >
          <hemisphereLight args={['#bfe3ff', '#0a2a4a', 0.5]} />
          <directionalLight ref={sunRef} position={[6, 10, 4]} intensity={1.8} color="#dff2ff" />
          <ambientLight intensity={0.25} />
          <DepthRig depth={depth} sun={sunRef} />
          {/* Superficie vista desde abajo */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[120, 120]} />
            <meshBasicMaterial color="#9fd8ff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <SunRays />
          <Bubbles count={scaleCount(90, quality, 30)} />
          {CREATURES.map((c) => (
            <Swimmer key={c.id} creature={c} />
          ))}
          {/* Fondo marino al final del descenso */}
          <mesh position={[0, Y(DEPTH_MAX) - 3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[60, 32]} />
            <meshStandardMaterial color="#1a2436" flatShading roughness={1} />
          </mesh>
          <AdaptiveQuality />
          {!useGPU && <Effects />}
        </Canvas>
      </div>

      <div className="ocean-controls">
        <div className="ocean-zone" style={{ borderColor: zone.color }}>
          {zone.emoji} <strong>{zone.name}</strong> · {Math.round(depth)} m
        </div>
        <input
          className="ocean-slider"
          type="range"
          min={0}
          max={DEPTH_MAX}
          step={1}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          aria-label="Profundidad"
        />
        <div className="control-hint">Desliza para bajar hasta el abismo 🌑</div>
      </div>
    </>
  );
}
