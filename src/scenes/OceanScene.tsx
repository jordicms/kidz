import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CREATURES, OCEAN_PLACES, ZONES, getPlace, type SeaCreature } from '../data/ocean';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import { playPop } from '../utils/sound';
import { speak } from '../utils/speech';
import SeaCreatureModel from '../components/three/SeaCreatureModel';
import Controls from '../components/three/Controls';
import Studio from '../components/three/Studio';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { wantsWebGPU, webGPURenderer } from '../utils/renderer';

const DEPTH_MAX = 140;
/** Metros → unidades de escena (hacia abajo). */
const Y = (m: number) => -m * 0.32;

const KELP_Y = Y(24);
const REEF_Y = Y(42);
const WRECK_Y = Y(96);
const FLOOR_Y = Y(DEPTH_MAX) - 3;

const SURFACE = new THREE.Color('#2b86c5');
const TWILIGHT = new THREE.Color('#123a6b');
const ABYSS = new THREE.Color('#02060f');
const _bg = new THREE.Color();
const _off = new THREE.Vector3();

/** Cámara que desciende suavemente hasta la profundidad elegida, y entorno
 *  (color de fondo, niebla y luz) que se apaga con la profundidad. */
function DepthRig({ depth, sun }: { depth: number; sun: React.RefObject<THREE.DirectionalLight | null> }) {
  const { camera, scene, controls } = useThree();
  const current = useRef(0);
  const fog = useMemo(() => new THREE.Fog('#2b86c5', 10, 55), []);

  useFrame((_, delta) => {
    current.current = THREE.MathUtils.damp(current.current, depth, 2.2, delta);
    const y = Y(current.current);

    // Antes esto fijaba la posición de la cámara y su mirada CADA frame, así
    // que los controles no servían para nada: no se podía girar ni acercarse.
    // Ahora solo se baja el punto de interés y se conserva el desvío que el
    // niño haya dado a la cámara (su giro y su zoom).
    const c = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    if (c?.target) {
      _off.copy(camera.position).sub(c.target);
      c.target.set(0, y, 0);
      camera.position.copy(c.target).add(_off);
      c.update?.();
    } else {
      camera.position.set(0, y + 1.2, 13);
      camera.lookAt(0, y, 0);
    }

    // Fondo y niebla: del azul soleado al negro abisal
    const t = Math.min(1, current.current / 100);
    if (t < 0.5) _bg.lerpColors(SURFACE, TWILIGHT, t * 2);
    else _bg.lerpColors(TWILIGHT, ABYSS, (t - 0.5) * 2);
    scene.background = _bg;
    fog.color.copy(_bg);
    fog.near = 8 - t * 3;
    fog.far = 55 - t * 22;
    scene.fog = fog;

    // La luz del entorno (los reflejos del agua sobre los peces) también se
    // apaga al bajar: si no, en el abismo brillarían como al mediodía.
    scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.12, t);

    if (sun.current) sun.current.intensity = Math.max(0.06, 1.8 * (1 - t * 1.15));
  });
  return null;
}

/** Degradado vertical para que el haz se apague hacia el fondo. */
function shaftTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(220,242,255,0.85)');
  g.addColorStop(0.45, 'rgba(210,238,255,0.28)');
  g.addColorStop(1, 'rgba(200,230,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  return new THREE.CanvasTexture(cv);
}

