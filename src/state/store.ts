import { create } from 'zustand';
import {
  PRESETS,
  detectPreset,
  lowerTier,
  type QualityPreset,
} from '../utils/quality';
import { setMuted } from '../utils/sound';

export type View =
  | 'home'
  | 'solar'
  | 'planet'
  | 'galaxy'
  | 'universe'
  | 'blackhole'
  | 'starlife'
  | 'constellations'
  | 'dino-island'
  | 'dino'
  | 'dig'
  | 'body'
  | 'organ'
  | 'journey'
  | 'ocean'
  | 'sea'
  | 'passport';

interface AppState {
  view: View;
  /** Cuerpo del sistema solar seleccionado (vista planeta). */
  bodyId: string | null;
  /** Dinosaurio seleccionado (vista ficha). */
  dinoId: string | null;
  /** Órgano del cuerpo humano seleccionado (vista ficha). */
  organId: string | null;
  /** Viaje guiado en curso. */
  journeyId: string | null;
  /** Criatura marina seleccionada (vista ficha). */
  seaId: string | null;
  /** Objeto de espacio profundo con su historia abierta. */
  deepSpaceId: string | null;
  /** Multiplicador de velocidad de la simulación. */
  speed: number;
  /** Preset de calidad gráfica actual (regula efectos y partículas). */
  quality: QualityPreset;
  /** Audio silenciado (persistente). */
  muted: boolean;
  /** Pasaporte del explorador: claves visitadas (persistente). */
  visited: Record<string, true>;
  goHome: () => void;
  goSolar: () => void;
  goGalaxy: () => void;
  goUniverse: () => void;
  goBlackHole: () => void;
  goStarLife: () => void;
  goConstellations: () => void;
  goDinoIsland: () => void;
  goDig: () => void;
  openDino: (id: string) => void;
  goBody: () => void;
  openOrgan: (id: string) => void;
  goJourney: (id: string) => void;
  goOcean: () => void;
  openSea: (id: string) => void;
  goPassport: () => void;
  openBody: (id: string) => void;
  openDeepSpace: (id: string) => void;
  closeDeepSpace: () => void;
  cycleSpeed: () => void;
  toggleMuted: () => void;
  setQuality: (q: QualityPreset) => void;
  /** Baja un escalón de calidad si los fps caen (lo llama el PerformanceMonitor). */
  degradeQuality: () => void;
}

const SPEEDS = [1, 3, 0];

function loadVisited(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem('kidz-visited') || '{}') as Record<string, true>;
  } catch {
    return {};
  }
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem('kidz-muted') === '1';
  } catch {
    return false;
  }
}

/** Añade una clave al pasaporte (y la persiste). */
function visit(current: Record<string, true>, key: string): Record<string, true> {
  if (current[key]) return current;
  const next = { ...current, [key]: true as const };
  try {
    localStorage.setItem('kidz-visited', JSON.stringify(next));
  } catch {
    /* sin almacenamiento */
  }
  return next;
}

const initialMuted = loadMuted();
setMuted(initialMuted);

export const useApp = create<AppState>((set) => ({
  view: 'home',
  bodyId: null,
  dinoId: null,
  organId: null,
  journeyId: null,
  seaId: null,
  deepSpaceId: null,
  speed: 1,
  quality: detectPreset(),
  muted: initialMuted,
  visited: loadVisited(),
  goHome: () =>
    set({ view: 'home', bodyId: null, dinoId: null, organId: null, journeyId: null, seaId: null, deepSpaceId: null }),
  goSolar: () => set({ view: 'solar', bodyId: null, deepSpaceId: null }),
  goGalaxy: () => set({ view: 'galaxy', bodyId: null, deepSpaceId: null }),
  goUniverse: () => set({ view: 'universe', bodyId: null, deepSpaceId: null }),
  goBlackHole: () => set({ view: 'blackhole', deepSpaceId: null }),
  goStarLife: () => set({ view: 'starlife' }),
  goConstellations: () => set({ view: 'constellations' }),
  goDinoIsland: () => set({ view: 'dino-island', dinoId: null, deepSpaceId: null }),
  goDig: () => set({ view: 'dig' }),
  openDino: (id) => set((s) => ({ view: 'dino', dinoId: id, visited: visit(s.visited, `dino:${id}`) })),
  goBody: () => set({ view: 'body', organId: null, journeyId: null, deepSpaceId: null }),
  openOrgan: (id) => set((s) => ({ view: 'organ', organId: id, visited: visit(s.visited, `organo:${id}`) })),
  goJourney: (id) => set((s) => ({ view: 'journey', journeyId: id, visited: visit(s.visited, `viaje:${id}`) })),
  goOcean: () => set({ view: 'ocean', seaId: null, deepSpaceId: null }),
  openSea: (id) => set((s) => ({ view: 'sea', seaId: id, visited: visit(s.visited, `mar:${id}`) })),
  goPassport: () => set({ view: 'passport' }),
  openBody: (id) => set((s) => ({ view: 'planet', bodyId: id, visited: visit(s.visited, `astro:${id}`) })),
  openDeepSpace: (id) => set((s) => ({ deepSpaceId: id, visited: visit(s.visited, `deep:${id}`) })),
  closeDeepSpace: () => set({ deepSpaceId: null }),
  cycleSpeed: () =>
    set((s) => ({ speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] })),
  toggleMuted: () =>
    set((s) => {
      const m = !s.muted;
      try {
        localStorage.setItem('kidz-muted', m ? '1' : '0');
      } catch {
        /* sin almacenamiento */
      }
      setMuted(m);
      return { muted: m };
    }),
  setQuality: (q) => set({ quality: q }),
  degradeQuality: () =>
    set((s) => {
      const next = lowerTier(s.quality.tier);
      return next ? { quality: PRESETS[next] } : {};
    }),
}));
