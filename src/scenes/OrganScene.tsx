import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import Controls from '../components/three/Controls';
import { getOrgan, SYSTEMS } from '../data/body';
import type { Organ } from '../data/types';
import { useApp } from '../state/store';
import { playHeartbeat } from '../utils/sound';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { GradientBackdrop, HoloPlatform, StudioEnvironment } from '../components/three/Studio';
import { MeshTierContext, OrganById, XRayShell } from '../components/three/body/BodyParts';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';
import { getPhoto } from '../utils/photos';
import type { Vec3 } from '../utils/sdf';
import { getAnatomyModelUrl } from '../utils/anatomyModels';
import GltfModel from '../components/three/GltfModel';

/**
 * Encuadre de cada órgano: todos están modelados en coordenadas del cuerpo,
 * así que aquí se centran y escalan para que ocupen bien la vista.
 */
const FIT: Record<string, { c: Vec3; size: number }> = {
  corazon: { c: [0.04, 0.58, 0.03], size: 0.4 },
  pulmones: { c: [0, 0.8, -0.01], size: 0.82 },
  cerebro: { c: [0, 1.47, -0.005], size: 0.4 },
  estomago: { c: [0.07, 0.2, 0.05], size: 0.4 },
  higado: { c: [-0.06, 0.34, 0.02], size: 0.46 },
  rinones: { c: [0, -0.06, -0.04], size: 0.55 },
  intestinos: { c: [0, -0.13, 0.07], size: 0.52 },
  huesos: { c: [0, 0, 0], size: 3.5 },
  musculos: { c: [0, 0, 0], size: 3.5 },
};

const TARGET_SIZE = 2.3;

function Turntable({ organ }: { organ: Organ }) {
  const ref = useRef<THREE.Group>(null);
  const [spin, setSpin] = useState(true);
  useFrame((_, delta) => {
    if (ref.current && spin) ref.current.rotation.y += 0.35 * delta;
  });
  const fit = FIT[organ.id] ?? { c: [0, 0, 0] as Vec3, size: 1 };
  const k = TARGET_SIZE / fit.size;
  // Si hay un modelo anatómico real (GLB, `npm run anatomy`), tiene prioridad.
  const url = getAnatomyModelUrl(organ.id);
  if (url) {
    return (
      <group ref={ref} onPointerDown={() => setSpin(false)}>
        <GltfModel url={url} height={TARGET_SIZE} />
      </group>
    );
  }
  return (
    <group ref={ref} onPointerDown={() => setSpin(false)}>
      <group scale={k} position={[-fit.c[0] * k, -fit.c[1] * k, -fit.c[2] * k]}>
        {organ.id === 'rinones' && <XRayShell opacity={0.25} />}
        <OrganById id={organ.id} detail />
      </group>
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div className="body-loading">
        <span className="pulse-dot" /> Preparando…
      </div>
    </Html>
  );
}

export default function OrganScene() {
  const organId = useApp((s) => s.organId);
  const quality = useApp((s) => s.quality);
  const [meshTier] = useState(quality.tier);
  const organ = organId ? getOrgan(organId) : undefined;
  if (!organ) return null;
  const system = SYSTEMS.find((s) => s.id === organ.system);

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas camera={{ position: [0, 0.25, 4.6], fov: 42 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
            <color attach="background" args={['#07090f']} />
            <GradientBackdrop top="#2a1630" bottom="#07060c" glow={system?.color ?? organ.color} />
            <StudioEnvironment warm={organ.color} />
            <hemisphereLight args={['#ffe8ee', '#2a1a22', 0.35]} />
            <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff2ec" />
            <directionalLight position={[-4, 1, 2]} intensity={0.6} color="#c8d4ff" />
            <directionalLight position={[0, 2, -5]} intensity={1.6} color={system?.color ?? '#7fe3ff'} />
            <MeshTierContext.Provider value={meshTier}>
              <Suspense fallback={<Loading />}>
                <Turntable organ={organ} />
              </Suspense>
            </MeshTierContext.Provider>
            <HoloPlatform y={-1.45} radius={0.85} color={system?.color ?? '#5fe3ff'} />
            <Controls minDistance={2.2} maxDistance={8} target={[0, 0, 0]} />
            <AdaptiveQuality />
            <Effects ao={{ radius: 0.35, intensity: 2 }} bloomThreshold={0.8} />
          </Canvas>
        </div>
      </div>

      <aside className="planet-panel">
        <div className="story-head">
          <span className="big-emoji">{organ.emoji}</span>
          <div>
            <h2>
              {organ.name}
              {system && (
                <span
                  className="kind-badge"
                  style={{ background: `${system.color}33`, borderColor: system.color, color: system.color }}
                >
                  {system.name}
                </span>
              )}
            </h2>
            <div className="tagline">{organ.tagline}</div>
          </div>
          {organ.id === 'corazon' && (
            <button className="btn btn-round story-close" onClick={() => playHeartbeat()} aria-label="Latido" title="¡Escucha el latido!">
              💓
            </button>
          )}
        </div>

        <StoryPager story={organ.story} storyKey={organ.id} />
        <FactsGrid facts={organ.facts} />

        {getPhoto(organ.id) && (
          <>
            <div className="section-title">📷 ¿Cómo es en realidad?</div>
            <PhotoCard photoKey={organ.id} label="Foto real" />
          </>
        )}
      </aside>
    </div>
  );
}
