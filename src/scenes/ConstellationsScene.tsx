import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import { CONSTELLATIONS, type Constellation } from '../data/constellations';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createFlareTexture } from '../utils/textures';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, SpaceBackground } from '../components/three/SceneExtras';
import { speak, stopSpeaking } from '../utils/speech';

function ConstellationStars({ c, active, onSelect }: { c: Constellation; active: boolean; onSelect: () => void }) {
  const flare = useMemo(() => createFlareTexture('const-star', 'rgba(220,235,255,1)'), []);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {c.stars.map((s, i) => (
        <sprite key={i} position={s} scale={active ? [1.5, 1.5, 1] : [0.9, 0.9, 1]}>
          <spriteMaterial
            map={flare}
            transparent
            opacity={active ? 1 : 0.6}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
      {active &&
        c.lines.map(([a, b], i) => (
          <Line key={i} points={[c.stars[a], c.stars[b]]} color="#8fc0ff" lineWidth={2} transparent opacity={0.9} />
        ))}
    </group>
  );
}

export default function ConstellationsScene() {
  const quality = useApp((s) => s.quality);
  const [sel, setSel] = useState(0);
  const c = CONSTELLATIONS[sel];

  useEffect(() => {
    speak(`${c.name}. ${c.myth}`);
  }, [c]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 2, 6], fov: 65 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#02030a']} />
          <SpaceBackground />
          <Stars radius={120} depth={50} count={scaleCount(5000, quality, 1500)} factor={4} saturation={0} fade speed={0.2} />
          {CONSTELLATIONS.map((con, i) => (
            <ConstellationStars key={con.id} c={con} active={i === sel} onSelect={() => setSel(i)} />
          ))}
          <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={-0.35} autoRotate autoRotateSpeed={0.15} />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="bh-overlay">
        <div className="bh-caption">
          <strong>{c.emoji} {c.name}</strong>
          <p style={{ marginTop: 4 }}>{c.myth}</p>
        </div>
        <div className="control-row" style={{ pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CONSTELLATIONS.map((con, i) => (
            <button key={con.id} className={`chip-btn${i === sel ? ' active' : ''}`} onClick={() => setSel(i)}>
              {con.emoji} {con.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
