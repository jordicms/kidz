import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CREATURES, ZONES, type SeaCreature } from '../data/ocean';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import { playPop } from '../utils/sound';
import { speak } from '../utils/speech';
import SeaCreatureModel from '../components/three/SeaCreatureModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { wantsWebGPU, webGPURenderer } from '../utils/renderer';

const DEPTH_MAX = 140;
/** Metros → unidades de escena (hacia abajo). */
const Y = (m: number) => -m * 0.32;

const REEF_Y = Y(42);
const WRECK_Y = Y(96);
const FLOOR_Y = Y(DEPTH_MAX) - 3;

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

/* ------------------------------------------------------------------ */
/* Tanda 4: arrecife, barco hundido, fumarolas y bioluminiscencia       */
/* ------------------------------------------------------------------ */

/** Etiqueta flotante con el nombre de un lugar del fondo marino. */
function FeatureLabel({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  return (
    <Html center position={position} zIndexRange={[4, 0]}>
      <div className="body-label">
        <span className="chip">{children}</span>
      </div>
    </Html>
  );
}

/** Vaivén suave (algas, tentáculos) con pivote en la base. */
function WaterSway({ children, phase = 0, amp = 0.14 }: { children: ReactNode; phase?: number; amp?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.z = Math.sin(t * 1.1 + phase) * amp;
      ref.current.rotation.x = Math.cos(t * 0.8 + phase) * amp * 0.6;
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** Alga que ondea. */
function Seaweed({ position, h = 2, color = '#3f9e5a', phase = 0 }: { position: [number, number, number]; h?: number; color?: string; phase?: number }) {
  return (
    <group position={position}>
      <WaterSway phase={phase} amp={0.22}>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh key={i} position={[(i - 1) * 0.14, h / 2, 0]} rotation={[0, 0, (i - 1) * 0.12]}>
            <boxGeometry args={[0.12, h, 0.03]} />
            <meshStandardMaterial color={color} flatShading roughness={1} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </WaterSway>
    </group>
  );
}

/** Coral procedural de varios tipos. */
function Coral({ type, color, position, scale = 1 }: { type: 'branch' | 'brain' | 'fan' | 'tube'; color: string; position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {type === 'branch' &&
        Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22]} rotation={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]} castShadow>
              <cylinderGeometry args={[0.05, 0.1, 1.0, 6]} />
              <meshStandardMaterial color={color} flatShading roughness={0.8} />
            </mesh>
          );
        })}
      {type === 'brain' && (
        <mesh position={[0, 0.35, 0]} castShadow>
          <icosahedronGeometry args={[0.45, 1]} />
          <meshStandardMaterial color={color} flatShading roughness={0.9} />
        </mesh>
      )}
      {type === 'fan' && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.1, 1.0, 3, 1, false]} />
          <meshStandardMaterial color={color} flatShading roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
      {type === 'tube' &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.18, 0.4 + (i % 2) * 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.7 + (i % 2) * 0.3, 8]} />
            <meshStandardMaterial color={color} flatShading roughness={0.8} />
          </mesh>
        ))}
    </group>
  );
}

/** Anémona con tentáculos que ondean. */
function Anemone({ position, color = '#ff7ab0', scale = 1 }: { position: [number, number, number]; color?: string; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#d98aa0" roughness={1} />
      </mesh>
      <WaterSway amp={0.28} phase={position[0]}>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.16, 0.4, Math.sin(a) * 0.16]} rotation={[Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]}>
              <coneGeometry args={[0.03, 0.5, 5]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.6} toneMapped={false} />
            </mesh>
          );
        })}
      </WaterSway>
    </group>
  );
}

