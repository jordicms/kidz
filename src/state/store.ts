import { create } from 'zustand';

export type View = 'home' | 'solar' | 'planet' | 'galaxy' | 'universe';

interface AppState {
  view: View;
  /** Cuerpo del sistema solar seleccionado (vista planeta). */
  bodyId: string | null;
  /** Objeto de espacio profundo con su historia abierta. */
  deepSpaceId: string | null;
  /** Multiplicador de velocidad de la simulación. */
  speed: number;
  goHome: () => void;
  goSolar: () => void;
  goGalaxy: () => void;
  goUniverse: () => void;
  openBody: (id: string) => void;
  openDeepSpace: (id: string) => void;
  closeDeepSpace: () => void;
  cycleSpeed: () => void;
}

const SPEEDS = [1, 3, 0];

export const useApp = create<AppState>((set) => ({
  view: 'home',
  bodyId: null,
  deepSpaceId: null,
  speed: 1,
  goHome: () => set({ view: 'home', bodyId: null, deepSpaceId: null }),
  goSolar: () => set({ view: 'solar', bodyId: null, deepSpaceId: null }),
  goGalaxy: () => set({ view: 'galaxy', bodyId: null, deepSpaceId: null }),
  goUniverse: () => set({ view: 'universe', bodyId: null, deepSpaceId: null }),
  openBody: (id) => set({ view: 'planet', bodyId: id }),
  openDeepSpace: (id) => set({ deepSpaceId: id }),
  closeDeepSpace: () => set({ deepSpaceId: null }),
  cycleSpeed: () =>
    set((s) => ({ speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] })),
}));
