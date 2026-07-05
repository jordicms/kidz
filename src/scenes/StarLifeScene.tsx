import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { createGlowTexture } from '../utils/textures';
import SunSurface from '../components/three/SunSurface';
import Effects from '../components/three/Effects';
import { AdaptiveQuality, SpaceBackground } from '../components/three/SceneExtras';
import { speak, stopSpeaking } from '../utils/speech';

interface Stage {
  id: string;
  name: string;
  emoji: string;
  text: string;
  branch: 'comun' | 'masiva';
}

const STAGES: Stage[] = [
  { id: 'nebulosa', name: 'Nebulosa', emoji: '🌫️', branch: 'comun', text: 'Todo empieza en una nube gigante de gas y polvo en el espacio. Es la cuna donde nacen las estrellas.' },
  { id: 'protoestrella', name: 'Protoestrella', emoji: '🌱', branch: 'comun', text: 'La gravedad junta el gas en una bola que gira y se calienta cada vez más. ¡Todavía no brilla del todo!' },
  { id: 'principal', name: 'Estrella (como el Sol)', emoji: '☀️', branch: 'comun', text: 'Se enciende y brilla estable durante miles de millones de años, quemando su combustible. ¡Aquí está nuestro Sol!' },
  { id: 'gigante', name: 'Gigante roja', emoji: '🔴', branch: 'comun', text: 'Cuando se le acaba el combustible, se hincha muchísimo y se enfría, poniéndose roja. ¡Se hace enorme!' },
  { id: 'planetaria', name: 'Nebulosa planetaria', emoji: '💍', branch: 'comun', text: 'La estrella suelta sus capas exteriores formando un anillo de colores precioso alrededor.' },
  { id: 'enana', name: 'Enana blanca', emoji: '⚪', branch: 'comun', text: 'Queda solo el corazón de la estrella: una bolita pequeña, blanca y muy caliente que se irá apagando poco a poco.' },
  { id: 'supernova', name: 'Supernova', emoji: '💥', branch: 'masiva', text: 'Las estrellas MUCHO más grandes que el Sol no se apagan: ¡explotan en una supernova, la mayor explosión del universo!' },
  { id: 'agujero', name: 'Agujero negro', emoji: '🕳️', branch: 'masiva', text: 'Tras la explosión, el centro se aplasta tanto que forma una estrella de neutrones... o un agujero negro, del que ni la luz escapa.' },
];

function Glow({ color, scale, position = [0, 0, 0], opacity = 1 }: { color: string; scale: number; position?: [number, number, number]; opacity?: number }) {
  const map = useMemo(() => createGlowTexture(`sl-${color}`, color), [color]);
  return (
    <sprite scale={[scale, scale, 1]} position={position}>
      <spriteMaterial map={map} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}

function Nebula() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * 0.05;
  });
  const puffs = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 0.6 + (i % 3) * 0.5;
        return {
          pos: [Math.cos(a) * r, Math.sin(a) * r * 0.7, (i % 2 ? 0.2 : -0.2)] as [number, number, number],
          c: ['rgba(255,110,199,0.7)', 'rgba(150,120,255,0.7)', 'rgba(90,160,255,0.6)'][i % 3],
          s: 1.6 + (i % 4) * 0.5,
        };
      }),
    [],
  );
  return (
    <group ref={ref}>
      {puffs.map((p, i) => (
        <Glow key={i} color={p.c} scale={p.s} position={p.pos} opacity={0.6} />
      ))}
    </group>
  );
}

function Protostar() {
  const disk = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (disk.current) disk.current.rotation.z += d * 0.6;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#ff7a3a" emissive="#ff5a1a" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh ref={disk} rotation={[-Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[0.8, 2.2, 48]} />
        <meshBasicMaterial color="#c98a5a" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <Glow color="rgba(255,150,80,0.9)" scale={3} opacity={0.7} />
    </group>
  );
}

function MainSequence() {
  return (
    <group>
      <SunSurface size={0.9} />
      <Glow color="rgba(255,220,120,0.9)" scale={3.4} opacity={0.7} />
    </group>
  );
}

function RedGiant() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
    ref.current?.scale.setScalar(s);
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshStandardMaterial color="#e0431f" emissive="#c02010" emissiveIntensity={0.9} toneMapped={false} roughness={1} />
      </mesh>
      <Glow color="rgba(255,90,50,0.85)" scale={6} opacity={0.6} />
    </group>
  );
}

