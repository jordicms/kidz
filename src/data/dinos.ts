import type { Fact, StoryPage } from './types';

export type DinoEra = 'Triásico' | 'Jurásico' | 'Cretácico';
export type DinoShape = 'theropod' | 'ceratopsian' | 'sauropod' | 'stegosaur' | 'pterosaur';

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
  /** Vuela (se mueve por el aire en vez de pasear por el suelo). */
  fly?: boolean;
  scene: {
    /** Escala del modelo en la isla. */
    scale: number;
    /** Paseo (o vuelo) en círculo por la isla. */
    path: { radius: number; speed: number; phase?: number; height?: number };
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
    // Para usar un modelo real: pon su URL en src/data/models.manifest.json y
    // ejecuta `npm run models` (se guarda en src/assets/models/trex.glb y se usa
    // automáticamente). Ver src/assets/models/README.md.
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
  {
    id: 'plateosaurus',
    name: 'Plateosaurus',
    emoji: '🦕',
    tagline: 'Uno de los primeros dinosaurios grandes',
    era: 'Triásico',
    livedMya: 215,
    diet: 'herbívoro',
    color: '#8a7b53',
    color2: '#c2b07a',
    shape: 'sauropod',
    heightM: 3,
    lengthM: 8,
    scene: { scale: 0.5, path: { radius: 14, speed: 0.3, phase: 4.0 } },
    facts: [
      { icon: '🕰️', label: 'Época', value: 'Del Triásico, ¡de los más antiguos!' },
      { icon: '🌿', label: 'Comida', value: 'Hojas altas, con su cuello largo' },
      { icon: '✋', label: 'Manos', value: 'Tenía pulgares con una garra grande' },
      { icon: '📏', label: 'Tamaño', value: '8 m de largo' },
    ],
    story: [
      {
        emoji: '🦕',
        title: '¡Soy de los abuelos!',
        text: 'Viví en el Triásico, hace más de 200 millones de años. Fui uno de los primeros dinosaurios grandes que pisaron la Tierra.',
      },
      {
        emoji: '🌿',
        title: 'Comía plantas',
        text: 'Con mi cuello largo alcanzaba las hojas más altas. Tenía pequeños dientes con forma de hoja para cortar las plantas.',
      },
      {
        emoji: '🦶',
        title: '¿A dos patas o a cuatro?',
        text: 'Podía caminar a cuatro patas, pero también levantarme sobre las dos traseras para llegar más alto. ¡Muy práctico!',
      },
      {
        emoji: '✋',
        title: 'Pulgar con garra',
        text: 'En mis manos tenía una garra grande en el pulgar. Quizá la usaba para defenderme o para agarrar ramas.',
      },
    ],
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    emoji: '🦕',
    tagline: 'El gigante de cuello altísimo',
    era: 'Jurásico',
    livedMya: 154,
    diet: 'herbívoro',
    color: '#7d8a5a',
    color2: '#b9c089',
    shape: 'sauropod',
    heightM: 12,
    lengthM: 22,
    scene: { scale: 0.32, path: { radius: 9, speed: 0.18, phase: 1.2 } },
    facts: [
      { icon: '🦒', label: 'Cuello', value: 'Como una jirafa gigante, ¡hasta 12 m de alto!' },
      { icon: '⚖️', label: 'Peso', value: 'Más que 8 elefantes juntos' },
      { icon: '🌳', label: 'Comida', value: 'Cientos de kilos de hojas al día' },
      { icon: '📏', label: 'Tamaño', value: '22 m de largo' },
    ],
    story: [
      {
        emoji: '🦕',
        title: '¡Mira hacia arriba!',
        text: 'Soy Brachiosaurus, uno de los animales más altos que han existido. Mi cuello llegaba tan alto como un edificio de cuatro pisos.',
      },
      {
        emoji: '🌳',
        title: 'Comía sin parar',
        text: 'Para mover mi cuerpo gigante necesitaba comer muchísimo: cientos de kilos de hojas cada día, desde las copas de los árboles.',
      },
      {
        emoji: '🦒',
        title: 'Patas delanteras más largas',
        text: 'Al revés que casi todos: mis patas de delante eran más largas que las de atrás, por eso mi cuerpo subía hacia el cuello.',
      },
      {
        emoji: '🌋',
        title: 'Vivía en el Jurásico',
        text: 'Caminé por la Tierra hace unos 150 millones de años, en el Jurásico, mucho antes que el T-Rex.',
      },
    ],
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    emoji: '🦴',
    tagline: 'El de las placas en la espalda',
    era: 'Jurásico',
    livedMya: 152,
    diet: 'herbívoro',
    color: '#5f7a4a',
    color2: '#c47a3a',
    shape: 'stegosaur',
    heightM: 4,
    lengthM: 9,
    scene: { scale: 0.5, path: { radius: 12, speed: 0.28, phase: 5.5 } },
    facts: [
      { icon: '🛡️', label: 'Placas', value: 'Filas de placas óseas en la espalda' },
      { icon: '🗡️', label: 'Cola', value: '¡Cuatro pinchos para defenderse!' },
      { icon: '🧠', label: 'Curiosidad', value: 'Cerebro pequeño, como una nuez' },
      { icon: '🌿', label: 'Comida', value: 'Plantas bajas' },
    ],
    story: [
      {
        emoji: '🦴',
        title: '¡Soy el de las placas!',
        text: 'Soy Stegosaurus. En mi espalda llevaba grandes placas en forma de cometa. ¡Me hacían inconfundible!',
      },
      {
        emoji: '🌡️',
        title: '¿Para qué servían?',
        text: 'Quizá para presumir, para reconocernos entre nosotros o para controlar mi temperatura, calentándome al sol.',
      },
      {
        emoji: '🗡️',
        title: 'Cola con pinchos',
        text: 'Al final de mi cola tenía cuatro pinchos enormes. Si un depredador se acercaba... ¡le daba un buen coletazo!',
      },
      {
        emoji: '🧠',
        title: 'Cabecita pequeña',
        text: 'Aunque era enorme, mi cabeza y mi cerebro eran pequeñitos. No me hacía falta más para comer plantas tranquilo.',
      },
    ],
  },
  {
    id: 'pteranodon',
    name: 'Pteranodon',
    emoji: '🦅',
    tagline: 'El reptil volador de los cielos',
    era: 'Cretácico',
    livedMya: 86,
    diet: 'carnívoro',
    color: '#9a6b4a',
    color2: '#d8c2a0',
    shape: 'pterosaur',
    heightM: 2,
    lengthM: 7,
    fly: true,
    scene: { scale: 0.5, path: { radius: 9, speed: 0.8, phase: 0.5, height: 9 } },
    facts: [
      { icon: '🪽', label: 'Alas', value: 'Hasta 7 m de punta a punta' },
      { icon: '🐟', label: 'Comida', value: 'Peces que pescaba del mar' },
      { icon: '🦴', label: 'Cresta', value: 'Una cresta larga en la cabeza' },
      { icon: '❗', label: 'Curiosidad', value: 'No era un dinosaurio, ¡era un reptil volador!' },
    ],
    story: [
      {
        emoji: '🦅',
        title: '¡Vuelo por el cielo!',
        text: 'Soy Pteranodon. No era un dinosaurio, sino un reptil volador. Con mis alas enormes planeaba sobre el mar buscando comida.',
      },
      {
        emoji: '🐟',
        title: 'Pescador experto',
        text: 'Volaba bajito sobre el agua y atrapaba peces con mi pico largo y sin dientes. ¡Era como un pelícano gigante!',
      },
      {
        emoji: '🦴',
        title: 'Mi cresta',
        text: 'En la cabeza tenía una cresta larga hacia atrás. Quizá me ayudaba a girar en el aire o a presumir ante otros pteranodones.',
      },
      {
        emoji: '🪶',
        title: 'Huesos huecos',
        text: 'Mis huesos eran huecos y ligeros, como los de los pájaros de hoy. Por eso, aun siendo grande, podía volar.',
      },
    ],
  },
];

export function getDino(id: string): Dino | undefined {
  return DINOS.find((d) => d.id === id);
}
