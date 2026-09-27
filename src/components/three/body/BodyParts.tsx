import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useApp } from '../../../state/store';
import { useSdfGeometry } from './useSdf';
import { useFlowMaterial, useTissueMaterial, XRayMaterial, type TissueProps } from './materials';
import { arteriesGeometry, nervesGeometry, veinsGeometry, AIR_ROUTE, DIGESTIVE_ROUTE } from './networks';
import { curveOf } from './geo';
import type { Vec3 } from '../../../utils/sdf';
import type { Tier } from './registry';

/**
 * Piezas React del cuerpo humano (todas en coordenadas del cuerpo: ~3,4 u de
 * alto, centrado en el origen, mirando a +Z).
 */

/**
 * Nivel de detalle de las mallas, fijado al montar la escena: si el monitor de
 * rendimiento baja la calidad a mitad de escena, solo se aligeran los efectos
 * (no se vuelven a esculpir todas las mallas).
 */
export const MeshTierContext = createContext<Tier | null>(null);

function useTier(): Tier {
  const live = useApp((s) => s.quality.tier);
  return useContext(MeshTierContext) ?? live;
}

/** Malla SDF con material de tejido. */
export function Piece({ k, hover = false, ...tissue }: { k: string; hover?: boolean } & TissueProps) {
  const geo = useSdfGeometry(k, useTier());
  const mat = useTissueMaterial({
    ...tissue,
    emissive: hover ? '#ffffff' : tissue.emissive,
    emissiveIntensity: hover ? 0.12 : tissue.emissiveIntensity,
  });
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}

/** Grupo que escala alrededor de un punto (latido, respiración). */
function Pivot({ at, children, pulse }: { at: Vec3; children: ReactNode; pulse: (t: number, g: THREE.Group) => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) pulse(clock.elapsedTime, ref.current);
  });
  return (
    <group position={at}>
      <group ref={ref}>
        <group position={[-at[0], -at[1], -at[2]]}>{children}</group>
      </group>
    </group>
  );
}

/** Latido "lub-dub" de 80 lpm. */
export function beat(t: number, bpm = 80) {
  const p = (t % (60 / bpm)) / (60 / bpm);
  const b = (x: number) => Math.exp(-Math.pow((p - x) / 0.05, 2));
  return b(0.05) + 0.6 * b(0.3);
}

/** Ciclo respiratorio (0 = sin aire, 1 = pulmones llenos). */
export function breath(t: number) {
  return 0.5 - 0.5 * Math.cos(t * 1.25);
}

export const HEART_CENTER: Vec3 = [0.045, 0.56, 0.055];
export const LUNGS_CENTER: Vec3 = [0, 0.66, -0.01];

/* ------------------------------------------------------------------ */
/* Capas exteriores                                                    */
/* ------------------------------------------------------------------ */

export function Skin() {
  return (
    <group>
      <Piece k="body:skin" roughness={0.58} sheen={0.55} sheenColor="#ff9f86" clearcoat={0.06} />
      <Piece k="body:hair" roughness={0.45} sheen={1} sheenColor="#c7885a" />
      <Eyes />
    </group>
  );
}

export function Fat() {
  return <Piece k="body:fat" roughness={0.35} clearcoat={0.7} clearcoatRoughness={0.3} sheen={0.4} sheenColor="#fff2b0" />;
}

export function Muscles({ hover }: { hover?: boolean }) {
  return (
    <group>
      <Piece k="body:muscle" hover={hover} roughness={0.42} clearcoat={0.55} clearcoatRoughness={0.3} sheen={0.5} sheenColor="#ff6b6b" />
      <Eyes />
    </group>
  );
}

export function Bones({ hover, opacity = 1 }: { hover?: boolean; opacity?: number }) {
  return <Piece k="skeleton" hover={hover} roughness={0.62} clearcoat={0.15} opacity={opacity} />;
}

