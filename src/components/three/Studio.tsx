import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useApp } from '../../state/store';

/**
 * ESTUDIO DE ILUMINACIÓN (IBL) — el gran salto de calidad visual.
 *
 * Un `meshStandardMaterial` sin mapa de entorno solo recibe luz difusa: por eso
 * los objetos parecen de plastilina mate, por muchas luces que pongamos. Los
 * demos de three.js que "impresionan" iluminan con un mapa de entorno (HDRI),
 * que aporta reflejos especulares y luz ambiental con dirección y color.
 *
 * Aquí NO descargamos ningún HDRI (la app es 100% offline): construimos el
 * entorno con `Lightformer`s que drei renderiza a un cubemap. Con `frames={1}`
 * se calcula UNA vez al montar la escena, así que el coste por frame es cero.
 *
 * Además monta un esquema clásico de tres puntos (principal, relleno y contra)
 * para que los volúmenes se lean y el sujeto se separe del fondo.
 */

export type StudioPreset = 'lab' | 'space' | 'daylight' | 'water' | 'dark';

interface StudioConfig {
  /** Color e intensidad de la cúpula (luz ambiental general). */
  dome: { color: string; intensity: number };
  /** Luz principal (la que modela el volumen). */
  key: { color: string; intensity: number; position: [number, number, number]; scale: [number, number, number] };
  /** Relleno: suaviza las sombras del lado opuesto. */
  fill: { color: string; intensity: number; position: [number, number, number] };
  /** Contraluz: dibuja el borde del sujeto y lo separa del fondo. */
  rim: { color: string; intensity: number; position: [number, number, number] };
  /** Intensidad global del mapa de entorno sobre los materiales. */
  environmentIntensity: number;
}

const CONFIGS: Record<StudioPreset, StudioConfig> = {
  // Microscopio: luz fría y limpia desde arriba, con contraluz turquesa.
  lab: {
    dome: { color: '#20364e', intensity: 0.6 },
    key: { color: '#eaf6ff', intensity: 5, position: [0, 6, 2], scale: [10, 10, 1] },
    fill: { color: '#4aa8c8', intensity: 1.6, position: [-5, 0, 3] },
    rim: { color: '#7ef0d8', intensity: 3, position: [2, -1, -6] },
    environmentIntensity: 1,
  },
  // Espacio: ambiente casi negro y un sol duro y cálido.
  space: {
    dome: { color: '#0a1226', intensity: 0.25 },
    key: { color: '#fff2d8', intensity: 6, position: [6, 4, 4], scale: [8, 8, 1] },
    fill: { color: '#2a4a8a', intensity: 0.8, position: [-6, 1, 2] },
    rim: { color: '#8ab4ff', intensity: 2, position: [-2, 2, -7] },
    environmentIntensity: 0.9,
  },
  // Exterior diurno: cúpula de cielo + sol cálido.
  daylight: {
    dome: { color: '#bcdcf5', intensity: 1.1 },
    key: { color: '#fff4e0', intensity: 4, position: [4, 7, 3], scale: [12, 12, 1] },
    fill: { color: '#9fd0a0', intensity: 1.2, position: [-5, 1, 2] },
    rim: { color: '#ffe0b0', intensity: 1.8, position: [0, 3, -7] },
    environmentIntensity: 1,
  },
  // Bajo el agua: azules, luz que baja desde la superficie.
  water: {
    dome: { color: '#0d3a5e', intensity: 0.7 },
    key: { color: '#cfeeff', intensity: 4, position: [1, 7, 1], scale: [10, 10, 1] },
    fill: { color: '#1d6a94', intensity: 1.2, position: [-5, 0, 3] },
    rim: { color: '#7fd8ff', intensity: 2.2, position: [2, 0, -6] },
    environmentIntensity: 1,
  },
  // Muy oscuro: solo un reborde, para escenas donde la luz la pone el objeto.
  dark: {
    dome: { color: '#05070f', intensity: 0.15 },
    key: { color: '#5a7ac0', intensity: 1.2, position: [3, 3, 3], scale: [6, 6, 1] },
    fill: { color: '#25304a', intensity: 0.4, position: [-4, 0, 2] },
    rim: { color: '#9ab4ff', intensity: 1.4, position: [0, 1, -6] },
    environmentIntensity: 0.7,
  },
};

/**
 * Ilumina la escena con un entorno procedural + tres puntos de luz.
 *
 * @param preset  Ambiente base.
 * @param intensity Multiplicador global (para ajustar por escena).
 * @param shadows Si la luz principal proyecta sombras (cuesta; solo gama alta).
 * @param children Lightformers extra que se añaden al entorno.
 */
