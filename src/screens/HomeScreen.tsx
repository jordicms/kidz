import { useMemo } from 'react';
import { useApp } from '../state/store';

export default function HomeScreen() {
  const goSolar = useApp((s) => s.goSolar);
  const goDinoIsland = useApp((s) => s.goDinoIsland);
  const goBody = useApp((s) => s.goBody);
  const goOcean = useApp((s) => s.goOcean);
  const goMicro = useApp((s) => s.goMicro);
  const goPassport = useApp((s) => s.goPassport);
  const visited = useApp((s) => s.visited);
  const stamps = Object.keys(visited).length;

  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2.5,
        delay: `${Math.random() * 3}s`,
      })),
    [],
  );

  return (
    <div className="home">
      {stars.map((s) => (
        <span
          key={s.key}
          className="twinkle"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
      <h1>🚀 Kidz Explora</h1>
      <p className="subtitle">Descubre el mundo jugando. ¿Qué quieres explorar hoy?</p>
      <div className="chapters">
        <button className="chapter-card" onClick={goSolar}>
          <span className="chapter-emoji">🪐</span>
          <h3>El Universo</h3>
          <p>Planetas, estrellas, galaxias y agujeros negros</p>
        </button>
        <button className="chapter-card" onClick={goDinoIsland}>
          <span className="chapter-emoji">🦖</span>
          <h3>Los Dinosaurios</h3>
          <p>Viaja millones de años al pasado</p>
        </button>
        <button className="chapter-card" onClick={goBody}>
          <span className="chapter-emoji">🫀</span>
          <h3>El Cuerpo Humano</h3>
          <p>Un viaje dentro de ti</p>
        </button>
        <button className="chapter-card" onClick={goOcean}>
          <span className="chapter-emoji">🐳</span>
          <h3>El Océano</h3>
          <p>Sumérgete hasta lo más profundo</p>
        </button>
        <button className="chapter-card" onClick={goMicro}>
          <span className="chapter-emoji">🔬</span>
          <h3>El Mundo Microscópico</h3>
          <p>Células, bacterias y virus de cerca</p>
        </button>
      </div>
      <button className="btn passport-btn" onClick={goPassport}>
        🎒 Mi pasaporte {stamps > 0 && <span className="passport-badge">{stamps}</span>}
      </button>
    </div>
  );
}
