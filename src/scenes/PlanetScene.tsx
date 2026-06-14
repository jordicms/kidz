import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { getBody } from '../data/solarSystem';
import type { Body, Moon } from '../data/types';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { getPhoto } from '../utils/photos';
import { createLayerTexture, createMoonTexture } from '../utils/textures';
import CelestialBody from '../components/three/CelestialBody';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, SpaceBackground } from '../components/three/SceneExtras';
import StoryPager from '../components/ui/StoryPager';
import FactsGrid from '../components/ui/FactsGrid';
import PhotoCard from '../components/ui/PhotoCard';

const CUT_ANGLE = Math.PI * 1.45; // porción visible de cada capa en el corte

function SpinningPlanet({ body, scale }: { body: Body; scale: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += 0.15 * delta;
  });
  return (
    <group ref={ref}>
      <CelestialBody body={body} scale={scale} />
    </group>
  );
}

/** Corte transversal: capas concéntricas con un "mordisco" para ver el interior. */
function Cutaway({ body, scale }: { body: Body; scale: number }) {
  const size = body.scene.size * scale;
  return (
    <group rotation={[0.15, Math.PI * 0.55, 0]}>
      {body.layers.map((layer) => (
        <mesh key={layer.name}>
          <sphereGeometry args={[size * layer.radius, 48, 48, 0, CUT_ANGLE]} />
          <meshStandardMaterial
            map={createLayerTexture(`${body.id}-${layer.name}`, layer.color)}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function DetailMoon({ moon, scale }: { moon: Moon; scale: number }) {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(Math.random() * Math.PI * 2);
  useFrame((_, delta) => {
    angle.current += moon.speed * 0.25 * delta;
    const d = moon.distance * scale;
    ref.current?.position.set(Math.cos(angle.current) * d, 0, Math.sin(angle.current) * d);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[moon.size * scale, 24, 24]} />
        <meshStandardMaterial map={createMoonTexture(moon.id, moon.color)} roughness={1} />
      </mesh>
      <Html center position={[0, moon.size * scale + 0.35, 0]} zIndexRange={[5, 0]}>
        <div className="body-label">
          <span className="chip">
            {moon.emoji} {moon.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function PlanetScene() {
  const bodyId = useApp((s) => s.bodyId);
  const quality = useApp((s) => s.quality);
  const [interior, setInterior] = useState(false);
  const body = bodyId ? getBody(bodyId) : undefined;
  if (!body) return null;

  // Normaliza el tamaño para que todos los astros se vean grandes en detalle
  const scale = 2.4 / body.scene.size;
  const isSun = body.kind === 'estrella';

  return (
    <div className="planet-layout">
      <div className="planet-3d">
        <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
          <Canvas
            camera={{ position: [0, 1.6, 7.5], fov: 50 }}
            dpr={quality.dpr}
            gl={{ antialias: quality.antialias }}
          >
            <color attach="background" args={['#05060f']} />
            <SpaceBackground />
            <Stars radius={120} depth={40} count={scaleCount(2500, quality, 600)} factor={4} saturation={0} fade />
            <ambientLight intensity={interior ? 0.9 : 0.45} />
            <directionalLight position={[8, 4, 6]} intensity={isSun ? 0.4 : 2.2} color="#fff2d5" />
            {interior ? (
              <Cutaway body={body} scale={scale} />
            ) : (
              <>
                <SpinningPlanet body={body} scale={scale} />
                {body.moons.map((m) => (
                  <DetailMoon key={m.id} moon={m} scale={scale} />
                ))}
              </>
            )}
            <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
            <AdaptiveQuality />
            <Effects />
          </Canvas>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            pointerEvents: 'auto',
            zIndex: 12,
          }}
        >
          <button className="btn btn-accent" onClick={() => setInterior(!interior)}>
            {interior ? '🌍 Ver por fuera' : '🔬 Ver el interior'}
          </button>
        </div>
      </div>

      <aside className="planet-panel">
        <div className="story-head">
          <span className="big-emoji">{body.emoji}</span>
          <div>
            <h2>
              {body.name}
              <span className="kind-badge">{body.kind}</span>
            </h2>
            <div className="tagline">{body.tagline}</div>
          </div>
        </div>

        <StoryPager story={body.story} storyKey={body.id} />
        <FactsGrid facts={body.facts} />

        {getPhoto(body.id) && (
          <>
            <div className="section-title">📷 ¿Cómo se ve de verdad?</div>
            <PhotoCard photoKey={body.id} label="Foto real" />
          </>
        )}

        {body.layers.length > 0 && (
          <>
            <div className="section-title">🔬 Sus capas, de fuera a dentro</div>
            {body.layers.map((layer) => (
              <div className="layer-row" key={layer.name}>
                <span className="layer-dot" style={{ background: layer.color }} />
                <div>
                  <span className="row-name">{layer.name}</span>{' '}
                  <span className="row-desc">{layer.description}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {body.moons.length > 0 && (
          <>
            <div className="section-title">🌙 Sus lunas</div>
            {body.moons.map((m) => (
              <div className="moon-row" key={m.id}>
                <span className="moon-emoji">{m.emoji}</span>
                <div>
                  <span className="row-name">{m.name}</span>{' '}
                  <span className="row-desc">{m.fact}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
