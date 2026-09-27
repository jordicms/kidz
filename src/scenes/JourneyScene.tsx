import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { getJourney } from '../data/body';
import { useApp } from '../state/store';
import { speak, stopSpeaking } from '../utils/speech';
import Effects from '../components/three/Effects';
import { AdaptiveQuality } from '../components/three/SceneExtras';
import { JOURNEY_CFG, type JourneyCfg } from './journey/config';
import { buildTunnel, type Tunnel } from './journey/tunnel';
import { AirBubble, FoodBite, makeRideState, RedCell, type RideState } from './journey/Travelers';
import {
  Acid,
  AlveoliRoom,
  AlveoliWall,
  Bacteria,
  Companions,
  Exit,
  Fork,
  Hairs,
  Teeth,
  TissueCells,
  Transfer,
  Valves,
  Villi,
} from './journey/Decor';
import MiniMap from './journey/MiniMap';

/**
 * Viaje por dentro del cuerpo, contado por estaciones: cada paso de la
 * historia es un sitio distinto y reconocible (la boca con sus dientes, la
 * tráquea con sus anillos, el estómago con su jugo...). El protagonista tiene
 * carita y cambia a la vista (el glóbulo se pone rojo brillante al cargar
 * oxígeno), y un minimapa del cuerpo enseña en todo momento DÓNDE estás.
 */

/* ------------------------------------------------------------------ */
/* Pared del túnel animada                                             */
/* ------------------------------------------------------------------ */