/** Rayos de sol que atraviesan el agua cerca de la superficie. */
function SunRays() {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => shaftTexture(), []);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    const fade = THREE.MathUtils.clamp(1 - -camera.position.y / 14, 0, 1);
    ref.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = fade * (0.028 + 0.022 * Math.sin(clock.elapsedTime * 0.7 + i * 1.9));
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-9 + i * 3.6, -7, -4 - (i % 3) * 2]} rotation={[0, 0, 0.16 + (i % 2) * 0.1]}>
          <planeGeometry args={[0.9 + (i % 3) * 0.5, 22]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
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
function Swimmer({ creature, depth }: { creature: SeaCreature; depth: number }) {
  const group = useRef<THREE.Group>(null);
  const angle = useRef(creature.scene.phase ?? 0);
  const openSea = useApp((s) => s.openSea);
  // Solo las de esta franja de profundidad (±22 m).
  const near = Math.abs(creature.depthM - depth) < 22;

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

  if (!near) return null;
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

/**
 * Lugar del fondo marino que se puede tocar para leer su historia.
 *
 * Antes solo tenían una etiqueta decorativa —de ahí que las fumarolas "no
 * fueran": no había ningún manejador de clic en ninguna parte—. Ahora todo el
 * conjunto es sensible al toque, además de una esfera invisible generosa para
 * que sea fácil de acertar con el dedo.
 */
function Place({
  id,
  labelAt,
  hit = 3,
  hitAt = [0, 0, 0],
  children,
}: {
  id: string;
  labelAt: [number, number, number];
  hit?: number;
  hitAt?: [number, number, number];
  children: ReactNode;
}) {
  const openPlace = useApp((s) => s.openPlace);
  const place = getPlace(id);
  const open = () => {
    playPop();
    openPlace(id);
  };
  return (
    <group>
      <group
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {children}
        <mesh visible={false} position={hitAt}>
          <sphereGeometry args={[hit, 10, 10]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      {place && (
        <Html center position={labelAt} zIndexRange={[4, 0]}>
          <div className="body-label" onClick={open}>
            <span className="chip">
              {place.emoji} {place.name} · ¡tócame!
            </span>
          </div>
        </Html>
      )}
    </group>
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

/** Material del coral: húmedo y con algo de brillo, no mate y facetado. */
function CoralMat({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.55}
      metalness={0}
      clearcoat={0.5}
      clearcoatRoughness={0.4}
      envMapIntensity={1.2}
    />
  );
}

/** Abanico de gorgonia: red de ramitas que se bifurcan en un plano. */
function FanCoral({ color }: { color: string }) {
  const branches = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; len: number; r: number }[] = [];
    // Tronco y bifurcaciones sucesivas, todas casi en el mismo plano.
    const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
      out.push({ pos: [x + (Math.sin(ang) * len) / 2, y + (Math.cos(ang) * len) / 2, 0], rot: -ang, len, r: 0.012 + depth * 0.008 });
      if (depth === 0) return;
      const nx = x + Math.sin(ang) * len;
      const ny = y + Math.cos(ang) * len;
      grow(nx, ny, ang - 0.42, len * 0.72, depth - 1);
      grow(nx, ny, ang + 0.42, len * 0.72, depth - 1);
    };
    grow(0, 0, 0, 0.34, 3);
    return out;
  }, []);
  return (
    <group>
      {branches.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={[0, 0, b.rot]} castShadow>
          <cylinderGeometry args={[b.r * 0.8, b.r, b.len, 6]} />
          <CoralMat color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** Coral procedural de varios tipos. */
function Coral({ type, color, position, scale = 1 }: { type: 'branch' | 'brain' | 'fan' | 'tube'; color: string; position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, position[0] * 1.7, 0]}>
      {/* Coral ramificado: tronco con ramas y yemas redondeadas en la punta */}
      {type === 'branch' &&
        Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const h = 0.5 + (i % 3) * 0.12;
          return (
            <group key={i} position={[Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16]} rotation={[Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32]}>
              <mesh position={[0, h / 2, 0]} castShadow>
                <capsuleGeometry args={[0.055, h, 4, 10]} />
                <CoralMat color={color} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.09, h * 0.85, 0]} rotation={[0, 0, s * 0.6]} castShadow>
                  <capsuleGeometry args={[0.035, h * 0.4, 4, 8]} />
                  <CoralMat color={color} />
                </mesh>
              ))}
            </group>
          );
        })}
      {/* Coral cerebro: cúpula lisa con surcos */}
      {type === 'brain' && (
        <group position={[0, 0.28, 0]}>
          <mesh scale={[1, 0.78, 1]} castShadow>
            <sphereGeometry args={[0.4, 26, 18]} />
            <CoralMat color={color} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[0, 0.1 + i * 0.045, 0]} rotation={[Math.PI / 2, 0, i * 0.5]} scale={[1, 1, 0.5]}>
              <torusGeometry args={[0.36 - i * 0.05, 0.016, 6, 26]} />
              <CoralMat color={color} />
            </mesh>
          ))}
        </group>
      )}
      {/* Gorgonia (abanico) */}
      {type === 'fan' && (
        <group position={[0, 0.05, 0]} scale={1.35}>
          <FanCoral color={color} />
        </group>
      )}
      {/* Coral tubo: manojo de tubos de distinta altura con la boca abierta */}
      {type === 'tube' &&
        Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          const h = 0.45 + ((i * 3) % 4) * 0.16;
          return (
            <group key={i} position={[Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13]} rotation={[Math.cos(a) * 0.14, 0, -Math.sin(a) * 0.14]}>
              <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[0.075, 0.095, h, 12, 1, true]} />
                <meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.5} envMapIntensity={1.2} side={THREE.DoubleSide} />
              </mesh>
              {/* Borde de la boca */}
              <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.075, 0.014, 6, 14]} />
                <CoralMat color={color} />
              </mesh>
            </group>
          );
        })}
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
  const center: [number, number, number] = [5, REEF_Y, -2];
  const corals = useMemo(() => {
    const types = ['branch', 'brain', 'fan', 'tube'] as const;
    const colors = ['#ff6f61', '#ffb347', '#b06ef2', '#4fd0e0', '#ff5aa0', '#7ce38b'];
    const n = quality.tier === 'low' ? 9 : 18;
    return Array.from({ length: n }, (_, i) => {
      const a = i * 2.39;
      const r = 0.8 + (i % 5) * 0.85;
      return {
        key: i,
        type: types[i % types.length],
        color: colors[i % colors.length],
        pos: [center[0] + Math.cos(a) * r, REEF_Y, center[2] + Math.sin(a) * r] as [number, number, number],
        scale: 0.95 + ((i * 7) % 6) / 8,
      };
    });
  }, [quality.tier]);
  const fish = quality.tier === 'low' ? 4 : 8;
  return (
    <Place id="arrecife" labelAt={[center[0], REEF_Y + 2.8, center[2]]} hit={4} hitAt={[center[0], REEF_Y + 0.6, center[2]]}>
      {/* Montículo de arena del arrecife */}
      <mesh position={[center[0], REEF_Y - 0.8, center[2]]} scale={[1, 0.34, 1]}>
        <sphereGeometry args={[4.6, 40, 24]} />
        <meshStandardMaterial color="#b8a878" roughness={0.95} metalness={0} />
      </mesh>
      {/* Ladera del monte submarino: sin ella la cima parecía flotar */}
      <mesh position={[center[0], REEF_Y - 8.6, center[2]]}>
        <cylinderGeometry args={[4.3, 9, 16, 30, 1, true]} />
        <meshStandardMaterial color="#3f4a4a" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Rocas sueltas en la base de la cima */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = i * 2.2;
        const r = 3.6 + (i % 3) * 0.5;
        return (
          <mesh
            key={i}
            position={[center[0] + Math.cos(a) * r, REEF_Y - 1.1 - (i % 2) * 0.4, center[2] + Math.sin(a) * r]}
            rotation={[i, i * 1.3, 0]}
            scale={0.5 + (i % 3) * 0.22}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#4a5450" roughness={0.95} flatShading />
          </mesh>
        );
      })}
      {corals.map((c) => (
        <Coral key={c.key} type={c.type} color={c.color} position={c.pos} scale={c.scale} />
      ))}
      <Anemone position={[center[0] - 1.2, REEF_Y, center[2] + 1]} color="#ff7ab0" />
      <Anemone position={[center[0] + 1.4, REEF_Y, center[2] - 0.8]} color="#8affea" scale={0.8} />
      {Array.from({ length: fish }).map((_, i) => (
        <ReefFish key={i} seed={i + 1} center={center} />
      ))}
    </Place>
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
    <Place id="pecio" labelAt={[pos[0], pos[1] + 3, pos[2]]} hit={4.5} hitAt={pos}>
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
      </group>
    </Place>
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
    <Place id="fumarolas" labelAt={[3.5, FLOOR_Y + 5, 0]} hit={5} hitAt={[3.5, FLOOR_Y + 1.5, 0]}>
      <Vent position={[3, FLOOR_Y + 1.2, -2]} quality={quality} />
      <Vent position={[6.5, FLOOR_Y + 1.2, 1]} quality={quality} />
      <Vent position={[1, FLOOR_Y + 1.2, 3]} quality={quality} />
    </Place>
  );
}

