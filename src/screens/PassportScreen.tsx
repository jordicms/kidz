import { useApp } from '../state/store';
import { SUN, PLANETS, DWARF_PLANETS } from '../data/solarSystem';
import { ALL_DEEP_SPACE } from '../data/deepSpace';
import { DINOS } from '../data/dinos';
import { ORGANS, JOURNEYS } from '../data/body';
import { CREATURES } from '../data/ocean';

interface Stamp {
  key: string;
  emoji: string;
  name: string;
}

interface Section {
  title: string;
  stamps: Stamp[];
}

const SECTIONS: Section[] = [
  {
    title: '🪐 El Universo',
    stamps: [
      ...[SUN, ...PLANETS, ...DWARF_PLANETS].map((b) => ({ key: `astro:${b.id}`, emoji: b.emoji, name: b.name })),
      ...ALL_DEEP_SPACE.map((d) => ({ key: `deep:${d.id}`, emoji: d.emoji, name: d.name })),
    ],
  },
  {
    title: '🦖 Los Dinosaurios',
    stamps: DINOS.map((d) => ({ key: `dino:${d.id}`, emoji: d.emoji, name: d.name })),
  },
  {
    title: '🫀 El Cuerpo Humano',
    stamps: [
      ...ORGANS.map((o) => ({ key: `organo:${o.id}`, emoji: o.emoji, name: o.name })),
      ...JOURNEYS.map((j) => ({ key: `viaje:${j.id}`, emoji: j.emoji, name: j.title })),
    ],
  },
  {
    title: '🐳 El Océano',
    stamps: CREATURES.map((c) => ({ key: `mar:${c.id}`, emoji: c.emoji, name: c.name })),
  },
];

/** Pasaporte del explorador: un sello por cada maravilla visitada. */
export default function PassportScreen() {
  const visited = useApp((s) => s.visited);
  const goHome = useApp((s) => s.goHome);

  const total = SECTIONS.reduce((n, s) => n + s.stamps.length, 0);
  const got = SECTIONS.reduce((n, s) => n + s.stamps.filter((st) => visited[st.key]).length, 0);
  const complete = got === total;

  return (
    <div className="home passport">
      <button className="btn passport-back" onClick={goHome}>
        ⬅️ Volver
      </button>
      <h1>🎒 Mi pasaporte</h1>
      <p className="subtitle">
        {complete
          ? '🏆 ¡COMPLETO! Eres una exploradora o explorador de primera.'
          : `Has descubierto ${got} de ${total} maravillas. ¡Sigue explorando!`}
      </p>
      <div className="passport-sections">
        {SECTIONS.map((section) => {
          const count = section.stamps.filter((s) => visited[s.key]).length;
          return (
            <div className="passport-section" key={section.title}>
              <div className="passport-title">
                {section.title}
                <span className="passport-count">
                  {count}/{section.stamps.length}
                </span>
              </div>
              <div className="stamps">
                {section.stamps.map((s) => (
                  <div key={s.key} className={`stamp${visited[s.key] ? ' got' : ''}`} title={s.name}>
                    <span className="stamp-emoji">{s.emoji}</span>
                    <span className="stamp-name">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