/** Ojos amistosos: esclerótica, iris, pupila y brillo (con soporte del barrido). */
export function Eyes() {
  const sclera = useTissueMaterial({ color: '#f7f4ef', vertexColors: false, roughness: 0.15, clearcoat: 1 });
  const iris = useTissueMaterial({ color: '#5a3a22', vertexColors: false, roughness: 0.3, clearcoat: 1 });
  const pupil = useTissueMaterial({ color: '#0d0806', vertexColors: false, roughness: 0.2, clearcoat: 1 });
  const shine = useTissueMaterial({ color: '#ffffff', vertexColors: false, emissive: '#ffffff', emissiveIntensity: 1.5 });
  const brow = useTissueMaterial({ color: '#4a2c1a', vertexColors: false, roughness: 0.8 });
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.069, 1.499, 0.19]} rotation={[0, s * 0.12, 0]}>
          <mesh material={sclera}>
            <sphereGeometry args={[0.029, 24, 18]} />
          </mesh>
          <mesh position={[0, 0, 0.0245]} scale={[1, 1, 0.35]} material={iris}>
            <sphereGeometry args={[0.0145, 20, 14]} />
          </mesh>
          <mesh position={[0, 0, 0.0285]} scale={[1, 1, 0.3]} material={pupil}>
            <sphereGeometry args={[0.0072, 16, 10]} />
          </mesh>
          <mesh position={[0.006, 0.007, 0.03]} material={shine}>
            <sphereGeometry args={[0.0028, 8, 6]} />
          </mesh>
        </group>
      ))}
      {/* Cejas */}
      {[1, -1].map((s) => (
        <mesh key={`b${s}`} position={[s * 0.071, 1.548, 0.204]} rotation={[0.25, s * 0.25, Math.PI / 2 - s * 0.1]} material={brow}>
          <capsuleGeometry args={[0.0065, 0.042, 4, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** Silueta de rayos X (holograma) para ver dentro sin perder la forma del cuerpo. */
export function XRayShell({ color = '#6fd8ff', opacity = 1 }: { color?: string; opacity?: number }) {
  const geo = useSdfGeometry('body:shell', useTier());
  return (
    <mesh geometry={geo} renderOrder={10}>
      <XRayMaterial color={color} opacity={opacity} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Órganos                                                             */
/* ------------------------------------------------------------------ */

/** Hace tocable cualquier grupo, con resaltado al pasar por encima. */
export function Tappable({ onTap, children }: { onTap?: () => void; children: (hover: boolean) => ReactNode }) {
  const [hover, setHover] = useState(false);
  if (!onTap) return <>{children(false)}</>;
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onTap();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {children(hover)}
    </group>
  );
}

export function Heart({ hover, beating = true, opacity }: { hover?: boolean; beating?: boolean; opacity?: number }) {
  return (
    <Pivot
      at={HEART_CENTER}
      pulse={(t, g) => g.scale.setScalar(beating ? 1 + beat(t) * 0.07 : 1)}
    >
      <Piece k="organ:corazon" hover={hover} roughness={0.38} clearcoat={0.8} clearcoatRoughness={0.2} sheen={0.4} sheenColor="#ff8a8a" opacity={opacity} />
    </Pivot>
  );
}

export function Lungs({ hover, opacity = 1, airway = true }: { hover?: boolean; opacity?: number; airway?: boolean }) {
  return (
    <group>
      <Pivot at={LUNGS_CENTER} pulse={(t, g) => {
        const b = breath(t);
        g.scale.set(1 + b * 0.06, 1 + b * 0.035, 1 + b * 0.06);
      }}>
        <Piece k="organ:pulmon-l" hover={hover} roughness={0.62} clearcoat={0.35} sheen={0.7} sheenColor="#ffd6de" opacity={opacity} />
        <Piece k="organ:pulmon-r" hover={hover} roughness={0.62} clearcoat={0.35} sheen={0.7} sheenColor="#ffd6de" opacity={opacity} />
        {airway && opacity < 1 && <Piece k="organ:bronquios" roughness={0.5} clearcoat={0.4} />}
      </Pivot>
      {airway && <Piece k="organ:traquea" hover={hover} roughness={0.5} clearcoat={0.5} />}
    </group>
  );
}

export function Brain({ hover }: { hover?: boolean }) {
  return <Piece k="organ:cerebro" hover={hover} roughness={0.5} clearcoat={0.55} clearcoatRoughness={0.3} sheen={0.4} sheenColor="#ffd0dc" />;
}

export function Stomach({ hover, esophagus = true }: { hover?: boolean; esophagus?: boolean }) {
  return (
    <group>
      <Pivot at={[0.1, 0.2, 0.05]} pulse={(t, g) => g.rotation.set(0, 0, Math.sin(t * 1.6) * 0.03)}>
        <Piece k="organ:estomago" hover={hover} roughness={0.4} clearcoat={0.85} clearcoatRoughness={0.2} sheen={0.3} sheenColor="#ffc0a8" />
      </Pivot>
      {esophagus && <Piece k="organ:esofago" roughness={0.4} clearcoat={0.8} />}
    </group>
  );
}

export function Liver({ hover }: { hover?: boolean }) {
  return <Piece k="organ:higado" hover={hover} roughness={0.32} clearcoat={0.9} clearcoatRoughness={0.15} />;
}

export function Kidneys({ hover }: { hover?: boolean }) {
  return <Piece k="organ:rinones" hover={hover} roughness={0.35} clearcoat={0.85} clearcoatRoughness={0.2} />;
}

export function Intestines({ hover }: { hover?: boolean }) {
  return (
    <Pivot at={[0, -0.12, 0.07]} pulse={(t, g) => g.scale.set(1 + Math.sin(t * 2.1) * 0.008, 1 + Math.sin(t * 2.1 + 1) * 0.008, 1)}>
      <Piece k="organ:intestinos" hover={hover} roughness={0.38} clearcoat={0.9} clearcoatRoughness={0.18} sheen={0.3} sheenColor="#ffc8b8" />
    </Pivot>
  );
}

/** Mapa id de órgano → componente. */
export function OrganById({ id, hover, opacity, detail }: { id: string; hover?: boolean; opacity?: number; detail?: boolean }) {
  switch (id) {
    case 'corazon':
      return <Heart hover={hover} opacity={opacity} />;
    case 'pulmones':
      return <Lungs hover={hover} opacity={opacity} airway />;
    case 'cerebro':
      return <Brain hover={hover} />;
    case 'estomago':
      return <Stomach hover={hover} esophagus={!detail} />;
    case 'higado':
      return <Liver hover={hover} />;
    case 'rinones':
      return <Kidneys hover={hover} />;
    case 'intestinos':
      return <Intestines hover={hover} />;
    case 'huesos':
      return <Bones hover={hover} />;
    case 'musculos':
      return <Muscles hover={hover} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Redes con flujo animado                                             */
/* ------------------------------------------------------------------ */

export function Circulation({ opacity = 1 }: { opacity?: number }) {
  const art = useMemo(() => arteriesGeometry(), []);
  const vein = useMemo(() => veinsGeometry(), []);
  const artMat = useFlowMaterial({ color: '#c41f26', glow: '#ff2414', speed: 0.45, spacing: 0.18, width: 0.35, intensity: 1.8 });
  const veinMat = useFlowMaterial({ color: '#2a52b8', glow: '#2f6bff', speed: 0.25, spacing: 0.18, width: 0.35, intensity: 1.5 });
  artMat.opacity = veinMat.opacity = opacity;
  artMat.transparent = veinMat.transparent = opacity < 1;
  return (
    <group>
      <mesh geometry={art} material={artMat} />
      <mesh geometry={vein} material={veinMat} />
    </group>
  );
}

export function Nerves() {
  const geo = useMemo(() => nervesGeometry(), []);
  const mat = useFlowMaterial({ color: '#e6c23a', glow: '#fff27a', speed: 0.9, spacing: 0.22, width: 0.18, intensity: 4 });
  return <mesh geometry={geo} material={mat} />;
}

/** Partículas que recorren una ruta (comida, aire...), con estela. */
export function RouteFlow({
  route,
  color,
  count = 6,
  size = 0.02,
  speed = 0.08,
  pingPong,
}: {
  route: Vec3[];
  color: string;
  count?: number;
  size?: number;
  speed?: number;
  /** Si se da, la posición la marca esta función (0–1) en lugar de avanzar. */
  pingPong?: (t: number, i: number) => number;
}) {
  const curve = useMemo(() => curveOf(route), [route]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const u = pingPong ? pingPong(t, i) : (t * speed + i / count) % 1;
      curve.getPointAt(Math.min(0.999, Math.max(0, u)), m.position);
    });
  });
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)}>
          <sphereGeometry args={[size, 12, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function FoodFlow() {
  return <RouteFlow route={DIGESTIVE_ROUTE} color="#ffb347" count={5} size={0.016} speed={0.045} />;
}

export function AirFlow() {
  // Entra al coger aire (azul) y sale al soltarlo.
  return (
    <group>
      <RouteFlow
        route={AIR_ROUTE}
        color="#9fe6ff"
        count={7}
        size={0.012}
        pingPong={(t, i) => {
          const phase = (t * 1.25) % (Math.PI * 2);
          const inhale = phase < Math.PI;
          const k = inhale ? phase / Math.PI : 1 - (phase - Math.PI) / Math.PI;
          return Math.max(0, Math.min(1, k * 1.15 - i * 0.03));
        }}
      />
      <RouteFlow
        route={AIR_ROUTE.map((p) => [-p[0], p[1], p[2]] as Vec3)}
        color="#9fe6ff"
        count={7}
        size={0.012}
        pingPong={(t, i) => {
          const phase = (t * 1.25) % (Math.PI * 2);
          const k = phase < Math.PI ? phase / Math.PI : 1 - (phase - Math.PI) / Math.PI;
          return Math.max(0, Math.min(1, k * 1.15 - i * 0.03));
        }}
      />
    </group>
  );
}