/* ------------------------------------------------------------------ */
/* Tanda 5: entorno más realista                                       */
/* ------------------------------------------------------------------ */

/**
 * Cáusticas: la red de luz temblorosa que dibuja el sol al atravesar las olas.
 * Es uno de los detalles que más "dice océano" y no cuesta casi nada: una
 * textura de rejilla animada, sumada sobre las superficies.
 */
function causticsTexture(): THREE.CanvasTexture {
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x / N) * Math.PI * 2;
      const v = (y / N) * Math.PI * 2;
      // Suma de ondas cruzadas: donde coinciden las crestas nace un filamento.
      const w =
        Math.sin(u * 3 + Math.sin(v * 2) * 1.6) +
        Math.sin(v * 3 + Math.sin(u * 2.4) * 1.4) +
        Math.sin((u + v) * 2.2);
      const k = Math.pow(Math.max(0, w / 3), 3.2);
      const i = (y * N + x) * 4;
      img.data[i] = 210;
      img.data[i + 1] = 240;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, k * 420);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Malla horizontal con las cáusticas proyectadas, que se desplazan despacio. */
function Caustics({ y, size, repeat = 4, opacity = 0.5 }: { y: number; size: number; repeat?: number; opacity?: number }) {
  const tex = useMemo(() => {
    const t = causticsTexture();
    t.repeat.set(repeat, repeat);
    return t;
  }, [repeat]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tex.offset.set(Math.sin(t * 0.06) * 0.3 + t * 0.012, Math.cos(t * 0.05) * 0.3 + t * 0.008);
  });
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Nieve marina: restos que caen despacio y llenan el agua de partículas. */
function MarineSnow({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const map = useMemo(() => createGlowTexture('snow', 'rgba(230,240,250,0.8)'), []);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 34;
      p[i * 3 + 1] = -Math.random() * 48;
      p[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return p;
  }, [count]);
  useFrame(({ clock }, delta) => {
    const geo = ref.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - delta * 0.16;
      if (y < -48) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * delta * 0.1);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={map} size={0.07} sizeAttenuation transparent opacity={0.32} depthWrite={false} />
    </points>
  );
}

