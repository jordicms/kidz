import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';
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
