import { useEffect, useState } from 'react';
import type { StoryPage } from '../../data/types';
import { speak, stopSpeaking } from '../../utils/speech';

interface Props {
  story: StoryPage[];
  /** Identificador para reiniciar el paginado cuando cambia el astro. */
  storyKey: string;
}

/** Páginas del cuento con navegación, puntitos y narración por voz. */
export default function StoryPager({ story, storyKey }: Props) {
  const [page, setPage] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setPage(0);
    setSpeaking(false);
    stopSpeaking();
  }, [storyKey]);

  // Para la voz al desmontar el panel
  useEffect(() => () => stopSpeaking(), []);

  const current = story[Math.min(page, story.length - 1)];

  const toggleVoice = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(`${current.title}. ${current.text}`, () => setSpeaking(false));
      setSpeaking(true);
    }
  };

  const go = (next: number) => {
    stopSpeaking();
    setSpeaking(false);
    setPage(next);
  };

  return (
    <div>
      <div className="story-page">
        <h3>
          <span className="page-emoji">{current.emoji}</span>
          {current.title}
        </h3>
        <p>{current.text}</p>
      </div>
      <div className="story-nav">
        <button className="btn btn-round" onClick={() => go(Math.max(0, page - 1))} disabled={page === 0} aria-label="Anterior">
          ◀
        </button>
        <button className="btn" onClick={toggleVoice} aria-label="Escuchar">
          {speaking ? '⏸️ Parar' : '🔊 Escuchar'}
        </button>
        <div className="story-dots">
          {story.map((_, i) => (
            <span key={i} className={i === page ? 'active' : ''} />
          ))}
        </div>
        <button
          className="btn btn-round btn-accent"
          onClick={() => go(Math.min(story.length - 1, page + 1))}
          disabled={page === story.length - 1}
          aria-label="Siguiente"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
