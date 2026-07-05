import { lazy, Suspense, useEffect } from 'react';
import { useApp, type View } from './state/store';
import HomeScreen from './screens/HomeScreen';
import PassportScreen from './screens/PassportScreen';
import DeepSpaceStory from './components/ui/DeepSpaceStory';
import SceneTransition from './components/ui/SceneTransition';
import { DINOS, ERA_COLORS, ERAS } from './data/dinos';
import { startAmbient, stopAmbient, type AmbientKind } from './utils/sound';

// Code-splitting: cada escena 3D se carga bajo demanda (three.js y compañía
// no entran en el arranque de la app → inicio mucho más rápido, clave en móvil).
const SolarSystemScene = lazy(() => import('./scenes/SolarSystemScene'));
const PlanetScene = lazy(() => import('./scenes/PlanetScene'));
const GalaxyScene = lazy(() => import('./scenes/GalaxyScene'));
const UniverseScene = lazy(() => import('./scenes/UniverseScene'));
const BlackHoleScene = lazy(() => import('./scenes/BlackHoleScene'));
const StarLifeScene = lazy(() => import('./scenes/StarLifeScene'));
const ConstellationsScene = lazy(() => import('./scenes/ConstellationsScene'));
const DinoIslandScene = lazy(() => import('./scenes/DinoIslandScene'));
const DinoScene = lazy(() => import('./scenes/DinoScene'));
const BodyScene = lazy(() => import('./scenes/BodyScene'));
const OrganScene = lazy(() => import('./scenes/OrganScene'));
const JourneyScene = lazy(() => import('./scenes/JourneyScene'));
const OceanScene = lazy(() => import('./scenes/OceanScene'));
const SeaCreatureScene = lazy(() => import('./scenes/SeaCreatureScene'));

const TITLES = {
  solar: { title: '🪐 El Sistema Solar', hint: 'Toca un planeta para conocerlo' },
  galaxy: { title: '🌌 La Vía Láctea', hint: 'Nuestra galaxia, vista desde fuera' },
  universe: { title: '✨ El Universo', hint: 'Toca cada maravilla del cosmos' },
  blackhole: { title: '🕳️ Sagitario A*', hint: 'El agujero negro de la Vía Láctea' },
  starlife: { title: '🌟 Vida de las estrellas', hint: 'Del nacimiento al final' },
  constellations: { title: '✨ Constelaciones', hint: 'Toca una para ver su figura' },
  'dino-island': { title: '🦖 La Isla de los Dinosaurios', hint: 'Toca un dinosaurio para conocerlo' },
  body: { title: '🫀 El Cuerpo Humano', hint: 'Pela las capas y toca un órgano' },
  ocean: { title: '🐳 El Océano', hint: 'Baja hasta lo más profundo' },
} as const;

/** Ambiente sonoro por vista (null = silencio). */
const AMBIENT_BY_VIEW: Record<View, AmbientKind | null> = {
  home: null,
  passport: null,
  solar: 'space',
  planet: 'space',
  galaxy: 'space',
  universe: 'space',
  blackhole: 'space',
  starlife: 'space',
  constellations: 'space',
  'dino-island': 'island',
  dino: 'island',
  body: 'body',
  organ: 'body',
  journey: 'body',
  ocean: 'ocean',
  sea: 'ocean',
};

function AmbientAudio() {
  const view = useApp((s) => s.view);
  const muted = useApp((s) => s.muted);
  useEffect(() => {
    const kind = muted ? null : AMBIENT_BY_VIEW[view];
    if (kind) startAmbient(kind);
    else stopAmbient();
  }, [view, muted]);
  useEffect(() => () => stopAmbient(), []);
  return null;
}

