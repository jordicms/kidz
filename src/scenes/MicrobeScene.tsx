import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getMicrobe, KIND_COLORS, type Microbe } from '../data/micro';
import { useApp } from '../state/store';
import MicrobeModel from '../components/three/MicrobeModel';
import Studio from '../components/three/Studio';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';
import { getPhoto } from '../utils/photos';

function Turntable({ microbe }: { microbe: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.25 * delta;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.08;
  });
  return (
    <group ref={ref} scale={3.4}>
      <MicrobeModel microbe={microbe} />
    </group>
  );
}

/** Cuántos caben en un milímetro (para hacerse una idea del tamaño). */
function howMany(sizeUm: number): string {
  const n = 1000 / sizeUm;
  if (n < 2) return 'Con dos o tres ya llenas un milímetro';
  if (n < 10000) return `Caben unos ${Math.round(n).toLocaleString('es-ES')} en un milímetro`;
  return `Caben más de ${Math.round(n / 1000).toLocaleString('es-ES')}.000 en un milímetro`;
}

export default function MicrobeScene() {
  const microbeId = useApp((s) => s.microbeId);
  const quality = useApp((s) => s.quality);
  const microbe = microbeId ? getMicrobe(microbeId) : undefined;
  if (!microbe) return null;
  const kindColor = KIND_COLORS[microbe.kind];

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas camera={{ position: [0, 0.4, 6.2], fov: 45 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
            <color attach="background" args={['#0a1622']} />
            <Studio preset="lab" intensity={1.05} />
            {/* Contraluz del color del tipo de ser, para separarlo del fondo */}
            <pointLight position={[0, 0, -6]} intensity={26} color={kindColor} distance={22} decay={2} />
            <Turntable microbe={microbe} />
            <OrbitControls enablePan={false} minDistance={3.2} maxDistance={11} target={[0, 0, 0]} />
            <AdaptiveQuality />
            <Effects ao bloomThreshold={0.6} />
          </Canvas>
        </div>
      </div>

      <aside className="planet-panel">
        <div className="story-head">
          <span className="big-emoji">{microbe.emoji}</span>
          <div>
            <h2>
              {microbe.name}
              <span
                className="kind-badge"
                style={{ background: `${kindColor}33`, borderColor: kindColor, color: '#eaf6ff' }}
              >
                {microbe.kind}
              </span>
            </h2>
            <div className="tagline">{microbe.tagline}</div>
          </div>
        </div>

        <div className="micro-size">
          <span className="micro-size-value">
            {microbe.sizeUm >= 1 ? `${microbe.sizeUm} µm` : `${Math.round(microbe.sizeUm * 1000)} nm`}
          </span>
          <span className="micro-size-note">
            {microbe.sizeLabel}
            <br />
            {howMany(microbe.sizeUm)}
          </span>
        </div>

        <StoryPager story={microbe.story} storyKey={microbe.id} />
        <FactsGrid facts={microbe.facts} />

        {getPhoto(microbe.id) && (
          <>
            <div className="section-title">📷 ¿Cómo es en realidad?</div>
            <PhotoCard photoKey={microbe.id} label="Foto de microscopio" />
          </>
        )}
      </aside>
    </div>
  );
}