/** Pececillo de arrecife que revolotea en una órbita pequeña. */
function ReefFish({ seed, center }: { seed: number; center: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const color = ['#ffcf3f', '#ff7a42', '#4fd0e0', '#ff5aa0', '#8af06e'][seed % 5];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (0.5 + (seed % 3) * 0.14) + seed * 1.7;
    const rx = 1.6 + (seed % 4) * 0.5;
    const g = ref.current;
    if (!g) return;
    const x = center[0] + Math.cos(t) * rx;
    const z = center[2] + Math.sin(t) * rx;
    g.position.set(x, center[1] + 0.6 + Math.sin(t * 1.7) * 0.4, z);
    g.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref} scale={0.35}>
      <mesh castShadow>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={color} flatShading roughness={0.6} />
      </mesh>
      <mesh position={[-0.4, 0, 0]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial color={color} flatShading roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Arrecife de coral colorido en la zona iluminada. */
function CoralReef({ quality }: { quality: ReturnType<typeof useApp.getState>['quality'] }) {
  const center: [number, number, number] = [8, REEF_Y, -3];
  const corals = useMemo(() => {
    const types = ['branch', 'brain', 'fan', 'tube'] as const;
    const colors = ['#ff6f61', '#ffb347', '#b06ef2', '#4fd0e0', '#ff5aa0', '#7ce38b'];
    const n = quality.tier === 'low' ? 7 : 14;
    return Array.from({ length: n }, (_, i) => {
      const a = i * 2.39;
      const r = 0.5 + (i % 5) * 0.7;
      return {
        key: i,
        type: types[i % types.length],
        color: colors[i % colors.length],
        pos: [center[0] + Math.cos(a) * r, REEF_Y, center[2] + Math.sin(a) * r] as [number, number, number],
        scale: 0.7 + ((i * 7) % 6) / 10,
      };
    });
  }, [quality.tier]);
  const fish = quality.tier === 'low' ? 4 : 8;
  return (
    <group>
      {/* Montículo de arena del arrecife */}
      <mesh position={[center[0], REEF_Y - 0.4, center[2]]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[4.2, 20, 12]} />
        <meshStandardMaterial color="#d8c48a" roughness={1} flatShading />
      </mesh>
      {corals.map((c) => (
        <Coral key={c.key} type={c.type} color={c.color} position={c.pos} scale={c.scale} />
      ))}
      <Anemone position={[center[0] - 1.2, REEF_Y, center[2] + 1]} color="#ff7ab0" />
      <Anemone position={[center[0] + 1.4, REEF_Y, center[2] - 0.8]} color="#8affea" scale={0.8} />
      {Array.from({ length: fish }).map((_, i) => (
        <ReefFish key={i} seed={i + 1} center={center} />
      ))}
      <FeatureLabel position={[center[0], REEF_Y + 2.6, center[2]]}>🪸 Arrecife de coral</FeatureLabel>
    </group>
  );
}

/** Barco hundido con algas y un cofre del tesoro que brilla. */
function Shipwreck() {
  const pos: [number, number, number] = [-9, WRECK_Y, -2];
  const chestGlow = useMemo(() => createGlowTexture('treasure', 'rgba(255,210,80,1)'), []);
  const [popped, setPopped] = useState(0);
  const chestRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (chestRef.current) chestRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04 + popped);
  });
  const tapChest = () => {
    playPop();
    speak('¡Un cofre del tesoro! Los barcos hundidos se llenan de vida: se vuelven el hogar de peces, corales y pulpos.');
    setPopped(0.18);
    setTimeout(() => setPopped(0), 180);
  };
  return (
    <group position={pos} rotation={[0.12, 0.5, -0.18]}>
      {/* Casco */}
      <mesh castShadow>
        <cylinderGeometry args={[1.6, 2.2, 7, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#4a3b2e" flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Cubierta */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 7]} />
        <meshStandardMaterial color="#5c4a38" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Mástil roto inclinado */}
      <mesh position={[0, 1.6, 1.4]} rotation={[0.4, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 3.4, 8]} />
        <meshStandardMaterial color="#3a2e22" flatShading roughness={1} />
      </mesh>
      {/* Ojos de buey */}
      {[-1.5, 0, 1.5].map((z) => (
        <mesh key={z} position={[1.1, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.22, 0.06, 6, 12]} />
          <meshStandardMaterial color="#6a5a3a" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      {/* Algas sobre el casco */}
      <Seaweed position={[-0.8, 0.2, -2.5]} h={2.2} phase={1} />
      <Seaweed position={[0.9, 0.2, 2]} h={1.6} color="#4faf6a" phase={2.4} />
      {/* Cofre del tesoro */}
      <group
        ref={chestRef}
        position={[2.4, -0.6, 2.2]}
        onClick={(e) => {
          e.stopPropagation();
          tapChest();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.55, 0.6]} />
          <meshStandardMaterial color="#6a4a24" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[0.92, 0.2, 0.62]} />
          <meshStandardMaterial color="#8a6a34" roughness={0.6} />
        </mesh>
        {/* Oro que brilla */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.7, 0.2, 0.42]} />
          <meshStandardMaterial color="#ffd45a" emissive="#ffb800" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
        <sprite position={[0, 0.25, 0]} scale={[2.2, 2.2, 1]}>
          <spriteMaterial map={chestGlow} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
        <pointLight position={[0, 0.4, 0]} color="#ffcf5a" intensity={0.8} distance={5} decay={2} />
      </group>
      <FeatureLabel position={[0, 2.6, 0]}>🚢 Barco hundido</FeatureLabel>
    </group>
  );
}

/** Una chimenea de fumarola con humo y brillo cálido. */
function Vent({ position, quality }: { position: [number, number, number]; quality: ReturnType<typeof useApp.getState>['quality'] }) {
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const smokeMap = useMemo(() => createGlowTexture('vent-smoke', 'rgba(40,40,55,0.95)'), []);
  const n = quality.tier === 'low' ? 0 : 6;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const s = smokeRefs.current[i];
      if (!s) continue;
      const k = (t * 0.16 + i / n) % 1;
      s.position.set(Math.sin(i * 1.7 + t * 0.3) * (0.2 + k * 0.5), 1.4 + k * 4, Math.cos(i * 1.3) * 0.2);
      s.scale.setScalar(0.5 + k * 2.2);
      (s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.5;
    }
  });
  return (
    <group position={position}>
      {/* Chimenea de roca */}
      <mesh castShadow>
        <cylinderGeometry args={[0.35, 0.7, 2.4, 8]} />
        <meshStandardMaterial color="#25201e" flatShading roughness={1} />
      </mesh>
      {/* Boca incandescente */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.3, 8]} />
        <meshStandardMaterial color="#ff6a1a" emissive="#ff4a00" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ff7a2a" intensity={1.4} distance={7} decay={2} />
      {/* Gusanos de tubo alrededor */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.8, -0.9, Math.sin(a) * 0.8]}>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.7, 6]} />
              <meshStandardMaterial color="#e8e0d0" roughness={1} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#e0322a" emissive="#c01810" emissiveIntensity={0.4} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: n }).map((_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            smokeRefs.current[i] = el;
          }}
        >
          <spriteMaterial map={smokeMap} transparent depthWrite={false} opacity={0.4} />
        </sprite>
      ))}
    </group>
  );
}

