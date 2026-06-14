/**
 * Calidad adaptativa: detecta de qué es capaz el dispositivo y expone presets
 * que regulan postprocesado, antialias, resolución y número de partículas.
 *
 * Objetivo: efectos espectaculares en gama alta y de escritorio, pero bajando
 * automáticamente la carga en móviles modestos para mantener la fluidez.
 * Importante para la app nativa (Capacitor): todo sigue siendo WebGL en WebView.
 */

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityPreset {
  tier: QualityTier;
  /** Rango de devicePixelRatio para el <Canvas>. */
  dpr: [number, number];
  antialias: boolean;
  /** Si se monta el pipeline de postprocesado (bloom, vignette...). */
  postprocessing: boolean;
  /** Intensidad del bloom. */
  bloomIntensity: number;
  /** Multiplicador (0–1) aplicado a los conteos de partículas de cada escena. */
  particleScale: number;
  /** Estrellas fugaces de adorno. */
  shootingStars: boolean;
}

export const PRESETS: Record<QualityTier, QualityPreset> = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    antialias: true,
    postprocessing: true,
    bloomIntensity: 1.1,
    particleScale: 1,
    shootingStars: true,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    antialias: true,
    postprocessing: true,
    bloomIntensity: 0.85,
    particleScale: 0.6,
    shootingStars: true,
  },
  low: {
    tier: 'low',
    dpr: [0.75, 1],
    antialias: false,
    postprocessing: false,
    bloomIntensity: 0,
    particleScale: 0.4,
    shootingStars: false,
  },
};

/** El siguiente tier más bajo (para degradar bajo carga). null si ya es el mínimo. */
export function lowerTier(tier: QualityTier): QualityTier | null {
  return tier === 'high' ? 'medium' : tier === 'medium' ? 'low' : null;
}

/** Aplica el multiplicador de partículas y nunca baja de un mínimo legible. */
export function scaleCount(base: number, preset: QualityPreset, min = 0): number {
  return Math.max(min, Math.round(base * preset.particleScale));
}

function overrideFromQuery(): QualityTier | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('q');
  return q === 'high' || q === 'medium' || q === 'low' ? q : null;
}

/** Estima el tier inicial con señales baratas del dispositivo. */
export function detectTier(): QualityTier {
  const forced = overrideFromQuery();
  if (forced) return forced;

  if (typeof navigator === 'undefined') return 'high';

  const cores = navigator.hardwareConcurrency || 4;
  // deviceMemory no existe en todos los navegadores.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const smallScreen =
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 480;

  if (cores <= 4 || mem <= 3) return 'low';

  let tier: QualityTier = cores >= 8 && mem >= 6 ? 'high' : 'medium';
  // Los móviles, aunque tengan muchos núcleos, suelen tener GPU más justa.
  if (coarse && tier === 'high') tier = 'medium';
  if (coarse && smallScreen) tier = 'low';
  return tier;
}

export function detectPreset(): QualityPreset {
  return PRESETS[detectTier()];
}