export default function Studio({
  preset = 'lab',
  intensity = 1,
  shadows = false,
  children,
}: {
  preset?: StudioPreset;
  intensity?: number;
  shadows?: boolean;
  children?: ReactNode;
}) {
  const tier = useApp((s) => s.quality.tier);
  const c = CONFIGS[preset];
  // En gama baja el cubemap se calcula a menor resolución (sigue aportando
  // reflejos, que es lo que de verdad cambia el aspecto).
  const resolution = tier === 'high' ? 256 : tier === 'medium' ? 128 : 64;
  const k = intensity;

  // Las luces "reales" complementan al entorno: el entorno da reflejo y
  // ambiente; estas dan la dirección y las sombras.
  const lights = useMemo(
    () => ({
      key: new THREE.Color(c.key.color),
      fill: new THREE.Color(c.fill.color),
      rim: new THREE.Color(c.rim.color),
    }),
    [c],
  );

  return (
    <>
      {/* Mapa de entorno procedural: se renderiza una sola vez (frames={1}). */}
      <Environment frames={1} resolution={resolution} environmentIntensity={c.environmentIntensity * k}>
        {/* Cúpula: luz ambiental con color, envuelve por todos lados. */}
        <mesh scale={100}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={c.dome.color} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={c.key.intensity}
          color={c.key.color}
          position={c.key.position}
          scale={c.key.scale}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="circle"
          intensity={c.fill.intensity}
          color={c.fill.color}
          position={c.fill.position}
          scale={[6, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={c.rim.intensity}
          color={c.rim.color}
          position={c.rim.position}
          scale={[5, 5, 1]}
          target={[0, 0, 0]}
        />
        {children}
      </Environment>

      {/* Tres puntos "reales" para volumen y sombras. */}
      <directionalLight
        position={c.key.position}
        intensity={1.5 * k}
        color={lights.key}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <directionalLight position={c.fill.position} intensity={0.45 * k} color={lights.fill} />
      <directionalLight position={c.rim.position} intensity={0.8 * k} color={lights.rim} />
      <ambientLight intensity={0.18 * k} color={c.dome.color} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Estudio del cuerpo humano: entorno de softboxes, fondo y plataforma  */
/* ------------------------------------------------------------------ */

/**
 * Iluminación de estudio fotográfico 100% procedural (sin descargar HDRIs,
 * funciona offline): un entorno de "softboxes" que da reflejos realistas a los
 * materiales PBR (órganos húmedos, esmalte, ojos...), más fondo degradado y
 * plataforma con sombra de contacto.
 */
export function StudioEnvironment({ tint = '#6fd8ff', warm = '#ff9a7a', intensity = 1 }: { tint?: string; warm?: string; intensity?: number }) {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={intensity}>
      {/* Softbox cenital grande */}
      <Lightformer form="rect" intensity={2.2} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
      {/* Softbox frontal-izquierdo (luz principal) */}
      <Lightformer form="rect" intensity={2.6} position={[-4, 2, 4]} rotation-y={Math.PI / 4} scale={[3, 5, 1]} />
      {/* Contraluces de color: dan el borde brillante "de película" */}
      <Lightformer form="ring" color={tint} intensity={3} position={[5, 1, -3]} scale={3} />
      <Lightformer form="ring" color={warm} intensity={2} position={[-5, -1, -3]} scale={2.5} />
      {/* Suelo tenue */}
      <Lightformer form="rect" intensity={0.4} position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#556" />
    </Environment>
  );
}

const backdropVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const backdropFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float h = vDir.y * 0.5 + 0.5;
    vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
    // Halo suave detrás del sujeto
    float g = exp(-pow(length(vec2(vDir.x, vDir.y * 1.4 - 0.05)) / 0.55, 2.0)) * step(0.0, -vDir.z);
    c += uGlow * g * 0.35;
    // Motas de luz muy sutiles (sensación de profundidad)
    vec2 q = vec2(atan(vDir.z, vDir.x) * 90.0, vDir.y * 90.0);
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float dotMask = smoothstep(0.18, 0.0, length(f));
    float s = step(0.985, hash(cell)) * dotMask * (0.5 + 0.5 * sin(uTime * 1.5 + hash(cell + 3.0) * 6.28));
    c += s * uGlow * 0.35;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Fondo esférico con degradado, halo y motas (no afecta a la iluminación). */
export function GradientBackdrop({ top = '#1b2a4a', bottom = '#07090f', glow = '#3fa9d6', radius = 40 }: { top?: string; bottom?: string; glow?: string; radius?: number }) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uGlow: { value: new THREE.Color(glow) },
      uTime: { value: 0 },
    }),
    [top, bottom, glow],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVert,
        fragmentShader: backdropFrag,
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={radius} renderOrder={-10} material={material}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}

/** Plataforma holográfica con anillos que giran + sombra de contacto suave. */
export function HoloPlatform({ y = -1.6, radius = 1.1, color = '#5fe3ff' }: { y?: number; radius?: number; color?: string }) {
  const tier = useApp((s) => s.quality.tier);
  const ring = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.25;
  });
  return (
    <group position={[0, y, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#0e1626" roughness={0.35} metalness={0.6} />
      </mesh>
      <group ref={ring} rotation-x={-Math.PI / 2}>
        <mesh>
          <ringGeometry args={[radius * 0.97, radius, 96]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <mesh>
          <ringGeometry args={[radius * 0.7, radius * 0.715, 96, 1, 0, Math.PI * 1.4]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
        </mesh>
        <mesh rotation-z={Math.PI}>
          <ringGeometry args={[radius * 0.8, radius * 0.81, 96, 1, 0, Math.PI * 0.6]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
        </mesh>
      </group>
      {tier !== 'low' && (
        <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={radius * 3} blur={2.4} far={2.2} resolution={512} color="#000814" />
      )}
    </group>
  );
}
