import type { Fact, StoryPage } from './types';

export type OceanZone = 'sol' | 'penumbra' | 'abismo';
export type SeaShape = 'whale' | 'turtle' | 'shark' | 'jelly' | 'octopus' | 'angler';

export interface SeaCreature {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  zone: OceanZone;
  /** Profundidad aproximada a la que se muestra, en metros. */
  depthM: number;
  color: string;
  color2?: string;
  shape: SeaShape;
  /** Escala del modelo y radio/velocidad de nado en círculo. */
  scene: { scale: number; radius: number; speed: number; phase?: number };
  facts: Fact[];
  story: StoryPage[];
}

export const ZONES: { zone: OceanZone; name: string; emoji: string; range: string; color: string }[] = [
  { zone: 'sol', name: 'Zona del sol', emoji: '☀️', range: '0–50 m', color: '#2b86c5' },
  { zone: 'penumbra', name: 'Zona de penumbra', emoji: '🌒', range: '50–100 m', color: '#123a6b' },
  { zone: 'abismo', name: 'El abismo', emoji: '🌑', range: '100 m o más', color: '#040a1a' },
];

export const CREATURES: SeaCreature[] = [
  {
    id: 'tortuga',
    name: 'La Tortuga Marina',
    emoji: '🐢',
    tagline: 'La viajera tranquila de los mares',
    zone: 'sol',
    depthM: 8,
    color: '#3f9e4d',
    color2: '#c8b06a',
    shape: 'turtle',
    scene: { scale: 0.8, radius: 6, speed: 0.35, phase: 0.5 },
    facts: [
      { icon: '🎂', label: 'Vive', value: '¡Hasta 100 años!' },
      { icon: '🗺️', label: 'Viajera', value: 'Cruza océanos enteros nadando' },
      { icon: '🏖️', label: 'Sus huevos', value: 'Los pone en la misma playa donde nació' },
      { icon: '💨', label: 'Respira', value: 'Aire, como tú: sube a la superficie' },
    ],
    story: [
      { emoji: '🐢', title: '¡Hola, soy la tortuga!', text: 'Nado despacito por las aguas cálidas y soleadas. Mi caparazón es mi casa y mi escudo.' },
      { emoji: '🗺️', title: 'Gran viajera', text: 'Puedo cruzar el océano entero sin perderme. ¡Es como si llevara una brújula mágica dentro!' },
      { emoji: '🏖️', title: 'Vuelta a casa', text: 'Cuando soy mamá, vuelvo a poner mis huevos a la misma playa donde nací. Nadie sabe cómo la encuentro.' },
    ],
  },
  {
    id: 'ballena',
    name: 'La Ballena Jorobada',
    emoji: '🐋',
    tagline: 'La cantante gigante del océano',
    zone: 'sol',
    depthM: 22,
    color: '#3a5a8a',
    color2: '#c8d8e8',
    shape: 'whale',
    scene: { scale: 1.6, radius: 9, speed: -0.22, phase: 2.5 },
    facts: [
      { icon: '📏', label: 'Tamaño', value: 'Como un autobús y medio' },
      { icon: '🎵', label: 'Canta', value: 'Sus canciones viajan kilómetros bajo el agua' },
      { icon: '🦐', label: 'Come', value: 'Toneladas de krill diminuto' },
      { icon: '🤸', label: 'Salta', value: '¡Salta fuera del agua entera!' },
    ],
    story: [
      { emoji: '🐋', title: '¡Soy la ballena!', text: 'Soy uno de los animales más grandes que han existido jamás, ¡más que muchos dinosaurios!' },
      { emoji: '🎵', title: 'Mi canción', text: 'Canto canciones larguísimas que viajan por el mar durante kilómetros. Así hablo con otras ballenas.' },
      { emoji: '💨', title: 'No soy un pez', text: 'Soy un mamífero, como tú: respiro aire y por eso subo a soplar mi chorro de agua famoso.' },
    ],
  },
  {
    id: 'tiburon',
    name: 'El Tiburón',
    emoji: '🦈',
    tagline: 'El explorador más antiguo del mar',
    zone: 'sol',
    depthM: 35,
    color: '#6a7d8a',
    color2: '#d8e0e8',
    shape: 'shark',
    scene: { scale: 0.9, radius: 7.5, speed: 0.5, phase: 4.2 },
    facts: [
      { icon: '🦷', label: 'Dientes', value: 'Se le caen y le crecen miles en su vida' },
      { icon: '👃', label: 'Olfato', value: 'Huele una gotita a kilómetros' },
      { icon: '🕰️', label: 'Antiguo', value: '¡Existía antes que los dinosaurios!' },
      { icon: '🏊', label: 'Nada', value: 'Sin parar, incluso mientras descansa' },
    ],
    story: [
      { emoji: '🦈', title: '¡Soy el tiburón!', text: 'Llevo en los mares más de 400 millones de años. ¡Ya nadaba antes de que existieran los dinosaurios!' },
      { emoji: '👃', title: 'Súper sentidos', text: 'Huelo y siento las cosas desde lejísimos. Hasta noto la electricidad de otros animales.' },
      { emoji: '🛡️', title: 'No soy un monstruo', text: 'Aunque tenga fama de fiero, casi nunca molesto a las personas. ¡El océano me necesita para estar sano!' },
    ],
  },
  {
    id: 'medusa',
    name: 'La Medusa',
    emoji: '🪼',
    tagline: 'La bailarina transparente',
    zone: 'penumbra',
    depthM: 60,
    color: '#d18ad1',
    color2: '#8ac0e8',
    shape: 'jelly',
    scene: { scale: 0.7, radius: 5, speed: 0.28, phase: 1.2 },
    facts: [
      { icon: '🧠', label: 'Curiosidad', value: 'No tiene cerebro ni corazón' },
      { icon: '💧', label: 'Su cuerpo', value: 'Es casi todo agua (¡95%!)' },
      { icon: '✨', label: 'Brilla', value: 'Algunas hacen su propia luz' },
      { icon: '🕰️', label: 'Antigua', value: 'Más de 500 millones de años' },
    ],
    story: [
      { emoji: '🪼', title: '¡Soy la medusa!', text: 'Bailo por el mar moviendo mi paraguas de gelatina. Soy casi toda de agua.' },
      { emoji: '🧠', title: 'Sin cerebro', text: 'No tengo cerebro, ni corazón, ni huesos... ¡y aun así llevo 500 millones de años nadando!' },
      { emoji: '✨', title: 'Luz propia', text: 'Algunas de mis primas brillan en la oscuridad, como farolillos del mar.' },
    ],
  },
  {
    id: 'pulpo',
    name: 'El Pulpo',
    emoji: '🐙',
    tagline: 'El genio de los ocho brazos',
    zone: 'penumbra',
    depthM: 80,
    color: '#c0504d',
    color2: '#e8a08a',
    shape: 'octopus',
    scene: { scale: 0.75, radius: 6.5, speed: -0.3, phase: 3.6 },
    facts: [
      { icon: '🫀', label: 'Corazones', value: '¡Tiene tres!' },
      { icon: '🎨', label: 'Camuflaje', value: 'Cambia de color y de textura' },
      { icon: '🧠', label: 'Listo', value: 'Abre frascos y resuelve puzles' },
      { icon: '🖐️', label: 'Brazos', value: 'Ocho, llenos de ventosas que saborean' },
    ],
    story: [
      { emoji: '🐙', title: '¡Soy el pulpo!', text: 'Tengo ocho brazos, tres corazones y la sangre azul. ¡Soy de lo más raro y maravilloso del mar!' },
      { emoji: '🎨', title: 'Maestro del disfraz', text: 'Puedo cambiar de color y de forma en un segundo para esconderme. ¡Ahora me ves, ahora no!' },
      { emoji: '🧠', title: 'Muy listo', text: 'Resuelvo puzles, abro frascos y me escapo por agujeros diminutos. Cada brazo piensa un poquito por su cuenta.' },
    ],
  },
  {
    id: 'rape',
    name: 'El Pez Abisal',
    emoji: '🎣',
    tagline: 'El pescador con farolillo del abismo',
    zone: 'abismo',
    depthM: 120,
    color: '#2a2a3a',
    color2: '#8af0e8',
    shape: 'angler',
    scene: { scale: 0.6, radius: 5, speed: 0.22, phase: 0.8 },
    facts: [
      { icon: '🏮', label: 'Farolillo', value: 'Una luz propia para atraer a sus presas' },
      { icon: '🌑', label: 'Su casa', value: 'La oscuridad total del abismo' },
      { icon: '🦷', label: 'Dientes', value: 'Enormes, como agujas transparentes' },
      { icon: '💪', label: 'Aguanta', value: 'Un frío y una presión tremendos' },
    ],
    story: [
      { emoji: '🎣', title: '¡Soy el rape abisal!', text: 'Vivo donde no llega ni un rayito de sol. Aquí abajo está todo oscuro, muy frío... ¡y es mi hogar!' },
      { emoji: '🏮', title: 'Mi farolillo', text: 'Llevo una lucecita colgando delante de la boca. Los peces curiosos se acercan a mirarla... ¡y ñam!' },
      { emoji: '🌑', title: 'Vida en el abismo', text: 'Aunque parezca imposible, en el fondo del mar vivimos muchos bichos con luces de colores. ¡Es como un cielo estrellado al revés!' },
    ],
  },
  {
    id: 'delfin',
    name: 'El Delfín',
    emoji: '🐬',
    tagline: 'El acróbata más listo del mar',
    zone: 'sol',
    depthM: 12,
    color: '#8fa6b6',
    color2: '#eef4f8',
    shape: 'whale',
    scene: { scale: 0.85, radius: 8, speed: 0.55, phase: 1.8 },
    facts: [
      { icon: '🧠', label: 'Muy listo', value: 'De los animales más inteligentes' },
      { icon: '🔊', label: 'Sonar', value: 'Ve con el oído lanzando chasquidos (ecolocalización)' },
      { icon: '🤸', label: 'Saltarín', value: 'Salta y hace piruetas fuera del agua' },
      { icon: '👨‍👩‍👧', label: 'En grupo', value: 'Vive en familias que se ayudan' },
    ],
    story: [
      { emoji: '🐬', title: '¡Soy el delfín!', text: 'Soy un mamífero muy listo y juguetón. Respiro aire por un agujero en lo alto de mi cabeza.' },
      { emoji: '🔊', title: 'Veo con sonidos', text: 'Lanzo chasquidos que rebotan en las cosas y vuelven a mí. ¡Así "veo" con el oído, incluso en agua turbia!' },
      { emoji: '🤸', title: 'Acróbata', text: 'Me encanta saltar, dar volteretas y nadar junto a los barcos. ¡Vivo en grupo y nos cuidamos entre todos!' },
    ],
  },
  {
    id: 'orca',
    name: 'La Orca',
    emoji: '🐋',
    tagline: 'La cazadora en equipo (¡no es una ballena!)',
    zone: 'sol',
    depthM: 30,
    color: '#1a1c22',
    color2: '#ffffff',
    shape: 'whale',
    scene: { scale: 1.2, radius: 10.5, speed: -0.3, phase: 4.8 },
    facts: [
      { icon: '🐬', label: 'Sorpresa', value: '¡Es el delfín más grande, no una ballena!' },
      { icon: '👨‍👩‍👧‍👦', label: 'Familia', value: 'Vive en manadas mandadas por la abuela' },
      { icon: '🧠', label: 'Estrategia', value: 'Cazan en equipo con trucos que se enseñan' },
      { icon: '⚫', label: 'Colores', value: 'Blanco y negro inconfundible' },
    ],
    story: [
      { emoji: '🐋', title: '¡Soy la orca!', text: 'Aunque me llaman "ballena asesina", en realidad soy el delfín más grande del mundo. ¡Blanca y negra!' },
      { emoji: '👨‍👩‍👧‍👦', title: 'Mi familia', text: 'Vivo toda la vida con mi familia, mandada por la abuela más sabia. Hablamos con sonidos propios de cada grupo.' },
      { emoji: '🧠', title: 'Cazadora lista', text: 'Cazamos en equipo con trucos muy ingeniosos que las mayores enseñan a las crías. ¡Somos muy inteligentes!' },
    ],
  },
];

export function getCreature(id: string): SeaCreature | undefined {
  return CREATURES.find((c) => c.id === id);
}
