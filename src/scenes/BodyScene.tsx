import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { BODY_LAYERS, SYSTEMS, INNER_ORGAN_IDS, JOURNEYS, getOrgan } from '../data/body';
import { useApp } from '../state/store';
import { playHeartbeat } from '../utils/sound';
import OrganModel from '../components/three/OrganModel';
import { HumanForm, Skeleton, Circulatory, NervousNet } from '../components/three/Anatomy';
import GltfModel from '../components/three/GltfModel';
import { getAnatomyModelUrl } from '../utils/anatomyModels';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

/** Modelo anatómico real a tamaño de cuerpo (~3,4 u) si existe; si no, el procedural. */
function whole(id: string, fallback: React.ReactNode) {
  const url = getAnatomyModelUrl(id);
  return url ? <GltfModel url={url} height={3.4} /> : fallback;
}

const ORGANS_LAYER = BODY_LAYERS.length - 1;
// Escalas realistas de cada órgano dentro del cuerpo (~3,4 u de alto).
const ORGAN_SCALE: Record<string, number> = {
  corazon: 0.3,
  pulmones: 0.34,
  cerebro: 0.5,
  estomago: 0.42,
  intestinos: 0.5,
};
const SKIN = '#e9b48c';
const GHOST = '#e7c0a8';

/** Un órgano colocado dentro de la figura, tocable, que abre su ficha. */
function OrganInBody({ id, labelY = 0.9 }: { id: string; labelY?: number }) {
  const openOrgan = useApp((s) => s.openOrgan);
  const organ = getOrgan(id);
  if (!organ) return null;
  const open = () => {
    if (id === 'corazon') playHeartbeat();
    openOrgan(id);
  };
  return (
    <group position={organ.position}>
      <group
        scale={ORGAN_SCALE[id] ?? 0.4}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <OrganModel organ={organ} beating />
      </group>
      <Html center position={[0, labelY, 0]} zIndexRange={[5, 0]}>
        <div className="body-label" onClick={open}>
          <span className="chip">{organ.emoji} {organ.name}</span>
        </div>
      </Html>
    </group>
  );
}

/** Toda la figura/esqueleto es tocable (para óseo y muscular). */
function TappableWhole({ id, children }: { id: string; children: React.ReactNode }) {
  const openOrgan = useApp((s) => s.openOrgan);
  const organ = getOrgan(id);
  return (
    <group>
      <group
        onClick={(e) => {
          e.stopPropagation();
          openOrgan(id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {children}
      </group>
      {organ && (
        <Html center position={[0, 1.95, 0]} zIndexRange={[5, 0]}>
          <div className="body-label" onClick={() => openOrgan(id)}>
            <span className="chip">{organ.emoji} {organ.name} · ¡tócame!</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function BodyContent({ layer, system }: { layer: number; system: string | null }) {
  // Sistemas
  if (system === 'oseo') {
    return <TappableWhole id="huesos">{whole('huesos', <Skeleton />)}</TappableWhole>;
  }
  if (system === 'muscular') {
    return <TappableWhole id="musculos">{whole('musculos', <HumanForm tone="#a83a3a" />)}</TappableWhole>;
  }
  if (system === 'circulatorio') {
    return (
      <>
        <HumanForm tone={GHOST} opacity={0.1} />
        <Circulatory />
        <OrganInBody id="corazon" />
      </>
    );
  }
  if (system === 'respiratorio') {
    return (
      <>
        <HumanForm tone={GHOST} opacity={0.1} />
        <OrganInBody id="pulmones" labelY={1.1} />
      </>
    );
  }
  if (system === 'nervioso') {
    return (
      <>
        <HumanForm tone={GHOST} opacity={0.1} />
        <NervousNet />
        <OrganInBody id="cerebro" labelY={0.7} />
      </>
    );
  }
  if (system === 'digestivo') {
    return (
      <>
        <HumanForm tone={GHOST} opacity={0.1} />
        <OrganInBody id="estomago" labelY={0.7} />
        <OrganInBody id="intestinos" labelY={0.7} />
      </>
    );
  }

  // Capas (pelar)
  if (layer === 0) return <>{whole('cuerpo', <HumanForm tone={SKIN} />)}</>;
  if (layer === 1) return <HumanForm tone="#f2d79a" />; // grasa
  if (layer === 2) return <>{whole('musculos', <HumanForm tone="#b23b3b" />)}</>; // músculos
  if (layer === 3) return <>{whole('huesos', <Skeleton />)}</>; // huesos
  return (
    <>
      <HumanForm tone={GHOST} opacity={0.1} />
      {!getAnatomyModelUrl('huesos') && <Skeleton opacity={0.12} />}
      {INNER_ORGAN_IDS.map((id) => (
        <OrganInBody key={id} id={id} />
      ))}
    </>
  );
}

export default function BodyScene() {
  const quality = useApp((s) => s.quality);
  const goJourney = useApp((s) => s.goJourney);
  const [layer, setLayer] = useState(0);
  const [system, setSystem] = useState<string | null>(null);

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

  const surface = BODY_LAYERS[Math.min(layer, ORGANS_LAYER)];

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0.3, 5.4], fov: 50 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#151a24']} />
          <hemisphereLight args={['#dfe8ff', '#3a2f3a', 0.9]} />
          <directionalLight position={[4, 6, 5]} intensity={1.9} color="#fff2f4" />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#a8c0ff" />
          <ambientLight intensity={0.3} />
          <group position={[0, 0.15, 0]}>
            <BodyContent layer={layer} system={system} />
          </group>
          <OrbitControls enablePan={false} minDistance={3.2} maxDistance={9} target={[0, 0.25, 0]} maxPolarAngle={Math.PI * 0.92} />
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
        <div className="control-row">
          <span className="control-label">Viajes</span>
          {JOURNEYS.map((j) => (
            <button key={j.id} className="chip-btn" onClick={() => goJourney(j.id)}>
              {j.emoji} {j.title.replace('El viaje de ', '').replace('Viaje de ', '')}
            </button>
          ))}
        </div>
        <div className="control-hint">{system ? `Sistema ${SYSTEMS.find((s) => s.id === system)?.name}` : surface.description}</div>
      </div>
    </>
  );
}
