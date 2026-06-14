import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { BODY_LAYERS, SYSTEMS, getOrgan } from '../data/body';
import { useApp } from '../state/store';
import { playHeartbeat } from '../utils/sound';
import OrganModel from '../components/three/OrganModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

const ORGANS_LAYER = BODY_LAYERS.length - 1; // índice de la capa "Órganos"

/** Figura humana low-poly (centrada en el origen para escalar concéntricamente). */
function HumanFigure({ color, opacity = 1 }: { color: string; opacity?: number }) {
  const transparent = opacity < 1;
  const mat = (
    <meshStandardMaterial color={color} flatShading roughness={0.85} transparent={transparent} opacity={opacity} />
  );
  const part = (geo: React.ReactNode, pos: [number, number, number], rot?: [number, number, number]) => (
    <mesh position={pos} rotation={rot}>
      {geo}
      {mat}
    </mesh>
  );
  return (
    <group>
      {part(<sphereGeometry args={[0.42, 20, 20]} />, [0, 1.45, 0])}
      {part(<cylinderGeometry args={[0.16, 0.18, 0.3, 12]} />, [0, 1.05, 0])}
      {part(<capsuleGeometry args={[0.5, 0.9, 6, 16]} />, [0, 0.35, 0])}
      {part(<sphereGeometry args={[0.46, 18, 18]} />, [0, -0.3, 0])}
      {/* Brazos */}
      {part(<capsuleGeometry args={[0.16, 0.95, 5, 12]} />, [-0.7, 0.3, 0], [0, 0, 0.14])}
      {part(<capsuleGeometry args={[0.16, 0.95, 5, 12]} />, [0.7, 0.3, 0], [0, 0, -0.14])}
      {/* Piernas */}
      {part(<capsuleGeometry args={[0.2, 1.1, 5, 12]} />, [-0.25, -1.05, 0])}
      {part(<capsuleGeometry args={[0.2, 1.1, 5, 12]} />, [0.25, -1.05, 0])}
    </group>
  );
}

/** El corazón colocado en el pecho; al tocarlo late y abre su ficha. */
function HeartInBody() {
  const openOrgan = useApp((s) => s.openOrgan);
  const heart = getOrgan('corazon');
  if (!heart) return null;
  const open = () => {
    playHeartbeat();
    openOrgan('corazon');
  };
  return (
    <group position={[-0.15, 0.55, 0.3]} scale={0.46}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <OrganModel organ={heart} beating />
      </group>
      <Html center position={[0, 1.7, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={open}>
          <span className="chip">🫀 Corazón · ¡tócame!</span>
        </div>
      </Html>
    </group>
  );
}

export default function BodyScene() {
  const quality = useApp((s) => s.quality);
  const [layer, setLayer] = useState(0);
  const [system, setSystem] = useState<string | null>(null);

  // Cada sistema lleva a la capa donde se ve mejor (en el prototipo, casi todos a Órganos).
  const systemToLayer = useMemo<Record<string, number>>(
    () => ({ oseo: 3, muscular: 2, circulatorio: ORGANS_LAYER, respiratorio: ORGANS_LAYER, digestivo: ORGANS_LAYER, nervioso: ORGANS_LAYER }),
    [],
  );

  const selectLayer = (i: number) => {
    setLayer(i);
    setSystem(null);
  };
  const selectSystem = (id: string) => {
    setSystem(id);
    setLayer(systemToLayer[id] ?? ORGANS_LAYER);
  };

  const showOrgans = layer >= ORGANS_LAYER;
  const surface = BODY_LAYERS[Math.min(layer, ORGANS_LAYER - 1)];

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0.4, 6], fov: 50 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#141026']} />
          <hemisphereLight args={['#cfd8ff', '#3a2f4a', 0.8]} />
          <directionalLight position={[4, 6, 5]} intensity={2} color="#fff2f4" />
          <ambientLight intensity={0.35} />

          {showOrgans ? (
            <>
              {/* Silueta translúcida de contexto + órganos del sistema */}
              <HumanFigure color="#e7c0a8" opacity={0.12} />
              <HeartInBody />
            </>
          ) : (
            <HumanFigure color={surface.color} />
          )}

          <OrbitControls enablePan={false} minDistance={3.5} maxDistance={10} target={[0, 0.2, 0]} maxPolarAngle={Math.PI * 0.9} />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="body-controls">
        <div className="control-row">
          <span className="control-label">Capas</span>
          {BODY_LAYERS.map((l, i) => (
            <button key={l.name} className={`chip-btn${i === layer && !system ? ' active' : ''}`} onClick={() => selectLayer(i)}>
              {l.name}
            </button>
          ))}
        </div>
        <div className="control-row">
          <span className="control-label">Sistemas</span>
          {SYSTEMS.map((s) => (
            <button
              key={s.id}
              className={`chip-btn${system === s.id ? ' active' : ''}`}
              style={system === s.id ? { borderColor: s.color, background: `${s.color}33` } : undefined}
              onClick={() => selectSystem(s.id)}
            >
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
        <div className="control-hint">{system ? `Sistema ${SYSTEMS.find((s) => s.id === system)?.name}` : surface.description}</div>
      </div>
    </>
  );
}