/** Fondo marino con relieve: dunas de arena en vez de un disco plano. */
function Seafloor() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 60, 60);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const sand = new THREE.Color('#26313f');
    const dark = new THREE.Color('#141c27');
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Dunas: ondas cruzadas de distinta escala.
      const h = Math.sin(x * 0.28) * 0.3 + Math.cos(z * 0.22) * 0.28 + Math.sin((x + z) * 0.11) * 0.5;
      pos.setY(i, h);
      col.copy(dark).lerp(sand, THREE.MathUtils.clamp(h * 0.6 + 0.5, 0, 1));
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, FLOOR_Y, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Una lámina de kelp: tallo largo que ondea con hojas a los lados. */
function KelpStalk({ position, height, phase }: { position: [number, number, number]; height: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  const blades = useMemo(() => Math.max(4, Math.round(height / 1.1)), [height]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // El tallo se dobla más arriba que abajo, como una planta anclada.
    ref.current?.children.forEach((seg, i) => {
      seg.rotation.z = Math.sin(t * 0.7 + phase + i * 0.4) * 0.09;
      seg.rotation.x = Math.cos(t * 0.55 + phase + i * 0.3) * 0.06;
    });
  });
  return (
    <group position={position}>
      <group ref={ref}>
        {Array.from({ length: blades }).map((_, i) => {
          const y = (i / blades) * height;
          const seg = height / blades;
          return (
            <group key={i} position={[0, y, 0]}>
              <mesh position={[0, seg / 2, 0]}>
                <cylinderGeometry args={[0.035, 0.045, seg, 6]} />
                <meshStandardMaterial color="#3f6a2a" roughness={0.75} />
              </mesh>
              {/* Hojas alternas */}
              {[-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[s * 0.24, seg * 0.6, 0]}
                  rotation={[0.2 * s, 0, s * 0.9]}
                  scale={[0.34, 1.5, 0.05]}
                >
                  <sphereGeometry args={[0.3, 10, 8]} />
                  <meshStandardMaterial color={i % 2 === 0 ? '#4f8a33' : '#3f7a2a'} roughness={0.7} side={THREE.DoubleSide} />
                </mesh>
              ))}
              {/* Flotador en la base de la hoja (los tiene el kelp de verdad) */}
              <mesh position={[0, seg * 0.4, 0.1]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#6a9a3a" roughness={0.6} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** Bosque de kelp: algas gigantes que suben desde un roquedo hacia la luz. */
function KelpForest({ quality }: { quality: ReturnType<typeof useApp.getState>['quality'] }) {
  const n = quality.tier === 'low' ? 7 : quality.tier === 'medium' ? 12 : 18;
  const stalks = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = i * 2.399;
        const r = 0.8 + (i % 5) * 0.85;
        return {
          key: i,
          pos: [-6 + Math.cos(a) * r, KELP_Y - 0.6, 2.5 + Math.sin(a) * r] as [number, number, number],
          h: 5.5 + ((i * 7) % 5) * 0.7,
          phase: i * 0.9,
        };
      }),
    [n],
  );
  return (
    <Place id="kelp" labelAt={[-6, KELP_Y + 3.4, 2.5]} hit={4} hitAt={[-6, KELP_Y + 2.4, 2.5]}>
      {/* Roquedo del que nace el bosque */}
      <mesh position={[-6, KELP_Y - 1, 2.5]} scale={[1, 0.42, 1]}>
        <dodecahedronGeometry args={[2.4, 1]} />
        <meshStandardMaterial color="#2f3a3a" roughness={0.95} flatShading />
      </mesh>
      {stalks.map((s) => (
        <KelpStalk key={s.key} position={s.pos} height={s.h} phase={s.phase} />
      ))}
    </Place>
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
          {/* Luz de entorno (reflejos del agua sobre la piel de los peces).
              Su intensidad la va apagando DepthRig al descender. */}
          <Studio preset="water" intensity={0.5} />
          <directionalLight ref={sunRef} position={[6, 10, 4]} intensity={1.8} color="#dff2ff" />
          <DepthRig depth={depth} sun={sunRef} />
          {/* Superficie vista desde abajo */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[120, 120]} />
            <meshBasicMaterial color="#9fd8ff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* Cáusticas: la red de luz de las olas, justo bajo la superficie y
              otra vez sobre el arrecife, donde se ve mejor. */}
          <Caustics y={0.2} size={90} repeat={7} opacity={0.42} />
          <SunRays />
          <Bubbles count={scaleCount(90, quality, 30)} />
          <MarineSnow count={scaleCount(140, quality, 50)} />
          <Bioluminescence count={scaleCount(120, quality, 40)} />
          {CREATURES.map((c) => (
            <Swimmer key={c.id} creature={c} depth={depth} />
          ))}
          {/* Lugares del fondo marino */}
          <KelpForest quality={quality} />
          <CoralReef quality={quality} />
          <Shipwreck />
          <Vents quality={quality} />
          <Seafloor />
          {/* Girar, acercarse y desplazarse. El objetivo lo baja DepthRig. */}
          <Controls
            minDistance={4}
            maxDistance={30}
            maxPolarAngle={Math.PI * 0.9}
            minPolarAngle={Math.PI * 0.1}
          />
          <AdaptiveQuality />
          {!useGPU && <Effects ao />}
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
        {/* Salto directo a cada lugar: buscarlos moviendo el deslizador a
            ciegas era incómodo, sobre todo en el móvil. */}
        <div className="control-row" style={{ pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {OCEAN_PLACES.map((p) => (
            <button
              key={p.id}
              className={`chip-btn${Math.abs(depth - p.depthM) < 6 ? ' active' : ''}`}
              onClick={() => setDepth(p.depthM)}
              title={`Ir a ${p.name} (${p.depthM} m)`}
            >
              {p.emoji} {p.name.replace('El ', '').replace('La ', '').replace('Las ', '')}
            </button>
          ))}
        </div>
        <div className="control-hint">Desliza para bajar, o toca un lugar para ir directo 🌑</div>
      </div>
    </>
  );
}
