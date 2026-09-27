import { Suspense, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { BODY_LAYERS, SYSTEMS, JOURNEYS, getOrgan } from '../data/body';
import { useApp } from '../state/store';
import { playHeartbeat } from '../utils/sound';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { GradientBackdrop, HoloPlatform, StudioEnvironment } from '../components/three/Studio';
import { CutContext, makeCutUniforms, type CutUniforms } from '../components/three/body/materials';
import {
  AirFlow,
  Bones,
  Brain,
  Circulation,
  Fat,
  FoodFlow,
  Heart,
  Intestines,
  Kidneys,
  Liver,
  Lungs,
  Muscles,
  Nerves,
  Skin,
  Stomach,
  MeshTierContext,
  Tappable,
  XRayShell,
} from '../components/three/body/BodyParts';
import { ensureSdf, sdfReady } from '../components/three/body/useSdf';
import type { Vec3 } from '../utils/sdf';

/**
 * El cuerpo humano como un escáner holográfico:
 * - CAPAS: piel → grasa → músculos → huesos → órganos. Al cambiar, un anillo
 *   de luz barre el cuerpo de arriba abajo y "pela" la capa en directo.
 * - SISTEMAS: modo rayos X con cada aparato resaltado y funcionando (la sangre
 *   circula, los impulsos viajan por los nervios, el aire entra y sale...).
 * - Etiquetas tipo libro de anatomía con líneas que señalan cada órgano.
 */

type ViewKey = `layer:${number}` | `sys:${string}`;

const Y_OFFSET = 0.12;

/** Piezas SDF que necesita cada vista (para precargarlas antes del barrido). */
function piecesFor(view: ViewKey): string[] {
  const shell = 'body:shell';
  switch (view) {
    case 'layer:0':
      return ['body:skin', 'body:hair'];
    case 'layer:1':
      return ['body:fat'];
    case 'layer:2':
      return ['body:muscle'];
    case 'layer:3':
      return ['skeleton', shell];
    case 'layer:4':
      return [shell, 'organ:corazon', 'organ:pulmon-l', 'organ:pulmon-r', 'organ:traquea', 'organ:cerebro', 'organ:estomago', 'organ:esofago', 'organ:higado', 'organ:rinones', 'organ:intestinos'];
    case 'sys:oseo':
      return ['skeleton', shell];
    case 'sys:muscular':
      return ['body:muscle'];
    case 'sys:circulatorio':
      return [shell, 'organ:corazon'];
    case 'sys:respiratorio':
      return [shell, 'organ:pulmon-l', 'organ:pulmon-r', 'organ:traquea', 'organ:bronquios'];
    case 'sys:digestivo':
      return [shell, 'organ:estomago', 'organ:esofago', 'organ:higado', 'organ:intestinos'];
    case 'sys:nervioso':
      return [shell, 'organ:cerebro'];
    case 'sys:excretor':
      return [shell, 'organ:rinones'];
    default:
      return [];
  }
}

/** Encuadre de cámara por vista: [posición, objetivo]. */
const FRAMING: Record<string, [Vec3, Vec3]> = {
  full: [[0, -0.1, 7.8], [0, -0.38, 0]],
  torso: [[0, 0.62, 5.2], [0, 0.39, 0]],
  chest: [[0, 0.82, 2.35], [0, 0.72, 0]],
  belly: [[0, 0.6, 4.3], [0, 0.42, 0]],
  kidneys: [[0.9, 0.35, 2.6], [0, 0.0, 0]],
};
function framingFor(view: ViewKey) {
  if (view === 'layer:4') return FRAMING.torso;
  if (view === 'sys:respiratorio') return FRAMING.chest;
  if (view === 'sys:digestivo') return FRAMING.belly;
  if (view === 'sys:excretor') return FRAMING.kidneys;
  return FRAMING.full;
}

/* ------------------------------------------------------------------ */
/* Etiquetas con línea guía                                            */
/* ------------------------------------------------------------------ */

function Callout({ id, anchor, side, y }: { id: string; anchor: Vec3; side: 1 | -1; y: number }) {
  const openOrgan = useApp((s) => s.openOrgan);
  const organ = getOrgan(id);
  if (!organ) return null;
  const end: Vec3 = [side * 0.78, y, anchor[2] * 0.5 + 0.1];
  const elbow: Vec3 = [side * 0.62, y, end[2]];
  const open = () => {
    if (id === 'corazon') playHeartbeat();
    openOrgan(id);
  };
  return (
    <group>
      <Line points={[anchor, elbow, end]} color="#bff4ff" lineWidth={1.4} transparent opacity={0.85} />
      <mesh position={anchor}>
        <sphereGeometry args={[0.014, 12, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <Html position={end} center zIndexRange={[5, 0]}>
        <button className={`body-callout ${side > 0 ? 'right' : 'left'}`} onClick={open}>
          <span>{organ.emoji}</span> {organ.name.replace(/^(El|La|Los|Las) /, '')}
        </button>
      </Html>
    </group>
  );
}

const CALLOUTS: Record<string, Array<{ id: string; anchor: Vec3; side: 1 | -1; y: number }>> = {
  'layer:4': [
    { id: 'cerebro', anchor: [0.06, 1.6, 0.06], side: 1, y: 1.58 },
    { id: 'corazon', anchor: [0.06, 0.55, 0.13], side: 1, y: 0.72 },
    { id: 'estomago', anchor: [0.15, 0.22, 0.11], side: 1, y: 0.28 },
    { id: 'rinones', anchor: [0.11, 0.15, -0.07], side: 1, y: -0.02 },
    { id: 'pulmones', anchor: [-0.16, 0.74, 0.08], side: -1, y: 0.9 },
    { id: 'higado', anchor: [-0.14, 0.36, 0.1], side: -1, y: 0.45 },
    { id: 'intestinos', anchor: [-0.08, -0.14, 0.12], side: -1, y: -0.12 },
  ],
  'sys:circulatorio': [
    { id: 'corazon', anchor: [0.06, 0.55, 0.13], side: 1, y: 0.75 },
    { id: 'rinones', anchor: [0.11, 0.15, -0.07], side: -1, y: 0.2 },
  ],
  'sys:respiratorio': [{ id: 'pulmones', anchor: [0.18, 0.72, 0.1], side: 1, y: 0.9 }],
  'sys:digestivo': [
    { id: 'estomago', anchor: [0.15, 0.22, 0.11], side: 1, y: 0.35 },
    { id: 'intestinos', anchor: [0.06, -0.1, 0.13], side: 1, y: -0.12 },
    { id: 'higado', anchor: [-0.14, 0.36, 0.1], side: -1, y: 0.45 },
  ],
  'sys:nervioso': [{ id: 'cerebro', anchor: [0.06, 1.6, 0.06], side: 1, y: 1.55 }],
  'sys:excretor': [{ id: 'rinones', anchor: [0.12, 0.16, -0.11], side: -1, y: 0.35 }],
};

/* ------------------------------------------------------------------ */
/* Contenido de cada vista                                             */
/* ------------------------------------------------------------------ */

function useOpen() {
  const openOrgan = useApp((s) => s.openOrgan);
  return (id: string) => () => {
    if (id === 'corazon') playHeartbeat();
    openOrgan(id);
  };
}

function ViewContent({ view, settled }: { view: ViewKey; settled: boolean }) {
  const open = useOpen();
  const shell = <XRayShell />;
  const extras = (node: ReactNode) => (settled ? node : null);

  switch (view) {
    case 'layer:0':
      return <Skin />;
    case 'layer:1':
      return <Fat />;
    case 'layer:2':
    case 'sys:muscular':
      return <Tappable onTap={open('musculos')}>{(h) => <Muscles hover={h} />}</Tappable>;
    case 'layer:3':
    case 'sys:oseo':
      return (
        <>
          <XRayShell opacity={0.6} />
          <Tappable onTap={open('huesos')}>{(h) => <Bones hover={h} />}</Tappable>
        </>
      );
    case 'layer:4':
      return (
        <>
          {shell}
          <Tappable onTap={open('cerebro')}>{(h) => <Brain hover={h} />}</Tappable>
          <Tappable onTap={open('pulmones')}>{(h) => <Lungs hover={h} />}</Tappable>
          <Tappable onTap={open('corazon')}>{(h) => <Heart hover={h} />}</Tappable>
          <Tappable onTap={open('higado')}>{(h) => <Liver hover={h} />}</Tappable>
          <Tappable onTap={open('estomago')}>{(h) => <Stomach hover={h} />}</Tappable>
          <Tappable onTap={open('rinones')}>{(h) => <Kidneys hover={h} />}</Tappable>
          <Tappable onTap={open('intestinos')}>{(h) => <Intestines hover={h} />}</Tappable>
        </>
      );
    case 'sys:circulatorio':
      return (
        <>
          {shell}
          <Circulation />
          <Tappable onTap={open('corazon')}>{(h) => <Heart hover={h} />}</Tappable>
        </>
      );
    case 'sys:respiratorio':
      return (
        <>
          {shell}
          <Tappable onTap={open('pulmones')}>{(h) => <Lungs hover={h} opacity={0.55} />}</Tappable>
          {extras(<AirFlow />)}
        </>
      );
    case 'sys:digestivo':
      return (
        <>
          {shell}
          <Tappable onTap={open('higado')}>{(h) => <Liver hover={h} />}</Tappable>
          <Tappable onTap={open('estomago')}>{(h) => <Stomach hover={h} />}</Tappable>
          <Tappable onTap={open('intestinos')}>{(h) => <Intestines hover={h} />}</Tappable>
          {extras(<FoodFlow />)}
        </>
      );
    case 'sys:nervioso':
      return (
        <>
          {shell}
          <Nerves />
          <Tappable onTap={open('cerebro')}>{(h) => <Brain hover={h} />}</Tappable>
        </>
      );
    case 'sys:excretor':
      return (
        <>
          {shell}
          <Tappable onTap={open('rinones')}>{(h) => <Kidneys hover={h} />}</Tappable>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Barrido del escáner entre vistas                                    */
/* ------------------------------------------------------------------ */

const TOP = 1.95 + Y_OFFSET;
const BOTTOM = -1.9 + Y_OFFSET;
const SWEEP_TIME = 1.15;

/**
 * Una vista con sus uniforms de corte. El objeto es estable por vista (lo crea
 * el Scanner una sola vez, a prueba del doble render de StrictMode) y se
 * reinicia cada vez que la vista se monta, para no heredar un barrido anterior.
 */
function CutView({ view, settled, cut, entering }: { view: ViewKey; settled: boolean; cut: CutUniforms; entering: boolean }) {
  useLayoutEffect(() => {
    cut.uCutOn.value = entering ? 1 : 0;
    cut.uCutDir.value = -1;
    cut.uCut.value = TOP;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut]);
  return (
    <CutContext.Provider value={cut}>
      <Suspense fallback={null}>
        <ViewContent view={view} settled={settled} />
      </Suspense>
    </CutContext.Provider>
  );
}

function Scanner({ view, onShown }: { view: ViewKey; onShown: (v: ViewKey) => void }) {
  const tier = useContext(MeshTierContext)!;
  const [shown, setShown] = useState<{ current: ViewKey; previous: ViewKey | null }>({ current: view, previous: null });
  const registry = useRef(new Map<ViewKey, CutUniforms>()).current;
  const cutFor = (v: ViewKey) => {
    let c = registry.get(v);
    if (!c) {
      c = makeCutUniforms();
      registry.set(v, c);
    }
    return c;
  };
  const anim = useRef<{ t: number } | null>(null);
  const ring = useRef<THREE.Group>(null);
  const [settled, setSettled] = useState(true);


  // Cuando cambia la vista: precarga sus piezas y lanza el barrido.
  useEffect(() => {
    if (view === shown.current) return;
    let alive = true;
    ensureSdf(piecesFor(view), tier).then(() => {
      if (!alive) return;
      setShown((s) => ({ current: view, previous: s.current }));
      onShown(view);
      setSettled(false);
      anim.current = { t: 0 };
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tier]);

  useFrame((_, dt) => {
    const a = anim.current;
    const cur = cutFor(shown.current);
    if (!a) {
      cur.uCutOn.value = 0;
      if (ring.current) ring.current.visible = false;
      return;
    }
    a.t = Math.min(1, a.t + dt / SWEEP_TIME);
    const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    const y = TOP + (BOTTOM - TOP) * e;
    cur.uCutOn.value = 1;
    cur.uCutDir.value = -1; // la nueva vista aparece por encima del corte
    cur.uCut.value = y;
    const prev = shown.previous ? cutFor(shown.previous) : undefined;
    if (prev) {
      prev.uCutOn.value = 1;
      prev.uCutDir.value = 1; // la anterior se queda por debajo
      prev.uCut.value = y;
    }
    if (ring.current) {
      ring.current.visible = true;
      ring.current.position.y = y;
      const w = y > 1.2 ? 0.28 : y > 0.95 ? 0.45 : y > -0.35 ? 0.85 : 0.42; // se ajusta a la silueta
      ring.current.scale.x += (w - ring.current.scale.x) * 0.25;
    }
    if (a.t >= 1) {
      anim.current = null;
      cur.uCutOn.value = 0;
      setShown((s) => ({ current: s.current, previous: null }));
      setSettled(true);
    }
  });

  return (
    <>
      {shown.previous && <CutView key={shown.previous} view={shown.previous} cut={cutFor(shown.previous)} settled={false} entering={false} />}
      <CutView key={shown.current} view={shown.current} cut={cutFor(shown.current)} settled={settled} entering={shown.previous !== null} />
      {/* Anillo de luz del escáner */}
      <group ref={ring} visible={false} scale={[0.6, 1, 0.45]}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.55, 0.008, 8, 96]} />
          <meshBasicMaterial color="#8ff6ff" toneMapped={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.0, 0.55, 64]} />
          <meshBasicMaterial color="#5ff2ff" transparent opacity={0.12} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {settled && (CALLOUTS[shown.current] ?? []).map((c) => <Callout key={c.id} {...c} anchor={c.anchor} />)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cámara                                                              */
/* ------------------------------------------------------------------ */

type ControlsLike = { target: THREE.Vector3; update: () => void; enabled: boolean };

function CameraRig({ view, controls }: { view: ViewKey; controls: React.RefObject<ControlsLike | null> }) {
  const camera = useThree((s) => s.camera);
  const anim = useRef<{ t: number; fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const [p, t] = framingFor(view);
    anim.current = {
      t: 0,
      fromP: camera.position.clone(),
      fromT: c.target.clone(),
      toP: new THREE.Vector3(p[0], p[1] + Y_OFFSET, p[2]),
      toT: new THREE.Vector3(t[0], t[1] + Y_OFFSET, t[2]),
    };
  }, [view, camera, controls]);
  useFrame((_, dt) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    a.t = Math.min(1, a.t + dt / 1.4);
    const e = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.fromP, a.toP, e);
    c.target.lerpVectors(a.fromT, a.toT, e);
    c.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

/** Aviso mientras se esculpen las mallas la primera vez. */
function Loading() {
  return (
    <Html center>
      <div className="body-loading">
        <span className="pulse-dot" /> Escaneando el cuerpo…
      </div>
    </Html>
  );
}

function FirstReady({ view, children }: { view: ViewKey; children: ReactNode }) {
  const tier = useContext(MeshTierContext)!;
  const [ready, setReady] = useState(() => sdfReady(piecesFor(view), tier));
  useEffect(() => {
    if (ready) return;
    let alive = true;
    ensureSdf(piecesFor(view), tier).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready ? <>{children}</> : <Loading />;
}

export default function BodyScene() {
  const quality = useApp((s) => s.quality);
  const goJourney = useApp((s) => s.goJourney);
  const [layer, setLayer] = useState(0);
  const [system, setSystem] = useState<string | null>(null);
  const controls = useRef<ControlsLike | null>(null);

  const view: ViewKey = system ? `sys:${system}` : `layer:${layer}`;
  // La cámara sigue a la vista que YA se está mostrando (no a la pedida).
  const [shownView, setShownView] = useState<ViewKey>(view);
  const [meshTier] = useState(quality.tier);
  const initialView = useMemo(() => view, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Precarga en segundo plano el resto de capas (así el barrido es instantáneo).
  useEffect(() => {
    const all: ViewKey[] = ['layer:0', 'layer:1', 'layer:2', 'layer:3', 'layer:4'];
    const t = setTimeout(() => all.forEach((v) => ensureSdf(piecesFor(v), meshTier)), 600);
    return () => clearTimeout(t);
  }, [meshTier]);

  const surface = BODY_LAYERS[Math.min(layer, BODY_LAYERS.length - 1)];
  const sys = SYSTEMS.find((s) => s.id === system);

  return (
    <>
      <div className="scene-canvas" style={{ pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, -0.1 + Y_OFFSET, 7.8], fov: 40 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <color attach="background" args={['#07090f']} />
          <GradientBackdrop top="#16294a" bottom="#05070c" glow={sys?.color ?? '#3fa9d6'} />
          <StudioEnvironment />
          <hemisphereLight args={['#dfe8ff', '#2a1f2a', 0.35]} />
          <directionalLight position={[3, 5, 5]} intensity={2.1} color="#fff1ea" />
          <directionalLight position={[-4, 2, 2]} intensity={0.55} color="#b8ccff" />
          <directionalLight position={[0, 3, -5]} intensity={1.6} color="#7fe3ff" />
          <MeshTierContext.Provider value={meshTier}>
            <group position={[0, Y_OFFSET, 0]}>
              <Suspense fallback={<Loading />}>
                <FirstReady view={initialView}>
                  <Scanner view={view} onShown={setShownView} />
                </FirstReady>
              </Suspense>
            </group>
          </MeshTierContext.Provider>
          <HoloPlatform y={-1.735 + Y_OFFSET} radius={0.95} color={sys?.color ?? '#5fe3ff'} />
          <OrbitControls
            ref={controls as never}
            makeDefault
            enablePan={false}
            enableDamping
            minDistance={1.6}
            maxDistance={9}
            target={[0, -0.38 + Y_OFFSET, 0]}
            maxPolarAngle={Math.PI * 0.9}
          />
          <CameraRig view={shownView} controls={controls} />
          <AdaptiveQuality />
          <Effects ao={{ radius: 0.25, intensity: 1.8 }} bloomThreshold={0.8} />
        </Canvas>
      </div>

      <div className="body-controls">
        <div className="control-row">
          <span className="control-label">Capas</span>
          {BODY_LAYERS.map((l, i) => (
            <button
              key={l.name}
              className={`chip-btn${i === layer && !system ? ' active' : ''}`}
              onClick={() => {
                setLayer(i);
                setSystem(null);
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div className="control-row">
          <span className="control-label">Sistemas</span>
          {SYSTEMS.map((s) => (
            <button
              key={s.id}
              className={`chip-btn${system === s.id ? ' active' : ''}`}
              style={system === s.id ? { borderColor: s.color, background: `${s.color}33` } : undefined}
              onClick={() => setSystem(s.id)}
            >
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
        <div className="control-row">
          <span className="control-label">Viajes</span>
          {JOURNEYS.map((j) => (
            <button key={j.id} className="chip-btn" onClick={() => goJourney(j.id)}>
              {j.emoji} {j.title.replace('El viaje de ', '').replace('Viaje de ', '')}
            </button>
          ))}
        </div>
        <div className="control-hint">{sys ? SYSTEM_HINTS[sys.id] ?? `Sistema ${sys.name}` : surface.description}</div>
      </div>
    </>
  );
}

const SYSTEM_HINTS: Record<string, string> = {
  oseo: '206 huesos forman tu esqueleto. ¡Tócalo para saber más!',
  muscular: 'Más de 600 músculos tiran de tus huesos para moverte.',
  circulatorio: 'Mira la sangre: sale roja del corazón por las arterias y vuelve azul por las venas.',
  respiratorio: 'El aire entra por la nariz, baja por la tráquea y llena los pulmones.',
  digestivo: 'Sigue la bolita naranja: así viaja la comida desde la boca.',
  nervioso: 'Los destellos son mensajes que el cerebro manda por los nervios.',
  excretor: 'Los riñones limpian la sangre y fabrican el pis, que baja a la vejiga.',
};
