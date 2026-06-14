import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createAccretionTexture, createGlowTexture } from '../utils/textures';
import { Lensing } from '../components/three/Lensing';
import { AdaptiveQuality, SpaceBackground } from '../components/three/SceneExtras';

/** Postprocesado del agujero negro: lente gravitacional (gama media/alta) + bloom. */
function BlackHoleEffects() {
  const quality = useApp((s) => s.quality);
  const size = useThree((s) => s.size);
  if (!quality.postprocessing) return null;
  return (
    <EffectComposer multisampling={quality.antialias ? 4 : 0}>
      {quality.tier !== 'low' ? (
        <Lensing radius={0.2} strength={0.14} aspect={size.width / size.height} />
      ) : (
        <></>
      )}
      <Bloom intensity={quality.bloomIntensity} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}

const HORIZON = 1.1;
const DISK_INNER = 1.6;
const DISK_OUTER = 6;

/** Disco de acreción plano con UV radial (degradado caliente→frío) que gira. */
function AccretionDisk() {
  const ref = useRef<THREE.Mesh>(null);
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
      // Doppler: el lado que se acerca (un costado) brilla bastante más.
      const doppler = 0.45 + 1.15 * (0.5 + 0.5 * Math.cos(ang));
      colors[i * 3] = doppler;
      colors[i * 3 + 1] = doppler;
      colors[i * 3 + 2] = doppler;
    }
    uv.needsUpdate = true;
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.5;
  });

  return (
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
      {/* Anillo de fotones brillante alrededor del horizonte */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HORIZON * 1.16, 0.035, 16, 128]} />
        <meshBasicMaterial color="#fff0d6" toneMapped={false} />
      </mesh>
      {/* Arcos "lente": parte del disco curvada por encima/por debajo */}
      {[0, Math.PI].map((rot) => (
        <mesh key={rot} rotation={[0, rot, 0]}>
          <torusGeometry args={[HORIZON * 1.32, 0.2, 24, 140, Math.PI]} />
          <meshBasicMaterial color="#ffb14d" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <AccretionDisk />
      <Infall count={420} />
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

  return (
    <div className="scene-canvas">
      <Canvas camera={{ position: [0, 3.5, 10], fov: 55 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
        <color attach="background" args={['#01010a']} />
        <SpaceBackground keys={['universe-bg', 'stars']} />
        <Stars radius={120} depth={60} count={scaleCount(3000, quality, 800)} factor={4} saturation={0.3} fade speed={0.4} />
        <ambientLight intensity={0.2} />
        <BlackHole />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={22} autoRotate autoRotateSpeed={0.35} maxPolarAngle={Math.PI * 0.92} />
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
