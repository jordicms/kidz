import type { Fact, StoryPage } from './types';

export type OceanZone = 'sol' | 'penumbra' | 'abismo';
export type SeaShape =
  | 'whale'
  | 'turtle'
  | 'shark'
  | 'jelly'
  | 'octopus'
  | 'angler'
  | 'fish'
  | 'ray'
  | 'seahorse'
  | 'starfish'
  | 'crab'
  | 'eel'
  | 'squid'
  | 'nautilus'
  | 'mola';

/** Dibujo de la piel: se pinta sobre el cuerpo con una textura procedural. */
export type SeaPattern = 'plain' | 'stripes' | 'spots' | 'countershade';

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
  pattern?: SeaPattern;
  /** Emite su propia luz (criaturas bioluminiscentes del abismo). */
  glow?: string;
  /** Proporciones del cuerpo para las formas paramétricas (1 = normal). */
  body?: { long?: number; tall?: number; wide?: number };
  /** Escala del modelo y radio/velocidad de nado en círculo. */
  scene: { scale: number; radius: number; speed: number; phase?: number };
  facts: Fact[];
  story: StoryPage[];
}

/** Un lugar del fondo marino que se puede visitar y tocar. */
export interface OceanPlace {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** Profundidad a la que aparece, en metros. */
  depthM: number;
  color: string;
  facts: Fact[];
  story: StoryPage[];
}

export const ZONES: { zone: OceanZone; name: string; emoji: string; range: string; color: string }[] = [
  { zone: 'sol', name: 'Zona del sol', emoji: '☀️', range: '0–50 m', color: '#2b86c5' },
  { zone: 'penumbra', name: 'Zona de penumbra', emoji: '🌒', range: '50–100 m', color: '#123a6b' },
  { zone: 'abismo', name: 'El abismo', emoji: '🌑', range: '100 m o más', color: '#040a1a' },
];

