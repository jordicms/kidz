import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { getJourney } from '../data/body';
import { useApp } from '../state/store';
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

function Ride({
  curve,
  tubeColor,
  travelerColor,
  playing,
  duration,
  onProgress,
}: {
  curve: THREE.CatmullRomCurve3;
  tubeColor: string;
  travelerColor: string;
  playing: boolean;
  duration: number;
  onProgress: (t: number) => void;
}) {
  const { camera } = useThree();
  const t = useRef(0);
  const light = useRef<THREE.PointLight>(null);
  const traveler = useRef<THREE.Mesh>(null);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 240, 1.3, 18, false), [curve]);

  useFrame((_, delta) => {
    if (playing && t.current < 1) t.current = Math.min(1, t.current + delta / duration);
    const e = t.current * 0.999;
    const p = curve.getPointAt(e);
    camera.position.copy(p);
    camera.lookAt(curve.getPointAt(Math.min(0.999, e + 0.012)));
    light.current?.position.copy(p);
    traveler.current?.position.copy(curve.getPointAt(Math.min(0.999, e + 0.03)));
    onProgress(t.current);
  });

  return (
    <>
      <mesh geometry={tube}>
        <meshStandardMaterial color={tubeColor} side={THREE.BackSide} roughness={0.85} metalness={0} flatShading />
      </mesh>
      <pointLight ref={light} intensity={6} distance={11} decay={1.4} color="#fff" />
      <ambientLight intensity={0.28} />
      <mesh ref={traveler}>
        <sphereGeometry args={[0.45, 18, 18]} />
        <meshStandardMaterial color={travelerColor} emissive={travelerColor} emissiveIntensity={0.5} toneMapped={false} flatShading />
      </mesh>
    </>
  );
}

export default function JourneyScene() {
  const journeyId = useApp((s) => s.journeyId);
  const quality = useApp((s) => s.quality);
  const journey = journeyId ? getJourney(journeyId) : undefined;

  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  const curve = useMemo(() => (journey ? buildCurve(hash(journey.id)) : null), [journey]);

  // Narra el paso actual al cambiar.
  useEffect(() => {
    if (journey) speak(journey.steps[step]);
  }, [step, journey]);
  useEffect(() => () => stopSpeaking(), []);

  if (!journey || !curve) return null;
  const duration = journey.steps.length * 6;

  const onProgress = (tt: number) => {
    const i = Math.min(journey.steps.length - 1, Math.floor(tt * journey.steps.length));
    setStep((prev) => (i !== prev ? i : prev));
  };

  const restart = () => {
    setStep(0);
    setPlaying(true);
    setRestartKey((k) => k + 1);
  };

  return (
    <>
      <div className="scene-canvas">
        <Canvas key={restartKey} camera={{ position: [0, 0, 0], fov: 72, near: 0.05, far: 120 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#0a0410']} />
          <Ride
            curve={curve}
            tubeColor={journey.tubeColor}
            travelerColor={journey.travelerColor}
            playing={playing}
            duration={duration}
            onProgress={onProgress}
          />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="journey-overlay">
        <div className="journey-caption">
          <strong>{journey.emoji} {journey.title}</strong>
          <p>{journey.steps[step]}</p>
        </div>
        <div className="journey-bar">
          <button className="btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? '⏸️ Pausa' : '▶️ Seguir'}
          </button>
          <button className="btn" onClick={restart}>
            🔄 Repetir
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
