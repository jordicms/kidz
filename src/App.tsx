import { useApp } from './state/store';
import HomeScreen from './screens/HomeScreen';
import SolarSystemScene from './scenes/SolarSystemScene';
import PlanetScene from './scenes/PlanetScene';
import GalaxyScene from './scenes/GalaxyScene';
import UniverseScene from './scenes/UniverseScene';
import DinoIslandScene from './scenes/DinoIslandScene';
import DinoScene from './scenes/DinoScene';
import BodyScene from './scenes/BodyScene';
import OrganScene from './scenes/OrganScene';
import JourneyScene from './scenes/JourneyScene';
import DeepSpaceStory from './components/ui/DeepSpaceStory';
import SceneTransition from './components/ui/SceneTransition';
import { DINOS, ERA_COLORS, ERAS } from './data/dinos';

const TITLES = {
  solar: { title: '🪐 El Sistema Solar', hint: 'Toca un planeta para conocerlo' },
  galaxy: { title: '🌌 La Vía Láctea', hint: 'Nuestra galaxia, vista desde fuera' },
  universe: { title: '✨ El Universo', hint: 'Toca cada maravilla del cosmos' },
  'dino-island': { title: '🦖 La Isla de los Dinosaurios', hint: 'Toca un dinosaurio para conocerlo' },
  body: { title: '🫀 El Cuerpo Humano', hint: 'Pela las capas y toca un órgano' },
} as const;

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
  const { goHome, goSolar, goGalaxy, goUniverse, goDinoIsland, goBody, openDeepSpace } = useApp();

  if (view === 'home') return null;

  const isDetail = view === 'planet' || view === 'dino' || view === 'organ' || view === 'journey';
  const back =
    view === 'planet' ? goSolar
    : view === 'galaxy' ? goSolar
    : view === 'universe' ? goGalaxy
    : view === 'dino' ? goDinoIsland
    : view === 'organ' ? goBody
    : view === 'journey' ? goBody
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
        {showSpeed ? <SpeedButton /> : <span style={{ width: 48 }} />}
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
          <button className="btn" onClick={goHome}>
            🏠 Inicio
          </button>
        )}
        {view === 'dino-island' && <DinoTimeline />}
      </div>
    </div>
  );
}

export default function App() {
  const view = useApp((s) => s.view);

  return (
    <div className="app">
      {view === 'home' && <HomeScreen />}
      {view === 'solar' && <SolarSystemScene />}
      {view === 'planet' && <PlanetScene />}
      {view === 'galaxy' && <GalaxyScene />}
      {view === 'universe' && <UniverseScene />}
      {view === 'dino-island' && <DinoIslandScene />}
      {view === 'dino' && <DinoScene />}
      {view === 'body' && <BodyScene />}
      {view === 'organ' && <OrganScene />}
      {view === 'journey' && <JourneyScene />}
      <Hud />
      <DeepSpaceStory />
      <SceneTransition />
    </div>
  );
}
