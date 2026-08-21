import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

import { getCreature, ZONES } from '../data/ocean';
import type { SeaCreature } from '../data/ocean';
import { useApp } from '../state/store';
import Controls from '../components/three/Controls';
import SeaCreatureModel from '../components/three/SeaCreatureModel';
import Studio from '../components/three/Studio';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';
import { getPhoto } from '../utils/photos';

/**
 * Plataforma giratoria que ENCAJA a la criatura en el hueco disponible.
 *
 * Antes se usaba una escala fija para todas, así que el nautilus o el caballito
 * de mar salían diminutos y la ballena se salía del cuadro. Aquí se mide el
 * modelo ya construido y se ajusta para que siempre llene el encuadre.
 */
function Turntable({ creature }: { creature: SeaCreature }) {
  const spin = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const fitted = useRef(false);

  useFrame(({ clock }, delta) => {
    if (spin.current) {
      spin.current.rotation.y += 0.3 * delta;
      spin.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.15;
    }
    // Se mide una vez, cuando el modelo ya tiene su geometría.
    if (!fitted.current && inner.current) {
      const box = new THREE.Box3().setFromObject(inner.current);
      const size = box.getSize(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z);
      if (largest > 0.001 && Number.isFinite(largest)) {
        const k = 3.4 / largest;
        inner.current.scale.setScalar(k);
        // Centrado: algunas criaturas no tienen su origen en el medio.
        const c = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
        inner.current.position.set(-c.x, -c.y, -c.z);
        fitted.current = true;
      }
    }
  });

  return (
    <group ref={spin}>
      <group ref={inner}>
        <SeaCreatureModel creature={creature} />
      </group>
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
            <Studio preset="water" intensity={creature.zone === 'abismo' ? 0.5 : 1} />
            <directionalLight position={[5, 7, 4]} intensity={creature.zone === 'abismo' ? 0.5 : 1.8} color="#dff2ff" />
            <ambientLight intensity={creature.zone === 'abismo' ? 0.15 : 0.35} />
            <Turntable creature={creature} />
            <Controls minDistance={3} maxDistance={10} target={[0, 0, 0]} />
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