function MuteButton() {
  const muted = useApp((s) => s.muted);
  const toggleMuted = useApp((s) => s.toggleMuted);
  return (
    <button className="btn btn-round" onClick={toggleMuted} title={muted ? 'Activar sonido' : 'Silenciar'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** Línea del tiempo: en qué era vivió cada dinosaurio de la isla. */
function DinoTimeline() {
  return (
    <div className="dino-timeline">
      {ERAS.map(({ era, range }) => {
        const here = DINOS.filter((d) => d.era === era);
        return (
          <div className="era-col" key={era} title={range}>
            <div className="era-name" style={{ color: ERA_COLORS[era] }}>
              {era}
            </div>
            <div className="era-dinos">{here.length ? here.map((d) => d.emoji).join(' ') : '·'}</div>
          </div>
        );
      })}
    </div>
  );
}

function SpeedButton() {
  const speed = useApp((s) => s.speed);
  const cycleSpeed = useApp((s) => s.cycleSpeed);
  const label = speed === 0 ? '⏸️' : speed === 1 ? '▶️ ×1' : '⏩ ×3';
  return (
    <button className="btn" onClick={cycleSpeed} title="Velocidad del tiempo">
      {label}
    </button>
  );
}

function Hud() {
  const view = useApp((s) => s.view);
  const { goHome, goSolar, goGalaxy, goUniverse, goDinoIsland, goBody, goOcean, openBody, openDeepSpace, goConstellations } = useApp();

  if (view === 'home' || view === 'passport') return null;

  const isDetail = view === 'planet' || view === 'dino' || view === 'organ' || view === 'journey' || view === 'sea';
  const back =
    view === 'planet' ? goSolar
    : view === 'galaxy' ? goSolar
    : view === 'universe' ? goGalaxy
    : view === 'blackhole' ? goGalaxy
    : view === 'starlife' ? () => openBody('sol')
    : view === 'constellations' ? goUniverse
    : view === 'dino' ? goDinoIsland
    : view === 'organ' ? goBody
    : view === 'journey' ? goBody
    : view === 'sea' ? goOcean
    : goHome;
  const showSpeed = view === 'solar' || view === 'dino-island';

  return (
    <div className="hud">
      <div className="hud-top">
        <button className="btn" onClick={back}>
          ⬅️ Volver
        </button>
        {!isDetail && view in TITLES && (
          <div className="view-title">
            {TITLES[view as keyof typeof TITLES].title}
            <small>{TITLES[view as keyof typeof TITLES].hint}</small>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {showSpeed && <SpeedButton />}
          <MuteButton />
        </div>
      </div>

      <div className="hud-bottom">
        {view === 'solar' && (
          <button className="btn btn-accent" onClick={goGalaxy}>
            🌌 Salir a la galaxia
          </button>
        )}
        {view === 'galaxy' && (
          <>
            <button className="btn" onClick={() => openDeepSpace('via-lactea')}>
              📖 Su historia
            </button>
            <button className="btn btn-accent" onClick={goUniverse}>
              ✨ Salir al universo
            </button>
          </>
        )}
        {view === 'universe' && (
          <>
            <button className="btn btn-accent" onClick={goConstellations}>
              ✨ Constelaciones
            </button>
            <button className="btn" onClick={goHome}>
              🏠 Inicio
            </button>
          </>
        )}
        {view === 'dino-island' && <DinoTimeline />}
      </div>
    </div>
  );
}

/** Pantalla de carga de una escena (mientras llega su código). */
function SceneLoader() {
  return (
    <div className="scene-loader">
      <span className="loader-emoji">🚀</span>
      <p>Viajando…</p>
    </div>
  );
}

export default function App() {
  const view = useApp((s) => s.view);

  return (
    <div className="app">
      {view === 'home' && <HomeScreen />}
      {view === 'passport' && <PassportScreen />}
      <Suspense fallback={<SceneLoader />}>
        {view === 'solar' && <SolarSystemScene />}
        {view === 'planet' && <PlanetScene />}
        {view === 'galaxy' && <GalaxyScene />}
        {view === 'universe' && <UniverseScene />}
        {view === 'blackhole' && <BlackHoleScene />}
        {view === 'starlife' && <StarLifeScene />}
        {view === 'constellations' && <ConstellationsScene />}
        {view === 'dino-island' && <DinoIslandScene />}
        {view === 'dino' && <DinoScene />}
        {view === 'body' && <BodyScene />}
        {view === 'organ' && <OrganScene />}
        {view === 'journey' && <JourneyScene />}
        {view === 'ocean' && <OceanScene />}
        {view === 'sea' && <SeaCreatureScene />}
      </Suspense>
      <Hud />
      <DeepSpaceStory />
      <SceneTransition />
      <AmbientAudio />
    </div>
  );
}
