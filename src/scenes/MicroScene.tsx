import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SCALES, KIND_COLORS, microbesAtScale, type Microbe, type MicroScale } from '../data/micro';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import { speak, stopSpeaking } from '../utils/speech';
import Controls, { visibleSizeAt } from '../components/three/Controls';
import MicrobeModel from '../components/three/MicrobeModel';
import Studio from '../components/three/Studio';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

/** Anchura de referencia del campo de visión, en unidades de escena. Solo se
 *  usa para convertir micrómetros en unidades; el encaje real en pantalla lo
 *  calcula <Ladder/> a partir del viewport. */
const FIELD = 12.5;

/** Cámara de la escena. El encaje en pantalla se calcula con estos valores,
 *  no preguntando al viewport (que no refleja el fov corregido). */
const CAM_DIST = 11;
const CAM_FOV = 50;

/**
 * Cuánto ocupa de verdad cada modelo respecto a su tamaño nominal.
 *
 * El tamaño nominal es el diámetro del microbio, pero varios modelos se salen
 * de esa esfera: el halo de membrana (Atmosphere) la agranda un 22 %, y la
 * neurona o el ADN son bastante más largos que anchos. Sin este margen, los
 * más grandes salían recortados por el borde de la pantalla.
 */
const FOOTPRINT: Record<string, number> = {
  neurona: 1.75,
  dna: 1.75,
  phage: 1.5,
  cocci: 1.4,
  cyano: 1.4,
  paramecio: 1.3,
  diatomea: 1.28,
  tardigrado: 1.25,
};
const FOOTPRINT_DEFAULT = 1.32;

/* ------------------------------------------------------------------ */
/* Composición: una "escalera de tamaños" que siempre encaja           */
/* ------------------------------------------------------------------ */

interface Placed {
  microbe: Microbe;
  /** Diámetro en unidades de escena ANTES de ajustar al encuadre. */
  size: number;
  /** Posición a lo largo del eje largo de la pantalla. */
  main: number;
  /** Desvío en el eje corto (para que las etiquetas no choquen). */
  cross: number;
  depth: number;
}

/**
 * Coloca los microbios en fila, de mayor a menor y sin solaparse.
 *
 * Las posiciones se dan en un eje "largo" abstracto: <Ladder/> lo orienta
 * luego en horizontal o en vertical según cómo esté la pantalla. Así, en un
 * móvil en vertical la escalera de tamaños baja por la pantalla en vez de
 * salirse por los lados.
 *
 * Lo importante: los tamaños son proporcionales a los REALES, así que al
 * verlos juntos se aprecia de verdad que una bacteria es diez veces menor
 * que un glóbulo rojo. El ajuste al encuadre se aplica a todo el grupo por
 * igual, de modo que esa proporción no se falsea.
 */
function layout(
  microbes: Microbe[],
  scale: MicroScale,
): { items: Placed[]; extentMain: number; maxCross: number } {
  const GAP = 0.22; // separación extra, relativa al hueco del vecino
  const sizes = microbes.map((m) => Math.max(0.16, (m.sizeUm / scale.fovUm) * FIELD));
  // Hueco reservado a cada uno (incluye halo y partes que sobresalen).
  const slots = microbes.map((m, i) => sizes[i] * (FOOTPRINT[m.shape] ?? FOOTPRINT_DEFAULT));
  const maxSlot = Math.max(...slots);

  const items: Placed[] = [];
  let cursor = 0;
  microbes.forEach((m, i) => {
    const r = slots[i] / 2;
    if (i > 0) cursor += r + GAP * Math.max(r, slots[i - 1] / 2);
    // Los pequeños se desvían a un lado y a otro alternativamente.
    const stagger = i % 2 === 0 ? 1 : -1;
    const cross = (maxSlot / 2 - r) * 0.3 * stagger;
    items.push({ microbe: m, size: sizes[i], main: cursor, cross, depth: ((i % 3) - 1) * 0.12 });
    cursor += r;
  });

  // Extensión real de la fila: del borde inicial del primero al final del
  // último (el centro del primero está en 0, así que su borde queda en -r).
  const start = -slots[0] / 2;
  const end = items[items.length - 1].main + slots[slots.length - 1] / 2;
  const extentMain = end - start;
  const mid = (start + end) / 2;
  items.forEach((it) => (it.main -= mid));

  return { items, extentMain, maxCross: maxSlot };
}

/* ------------------------------------------------------------------ */
/* Un microbio a la deriva                                             */
/* ------------------------------------------------------------------ */

