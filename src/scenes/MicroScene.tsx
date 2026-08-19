import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { SCALES, KIND_COLORS, microbesAtScale, type Microbe, type MicroScale } from '../data/micro';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import { speak, stopSpeaking } from '../utils/speech';
import MicrobeModel from '../components/three/MicrobeModel';
import Studio from '../components/three/Studio';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

/** Espacio disponible en la escena (ancho × alto) donde debe caber todo. */
const VIEW_W = 12.5;
const VIEW_H = 5.8;

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
  position: [number, number, number];
}

/**
 * Coloca los microbios en fila, de mayor a menor, sin solaparse, y calcula
 * cuánto hay que reducir el conjunto para que quepa en pantalla.
 *
 * Lo importante: los tamaños son proporcionales a los REALES, así que al
 * verlos juntos se aprecia de verdad que una bacteria es diez veces menor
 * que un glóbulo rojo. El ajuste al encuadre se aplica a todo el grupo por
 * igual, de modo que esa proporción no se falsea.
 */
function layout(microbes: Microbe[], scale: MicroScale): { items: Placed[]; fit: number } {
  const GAP = 0.22; // separación extra, relativa al hueco del vecino
  const sizes = microbes.map((m) => Math.max(0.16, (m.sizeUm / scale.fovUm) * VIEW_W));
  // Hueco reservado a cada uno (incluye halo y partes que sobresalen).
  const slots = microbes.map((m, i) => sizes[i] * (FOOTPRINT[m.shape] ?? FOOTPRINT_DEFAULT));
  const maxSlot = Math.max(...slots);

  const items: Placed[] = [];
  let cursor = 0;
  microbes.forEach((m, i) => {
    const r = slots[i] / 2;
    if (i > 0) cursor += r + GAP * Math.max(r, slots[i - 1] / 2);
    // Los pequeños se levantan/bajan un poco para que las etiquetas no choquen.
    const stagger = i % 2 === 0 ? 1 : -1;
    const lift = (maxSlot / 2 - r) * 0.3 * stagger;
    items.push({
      microbe: m,
      size: sizes[i],
      position: [cursor, lift, ((i % 3) - 1) * 0.12],
    });
    cursor += r;
  });

  // Extensión real de la fila: del borde izquierdo del primero al derecho del
  // último (el centro del primero está en 0, así que su borde queda en -r).
  const left = -slots[0] / 2;
  const right = items[items.length - 1].position[0] + slots[slots.length - 1] / 2;
  const extentW = right - left;
  const mid = (left + right) / 2;
  items.forEach((it) => (it.position[0] -= mid));

  const fit = Math.min(1.6, VIEW_W / Math.max(extentW, 0.001), VIEW_H / Math.max(maxSlot, 0.001));
  return { items, fit };
}

/* ------------------------------------------------------------------ */
/* Un microbio a la deriva                                             */
/* ------------------------------------------------------------------ */

function Floater({ placed, fit, seed }: { placed: Placed; fit: number; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const openMicrobe = useApp((s) => s.openMicrobe);
  const { microbe, size, position } = placed;

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
      position[0] + Math.sin(t * 0.45 + seed) * drift,
      position[1] + Math.cos(t * 0.38 + seed * 1.3) * drift + Math.sin(t * 7.5 + seed) * jitter,
      position[2] + Math.sin(t * 0.3 + seed * 0.7) * drift * 0.6,
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
      <Html center position={[0, Math.max(size * 0.62, 0.3) + 0.34, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={open}>
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
      p[i * 3] = (Math.random() - 0.5) * VIEW_W * 1.6;
      p[i * 3 + 1] = (Math.random() - 0.5) * VIEW_H * 1.8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return p;
  }, [count]);

  useFrame(({ clock }, delta) => {
    const geo = ref.current?.geometry;
    if (!geo) return;
    const t = clock.elapsedTime;
    const pos = geo.attributes.position;
    const top = (VIEW_H * 1.8) / 2;
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

/** Al cambiar de zoom, el grupo entra con un pequeño "enfoque". */
function FocusIn({ children, keyId, fit }: { children: ReactNode; keyId: string; fit: number }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
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

export default function MicroScene() {
  const quality = useApp((s) => s.quality);
  const [level, setLevel] = useState(2); // arranca en "las células"
  const scale = SCALES[level];
  const { items, fit } = useMemo(() => layout(microbesAtScale(scale), scale), [scale]);

  useEffect(() => {
    speak(`${scale.name}. ${scale.reference}`);
  }, [scale]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <>
      <div className="scene-canvas micro-field" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0, 11], fov: 50 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#08131f']} />
          <fog attach="fog" args={['#0a1a28', 16, 34]} />

          {/* Iluminación de laboratorio con mapa de entorno (reflejos húmedos) */}
          <Studio preset="lab" intensity={1.05} />
          <Backdrop color={scale.color} />

          {/* Luz que atraviesa la muestra desde detrás, como en un microscopio */}
          <pointLight position={[0, 0, -6]} intensity={24} color={scale.color} distance={26} decay={2} />

          <FocusIn keyId={scale.id} fit={fit}>
            {items.map((it, i) => (
              <Floater key={it.microbe.id} placed={it} fit={fit} seed={i * 2.7 + 1} />
            ))}
          </FocusIn>

          <Debris count={scaleCount(70, quality, 25)} />

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            rotateSpeed={0.25}
            maxPolarAngle={Math.PI * 0.62}
            minPolarAngle={Math.PI * 0.38}
            maxAzimuthAngle={0.35}
            minAzimuthAngle={-0.35}
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
