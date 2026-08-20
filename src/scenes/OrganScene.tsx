import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

import { getOrgan, SYSTEMS } from '../data/body';
import type { Organ } from '../data/types';
import { useApp } from '../state/store';
import { playHeartbeat } from '../utils/sound';
import Controls from '../components/three/Controls';
import OrganModel from '../components/three/OrganModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';
import { getPhoto } from '../utils/photos';

const FIT: Record<string, number> = {
  corazon: 1.5,
  cerebro: 1.9,
  estomago: 1.7,
  pulmones: 1.0,
  intestinos: 1.4,
  huesos: 1.4,
  musculos: 1.4,
};

function Turntable({ organ }: { organ: Organ }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.3 * delta;
  });
  return (
    <group ref={ref} scale={FIT[organ.id] ?? 1.4}>
      <OrganModel organ={organ} beating />
    </group>
  );
}

export default function OrganScene() {
  const organId = useApp((s) => s.organId);
  const quality = useApp((s) => s.quality);
  const organ = organId ? getOrgan(organId) : undefined;
  if (!organ) return null;
  const system = SYSTEMS.find((s) => s.id === organ.system);

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas camera={{ position: [0, 0.3, 4.5] }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
            <color attach="background" args={['#1a1020']} />
            <hemisphereLight args={['#ffd8e0', '#3a2030', 0.8]} />
            <directionalLight position={[4, 5, 4]} intensity={2.2} color="#fff2f4" />
            <ambientLight intensity={0.4} />
            <Turntable organ={organ} />
            <Controls minDistance={2.5} maxDistance={8} target={[0, 0.1, 0]} />
            <AdaptiveQuality />
            <Effects />
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
          <button className="btn btn-round story-close" onClick={() => playHeartbeat()} aria-label="Latido" title="¡Escucha el latido!">
            💓
          </button>
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
