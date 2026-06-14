import { useApp } from './state/store';
import HomeScreen from './screens/HomeScreen';
import SolarSystemScene from './scenes/SolarSystemScene';
import PlanetScene from './scenes/PlanetScene';
import GalaxyScene from './scenes/GalaxyScene';
import UniverseScene from './scenes/UniverseScene';
import DeepSpaceStory from './components/ui/DeepSpaceStory';
import SceneTransition from './components/ui/SceneTransition';

const TITLES = {
  solar: { title: '🪐 El Sistema Solar', hint: 'Toca un planeta para conocerlo' },
  galaxy: { title: '🌌 La Vía Láctea', hint: 'Nuestra galaxia, vista desde fuera' },
  universe: { title: '✨ El Universo', hint: 'Toca cada maravilla del cosmos' },
} as const;

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
  const { goHome, goSolar, goGalaxy, goUniverse, openDeepSpace } = useApp();

  if (view === 'home') return null;

  return (
    <div className="hud">
      <div className="hud-top">
        <button
          className="btn"
          onClick={view === 'planet' ? goSolar : view === 'galaxy' ? goSolar : view === 'universe' ? goGalaxy : goHome}
        >
          ⬅️ Volver
        </button>
        {view !== 'planet' && (
          <div className="view-title">
            {TITLES[view].title}
            <small>{TITLES[view].hint}</small>
          </div>
        )}
        {view === 'solar' ? <SpeedButton /> : <span style={{ width: 48 }} />}
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
      <Hud />
      <DeepSpaceStory />
      <SceneTransition />
    </div>
  );
}