function useWallMaterial(state: RideState) {
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.36,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      sheen: 0.6,
      sheenColor: new THREE.Color('#ffb0b0'),
      side: THREE.DoubleSide,
    });
    const u = { uTime: { value: 0 }, uTravS: { value: 0 } };
    m.userData.u = u;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec3 aAnim;
          uniform float uTime;
          uniform float uTravS;
          float beatFn(float t) {
            float p = mod(t, 0.75) / 0.75;
            return exp(-pow((p - 0.05) / 0.06, 2.0)) + 0.6 * exp(-pow((p - 0.3) / 0.06, 2.0));
          }`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float sArc = uv.x;
          // Peristaltismo: la pared se aprieta justo DETRÁS del bocado y lo empuja.
          float squeeze = aAnim.x * 0.38 * exp(-pow((sArc - (uTravS - 1.0)) / 0.55, 2.0));
          squeeze += aAnim.x * 0.08 * (0.5 + 0.5 * sin(sArc * 1.3 - uTime * 3.0));
          float heart = aAnim.y * 0.4 * beatFn(uTime);
          float lungs = -aAnim.z * 0.28 * sin(uTime * 1.25);
          // Las normales miran hacia dentro: sumar = estrechar el túnel.
          transformed += objectNormal * (squeeze + heart + lungs);`,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.1;`,
      );
    };
    m.customProgramCacheKey = () => 'kidz-tunnel';
    return m;
  }, []);
  useFrame((_, dt) => {
    mat.userData.u.uTime.value += dt;
    mat.userData.u.uTravS.value = state.s;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/* ------------------------------------------------------------------ */
/* Motor del recorrido                                                 */
/* ------------------------------------------------------------------ */

interface Control {
  playing: boolean;
  /** Tiempo dentro de la estación actual. */
  local: number;
  station: number;
  jump: number | null;
  done: boolean;
}

function derive(id: string, st: RideState, cfg: JourneyCfg) {
  const { station: i, k } = st;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
  if (id === 'sangre') st.o2 = i === 2 ? lerp(0.15, 1, (k - 0.15) / 0.7) : i === 3 ? lerp(1, 0.15, (k - 0.15) / 0.7) : 0.15;
  if (id === 'comida') st.food = [lerp(1, 0.9, k), 0.9, lerp(0.9, 0.6, k), lerp(0.6, 0.3, k), lerp(0.3, 0.15, k)][i] ?? 0.15;
  if (id === 'aire') st.co2 = i < 3 ? 0 : i === 3 ? lerp(0, 0.85, (k - 0.1) / 0.8) : 0.85;
  const r = cfg.stations[i].route;
  st.route = lerp(r[0], r[1], k);
}

function Ride({
  id,
  cfg,
  tunnel,
  state,
  control,
  onStation,
}: {
  id: string;
  cfg: JourneyCfg;
  tunnel: Tunnel;
  state: RideState;
  control: React.RefObject<Control>;
  onStation: (i: number, done: boolean) => void;
}) {
  const { camera, scene } = useThree();
  const traveler = useRef<THREE.Group>(null);
  const head = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.PointLight>(null);
  const wallMat = useWallMaterial(state);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const lastStation = useRef(-1);

  useEffect(() => {
    scene.fog = new THREE.Fog(cfg.stations[0].fog, 4, 26);
    return () => {
      scene.fog = null;
    };
  }, [scene, cfg]);

  useFrame((frame, delta) => {
    const c = control.current;
    const dt = Math.min(delta, 0.1);
    if (c.jump !== null) {
      c.station = c.jump;
      c.local = 0;
      c.jump = null;
      c.done = false;
    }
    const st = cfg.stations[c.station];
    if (c.playing && !c.done) {
      c.local += dt;
      if (c.local >= st.duration) {
        if (c.station < cfg.stations.length - 1) {
          c.station++;
          c.local = 0;
        } else {
          c.local = st.duration;
          c.done = true;
        }
      }
    }
    const k = Math.min(1, c.local / cfg.stations[c.station].duration);
    // Suavizado: arranca y frena un poco en las cámaras grandes.
    const ease = cfg.stations[c.station].radius > 2.5 ? k * k * (3 - 2 * k) * 0.6 + k * 0.4 : k;
    const s = Math.min(tunnel.length - 1.2, tunnel.starts[c.station] + ease * cfg.stations[c.station].length);
    state.s = s;
    state.station = c.station;
    state.k = k;
    state.time = frame.clock.elapsedTime;
    derive(id, state, cfg);

    if (c.station !== lastStation.current) {
      lastStation.current = c.station;
      onStation(c.station, false);
    }
    if (c.done) onStation(c.station, true);

    // Protagonista con un ligero vaivén.
    const f = tunnel.frameAt(s);
    const t = frame.clock.elapsedTime;
    const bob = new THREE.Vector3().addScaledVector(f.n, Math.sin(t * 1.7) * 0.12).addScaledVector(f.b, Math.cos(t * 1.3) * 0.12);
    state.pos.copy(f.p).add(bob);
    if (traveler.current) {
      traveler.current.position.copy(state.pos);
      traveler.current.lookAt(camera.position); // mira hacia nosotros
    }

    // Cámara en tercera persona, un poco por detrás y por encima.
    const back = Math.max(0.2, s - 2.6);
    const fb = tunnel.frameAt(back);
    camPos.copy(fb.p).addScaledVector(new THREE.Vector3(0, 1, 0), 0.35);
    camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
    lookAt.copy(tunnel.frameAt(Math.min(tunnel.length - 0.5, s + 1.2)).p);
    camera.lookAt(lookAt);
    head.current?.position.copy(camera.position);
    glow.current?.position.copy(state.pos).addScaledVector(f.t, 1.2);

    // Luz y niebla del sitio en el que estamos (con fundido entre estaciones).
    const w = tunnel.weights(s);
    fogColor.setRGB(0, 0, 0);
    const light = new THREE.Color(0, 0, 0);
    cfg.stations.forEach((stn, i) => {
      fogColor.add(tmpColor.set(stn.fog).multiplyScalar(w[i]));
      light.add(tmpColor.set(stn.light).multiplyScalar(w[i]));
    });
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor);
    (scene.background as THREE.Color | null)?.copy?.(fogColor);
    head.current?.color.copy(light);
  });

  const decor = (i: number) => {
    const st = cfg.stations[i];
    const p = { tunnel, station: i, state, scale: 1 };
    return st.decor.map((d) => {
      switch (d) {
        case 'valves':
          return <Valves key={d} {...p} />;
        case 'alveoliWall':
          return <AlveoliWall key={d} {...p} />;
        case 'tissueCells':
          return <TissueCells key={d} {...p} />;
        case 'teeth':
          return <Teeth key={d} {...p} />;
        case 'acid':
          return <Acid key={d} {...p} />;
        case 'villi':
          return <Villi key={d} {...p} />;
        case 'bacteria':
          return <Bacteria key={d} {...p} />;
        case 'hairs':
          return <Hairs key={d} {...p} />;
        case 'fork':
          return <Fork key={d} {...p} />;
        case 'alveoliRoom':
          return <AlveoliRoom key={d} {...p} />;
        default:
          return null;
      }
    });
  };

  return (
    <>
      <color attach="background" args={[cfg.stations[0].fog]} />
      <mesh geometry={tunnel.geometry} material={wallMat} />
      <hemisphereLight args={['#ffe8e8', '#300810', 0.35]} />
      <pointLight ref={head} intensity={14} distance={16} decay={1.3} />
      <pointLight ref={glow} intensity={1.6} distance={6} decay={1.6} color="#fff0e0" />
      {cfg.stations.map((_, i) => decor(i))}
      {cfg.stations.some((s) => s.decor.includes('companions')) && <Companions tunnel={tunnel} state={state} scale={1} />}
      {cfg.stations[cfg.stations.length - 1].decor.includes('exit') && <Exit tunnel={tunnel} />}
      {id === 'sangre' && (
        <>
          <Transfer tunnel={tunnel} station={2} state={state} scale={1} color="#6fd0ff" dir="in" label="+ O₂ oxígeno" />
          <Transfer tunnel={tunnel} station={3} state={state} scale={1} color="#6fd0ff" dir="out" label="Reparto O₂" />
        </>
      )}
      {id === 'comida' && (
        <>
          <Transfer tunnel={tunnel} station={2} state={state} scale={1} color="#c8ff5a" dir="in" size={0.05} label="Jugos gástricos" />
          <Transfer tunnel={tunnel} station={3} state={state} scale={1} color="#ffd84a" dir="out" size={0.06} label="Vitaminas y energía" />
          <Transfer tunnel={tunnel} station={4} state={state} scale={1} color="#6fd0ff" dir="out" size={0.05} count={16} label="Agua" />
        </>
      )}
      {id === 'aire' && (
        <>
          <Transfer tunnel={tunnel} station={3} state={state} scale={1} color="#6fd0ff" dir="out" label="O₂ a la sangre" />
          <Transfer tunnel={tunnel} station={3} state={state} scale={1} color="#a0a0b0" dir="in" count={18} label="" />
        </>
      )}
      <group ref={traveler} scale={0.85}>
        {id === 'sangre' ? <RedCell state={state} /> : id === 'comida' ? <FoodBite state={state} /> : <AirBubble state={state} />}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */

export default function JourneyScene() {
  const journeyId = useApp((s) => s.journeyId);
  const quality = useApp((s) => s.quality);
  const goBody = useApp((s) => s.goBody);
  const journey = journeyId ? getJourney(journeyId) : undefined;
  const cfg = journey ? JOURNEY_CFG[journey.id] : undefined;
  const [meshTier] = useState(quality.tier);

  const tunnel = useMemo(() => (cfg ? buildTunnel(cfg, meshTier === 'high' ? 1 : meshTier === 'medium' ? 0.8 : 0.6) : null), [cfg, meshTier]);
  const state = useMemo(() => makeRideState(), []);
  const control = useRef<Control>({ playing: true, local: 0, station: 0, jump: null, done: false });
  const [station, setStation] = useState(0);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [banner, setBanner] = useState<number | null>(0);

  useEffect(() => {
    if (!journey) return;
    if (!done) speak(journey.steps[station]);
    setBanner(station);
    const t = setTimeout(() => setBanner(null), 2200);
    return () => clearTimeout(t);
  }, [station, journey, done]);
  useEffect(() => () => stopSpeaking(), []);

  if (!journey || !cfg || !tunnel) return null;

  const onStation = (i: number, isDone: boolean) => {
    setStation((prev) => (prev !== i ? i : prev));
    if (isDone) {
      setDone((d) => {
        if (!d) setPlaying(false);
        return true;
      });
    }
  };

  const jump = (i: number) => {
    stopSpeaking();
    control.current.jump = i;
    control.current.playing = true;
    control.current.done = false;
    setDone(false);
    setPlaying(true);
  };
  const togglePlay = () => {
    control.current.playing = !control.current.playing;
    setPlaying(control.current.playing);
  };

  const st = cfg.stations[station];
  // Efectos: oclusión ambiental y desenfoque solo en gama alta (el túnel es exigente).
  const high = quality.tier === 'high';

  return (
    <>
      <div className="scene-canvas">
        <Canvas camera={{ position: [0, 0, -2], fov: 70, near: 0.05, far: 80 }} dpr={quality.dpr} gl={{ antialias: quality.antialias }}>
          <Ride id={journey.id} cfg={cfg} tunnel={tunnel} state={state} control={control} onStation={onStation} />
          <AdaptiveQuality />
          <Effects ao={high ? { radius: 0.5, intensity: 1.6 } : undefined} bloomThreshold={0.7} bloomScale={1.1} chromatic={high ? 0.0012 : 0} vignette={0.85} />
        </Canvas>
      </div>

      {banner !== null && !done && (
        <div className="journey-banner" key={banner}>
          <span className="emoji">{cfg.stations[banner].emoji}</span>
          <small>Estación {banner + 1} de {cfg.stations.length}</small>
          {cfg.stations[banner].place}
        </div>
      )}

      <MiniMap cfg={cfg} state={state} tier={meshTier} />

      <div className="journey-overlay">
        <div className="journey-caption" key={done ? 'done' : station}>
          <div className="journey-place">
            <span>{st.emoji}</span> {st.place}
          </div>
          <p>{done ? '🎉 ¡Fin del viaje! ¿Lo repetimos?' : journey.steps[station]}</p>
        </div>
        <div className="journey-rail">
          {cfg.stations.map((s, i) => (
            <button key={i} className={`rail-stop${i === station ? ' active' : ''}${i < station ? ' past' : ''}`} onClick={() => jump(i)} title={s.place}>
              <span className="rail-emoji">{s.emoji}</span>
              <span className="rail-name">{s.place}</span>
            </button>
          ))}
        </div>
        <div className="journey-bar">
          {!done && (
            <button className="btn" onClick={togglePlay}>
              {playing ? '⏸️ Pausa' : '▶️ Seguir'}
            </button>
          )}
          <button className="btn btn-accent" onClick={() => jump(0)}>
            🔄 Repetir
          </button>
          <button className="btn" onClick={goBody}>
            🧍 Volver al cuerpo
          </button>
        </div>
      </div>
    </>
  );
}
