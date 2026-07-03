import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/store';
import { playWhoosh } from '../../utils/sound';

/**
 * Destello tipo "salto al hiperespacio" al cambiar de vista. Es CSS puro
 * (coste mínimo) y da continuidad cinematográfica entre escenas.
 */
export default function SceneTransition() {
  const view = useApp((s) => s.view);
  const prev = useRef(view);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prev.current === view) return;
    prev.current = view;
    playWhoosh();
    setActive(false);
    // Reinicia la animación aunque se encadenen cambios rápidos.
    const raf = requestAnimationFrame(() => setActive(true));
    const done = setTimeout(() => setActive(false), 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [view]);

  return <div className={`scene-transition${active ? ' active' : ''}`} aria-hidden="true" />;
}
