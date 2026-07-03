import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getCreature, ZONES } from '../data/ocean';
import type { SeaCreature } from '../data/ocean';
import { useApp } from '../state/store';
import SeaCreatureModel from '../components/three/SeaCreatureModel';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';
import { getPhoto } from '../utils/photos';

function Turntable({ creature }: { creature: SeaCreature }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.3 * delta;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.15;
  });
  return (
    <group ref={ref} scale={1.6}>
      <SeaCreatureModel creature={creature} />
    </group>
  );
}

export default function SeaCreatureScene() {
  const seaId = useApp((s) => s.seaId);
  const quality = useApp((s) => s.quality);
  const creature = seaId ? getCreature(seaId) : undefined;
  if (!creature) return null;
  const zone = ZONES.find((z) => z.zone === creature.zone);

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas camera={{ position: [0, 0.6, 5.5] }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
            <color attach="background" args={[zone?.color ?? '#123a6b']} />
            <fog attach="fog" args={[zone?.color ?? '#123a6b', 8, 20]} />
            <hemisphereLight args={['#bfe3ff', '#0a2a4a', 0.7]} />
            <directionalLight position={[5, 7, 4]} intensity={creature.zone === 'abismo' ? 0.5 : 1.8} color="#dff2ff" />
            <ambientLight intensity={creature.zone === 'abismo' ? 0.15 : 0.35} />
            <Turntable creature={creature} />
            <OrbitControls enablePan={false} minDistance={3} maxDistance={10} target={[0, 0, 0]} />
            <AdaptiveQuality />
            <Effects />
          </Canvas>
        </div>
      </div>

      <aside className="planet-panel">
        <div className="story-head">
          <span className="big-emoji">{creature.emoji}</span>
          <div>
            <h2>
              {creature.name}
              {zone && (
                <span className="kind-badge" style={{ background: `${zone.color}55`, borderColor: zone.color, color: '#dff2ff' }}>
                  {zone.emoji} {zone.name}
                </span>
              )}
            </h2>
            <div className="tagline">
              {creature.tagline} · vive a unos {creature.depthM} m
            </div>
          </div>
        </div>

        <StoryPager story={creature.story} storyKey={creature.id} />
        <FactsGrid facts={creature.facts} />

        {getPhoto(creature.id) && (
          <>
            <div className="section-title">📷 ¿Cómo es en realidad?</div>
            <PhotoCard photoKey={creature.id} label="Foto real" />
          </>
        )}
      </aside>
    </div>
  );
}
