import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, ChromaticAberration } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as PP from 'postprocessing';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createAccretionTexture, createGlowTexture } from '../utils/textures';
import { Lensing } from '../components/three/Lensing';
import { AdaptiveQuality, IntroFly, SpaceBackground } from '../components/three/SceneExtras';

/** Postprocesado del agujero negro: lente gravitacional + bloom + ACES.
 *  La lente y la aberración (más pesadas) solo en gama media/alta. */
function BlackHoleEffects() {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;
  const heavy = quality.tier !== 'low';
  return (
    <EffectComposer multisampling={quality.antialias ? 2 : 0}>
      {heavy ? <Lensing radius={0.2} strength={0.14} ringGain={2.6} /> : <></>}
      <Bloom intensity={quality.bloomIntensity * 1.5} luminanceThreshold={0.4} luminanceSmoothing={0.3} mipmapBlur radius={0.8} />
      {heavy ? (
        <ChromaticAberration offset={[0.0011, 0.0011]} radialModulation modulationOffset={0.6} blendFunction={PP.BlendFunction.NORMAL} />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.22} darkness={0.8} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

const HORIZON = 1.1;
const DISK_INNER = 1.6;
const DISK_OUTER = 6;

/** Disco de acreción con UV radial, vetas de plasma y dos capas girando a
 *  distinta velocidad (remolino visible). El Doppler tiñe de azul-blanco el
 *  lado que se acerca y de rojo oscuro el que se aleja, como en las fotos. */
function AccretionDisk() {
  const ref = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);
  const map = useMemo(() => createAccretionTexture(), []);
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(DISK_INNER, DISK_OUTER, 160, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      const ang = Math.atan2(y, x);
      uv.setXY(i, (r - DISK_INNER) / (DISK_OUTER - DISK_INNER), (ang + Math.PI) / (Math.PI * 2));
      // Doppler relativista: el lado que se acerca es más brillante Y más azul.
      // Colores en HDR (>1) para que el bloom irradie con fuerza.
      const d = 0.5 + 0.5 * Math.cos(ang);
      const b = 0.5 + 2.4 * d;
      colors[i * 3] = b;
      colors[i * 3 + 1] = b * (0.78 + 0.22 * d);
      colors[i * 3 + 2] = b * (0.5 + 0.55 * d);
    }
    uv.needsUpdate = true;
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.5;
    if (ref2.current) ref2.current.rotation.z += delta * 0.82;
  });

  return (
    <>
      <mesh ref={ref} geometry={geometry} rotation={[-Math.PI / 2.6, 0, 0]}>
        <meshBasicMaterial
          map={map}
          vertexColors
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Segunda capa más rápida y tenue: el plasma parece hervir */}
      <mesh ref={ref2} geometry={geometry} rotation={[-Math.PI / 2.6, 0, 1.9]} scale={0.985}>
        <meshBasicMaterial
          map={map}
          vertexColors
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** Partículas que caen en espiral hacia el disco (sensación de materia engullida). */
function Infall({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const tex = useMemo(() => createGlowTexture('infall', 'rgba(255,205,150,1)'), []);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const r = DISK_INNER + t * (DISK_OUTER - DISK_INNER + 1);
      const a = Math.random() * Math.PI * 2 + r * 1.6;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = Math.sin(a) * r;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return p;
  }, [count]);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * 0.7;
  });
  return (
    <points ref={ref} rotation={[-Math.PI / 2.6, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={0.22} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} color="#ffd9a0" />
    </points>
  );
}

function BlackHole() {
  const quality = useApp((s) => s.quality);
  const photonGlow = useMemo(() => createGlowTexture('photon-ring', 'rgba(255,220,170,1)'), []);
  const halo = useMemo(() => createGlowTexture('bh-halo', 'rgba(255,150,60,0.7)'), []);

  return (
    <group>
      {/* Chorros relativistas (polos), sutiles */}
      {[1, -1].map((dir) => (
        <mesh key={dir} position={[0, dir * 3, 0]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]}>
          <coneGeometry args={[0.4, 5, 24, 1, true]} />
          <meshBasicMaterial color="#bfe0ff" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
      {/* Horizonte de sucesos */}
      <mesh>
        <sphereGeometry args={[HORIZON, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Anillo de fotones doble alrededor del horizonte */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HORIZON * 1.16, 0.035, 16, 128]} />
        <meshBasicMaterial color="#fff0d6" toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HORIZON * 1.26, 0.05, 16, 128]} />
        <meshBasicMaterial
          color="#ffc880"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Arcos "lente": parte del disco curvada por encima/por debajo */}
      {[0, Math.PI].map((rot) => (
        <mesh key={rot} rotation={[0, rot, 0]}>
          <torusGeometry args={[HORIZON * 1.32, 0.2, 24, 140, Math.PI]} />
          <meshBasicMaterial color="#ffb14d" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <AccretionDisk />
      <Infall count={scaleCount(420, quality, 120)} />
      {/* Halos */}
      <sprite scale={[13, 13, 1]}>
        <spriteMaterial map={halo} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial map={photonGlow} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

export default function BlackHoleScene() {
  const quality = useApp((s) => s.quality);
  const openDeepSpace = useApp((s) => s.openDeepSpace);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);

  return (
    <div className="scene-canvas">
      <Canvas camera={{ position: [0, 3.5, 10], fov: 55 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
        <color attach="background" args={['#01010a']} />
        {/* 8K solo en gama alta: en móvil agota la memoria GPU y tumba WebGL. */}
        <SpaceBackground keys={quality.tier === 'high' ? ['universe-bg', 'stars'] : ['stars']} />
        <Stars radius={120} depth={60} count={scaleCount(3000, quality, 800)} factor={4} saturation={0.3} fade speed={0.4} />
        <ambientLight intensity={0.2} />
        <BlackHole />
        <OrbitControls
          ref={controlsRef as never}
          enablePan={false}
          minDistance={5}
          maxDistance={30}
          autoRotate
          autoRotateSpeed={0.35}
          maxPolarAngle={Math.PI * 0.92}
        />
        <IntroFly from={[0, 12, 30]} to={[0, 3.5, 10]} duration={2.8} controls={controlsRef} />
        <AdaptiveQuality />
        <BlackHoleEffects />
      </Canvas>

      <div className="bh-overlay">
        <div className="bh-caption">
          🕳️ <strong>Sagitario A*</strong> — el agujero negro gigante del centro de la Vía Láctea. Su gravedad es tan
          fuerte que ni la luz escapa; alrededor, el gas girando se calienta y brilla muchísimo.
        </div>
        <button className="btn" onClick={() => openDeepSpace('sagitario-a')}>
          📖 Su historia
        </button>
      </div>
    </div>
  );
}
