import { create } from 'zustand';
import {
  PRESETS,
  detectPreset,
  lowerTier,
  type QualityPreset,
} from '../utils/quality';

export type View = 'home' | 'solar' | 'planet' | 'galaxy' | 'universe';

interface AppState {
  view: View;
  /** Cuerpo del sistema solar seleccionado (vista planeta). */
  bodyId: string | null;
  /** Objeto de espacio profundo con su historia abierta. */
  deepSpaceId: string | null;
  /** Multiplicador de velocidad de la simulación. */
  speed: number;
  /** Preset de calidad gráfica actual (regula efectos y partículas). */
  quality: QualityPreset;
  goHome: () => void;
  goSolar: () => void;
  goGalaxy: () => void;
  goUniverse: () => void;
  openBody: (id: string) => void;
  openDeepSpace: (id: string) => void;
  closeDeepSpace: () => void;
  cycleSpeed: () => void;
  setQuality: (q: QualityPreset) => void;
  /** Baja un escalón de calidad si los fps caen (lo llama el PerformanceMonitor). */
  degradeQuality: () => void;
}

const SPEEDS = [1, 3, 0];

export const useApp = create<AppState>((set) => ({
  view: 'home',
  bodyId: null,
  deepSpaceId: null,
  speed: 1,
  quality: detectPreset(),
  goHome: () => set({ view: 'home', bodyId: null, deepSpaceId: null }),
  goSolar: () => set({ view: 'solar', bodyId: null, deepSpaceId: null }),
  goGalaxy: () => set({ view: 'galaxy', bodyId: null, deepSpaceId: null }),
  goUniverse: () => set({ view: 'universe', bodyId: null, deepSpaceId: null }),
  openBody: (id) => set({ view: 'planet', bodyId: id }),
  openDeepSpace: (id) => set({ deepSpaceId: id }),
  closeDeepSpace: () => set({ deepSpaceId: null }),
  cycleSpeed: () =>
    set((s) => ({ speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] })),
  setQuality: (q) => set({ quality: q }),
  degradeQuality: () =>
    set((s) => {
      const next = lowerTier(s.quality.tier);
      return next ? { quality: PRESETS[next] } : {};
    }),
}));