/** Campo de fumarolas hidrotermales (fumarolas negras) en el abismo. */
function Vents({ quality }: { quality: ReturnType<typeof useApp.getState>['quality'] }) {
  return (
    <group>
      <Vent position={[3, FLOOR_Y + 1.2, -2]} quality={quality} />
      <Vent position={[6.5, FLOOR_Y + 1.2, 1]} quality={quality} />
      <Vent position={[1, FLOOR_Y + 1.2, 3]} quality={quality} />
      <FeatureLabel position={[3.5, FLOOR_Y + 5, 0]}>🌋 Fumarolas negras</FeatureLabel>
    </group>
  );
}

/** Bioluminiscencia: motas de luz que flotan y palpitan en la profundidad. */
function Bioluminescence({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const map = useMemo(() => createGlowTexture('biolum', 'rgba(120,255,220,1)'), []);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 13;
      p[i * 3] = Math.cos(a) * r;
      // Concentradas en la penumbra y el abismo (más abajo).
      p[i * 3 + 1] = Y(55) - Math.random() * (Math.abs(FLOOR_Y) - Math.abs(Y(55)));
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    return p;
  }, [count]);

  useFrame(({ clock, camera }, delta) => {
    const geo = ref.current?.geometry;
    if (geo) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + Math.sin(clock.elapsedTime * 0.4 + i) * delta * 0.12);
        pos.setY(i, pos.getY(i) + Math.cos(clock.elapsedTime * 0.3 + i) * delta * 0.08);
      }
      pos.needsUpdate = true;
    }
    // Se encienden a medida que bajamos (invisibles cerca de la superficie).
    if (matRef.current) {
      const deep = THREE.MathUtils.clamp((-camera.position.y - 12) / 20, 0, 1);
      matRef.current.opacity = deep * (0.6 + Math.sin(clock.elapsedTime * 1.5) * 0.15);
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={map}
        size={0.4}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
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
          <Bioluminescence count={scaleCount(120, quality, 40)} />
          {CREATURES.map((c) => (
            <Swimmer key={c.id} creature={c} />
          ))}
          {/* Lugares del fondo marino */}
          <CoralReef quality={quality} />
          <Shipwreck />
          <Vents quality={quality} />
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