function Floater({
  placed,
  fit,
  seed,
  vertical,
  index,
}: {
  placed: Placed;
  fit: number;
  seed: number;
  /** La escalera baja por la pantalla (móvil en vertical) en vez de cruzarla. */
  vertical: boolean;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const openMicrobe = useApp((s) => s.openMicrobe);
  const { microbe, size, main, cross, depth } = placed;

  // El eje largo va en X (apaisado) o en Y de arriba abajo (vertical).
  const home = vertical ? [cross, -main, depth] : [main, cross, depth];

  // Zona sensible al toque: al menos ~0,45 unidades de mundo, para que
  // incluso los microbios diminutos se puedan tocar con el dedo.
  const hitRadius = Math.max(0.72, 0.45 / Math.max(0.001, size * fit));

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // Deriva suave proporcional al tamaño (no se salen de su sitio) más el
    // temblor browniano, que afecta mucho más a los más pequeños.
    const drift = size * 0.12 * (microbe.swims ? 1.6 : 1);
    const jitter = THREE.MathUtils.clamp(0.06 / Math.max(0.12, size), 0.004, 0.09);
    g.position.set(
      home[0] + Math.sin(t * 0.45 + seed) * drift,
      home[1] + Math.cos(t * 0.38 + seed * 1.3) * drift + Math.sin(t * 7.5 + seed) * jitter,
      home[2] + Math.sin(t * 0.3 + seed * 0.7) * drift * 0.6,
    );
    // Giro contenido: si cabecean mucho, los modelos alargados (neurona, ADN)
    // se salen del hueco que tienen reservado.
    g.rotation.x = Math.sin(t * 0.22 + seed) * 0.22;
    g.rotation.y = t * (microbe.swims ? 0.2 : 0.09) + seed;
    g.rotation.z = Math.cos(t * 0.18 + seed * 1.1) * 0.16;
  });

  const open = () => openMicrobe(microbe.id);

  return (
    <group ref={group}>
      <group
        scale={size}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <MicrobeModel microbe={microbe} />
        <mesh visible={false}>
          <sphereGeometry args={[hitRadius, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <Html
        center
        position={vertical ? [0, Math.max(size * 0.5, 0.2) + 0.22, 0] : [0, Math.max(size * 0.62, 0.3) + 0.34, 0]}
        zIndexRange={[5, 0]}
      >
        <div
          className="body-label"
          onClick={open}
          style={vertical ? { transform: `translateX(${index % 2 === 0 ? -46 : 46}%)` } : undefined}
        >
          <span className="chip">
            {microbe.emoji} {microbe.name.replace('El ', '').replace('La ', '')}
            <i className="era-pill" style={{ background: KIND_COLORS[microbe.kind] }}>
              {microbe.sizeUm >= 1 ? `${microbe.sizeUm} µm` : `${Math.round(microbe.sizeUm * 1000)} nm`}
            </i>
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ambiente del portaobjetos                                           */
/* ------------------------------------------------------------------ */

/** Fondo iluminado (campo claro): un halo suave detrás de la muestra.
 *  Sin él, el fondo negro plano hace que todo parezca flotar en la nada. */
function Backdrop({ color }: { color: string }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.35, 'rgba(160,220,255,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[0, 0, -9]}>
      <planeGeometry args={[46, 30]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Partículas del líquido: restos y motas que flotan y dan sensación de agua. */
function Debris({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const map = useMemo(() => createGlowTexture('micro-mote', 'rgba(200,240,255,0.85)'), []);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * FIELD * 1.6;
      p[i * 3 + 1] = (Math.random() - 0.5) * FIELD * 1.4;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return p;
  }, [count]);

  useFrame(({ clock }, delta) => {
    const geo = ref.current?.geometry;
    if (!geo) return;
    const t = clock.elapsedTime;
    const pos = geo.attributes.position;
    const top = (FIELD * 1.4) / 2;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.5 + i) * delta * 0.22);
      let y = pos.getY(i) + delta * 0.1 + Math.cos(t * 0.7 + i) * delta * 0.18;
      if (y > top) y = -top;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={map}
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/**
 * Orienta y encaja la escalera de tamaños en la pantalla que toque.
 *
 * Antes el encaje usaba medidas fijas pensadas para una pantalla apaisada: en
 * un móvil en vertical la fila se salía por los lados y, como no había ni
 * desplazamiento ni zoom, era imposible llegar a los que quedaban fuera.
 * Ahora se mide el viewport de verdad (en unidades de mundo) y la escalera se
 * pone en vertical cuando la pantalla es más alta que ancha.
 *
 * Se reservan márgenes para el HUD: la barra de arriba y los controles de
 * abajo tapan bastante alto, sobre todo en vertical.
 */
function Ladder({
  children,
  keyId,
  extentMain,
  maxCross,
  vertical,
  onFit,
}: {
  children: ReactNode;
  keyId: string;
  extentMain: number;
  maxCross: number;
  vertical: boolean;
  onFit: (fit: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const t = useRef(0);

  const fit = useMemo(() => {
    const view = visibleSizeAt(CAM_FOV, size.width / size.height, CAM_DIST);
    // Alto útil: hay que descontar el HUD superior y los controles inferiores.
    const usableH = view.height * (vertical ? 0.66 : 0.62);
    const usableW = view.width * 0.94;
    const availMain = vertical ? usableH : usableW;
    const availCross = vertical ? usableW : usableH;
    return Math.min(1.6, availMain / Math.max(extentMain, 0.001), availCross / Math.max(maxCross, 0.001));
  }, [size.width, size.height, vertical, extentMain, maxCross]);

  useEffect(() => {
    onFit(fit);
  }, [fit, onFit]);

  // Al cambiar de zoom, el grupo entra con un pequeño "enfoque".
  useEffect(() => {
    t.current = 0;
  }, [keyId]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current = Math.min(1, t.current + delta * 2.4);
    const e = 1 - Math.pow(1 - t.current, 3);
    ref.current.scale.setScalar(fit * (0.86 + e * 0.14));
  });

  return <group ref={ref}>{children}</group>;
}

/** Detecta si la pantalla es más alta que ancha (móvil en vertical). */
function useVertical(): boolean {
  const size = useThree((s) => s.size);
  return size.height > size.width * 1.05;
}

/** Puente: la orientación se decide dentro del Canvas y la necesitan los
 *  hijos, así que se calcula aquí y se pasa por render prop. */
function Field({ scale }: { scale: MicroScale }) {
  const vertical = useVertical();
  const { items, extentMain, maxCross } = useMemo(() => layout(microbesAtScale(scale), scale), [scale]);
  const [fit, setFit] = useState(1);
  const onFit = useCallback((f: number) => setFit(f), []);

  return (
    <Ladder
      keyId={scale.id}
      extentMain={extentMain}
      maxCross={maxCross}
      vertical={vertical}
      onFit={onFit}
    >
      {items.map((it, i) => (
        <Floater key={it.microbe.id} placed={it} fit={fit} seed={i * 2.7 + 1} vertical={vertical} index={i} />
      ))}
    </Ladder>
  );
}

export default function MicroScene() {
  const quality = useApp((s) => s.quality);
  const [level, setLevel] = useState(2); // arranca en "las células"
  const scale = SCALES[level];

  useEffect(() => {
    speak(`${scale.name}. ${scale.reference}`);
  }, [scale]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <>
      <div className="scene-canvas micro-field" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0, CAM_DIST], fov: CAM_FOV }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#08131f']} />
          <fog attach="fog" args={['#0a1a28', 16, 34]} />

          {/* Iluminación de laboratorio con mapa de entorno (reflejos húmedos) */}
          <Studio preset="lab" intensity={1.05} />
          <Backdrop color={scale.color} />

          {/* Luz que atraviesa la muestra desde detrás, como en un microscopio */}
          <pointLight position={[0, 0, -6]} intensity={24} color={scale.color} distance={26} decay={2} />

          <Field scale={scale} />

          <Debris count={scaleCount(70, quality, 25)} />

          {/* Se puede girar, acercar y desplazar: antes estaba todo bloqueado
              y lo que quedaba fuera de pantalla era inalcanzable. */}
          <Controls
            minDistance={4}
            maxDistance={20}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.15}
          />
          <AdaptiveQuality />
          {/* Poca profundidad de campo: el sello visual del microscopio */}
          <Effects ao dof={{ focusDistance: 0.011, focalLength: 0.05, bokehScale: 1.3 }} bloomThreshold={0.62} />
        </Canvas>
      </div>

      {/* Máscara circular del ocular */}
      <div className="micro-eyepiece" />

      <div className="ocean-controls">
        <div className="ocean-zone" style={{ borderColor: scale.color }}>
          {scale.emoji} <strong>{scale.name}</strong> · campo de {scale.label}
        </div>
        {/* Barra de escala, como en las fotos de microscopio de verdad */}
        <div className="micro-scalebar" style={{ borderColor: scale.color }}>
          <span className="micro-bar" style={{ background: scale.color }} />
          <span>{scale.label}</span>
        </div>
        <input
          className="ocean-slider"
          type="range"
          min={0}
          max={SCALES.length - 1}
          step={1}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          aria-label="Nivel de aumento"
        />
        <div className="control-hint">{scale.reference}</div>
      </div>
    </>
  );
}
