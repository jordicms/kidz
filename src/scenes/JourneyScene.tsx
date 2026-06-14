import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { getJourney } from '../data/body';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { speak, stopSpeaking } from '../utils/speech';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

/** Curva ondulada determinista por la que viaja la cámara (el "túnel"). */
function buildCurve(seed: number) {
  const pts: THREE.Vector3[] = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    pts.push(new THREE.Vector3(Math.sin(i * 1.2 + seed) * 2.4, Math.cos(i * 0.8 + seed * 1.3) * 1.8, i * 5));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h / 50;
}

/** Viajero según el tipo de viaje. */
function Traveler({ id, color }: { id: string; color: string }) {
  if (id === 'sangre') {
    // Glóbulo rojo: disco bicóncavo (anillo + centro hundido).
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.32, 0.16, 12, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} flatShading toneMapped={false} />
        </mesh>
        <mesh scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (id === 'aire') {
    // Burbuja de aire: esferas translúcidas agrupadas.
    return (
      <group>
        {[[0, 0, 0, 0.42], [0.3, 0.15, 0.1, 0.26], [-0.25, -0.12, 0.05, 0.22]].map((b, i) => (
          <mesh key={i} position={[b[0], b[1], b[2]]}>
            <sphereGeometry args={[b[3], 16, 16]} />
            <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.1} metalness={0.1} />
          </mesh>
        ))}
      </group>
    );
  }
  // Comida: bocado irregular.
  return (
    <mesh scale={[1, 0.85, 1.1]}>
      <icosahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
}

/** Partículas estáticas dentro del túnel: dan parallax y sensación de avance. */
function Motes({ curve, count, color }: { curve: THREE.CatmullRomCurve3; count: number; color: string }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = curve.getPointAt(Math.random());
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.0;
      pos[i * 3] = c.x + Math.cos(a) * r;
      pos[i * 3 + 1] = c.y + Math.sin(a) * r;
      pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * 1.2;
    }
    return pos;
  }, [curve, count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color={color} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

function Ride({
  curve,
  tubeColor,
  traveler,
  motes,
  playing,
  duration,
  onProgress,
}: {
  curve: THREE.CatmullRomCurve3;
  tubeColor: string;
  traveler: ReactNode;
  motes: ReactNode;
  playing: boolean;
  duration: number;
  onProgress: (t: number) => void;
}) {
  const { camera } = useThree();
  const t = useRef(0);
  const light = useRef<THREE.PointLight>(null);
  const travelerRef = useRef<THREE.Group>(null);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 240, 1.3, 18, false), [curve]);

  useFrame((state, delta) => {
    if (playing && t.current < 1) t.current = Math.min(1, t.current + delta / duration);
    const e = t.current * 0.999;
    const p = curve.getPointAt(e);
    const time = state.clock.elapsedTime;
    camera.position.set(p.x + Math.cos(time * 3) * 0.04, p.y + Math.sin(time * 4) * 0.05, p.z);
    camera.lookAt(curve.getPointAt(Math.min(0.999, e + 0.012)));
    light.current?.position.copy(p);
    travelerRef.current?.position.copy(curve.getPointAt(Math.min(0.999, e + 0.03)));
    onProgress(t.current);
  });

  return (
    <>
      <mesh geometry={tube}>
        <meshStandardMaterial color={tubeColor} side={THREE.BackSide} roughness={0.85} metalness={0} flatShading />
      </mesh>
      {motes}
      <pointLight ref={light} intensity={7} distance={12} decay={1.4} color="#fff" />
      <ambientLight intensity={0.28} />
      <group ref={travelerRef}>{traveler}</group>
    </>
  );
}

export default function JourneyScene() {
  const journeyId = useApp((s) => s.journeyId);
  const quality = useApp((s) => s.quality);
  const goBody = useApp((s) => s.goBody);
  const journey = journeyId ? getJourney(journeyId) : undefined;

  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const curve = useMemo(() => (journey ? buildCurve(hash(journey.id)) : null), [journey]);

  useEffect(() => {
    if (journey && !done) speak(journey.steps[step]);
  }, [step, journey, done]);
  useEffect(() => () => stopSpeaking(), []);

  if (!journey || !curve) return null;
  const duration = journey.steps.length * 6;

  const onProgress = (tt: number) => {
    const i = Math.min(journey.steps.length - 1, Math.floor(tt * journey.steps.length));
    setStep((prev) => (i !== prev ? i : prev));
    if (tt >= 1 && !done) {
      setDone(true);
      setPlaying(false);
    }
  };

  const restart = () => {
    stopSpeaking();
    setStep(0);
    setDone(false);
    setPlaying(true);
    setRestartKey((k) => k + 1);
  };

  return (
    <>
      <div className="scene-canvas">
        <Canvas key={restartKey} camera={{ position: [0, 0, 0], fov: 72, near: 0.05, far: 120 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#0a0410']} />
          <fog attach="fog" args={[journey.tubeColor, 9, 30]} />
          <Ride
            curve={curve}
            tubeColor={journey.tubeColor}
            playing={playing}
            duration={duration}
            onProgress={onProgress}
            traveler={<Traveler id={journey.id} color={journey.travelerColor} />}
            motes={<Motes curve={curve} count={scaleCount(420, quality, 120)} color={journey.travelerColor} />}
          />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="journey-overlay">
        <div className="journey-caption">
          <strong>{journey.emoji} {journey.title}</strong>
          <p>{done ? '🎉 ¡Fin del viaje! ¿Lo repetimos?' : journey.steps[step]}</p>
        </div>
        <div className="journey-bar">
          {!done && (
            <button className="btn" onClick={() => setPlaying((p) => !p)}>
              {playing ? '⏸️ Pausa' : '▶️ Seguir'}
            </button>
          )}
          <button className="btn btn-accent" onClick={restart}>
            🔄 Repetir
          </button>
          <button className="btn" onClick={goBody}>
            🧍 Volver al cuerpo
          </button>
          <div className="journey-dots">
            {journey.steps.map((_, i) => (
              <span key={i} className={i === step ? 'active' : ''} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
