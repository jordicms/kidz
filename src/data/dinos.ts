import type { Fact, StoryPage } from './types';

export type DinoEra = 'Triásico' | 'Jurásico' | 'Cretácico';
export type DinoShape = 'theropod' | 'ceratopsian' | 'sauropod';

export interface Dino {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  era: DinoEra;
  /** Hace cuántos millones de años vivió (aprox.), para la línea del tiempo. */
  livedMya: number;
  diet: 'carnívoro' | 'herbívoro';
  color: string;
  /** Color secundario (vientre, detalles). */
  color2?: string;
  /** Silueta para el modelo procedural si no hay GLB. */
  shape: DinoShape;
  /** Altura y largo reales aproximados en metros (comparación de tamaño). */
  heightM: number;
  lengthM: number;
  scene: {
    /** Escala del modelo en la isla. */
    scale: number;
    /** Paseo en círculo por la isla. */
    path: { radius: number; speed: number; phase?: number };
  };
  /**
   * Si se define, se carga este modelo GLB (rigged + animado) en vez del
   * procedural. Coloca el archivo en `public/models/` y pon aquí la ruta,
   * p. ej. '/models/trex.glb'. Ver public/models/README.md.
   */
  modelUrl?: string;
  facts: Fact[];
  story: StoryPage[];
}

/** Color de cada era para la línea del tiempo. */
export const ERA_COLORS: Record<DinoEra, string> = {
  Triásico: '#c98a4b',
  Jurásico: '#3f9e4d',
  Cretácico: '#d1603d',
};

export const ERAS: { era: DinoEra; range: string }[] = [
  { era: 'Triásico', range: 'hace 252–201 millones de años' },
  { era: 'Jurásico', range: 'hace 201–145 millones de años' },
  { era: 'Cretácico', range: 'hace 145–66 millones de años' },
];

export const DINOS: Dino[] = [
  {
    id: 'trex',
    name: 'Tyrannosaurus Rex',
    emoji: '🦖',
    tagline: 'El rey de los dinosaurios carnívoros',
    era: 'Cretácico',
    livedMya: 68,
    diet: 'carnívoro',
    color: '#6f8a4a',
    color2: '#c7b06a',
    shape: 'theropod',
    heightM: 4,
    lengthM: 12,
    // Para usar un modelo real: descarga un T-Rex CC0 (Quaternius/Poly Pizza),
    // ponlo en public/models/trex.glb y descomenta la línea siguiente:
    // modelUrl: '/models/trex.glb',
    scene: { scale: 0.5, path: { radius: 7, speed: 0.5, phase: 0 } },
    facts: [
      { icon: '🦷', label: 'Dientes', value: 'Hasta 60, ¡del tamaño de un plátano!' },
      { icon: '📏', label: 'Tamaño', value: '12 m de largo y 4 m de alto' },
      { icon: '🏃', label: 'Velocidad', value: 'Corría a unos 20 km/h' },
      { icon: '🦴', label: 'Brazos', value: 'Cortísimos, pero muy fuertes' },
    ],
    story: [
      {
        emoji: '🦖',
        title: '¡Soy el T-Rex!',
        text: 'Mi nombre significa "lagarto rey tirano". Fui uno de los mayores cazadores que han existido. ¡Mi cabeza sola medía más que tú!',
      },
      {
        emoji: '🦷',
        title: 'Una mordida brutal',
        text: 'Mis mandíbulas eran tan fuertes que podían partir huesos. Tenía unos 60 dientes afilados y, si perdía uno, ¡me crecía otro nuevo!',
      },
      {
        emoji: '👃',
        title: 'Súper olfato',
        text: 'Olía la comida desde muy lejos. Mis ojos miraban al frente, como los tuyos, así que calculaba muy bien las distancias para cazar.',
      },
      {
        emoji: '⏳',
        title: 'Hace muchísimo tiempo',
        text: 'Viví al final del Cretácico, hace unos 68 millones de años. ¡Entre tú y yo hay más tiempo que entre yo y el Stegosaurus!',
      },
    ],
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    emoji: '🦏',
    tagline: 'El herbívoro de los tres cuernos',
    era: 'Cretácico',
    livedMya: 67,
    diet: 'herbívoro',
    color: '#7a9b5b',
    color2: '#b88a52',
    shape: 'ceratopsian',
    heightM: 3,
    lengthM: 9,
    scene: { scale: 0.5, path: { radius: 11, speed: -0.35, phase: 2.4 } },
    facts: [
      { icon: '🔱', label: 'Cuernos', value: 'Tres: dos largos y uno en el morro' },
      { icon: '🛡️', label: 'Gola', value: 'Un enorme escudo óseo en la cabeza' },
      { icon: '📏', label: 'Tamaño', value: '9 m de largo, como un autobús' },
      { icon: '🌿', label: 'Comida', value: 'Plantas, ¡muchas plantas!' },
    ],
    story: [
      {
        emoji: '🦏',
        title: '¡Hola, soy Triceratops!',
        text: 'Mi nombre significa "cara con tres cuernos". Era herbívoro: comía plantas todo el día con mi pico, parecido al de un loro gigante.',
      },
      {
        emoji: '🛡️',
        title: 'Mi escudo gigante',
        text: 'Tenía una gola enorme detrás de la cabeza. Me servía para protegerme y, quizás, para presumir y avisar a otros triceratops.',
      },
      {
        emoji: '🔱',
        title: 'Tres cuernos valientes',
        text: 'Con mis tres cuernos podía defenderme hasta del mismísimo T-Rex. ¡No era una presa fácil!',
      },
      {
        emoji: '🌿',
        title: 'Vecino del T-Rex',
        text: 'Viví en la misma época y lugar que el T-Rex, hace unos 67 millones de años. A veces éramos su comida... ¡pero sabíamos plantar cara!',
      },
    ],
  },
];

export function getDino(id: string): Dino | undefined {
  return DINOS.find((d) => d.id === id);
}