function PlanetaryNebula() {
  const shells = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (shells.current) shells.current.rotation.y += d * 0.2;
  });
  return (
    <group>
      {/* Núcleo caliente */}
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#dff0ff" emissive="#bfe0ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <Glow color="rgba(200,235,255,1)" scale={1.6} />
      {/* Capas expulsadas */}
      <group ref={shells}>
        {[['#7fd4ff', 1.6], ['#ff8ad0', 2.1], ['#a0ffd0', 2.6]].map(([c, r], i) => (
          <mesh key={i}>
            <sphereGeometry args={[r as number, 32, 24]} />
            <meshBasicMaterial color={c as string} transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WhiteDwarf() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#eaf4ff" emissive="#cfe6ff" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <Glow color="rgba(210,235,255,1)" scale={2} opacity={0.8} />
    </group>
  );
}

function Supernova() {
  const core = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 2.5) / 2.5;
    const s = 0.3 + t * 5;
    shock.current?.scale.setScalar(s);
    const m = shock.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = (1 - t) * 0.7;
    const cs = 1 + Math.sin(clock.elapsedTime * 12) * 0.2;
    core.current?.scale.setScalar(cs);
  });
  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff0c0" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh ref={shock}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color="#ffd27f" transparent opacity={0.6} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <Glow color="rgba(255,240,200,1)" scale={7} opacity={0.7} />
    </group>
  );
}

function MiniBlackHole() {
  const disk = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (disk.current) disk.current.rotation.z += d * 0.9;
  });
  const diskMap = useMemo(() => createGlowTexture('sl-bh', 'rgba(255,170,70,1)'), []);
  return (
    <group rotation={[0.4, 0, 0]}>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.03, 16, 80]} />
        <meshBasicMaterial color="#fff0d6" toneMapped={false} />
      </mesh>
      <mesh ref={disk} rotation={[-Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[0.75, 2, 64]} />
        <meshBasicMaterial map={diskMap} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StageVisual({ id }: { id: string }) {
  switch (id) {
    case 'nebulosa':
      return <Nebula />;
    case 'protoestrella':
      return <Protostar />;
    case 'principal':
      return <MainSequence />;
    case 'gigante':
      return <RedGiant />;
    case 'planetaria':
      return <PlanetaryNebula />;
    case 'enana':
      return <WhiteDwarf />;
    case 'supernova':
      return <Supernova />;
    case 'agujero':
      return <MiniBlackHole />;
    default:
      return null;
  }
}

export default function StarLifeScene() {
  const quality = useApp((s) => s.quality);
  const [index, setIndex] = useState(0);
  const stage = STAGES[index];

  useEffect(() => {
    speak(`${stage.name}. ${stage.text}`);
  }, [stage]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 1, 8], fov: 55 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#05060f']} />
          <SpaceBackground />
          <Stars radius={120} depth={60} count={scaleCount(2500, quality, 700)} factor={4} saturation={0} fade speed={0.3} />
          <ambientLight intensity={0.25} />
          <pointLight position={[0, 0, 3]} intensity={1.5} color="#fff2d5" />
          <group key={stage.id}>
            <StageVisual id={stage.id} />
          </group>
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} autoRotate autoRotateSpeed={0.3} />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="bh-overlay">
        <div className="bh-caption">
          <strong>{stage.emoji} {stage.name}</strong>
          {stage.branch === 'masiva' && <em className="star-branch"> · solo estrellas gigantes</em>}
          <p style={{ marginTop: 4 }}>{stage.text}</p>
        </div>
        <div className="journey-bar">
          <button className="btn btn-round" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Anterior">
            ◀
          </button>
          <div className="journey-dots">
            {STAGES.map((s, i) => (
              <span key={s.id} className={i === index ? 'active' : ''} title={s.name} />
            ))}
          </div>
          <button
            className="btn btn-round btn-accent"
            onClick={() => setIndex((i) => Math.min(STAGES.length - 1, i + 1))}
            disabled={index === STAGES.length - 1}
            aria-label="Siguiente"
          >
            ▶
          </button>
        </div>
      </div>
    </>
  );
}