const BASE: SeaCreature[] = [
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

/* ------------------------------------------------------------------ */
/* Tanda 5: doce criaturas más, de la superficie al abismo             */
/* ------------------------------------------------------------------ */

const MORE: SeaCreature[] = [
  {
    id: 'pez-payaso',
    name: 'El Pez Payaso',
    emoji: '🐠',
    tagline: 'El que vive dentro de una anémona venenosa',
    zone: 'sol',
    depthM: 6,
    color: '#ff7a1a',
    color2: '#fff6e8',
    shape: 'fish',
    pattern: 'stripes',
    body: { tall: 1.35, long: 0.85 },
    scene: { scale: 0.34, radius: 4.5, speed: 0.9, phase: 0.2 },
    facts: [
      { icon: '🏠', label: 'Su casa', value: 'Una anémona que pica... ¡pero a él no!' },
      { icon: '🛡️', label: 'Su truco', value: 'Una capa de moco que lo protege del veneno' },
      { icon: '🤝', label: 'Se ayudan', value: 'Él la limpia y ella lo esconde' },
      { icon: '👨', label: 'Curiosidad', value: 'Todos nacen macho; el jefe se vuelve hembra' },
    ],
    story: [
      { emoji: '🐠', title: '¡Soy el pez payaso!', text: 'Soy naranja con rayas blancas y vivo entre los tentáculos de una anémona, que pica a todo el que se acerca.' },
      { emoji: '🛡️', title: '¿Por qué no me pica?', text: 'Tengo el cuerpo cubierto de una capa de moco especial que engaña a la anémona: cree que soy parte de ella.' },
      { emoji: '🤝', title: 'Buenos vecinos', text: 'Yo le quito la suciedad y le traigo restos de comida; ella me protege de los peces grandes. ¡Los dos ganamos!' },
    ],
  },
  {
    id: 'caballito-de-mar',
    name: 'El Caballito de Mar',
    emoji: '🐴',
    tagline: 'El pez que nada de pie... ¡y es papá!',
    zone: 'sol',
    depthM: 14,
    color: '#e8b04a',
    color2: '#f6dfa0',
    shape: 'seahorse',
    scene: { scale: 0.4, radius: 3.6, speed: 0.3, phase: 2.1 },
    facts: [
      { icon: '👶', label: 'Increíble', value: '¡El papá se queda embarazado!' },
      { icon: '🏊', label: 'Nada', value: 'De pie y despacísimo, es el pez más lento' },
      { icon: '👀', label: 'Ojos', value: 'Cada uno mira a un lado distinto' },
      { icon: '🌾', label: 'Se agarra', value: 'Con la cola, a las algas, para no irse con la corriente' },
    ],
    story: [
      { emoji: '🐴', title: '¡Soy el caballito de mar!', text: 'Soy un pez, aunque no lo parezca: nado de pie, muy despacito, moviendo una aletita de la espalda.' },
      { emoji: '👶', title: 'Papá embarazado', text: 'La mamá pone los huevos en una bolsa que tengo en la barriga, y soy YO quien los lleva hasta que nacen. ¡Cientos de bebés!' },
      { emoji: '🌾', title: 'Me agarro fuerte', text: 'Con mi cola enrollada me sujeto a las algas para que la corriente no me arrastre. Y cambio de color para esconderme.' },
    ],
  },
  {
    id: 'mantarraya',
    name: 'La Manta',
    emoji: '🪁',
    tagline: 'La cometa gigante que vuela bajo el agua',
    zone: 'sol',
    depthM: 26,
    color: '#2a3a52',
    color2: '#eef4f8',
    shape: 'ray',
    pattern: 'countershade',
    scene: { scale: 1.15, radius: 8.5, speed: 0.4, phase: 3.1 },
    facts: [
      { icon: '📏', label: 'Envergadura', value: '¡Hasta 7 metros de ala a ala!' },
      { icon: '🦐', label: 'Come', value: 'Plancton diminuto, filtrando agua' },
      { icon: '🧠', label: 'Lista', value: 'Tiene el cerebro más grande de los peces' },
      { icon: '🤸', label: 'Salta', value: 'Da saltos enormes fuera del agua' },
    ],
    story: [
      { emoji: '🪁', title: '¡Soy la manta!', text: 'Parezco una cometa gigante. Muevo mis "alas" despacio y planeo por el agua como un pájaro por el aire.' },
      { emoji: '🦐', title: 'Comer nadando', text: 'Abro mi boca enorme y filtro el agua para quedarme con el plancton. ¡Aunque soy gigantesca, como cosas minúsculas!' },
      { emoji: '🧠', title: 'Muy inteligente', text: 'Tengo el cerebro más grande de todos los peces. Puedo reconocerme en un espejo y me acuerdo de los sitios.' },
    ],
  },
  {
    id: 'tiburon-ballena',
    name: 'El Tiburón Ballena',
    emoji: '🦈',
    tagline: 'El pez más grande del mundo (¡y es bueno!)',
    zone: 'sol',
    depthM: 18,
    color: '#40566e',
    color2: '#eaf2f8',
    shape: 'shark',
    pattern: 'spots',
    body: { long: 1.25 },
    scene: { scale: 1.6, radius: 11, speed: -0.22, phase: 5.2 },
    facts: [
      { icon: '📏', label: 'Tamaño', value: '¡Hasta 18 m, como un autobús doble!' },
      { icon: '🦐', label: 'Come', value: 'Plancton y peces pequeñitos' },
      { icon: '⭐', label: 'Sus manchas', value: 'Únicas en cada uno, como tus huellas' },
      { icon: '😌', label: 'Carácter', value: 'Tranquilísimo, no es peligroso' },
    ],
    story: [
      { emoji: '🦈', title: '¡Soy el pez más grande!', text: 'Soy un tiburón, pero del tamaño de un autobús doble. Y aun así soy de lo más pacífico.' },
      { emoji: '🦐', title: 'Boca gigante, comida diminuta', text: 'Nado con la boca abierta filtrando agua para comer plancton. ¡Mis dientes son diminutos y no me sirven para morder!' },
      { emoji: '⭐', title: 'Mis lunares', text: 'Mi lomo está cubierto de manchitas blancas colocadas de un modo único: sirven para identificarme, como tus huellas.' },
    ],
  },
  {
    id: 'estrella-de-mar',
    name: 'La Estrella de Mar',
    emoji: '⭐',
    tagline: 'La que camina con cientos de piecitos',
    zone: 'sol',
    depthM: 32,
    color: '#ff7043',
    color2: '#ffb08a',
    shape: 'starfish',
    scene: { scale: 0.55, radius: 5.2, speed: 0.14, phase: 1.4 },
    facts: [
      { icon: '🦶', label: 'Se mueve', value: 'Con cientos de piecitos con ventosa' },
      { icon: '🔄', label: 'Poder', value: '¡Si pierde un brazo, le crece otro!' },
      { icon: '🫀', label: 'Curiosidad', value: 'No tiene cerebro ni sangre' },
      { icon: '🍽️', label: 'Come', value: 'Saca el estómago por la boca. ¡De verdad!' },
    ],
    story: [
      { emoji: '⭐', title: '¡Soy la estrella de mar!', text: 'Tengo cinco brazos y, por debajo, cientos de piecitos con ventosa con los que camino muy despacio por las rocas.' },
      { emoji: '🔄', title: 'Me regenero', text: 'Si un depredador me arranca un brazo, me vuelve a crecer. Algunas de mis primas pueden rehacerse a partir de un solo brazo.' },
      { emoji: '🍽️', title: 'Como al revés', text: 'Para comerme un mejillón lo abro un poquito y saco mi estómago hacia fuera para digerirlo. ¡Ni cerebro ni sangre necesito!' },
    ],
  },
  {
    id: 'cangrejo',
    name: 'El Cangrejo Ermitaño',
    emoji: '🦀',
    tagline: 'El que se muda de casa cuando crece',
    zone: 'sol',
    depthM: 38,
    color: '#c0503a',
    color2: '#e8d0a8',
    shape: 'crab',
    scene: { scale: 0.42, radius: 4.8, speed: 0.22, phase: 4.4 },
    facts: [
      { icon: '🐚', label: 'Su casa', value: 'Una concha vacía que encuentra' },
      { icon: '📦', label: 'Se muda', value: 'A una concha mayor cuando ya no cabe' },
      { icon: '🦵', label: 'Patas', value: 'Diez, y dos son pinzas' },
      { icon: '👀', label: 'Ojos', value: 'En dos palitos, para mirar alrededor' },
    ],
    story: [
      { emoji: '🦀', title: '¡Soy el cangrejo ermitaño!', text: 'Mi barriga es blandita, así que vivo dentro de una concha vacía que llevo a cuestas como una casa portátil.' },
      { emoji: '📦', title: 'Cambio de casa', text: 'Cuando crezco, la concha se me queda pequeña y busco otra mayor. ¡A veces hacemos fila para intercambiarlas!' },
      { emoji: '🧹', title: 'Limpiador del mar', text: 'Como restos de comida del fondo, así que ayudo a mantener el mar limpio.' },
    ],
  },
  {
    id: 'morena',
    name: 'La Morena',
    emoji: '🐍',
    tagline: 'La serpiente marina que vive en una cueva',
    zone: 'penumbra',
    depthM: 55,
    color: '#5a6a3a',
    color2: '#c8c078',
    shape: 'eel',
    pattern: 'spots',
    scene: { scale: 0.85, radius: 5.6, speed: 0.34, phase: 0.9 },
    facts: [
      { icon: '🕳️', label: 'Vive en', value: 'Grietas y cuevas de las rocas' },
      { icon: '🦷', label: 'Dientes', value: 'Tiene DOS mandíbulas, una dentro' },
      { icon: '👃', label: 'Caza', value: 'Con el olfato, casi no ve' },
      { icon: '🤝', label: 'Curiosidad', value: 'A veces caza en equipo con el mero' },
    ],
    story: [
      { emoji: '🐍', title: '¡Soy la morena!', text: 'Soy un pez muy largo, como una serpiente. Vivo escondida en una grieta y solo saco la cabeza.' },
      { emoji: '🦷', title: 'Dos mandíbulas', text: 'Tengo unas segundas mandíbulas dentro de la garganta que salen hacia delante para atrapar la comida y tragarla.' },
      { emoji: '💨', title: 'Siempre con la boca abierta', text: 'No es que esté enfadada: abro y cierro la boca para respirar, porque así paso el agua por mis branquias.' },
    ],
  },
  {
    id: 'pez-linterna',
    name: 'El Pez Linterna',
    emoji: '🏮',
    tagline: 'El pez más abundante del planeta',
    zone: 'penumbra',
    depthM: 72,
    color: '#2a3a4a',
    color2: '#9fe8ff',
    shape: 'fish',
    pattern: 'plain',
    glow: '#8ff0ff',
    body: { long: 0.9 },
    scene: { scale: 0.3, radius: 6.2, speed: 0.7, phase: 2.7 },
    facts: [
      { icon: '💡', label: 'Sus luces', value: 'Filas de puntitos que brillan en su cuerpo' },
      { icon: '🔢', label: 'Cuántos', value: 'Son los peces más numerosos del mundo' },
      { icon: '🌙', label: 'Su viaje', value: 'Cada noche sube a comer y al alba baja' },
      { icon: '🐋', label: 'Importante', value: 'Alimenta a ballenas, atunes y calamares' },
    ],
    story: [
      { emoji: '🏮', title: '¡Soy el pez linterna!', text: 'Soy pequeñito y llevo filas de lucecitas azules por el cuerpo. Somos los peces más abundantes de todo el planeta.' },
      { emoji: '🌙', title: 'El viaje de cada noche', text: 'Cuando se hace de noche subimos todos a comer cerca de la superficie, y al amanecer volvemos a la penumbra. ¡Es la mayor migración de la Tierra!' },
      { emoji: '💡', title: '¿Para qué la luz?', text: 'Mis luces me sirven para reconocer a los míos y para camuflarme: si brillo igual que el agua de arriba, desde abajo no me ven.' },
    ],
  },
  {
    id: 'nautilus',
    name: 'El Nautilus',
    emoji: '🐚',
    tagline: 'Un fósil vivo con concha de caracol',
    zone: 'penumbra',
    depthM: 90,
    color: '#f0e0c0',
    color2: '#b0603a',
    shape: 'nautilus',
    pattern: 'stripes',
    scene: { scale: 0.6, radius: 5, speed: -0.26, phase: 3.8 },
    facts: [
      { icon: '🕰️', label: 'Antigüedad', value: '¡Casi igual desde hace 500 millones de años!' },
      { icon: '🐚', label: 'Su concha', value: 'Con cámaras de gas: sube y baja como un submarino' },
      { icon: '🖐️', label: 'Tentáculos', value: '¡Hasta noventa!' },
      { icon: '👁️', label: 'Ojos', value: 'Sin cristalino, ve como por un agujerito' },
    ],
    story: [
      { emoji: '🐚', title: '¡Soy el nautilus!', text: 'Soy primo del pulpo y del calamar, pero yo llevo una concha en espiral preciosa. Soy un fósil vivo.' },
      { emoji: '🎈', title: 'Mi submarino', text: 'Mi concha tiene cámaras que lleno de gas o de agua para subir y bajar sin esfuerzo, igual que un submarino de verdad.' },
      { emoji: '🕰️', title: 'Casi no he cambiado', text: 'Mis abuelos nadaban por aquí antes de los dinosaurios y era casi igual que yo. ¡Me ha ido bien así!' },
    ],
  },
  {
    id: 'pez-luna',
    name: 'El Pez Luna',
    emoji: '🌕',
    tagline: 'Una cabeza gigante que nada sola',
    zone: 'penumbra',
    depthM: 66,
    color: '#8a97a8',
    color2: '#dfe8ef',
    shape: 'mola',
    pattern: 'countershade',
    scene: { scale: 1.2, radius: 7.8, speed: 0.2, phase: 1.7 },
    facts: [
      { icon: '⚖️', label: 'Peso', value: 'Hasta 2 toneladas: el pez con huesos más pesado' },
      { icon: '🥚', label: 'Huevos', value: '¡300 millones de una vez!' },
      { icon: '🪼', label: 'Come', value: 'Sobre todo medusas' },
      { icon: '☀️', label: 'Curiosidad', value: 'Se tumba de lado en la superficie a tomar el sol' },
    ],
    story: [
      { emoji: '🌕', title: '¡Soy el pez luna!', text: 'Parezco una cabeza enorme y plana a la que se le olvidó el resto del cuerpo. Soy el pez con huesos más pesado del mundo.' },
      { emoji: '🪼', title: 'Comemedusas', text: 'Me paso el día comiendo medusas, que son casi todo agua. ¡Tengo que comer muchísimas para llenarme!' },
      { emoji: '☀️', title: 'Tomando el sol', text: 'A veces subo y me tumbo de lado en la superficie. Así me calienta el sol y los pájaros me quitan los bichitos de la piel.' },
    ],
  },
  {
    id: 'calamar-gigante',
    name: 'El Calamar Gigante',
    emoji: '🦑',
    tagline: 'El monstruo de ojos enormes del abismo',
    zone: 'abismo',
    depthM: 115,
    color: '#b0483a',
    color2: '#e8a890',
    shape: 'squid',
    scene: { scale: 1.3, radius: 6.8, speed: 0.3, phase: 5.6 },
    facts: [
      { icon: '👁️', label: 'Ojos', value: 'Los mayores del reino animal: ¡como un plato!' },
      { icon: '📏', label: 'Tamaño', value: 'Hasta 13 m con los tentáculos' },
      { icon: '🐋', label: 'Su enemigo', value: 'El cachalote, que baja a cazarlo' },
      { icon: '📷', label: 'Curiosidad', value: 'Hasta 2004 nadie lo había fotografiado vivo' },
    ],
    story: [
      { emoji: '🦑', title: '¡Soy el calamar gigante!', text: 'Vivo en la oscuridad del fondo y soy tan grande y tan raro que los marineros contaban leyendas de monstruos sobre mí.' },
      { emoji: '👁️', title: 'Mis ojazos', text: 'Tengo los ojos más grandes de todo el reino animal, como un plato de comer. Así aprovecho la poquísima luz que hay aquí abajo.' },
      { emoji: '🐋', title: 'Peleas de titanes', text: 'Los cachalotes bajan a cazarme y a veces salen con marcas de mis ventosas en la piel. ¡Nos defendemos bien!' },
    ],
  },
  {
    id: 'pulpo-dumbo',
    name: 'El Pulpo Dumbo',
    emoji: '🐘',
    tagline: 'El pulpo con orejas de elefante',
    zone: 'abismo',
    depthM: 132,
    color: '#e88a9a',
    color2: '#ffd0d8',
    shape: 'octopus',
    glow: '#ffb0c0',
    scene: { scale: 0.7, radius: 4.4, speed: 0.2, phase: 2.3 },
    facts: [
      { icon: '👂', label: 'Sus "orejas"', value: 'Dos aletas con las que aletea para nadar' },
      { icon: '🕳️', label: 'Profundidad', value: 'De los pulpos que viven más hondo' },
      { icon: '🍽️', label: 'Come', value: 'Se traga las presas de un bocado, enteras' },
      { icon: '🎈', label: 'Curiosidad', value: 'Es blandito y gelatinoso por la presión' },
    ],
    story: [
      { emoji: '🐘', title: '¡Soy el pulpo dumbo!', text: 'Me llaman así por las dos aletas que tengo sobre la cabeza: parecen las orejas del elefantito Dumbo.' },
      { emoji: '🏊', title: 'Vuelo por el agua', text: 'En vez de impulsarme como otros pulpos, aleteo con mis "orejas" y planeo despacito por el fondo del abismo.' },
      { emoji: '🕳️', title: 'Muy, muy hondo', text: 'Vivo más hondo que casi cualquier otro pulpo, donde la presión aplastaría un coche. Mi cuerpo es gelatinoso para aguantarla.' },
    ],
  },
];

export const CREATURES: SeaCreature[] = [...BASE, ...MORE];

/* ------------------------------------------------------------------ */
/* Lugares del océano: se tocan y cuentan su historia                  */
/* ------------------------------------------------------------------ */

export const OCEAN_PLACES: OceanPlace[] = [
  {
    id: 'arrecife',
    name: 'El Arrecife de Coral',
    emoji: '🪸',
    tagline: 'La ciudad más animada del mar',
    depthM: 42,
    color: '#ff7ab0',
    facts: [
      { icon: '🐠', label: 'Vecinos', value: 'Un cuarto de toda la vida marina vive aquí' },
      { icon: '🐛', label: '¿Es una planta?', value: '¡No! Son millones de animalitos diminutos' },
      { icon: '🏗️', label: 'Su casa', value: 'Se construyen un esqueleto de piedra' },
      { icon: '🌡️', label: 'Cuidado', value: 'Si el agua se calienta, el coral se pone blanco' },
    ],
    story: [
      { emoji: '🪸', title: '¡Bienvenido al arrecife!', text: 'Esto parece una ciudad llena de color y de movimiento. Aunque el coral parece una roca o una planta, ¡en realidad son animales!' },
      { emoji: '🐛', title: 'Millones de bichitos', text: 'Cada coral está hecho de miles de animalitos diminutos, los pólipos, que construyen un esqueleto de piedra donde vivir todos juntos.' },
      { emoji: '🐠', title: 'La ciudad del mar', text: 'Aunque los arrecifes ocupan poquísimo espacio en el mar, en ellos vive una de cada cuatro criaturas marinas. Por eso hay que cuidarlos.' },
    ],
  },
  {
    id: 'kelp',
    name: 'El Bosque de Kelp',
    emoji: '🌿',
    tagline: 'Un bosque de algas gigantes bajo el agua',
    depthM: 24,
    color: '#4faf6a',
    facts: [
      { icon: '📏', label: 'Altura', value: 'Las algas llegan a 45 m, como un edificio' },
      { icon: '🚀', label: 'Crecen', value: '¡Hasta medio metro al día!' },
      { icon: '🦦', label: 'Habitante', value: 'La nutria marina, que se enrolla para dormir' },
      { icon: '🫁', label: 'Regalan', value: 'Oxígeno y refugio a miles de animales' },
    ],
    story: [
      { emoji: '🌿', title: '¡Un bosque en el mar!', text: 'Estas algas gigantes se agarran a las rocas del fondo y suben hasta la superficie, formando un bosque por el que se puede nadar.' },
      { emoji: '🚀', title: 'Crecen a toda prisa', text: 'El kelp es uno de los seres vivos que crece más rápido: puede estirarse medio metro en un solo día. ¡Casi se ve crecer!' },
      { emoji: '🦦', title: 'Quien vive aquí', text: 'Peces, erizos, cangrejos y las nutrias marinas, que se enrollan una hoja alrededor del cuerpo para dormir sin que la corriente las lleve.' },
    ],
  },
  {
    id: 'pecio',
    name: 'El Barco Hundido',
    emoji: '🚢',
    tagline: 'Un naufragio convertido en hogar',
    depthM: 96,
    color: '#c8a060',
    facts: [
      { icon: '🐙', label: 'Quién vive', value: 'Pulpos, morenas y bancos de peces' },
      { icon: '🪸', label: 'Se convierte en', value: 'Un arrecife artificial lleno de coral' },
      { icon: '🏺', label: 'Tesoros', value: 'Los arqueólogos estudian lo que se hundió' },
      { icon: '⏳', label: 'Tiempo', value: 'En pocos años se cubre de vida' },
    ],
    story: [
      { emoji: '🚢', title: 'Un barco en el fondo', text: 'Hace mucho este barco se hundió. Ahora descansa aquí abajo, cubierto de algas, y se ha convertido en algo mucho más bonito.' },
      { emoji: '🪸', title: 'El mar lo adopta', text: 'Los corales se pegan al casco, las algas crecen en la cubierta y los pulpos y las morenas se meten en los agujeros. ¡El barco es ahora un arrecife!' },
      { emoji: '🏺', title: 'Una cápsula del tiempo', text: 'Los arqueólogos bucean hasta aquí para estudiar lo que llevaba el barco. Cada naufragio cuenta cómo vivía la gente de aquella época.' },
    ],
  },
  {
    id: 'fumarolas',
    name: 'Las Fumarolas Negras',
    emoji: '🌋',
    tagline: 'Volcanes del fondo donde la vida no necesita sol',
    depthM: 138,
    color: '#ff7a2a',
    facts: [
      { icon: '🌡️', label: 'Temperatura', value: 'El agua sale a más de 350 °C' },
      { icon: '☀️', label: 'Sin sol', value: 'Aquí la vida se alimenta de química, no de luz' },
      { icon: '🪱', label: 'Habitantes', value: 'Gusanos de tubo gigantes y cangrejos blancos' },
      { icon: '🔬', label: 'Curiosidad', value: 'Quizá la vida en la Tierra empezó aquí' },
    ],
    story: [
      { emoji: '🌋', title: '¡Volcanes en el fondo!', text: 'Estas chimeneas escupen agua tan caliente que saldría humo negro. Están en las grietas donde el suelo del mar se abre.' },
      { emoji: '☀️', title: 'Vida sin sol', text: 'Aquí abajo no llega ni un rayo de luz, así que las plantas no pueden vivir. Y sin embargo hay bichos por todas partes: se alimentan de los minerales del agua caliente.' },
      { emoji: '🔬', title: '¿Empezó todo aquí?', text: 'Muchos científicos creen que la primera vida de la Tierra nació justo en un sitio como este, hace miles de millones de años.' },
    ],
  },
];

export function getPlace(id: string): OceanPlace | undefined {
  return OCEAN_PLACES.find((p) => p.id === id);
}

export function getCreature(id: string): SeaCreature | undefined {
  return CREATURES.find((c) => c.id === id);
}
