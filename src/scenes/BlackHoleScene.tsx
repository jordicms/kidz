import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createAccretionTexture, createGlowTexture } from '../utils/textures';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, SpaceBackground } from '../components/three/SceneExtras';

const HORIZON = 1.1;
const DISK_INNER = 1.7;
const DISK_OUTER = 5.2;

/** Disco de acreción plano con UV radial (degradado caliente→frío) que gira. */
function AccretionDisk() {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(() => createAccretionTexture(), []);
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(DISK_INNER, DISK_OUTER, 160, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      uv.setXY(i, (r - DISK_INNER) / (DISK_OUTER - DISK_INNER), (Math.atan2(y, x) + Math.PI) / (Math.PI * 2));
    }
    uv.needsUpdate = true;
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.5;
  });

  return (
    <mesh ref={ref} geometry={geometry} rotation={[-Math.PI / 2.6, 0, 0]}>
      <meshBasicMaterial
        map={map}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function BlackHole() {
  const photonGlow = useMemo(() => createGlowTexture('photon-ring', 'rgba(255,210,150,0.95)'), []);
  const halo = useMemo(() => createGlowTexture('bh-halo', 'rgba(255,150,60,0.7)'), []);

  return (
    <group>
      {/* Horizonte de sucesos */}
      <mesh>
        <sphereGeometry args={[HORIZON, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Anillo de fotones (luz curvada alrededor del horizonte) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HORIZON * 1.18, 0.05, 16, 96]} />
        <meshBasicMaterial color="#ffe6c0" toneMapped={false} />
      </mesh>
      {/* Arco "lente": parte del disco curvada por encima/por debajo del horizonte */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[HORIZON * 1.3, 0.16, 20, 120, Math.PI]} />
        <meshBasicMaterial color="#ffb14d" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <torusGeometry args={[HORIZON * 1.3, 0.16, 20, 120, Math.PI]} />
        <meshBasicMaterial color="#ffb14d" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <AccretionDisk />
      {/* Halo suave de fondo */}
      <sprite scale={[12, 12, 1]}>
        <spriteMaterial map={halo} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite scale={[3.4, 3.4, 1]}>
        <spriteMaterial map={photonGlow} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
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
        <SpaceBackground />
        <Stars radius={120} depth={60} count={scaleCount(3000, quality, 800)} factor={4} saturation={0.3} fade speed={0.4} />
        <ambientLight intensity={0.2} />
        <BlackHole />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={22} autoRotate autoRotateSpeed={0.35} maxPolarAngle={Math.PI * 0.92} />
        <AdaptiveQuality />
        <Effects />
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
