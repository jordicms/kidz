import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { FOSSILS } from '../data/fossils';
import { ERA_COLORS } from '../data/dinos';
import { useApp } from '../state/store';
import { createGlowTexture } from '../utils/textures';
import { playDig, playPop, playFanfare, playRoar } from '../utils/sound';
import { speak, stopSpeaking } from '../utils/speech';
import { BonePiece } from '../components/three/Skeleton';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';

type Phase = 'dig' | 'build' | 'done';

/* ------------------------------------------------------------------ */
/* Polvo: pequeño pool de destellos reutilizables (sin estado por frame) */
/* ------------------------------------------------------------------ */
function useDust() {
  const map = useMemo(() => createGlowTexture('dust-puff', 'rgba(190,165,120,0.9)'), []);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const born = useRef<number[]>([]);
  const cursor = useRef(0);
  const trigger = useRef((x: number, y: number, z: number, now: number) => {
    const i = cursor.current % 16;
    cursor.current++;
    const sp = sprites.current[i];
    if (!sp) return;
    sp.position.set(x, y, z);
    sp.visible = true;
    born.current[i] = now;
  });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < 16; i++) {
      const sp = sprites.current[i];
      if (!sp || !sp.visible) continue;
      const k = (t - (born.current[i] ?? t)) / 0.6;
      if (k >= 1) {
        sp.visible = false;
        continue;
      }
      sp.scale.setScalar(0.4 + k * 1.2);
      (sp.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.7;
    }
  });
  const layer = (
    <>
      {Array.from({ length: 16 }).map((_, i) => (
        <sprite
          key={i}
          visible={false}
          ref={(el) => {
            sprites.current[i] = el;
          }}
        >
          <spriteMaterial map={map} transparent depthWrite={false} opacity={0} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
  return { layer, trigger: trigger.current };
}

/* ------------------------------------------------------------------ */
/* Fase EXCAVAR: terrones de tierra que se quitan tocando               */
/* ------------------------------------------------------------------ */
function Clod({ pos, onDig }: { pos: [number, number, number]; onDig: (p: [number, number, number]) => void }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <mesh
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        setGone(true);
        onDig(pos);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
      castShadow
    >
      <dodecahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial color="#7a5a3a" flatShading roughness={1} />
    </mesh>
  );
}

/** Huesos "enterrados": tumbados en la arena, se ven al quitar la tierra. */
function BoneBed() {
  const m = { color: '#e8dfc6', roughness: 1, flatShading: true } as const;
  const longs: { p: [number, number, number]; r: [number, number, number]; l: number }[] = [
    { p: [-1.6, 0.12, 0.6], r: [0, 0.4, Math.PI / 2], l: 1.4 },
    { p: [1.2, 0.12, -0.8], r: [0, -0.6, Math.PI / 2], l: 1.2 },
    { p: [0.2, 0.12, 1.4], r: [0, 1.1, Math.PI / 2], l: 1.0 },
    { p: [-0.8, 0.12, -1.4], r: [0, 0.2, Math.PI / 2], l: 1.6 },
  ];
  return (
    <group>
      {/* Cráneo tumbado */}
      <group position={[0.1, 0.2, 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.6]} />
          <meshStandardMaterial {...m} />
        </mesh>
        <mesh position={[0, -0.02, 0.5]} castShadow>
          <boxGeometry args={[0.36, 0.34, 0.6]} />
          <meshStandardMaterial {...m} />
        </mesh>
      </group>
      {/* Huesos largos */}
      {longs.map((b, i) => (
        <mesh key={i} position={b.p} rotation={b.r} castShadow>
          <capsuleGeometry args={[0.14, b.l, 4, 8]} />
          <meshStandardMaterial {...m} />
        </mesh>
      ))}
      {/* Costillas curvas */}
      {[-1, 1].map((s) =>
        [0, 1, 2].map((j) => (
          <mesh key={`${s}-${j}`} position={[s * (0.5 + j * 0.25), 0.1, -0.2 + j * 0.1]} rotation={[Math.PI / 2, 0, s * 0.6]}>
            <capsuleGeometry args={[0.05, 0.7, 3, 6]} />
            <meshStandardMaterial {...m} />
          </mesh>
        )),
      )}
    </group>
  );
}

function DigPhase({ onComplete }: { onComplete: () => void }) {
  const quality = useApp((s) => s.quality);
  const { layer, trigger } = useDust();
  const total = useRef(0);
  const removed = useRef(0);
  const [ready, setReady] = useState(false);
  const clockRef = useRef(0);
  useFrame(({ clock }) => (clockRef.current = clock.elapsedTime));

  const clods = useMemo(() => {
    const list: [number, number, number][] = [];
    const cols = quality.tier === 'low' ? 6 : 8;
    const rows = quality.tier === 'low' ? 5 : 6;
    for (let cx = 0; cx < cols; cx++) {
      for (let cz = 0; cz < rows; cz++) {
        const x = -3.0 + (cx / (cols - 1)) * 6.0;
        const z = -2.4 + (cz / (rows - 1)) * 4.8;
        const jx = (((cx * 7 + cz * 13) % 5) - 2) * 0.06;
        const jz = (((cx * 11 + cz * 5) % 5) - 2) * 0.06;
        list.push([x + jx, 0.35, z + jz]);
      }
    }
    return list;
  }, [quality.tier]);
  total.current = clods.length;

  const onDig = (p: [number, number, number]) => {
    playDig();
    trigger(p[0], p[1] + 0.2, p[2], clockRef.current);
    removed.current++;
    if (!ready && removed.current / total.current >= 0.6) setReady(true);
  };

  return (
    <group>
      {/* Suelo de arena */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#d8c290" roughness={1} />
      </mesh>
      <BoneBed />
      {clods.map((p, i) => (
        <Clod key={i} pos={p} onDig={onDig} />
      ))}
      {layer}
      {ready && (
        <Html center position={[0, 3.4, 0]} zIndexRange={[8, 0]}>
          <button className="chip-btn active" style={{ fontSize: 16, padding: '10px 18px' }} onClick={onComplete}>
            🦴 ¡Reconstruir esqueleto!
          </button>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Fase MONTAR: encaja los huesos tocando el que brilla                 */
/* ------------------------------------------------------------------ */
function ActiveBone({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const s = 1 + Math.sin(t * 4) * 0.05;
    g.scale.setScalar(s);
    g.position.y = Math.sin(t * 2) * 0.06;
  });
  return <group ref={ref}>{children}</group>;
}

function BuildPhase({ fossilIndex, onDone }: { fossilIndex: number; onDone: () => void }) {
  const fossil = FOSSILS[fossilIndex];
  const [placed, setPlaced] = useState(0);
  const { layer, trigger } = useDust();
  const clockRef = useRef(0);
  useFrame(({ clock }) => (clockRef.current = clock.elapsedTime));

  const place = (i: number) => {
    if (i !== placed) return;
    const b = fossil.bones[i];
    playPop();
    trigger(b.pos[0], b.pos[1], b.pos[2], clockRef.current);
    const next = placed + 1;
    setPlaced(next);
    if (next >= fossil.bones.length) {
      playFanfare();
      setTimeout(() => playRoar(90), 500);
      setTimeout(onDone, 700);
    }
  };

  const active = fossil.bones[placed];

  return (
    <group>
      {/* Pedestal de museo */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3.4, 0.3, 40]} />
        <meshStandardMaterial color="#3a3550" roughness={0.9} />
      </mesh>
      {fossil.bones.map((b, i) => {
        if (i < placed) return <BonePiece key={b.id} bone={b} state="placed" />;
        if (i > placed) return <BonePiece key={b.id} bone={b} state="ghost" />;
        return (
          <group
            key={b.id}
            onClick={(e) => {
              e.stopPropagation();
              place(i);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
          >
            <ActiveBone>
              <BonePiece bone={b} state="active" />
            </ActiveBone>
          </group>
        );
      })}
      {layer}
      {active && (
        <Html center position={[0, 4.6, 0]} zIndexRange={[8, 0]}>
          <div className="dig-hint">
            Toca el hueso que brilla: <b>{active.label}</b>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */
export default function DigScene() {
  const quality = useApp((s) => s.quality);
  const openDino = useApp((s) => s.openDino);
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState<Phase>('dig');
  const fossil = FOSSILS[sel];

  // Al cambiar de fósil, vuelve a empezar por la excavación.
  useEffect(() => {
    setPhase('dig');
  }, [sel]);

  useEffect(() => {
    if (phase === 'dig') speak('¡Vamos a excavar! Toca la tierra para descubrir los huesos.');
    else if (phase === 'build') speak('Ahora monta el esqueleto. Toca el hueso que brilla.');
    else speak(`¡Lo lograste! Es un ${fossil.name}. ${fossil.hint}`);
  }, [phase, fossil]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas
          shadows={quality.tier !== 'low'}
          camera={{ position: [4.5, 4, 8], fov: 55 }}
          dpr={quality.dpr}
          gl={{ antialias: quality.antialias }}
        >
          <color attach="background" args={['#20222f']} />
          <hemisphereLight args={['#cfd8ff', '#3a2f22', 0.7]} />
          <directionalLight
            position={[6, 12, 6]}
            intensity={2}
            color="#fff2dc"
            castShadow
            shadow-mapSize={quality.tier === 'high' ? [2048, 2048] : [1024, 1024]}
          />
          <spotLight position={[-4, 8, 4]} angle={0.6} penumbra={0.6} intensity={1.2} color="#bcd0ff" />

          {phase === 'dig' && <DigPhase onComplete={() => setPhase('build')} />}
          {(phase === 'build' || phase === 'done') && (
            <BuildPhase key={sel} fossilIndex={sel} onDone={() => setPhase('done')} />
          )}

          <OrbitControls enablePan={false} minDistance={5} maxDistance={16} maxPolarAngle={Math.PI * 0.49} target={[0, 1.6, 0]} />
          <AdaptiveQuality />
          <Effects />
        </Canvas>
      </div>

      <div className="bh-overlay">
        {phase === 'done' ? (
          <div className="bh-caption">
            <strong style={{ fontSize: 18 }}>
              {fossil.emoji} ¡Es un {fossil.name}!
            </strong>
            <p style={{ marginTop: 6 }}>{fossil.hint}</p>
            <div className="control-row" style={{ justifyContent: 'center', marginTop: 10 }}>
              <button className="btn btn-accent" onClick={() => openDino(fossil.dinoId)}>
                🦖 Verlo con vida
              </button>
              <button className="btn" onClick={() => setPhase('dig')}>
                🔁 Excavar otra vez
              </button>
            </div>
          </div>
        ) : (
          <div className="bh-caption">
            {phase === 'dig' ? '⛏️ Toca la tierra para desenterrar los huesos.' : '🦴 Toca el hueso que brilla para montarlo.'}
          </div>
        )}
        <div className="control-row" style={{ pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FOSSILS.map((f, i) => (
            <button
              key={f.id}
              className={`chip-btn${i === sel ? ' active' : ''}`}
              onClick={() => setSel(i)}
              title={f.era}
            >
              {f.emoji} {f.name.split(' ')[0]}
              <i className="era-pill" style={{ background: ERA_COLORS[f.era], marginLeft: 6 }}>
                {f.era}
              </i>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
