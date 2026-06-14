import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getDino, ERA_COLORS } from '../data/dinos';
import type { Dino } from '../data/dinos';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { playRoar, roarPitchFor } from '../utils/sound';
import DinoModel from '../components/three/DinoModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';

function TurntableDino({ dino }: { dino: Dino }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.25 * delta;
  });
  // Normaliza para que todos se vean a un tamaño parecido en la ficha.
  const scale = 2.6 / dino.heightM;
  return (
    <group ref={ref} position={[0, -1.6, 0]}>
      <group scale={scale}>
        <DinoModel dino={dino} moving={false} />
      </group>
    </group>
  );
}

/** Comparación visual de tamaño: el dino frente a un niño de 1,3 m. */
function SizeCompare({ dino }: { dino: Dino }) {
  const childM = 1.3;
  const maxM = Math.max(dino.heightM, childM);
  return (
    <div className="size-compare">
      <div className="size-bar">
        <div className="size-fill dino" style={{ height: `${(dino.heightM / maxM) * 100}%` }}>
          <span>{dino.emoji}</span>
        </div>
        <small>{dino.name.split(' ')[0]} · {dino.heightM} m</small>
      </div>
      <div className="size-bar">
        <div className="size-fill child" style={{ height: `${(childM / maxM) * 100}%` }}>
          <span>🧒</span>
        </div>
        <small>Tú · {childM} m</small>
      </div>
    </div>
  );
}

export default function DinoScene() {
  const dinoId = useApp((s) => s.dinoId);
  const quality = useApp((s) => s.quality);
  const dino = dinoId ? getDino(dinoId) : undefined;
  if (!dino) return null;

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas
            shadows={quality.tier !== 'low'}
            camera={{ position: [0, 1.2, 7] }}
            dpr={quality.dpr}
            gl={{ antialias: quality.antialias }}
          >
            <color attach="background" args={['#101a10']} />
            <fog attach="fog" args={['#101a10', 12, 24]} />
            <hemisphereLight args={['#cfe7ff', '#3a5a30', 0.8]} />
            <directionalLight position={[6, 8, 4]} intensity={2.2} color="#fff4e0" castShadow shadow-mapSize={[1024, 1024]} />
            {/* Suelo */}
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[8, scaleCount(48, quality, 16)]} />
              <meshStandardMaterial color="#3f6a33" flatShading roughness={1} />
            </mesh>
            <TurntableDino dino={dino} />
            <OrbitControls enablePan={false} minDistance={4} maxDistance={12} target={[0, 0.4, 0]} maxPolarAngle={Math.PI * 0.52} />
            <AdaptiveQuality />
            <Effects />
          </Canvas>
        </div>
      </div>

      <aside className="planet-panel">
        <div className="story-head">
          <span className="big-emoji">{dino.emoji}</span>
          <div>
            <h2>
              {dino.name}
              <span className="kind-badge" style={{ background: `${ERA_COLORS[dino.era]}33`, borderColor: ERA_COLORS[dino.era], color: ERA_COLORS[dino.era] }}>
                {dino.era}
              </span>
            </h2>
            <div className="tagline">{dino.tagline} · {dino.diet}</div>
          </div>
          <button
            className="btn btn-round story-close"
            onClick={() => playRoar(roarPitchFor(dino.heightM))}
            aria-label="Rugido"
            title="¡Rugido!"
          >
            🔊
          </button>
        </div>

        <StoryPager story={dino.story} storyKey={dino.id} />
        <FactsGrid facts={dino.facts} />

        <div className="section-title">📏 ¿Cómo de grande era?</div>
        <SizeCompare dino={dino} />
      </aside>
    </div>
  );
}
