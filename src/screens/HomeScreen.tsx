import { useMemo } from 'react';
import { useApp } from '../state/store';

const LOCKED_CHAPTERS = [
  { emoji: '🐳', title: 'El Océano', desc: 'Sumérgete hasta lo más profundo' },
  { emoji: '🫀', title: 'El Cuerpo Humano', desc: 'Un viaje dentro de ti' },
];

export default function HomeScreen() {
  const goSolar = useApp((s) => s.goSolar);
  const goDinoIsland = useApp((s) => s.goDinoIsland);

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
        {LOCKED_CHAPTERS.map((c) => (
          <div className="chapter-card locked" key={c.title}>
            <span className="chapter-emoji">{c.emoji}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="soon">Próximamente</span>
          </div>
        ))}
      </div>
    </div>
  );
}
