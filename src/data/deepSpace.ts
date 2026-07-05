import type { DeepSpaceObject } from './types';

/** El agujero negro del centro de nuestra galaxia (vista Galaxia). */
export const SAGITTARIUS_A: DeepSpaceObject = {
  id: 'sagitario-a',
  name: 'Sagitario A*',
  emoji: '🕳️',
  kind: 'agujero negro',
  tagline: 'El agujero negro gigante del centro de nuestra galaxia',
  color: '#ff8c42',
  facts: [
    { icon: '⚖️', label: 'Peso', value: 'Como 4 millones de soles juntos' },
    { icon: '📍', label: 'Dónde está', value: 'En el centro de la Vía Láctea' },
    { icon: '📸', label: 'Famoso', value: 'Le hicieron su primera foto en 2022' },
    { icon: '😌', label: 'Tranquilo', value: 'Está lejísimos: no puede hacernos nada' },
  ],
  story: [
    {
      emoji: '🕳️',
      title: 'El gran tragón',
      text: 'Soy Sagitario A*, un agujero negro supermasivo. Vivo en el mismísimo centro de la Vía Láctea y peso tanto como 4 millones de soles.',
    },
    {
      emoji: '🧲',
      title: '¿Qué es un agujero negro?',
      text: 'Soy un lugar donde la gravedad es tan fuerte que nada puede escapar de mí, ¡ni siquiera la luz! Por eso me veo negro, como un agujero en el espacio.',
    },
    {
      emoji: '🍩',
      title: 'Mi rosquilla brillante',
      text: 'El gas que cae hacia mí gira a toda velocidad y se calienta tanto que brilla, formando un anillo de luz a mi alrededor. ¡Parece una rosquilla de fuego!',
    },
    {
      emoji: '💃',
      title: 'Todos bailan conmigo',
      text: 'Las 200.000 millones de estrellas de la galaxia, incluido vuestro Sol, giran alrededor del centro donde yo vivo. ¡Soy el centro de la pista de baile!',
    },
    {
      emoji: '😴',
      title: 'No te preocupes',
      text: 'Aunque suene aterrador, estoy a 26.000 años luz de la Tierra. Los agujeros negros no vamos por ahí "aspirando" cosas: solo atrapamos lo que se acerca demasiado.',
    },
  ],
};

/** La Vía Láctea como objeto con historia (vista Galaxia). */
export const MILKY_WAY: DeepSpaceObject = {
  id: 'via-lactea',
  name: 'La Vía Láctea',
  emoji: '🌌',
  kind: 'galaxia',
  tagline: 'Nuestra ciudad de estrellas',
  color: '#a78bfa',
  facts: [
    { icon: '⭐', label: 'Estrellas', value: 'Unas 200.000 millones' },
    { icon: '📏', label: 'Tamaño', value: '100.000 años luz de punta a punta' },
    { icon: '🌀', label: 'Forma', value: 'Espiral con brazos gigantes' },
    { icon: '📍', label: 'Nosotros', value: 'Vivimos en el brazo de Orión' },
  ],
  story: [
    {
      emoji: '🌌',
      title: 'Tu ciudad de estrellas',
      text: 'Soy la Vía Láctea, la galaxia donde vives. Soy una espiral gigante con unos 200.000 millones de estrellas. ¡Tu Sol es solo una de ellas!',
    },
    {
      emoji: '🥛',
      title: '¿Por qué me llamo así?',
      text: 'Los antiguos griegos veían una franja blanca cruzando el cielo de noche y pensaron que parecía un camino de leche derramada. "Vía Láctea" significa "camino de leche".',
    },
    {
      emoji: '📍',
      title: '¿Dónde estás tú?',
      text: 'El Sol y la Tierra vivís en uno de mis brazos espirales, el brazo de Orión, a mitad de camino entre mi centro y mi borde. ¡Busca el puntito amarillo!',
    },
    {
      emoji: '🎠',
      title: 'Un tiovivo gigante',
      text: 'Todo en mí gira alrededor del centro. El Sol viaja a 800.000 km por hora y aun así tarda 230 millones de años en dar una vuelta completa. ¡Menudo tiovivo!',
    },
  ],
};

/** Objetos de la vista Universo. */
export const UNIVERSE_OBJECTS: DeepSpaceObject[] = [
  {
    id: 'andromeda',
    name: 'Galaxia de Andrómeda',
    emoji: '🌀',
    kind: 'galaxia',
    tagline: 'Nuestra vecina gigante',
    color: '#7fb3ff',
    facts: [
      { icon: '⭐', label: 'Estrellas', value: '¡Un billón! 5 veces más que nosotros' },
      { icon: '📏', label: 'Distancia', value: '2,5 millones de años luz' },
      { icon: '👀', label: 'A simple vista', value: 'Lo más lejano que puedes ver sin telescopio' },
    ],
    story: [
      {
        emoji: '👋',
        title: 'Tu vecina del cosmos',
        text: 'Soy Andrómeda, la galaxia grande más cercana a la Vía Láctea. Soy una espiral como vuestra galaxia, ¡pero con muchas más estrellas: un billón!',
      },
      {
        emoji: '👀',
        title: 'Puedes verme',
        text: 'En una noche muy oscura y sin luna puedes verme a simple vista, como una manchita borrosa. Mi luz tarda 2,5 millones de años en llegar a tus ojos: me ves como era hace 2,5 millones de años.',
      },
      {
        emoji: '💥',
        title: 'Un abrazo de galaxias',
        text: 'Dentro de unos 4.500 millones de años, la Vía Láctea y yo nos fusionaremos en una galaxia nueva y gigante. No te preocupes: las estrellas están tan separadas que casi ninguna chocará.',
      },
    ],
  },
  {
    id: 'orion',
    name: 'Nebulosa de Orión',
    emoji: '☁️',
    kind: 'nebulosa',
    tagline: 'Una guardería de estrellas',
    color: '#ff6ec7',
    facts: [
      { icon: '👶', label: 'Qué es', value: 'Un lugar donde nacen estrellas nuevas' },
      { icon: '📏', label: 'Distancia', value: '1.350 años luz' },
      { icon: '🔭', label: 'Dónde verla', value: 'En la "espada" de la constelación de Orión' },
    ],
    story: [
      {
        emoji: '👶',
        title: 'La guardería de estrellas',
        text: 'Soy la Nebulosa de Orión, una nube gigante de gas y polvo de colores. ¿Sabes qué pasa dentro de mí? ¡Nacen estrellas nuevas!',
      },
      {
        emoji: '🥚',
        title: 'Cómo nace una estrella',
        text: 'Cuando una parte de mi gas se junta y se aprieta mucho, se calienta más y más... hasta que ¡fum!, se enciende y nace una estrella bebé. Dentro de mí hay miles naciendo ahora mismo.',
      },
      {
        emoji: '🎨',
        title: 'Mis colores',
        text: 'Las estrellas jóvenes y calientes iluminan mi gas y lo hacen brillar de color rosa, rojo y violeta. Soy una de las nubes más fotografiadas por los telescopios.',
      },
      {
        emoji: '☀️',
        title: 'El Sol también fue bebé',
        text: 'Hace 4.600 millones de años, vuestro Sol nació en una nube como yo. ¡Todas las estrellas que ves de noche nacieron en nebulosas!',
      },
    ],
  },
  {
    id: 'cangrejo',
    name: 'Nebulosa del Cangrejo',
    emoji: '💥',
    kind: 'nebulosa',
    tagline: 'Los restos de una estrella que explotó',
    color: '#ffa94d',
    facts: [
      { icon: '💥', label: 'Origen', value: 'Una supernova vista en el año 1054' },
      { icon: '📜', label: 'Historia', value: 'Astrónomos chinos la vieron brillar de día' },
      { icon: '🌀', label: 'Dentro', value: 'Esconde un púlsar que gira 30 veces por segundo' },
    ],
    story: [
      {
        emoji: '💥',
        title: '¡Bum! Una supernova',
        text: 'Soy lo que queda de una estrella gigante que explotó. La explosión se llama supernova, y es de las cosas más potentes del universo.',
      },
      {
        emoji: '📜',
        title: 'Una historia de hace 1.000 años',
        text: 'En el año 1054, astrónomos de China vieron aparecer una "estrella nueva" tan brillante que se veía de día. ¡Era mi explosión! Sus apuntes nos ayudaron a estudiarla.',
      },
      {
        emoji: '♻️',
        title: 'Polvo de estrellas',
        text: 'Las supernovas esparcen por el espacio los ingredientes para hacer planetas y seres vivos. El hierro de tu sangre y el calcio de tus huesos se hicieron dentro de estrellas que explotaron. ¡Eres polvo de estrellas!',
      },
    ],
  },
  {
    id: 'pulsar',
    name: 'Púlsar',
    emoji: '🚨',
    kind: 'púlsar',
    tagline: 'El faro del universo',
    color: '#74f7ff',
    facts: [
      { icon: '🌀', label: 'Giro', value: 'Algunos giran 700 veces por segundo' },
      { icon: '🥄', label: 'Densidad', value: 'Una cucharadita pesa como una montaña' },
      { icon: '📡', label: 'Descubrimiento', value: 'Al principio pensaron que eran señales alienígenas' },
    ],
    story: [
      {
        emoji: '🚨',
        title: 'El faro del espacio',
        text: 'Soy un púlsar: una estrella diminuta y superpesada que gira a toda velocidad lanzando dos rayos de luz, como un faro en la costa. Cada vez que mi rayo apunta a la Tierra, ves un destello.',
      },
      {
        emoji: '🏋️',
        title: 'Pequeño pero matón',
        text: 'Solo mido unos 20 kilómetros, como una ciudad, pero peso más que el Sol. Una cucharadita de mi material pesaría tanto como una montaña entera.',
      },
      {
        emoji: '👽',
        title: '¿Alienígenas?',
        text: 'Cuando la científica Jocelyn Bell descubrió mis señales en 1967, eran tan regulares que las llamaron LGM: "Little Green Men" (hombrecitos verdes). ¡Pensaron que podían ser extraterrestres!',
      },
      {
        emoji: '⏰',
        title: 'El mejor reloj',
        text: 'Giro con tanta precisión que los científicos me usan como reloj cósmico. ¡Soy más puntual que casi cualquier reloj de la Tierra!',
      },
    ],
  },
  {
    id: 'pleyades',
    name: 'Las Pléyades',
    emoji: '✨',
    kind: 'cúmulo',
    tagline: 'Las siete hermanas del cielo',
    color: '#9fc9ff',
    facts: [
      { icon: '⭐', label: 'Qué son', value: 'Un grupo de más de 1.000 estrellas jóvenes' },
      { icon: '👀', label: 'A simple vista', value: 'Puedes contar 6 o 7 sin telescopio' },
      { icon: '👶', label: 'Edad', value: '100 millones de años, ¡bebés cósmicos!' },
    ],
    story: [
      {
        emoji: '👭',
        title: 'Las siete hermanas',
        text: 'Somos las Pléyades, un grupo de estrellas hermanas que nacimos juntas en la misma nube. Las personas nos llaman "las siete hermanas" desde hace miles de años.',
      },
      {
        emoji: '🔵',
        title: 'Jóvenes y azules',
        text: 'Somos estrellas muy jóvenes y calientes, por eso brillamos de color azul. Las estrellas jóvenes son azules, y las viejecitas, rojas.',
      },
      {
        emoji: '🗺️',
        title: 'Famosas en todo el mundo',
        text: 'Casi todas las culturas nos pusieron nombre: en Japón nos llaman Subaru (¡mira el logo de los coches!). Los marineros y agricultores nos usaban de calendario.',
      },
    ],
  },
  {
    id: 'quasar',
    name: 'Cuásar',
    emoji: '🔦',
    kind: 'cuásar',
    tagline: 'La linterna más potente del universo',
    color: '#e0aaff',
    facts: [
      { icon: '💡', label: 'Brillo', value: 'Brilla más que toda una galaxia' },
      { icon: '🕳️', label: 'Motor', value: 'Un agujero negro gigante comiendo gas' },
      { icon: '📏', label: 'Distancia', value: 'Los vemos a miles de millones de años luz' },
    ],
    story: [
      {
        emoji: '🔦',
        title: 'La superlinterna',
        text: 'Soy un cuásar, lo más brillante que existe. Brillo más que cientos de galaxias juntas, ¡y toda esa luz sale de un espacio no mucho mayor que el sistema solar!',
      },
      {
        emoji: '🍽️',
        title: 'Mi motor secreto',
        text: 'En mi centro hay un agujero negro gigantesco tragando gas sin parar. El gas, antes de caer, gira tan rápido y se calienta tanto que brilla con una luz increíble.',
      },
      {
        emoji: '⏳',
        title: 'Una ventana al pasado',
        text: 'Estoy tan lejos que mi luz tarda miles de millones de años en llegar. Cuando los telescopios me miran, ven cómo era el universo cuando era joven. ¡Soy una máquina del tiempo!',
      },
    ],
  },
  {
    id: 'cumulo-globular',
    name: 'Cúmulo globular',
    emoji: '🔮',
    kind: 'cúmulo',
    tagline: 'Una bola de cientos de miles de estrellas',
    color: '#ffe6b0',
    facts: [
      { icon: '⭐', label: 'Estrellas', value: 'Cientos de miles, muy juntitas' },
      { icon: '⏳', label: 'Edad', value: 'De las cosas más antiguas: ~12.000 millones de años' },
      { icon: '🔵', label: 'Forma', value: 'Una pelota casi perfecta' },
    ],
    story: [
      { emoji: '🔮', title: '¡Soy un cúmulo globular!', text: 'Soy una bola gigante de cientos de miles de estrellas muy apretadas, girando juntas por la gravedad.' },
      { emoji: '⏳', title: 'Estrellas abuelas', text: 'Mis estrellas son de las más viejas del universo, ¡casi tan antiguas como el propio cosmos!' },
      { emoji: '🌃', title: 'Un cielo lleno', text: 'Si vivieras en un planeta dentro de mí, tu cielo nocturno tendría miles de estrellas brillantes, ¡nunca sería del todo de noche!' },
    ],
  },
  {
    id: 'aguila',
    name: 'Nebulosa del Águila',
    emoji: '🦅',
    kind: 'nebulosa',
    tagline: 'Los famosos "Pilares de la Creación"',
    color: '#b7d98a',
    facts: [
      { icon: '🏛️', label: 'Pilares', value: 'Columnas de gas de años luz de altas' },
      { icon: '👶', label: 'Fábrica', value: 'Dentro nacen estrellas nuevas' },
      { icon: '🔭', label: 'Famosa', value: 'La retrató el telescopio Hubble' },
    ],
    story: [
      { emoji: '🏛️', title: 'Los Pilares de la Creación', text: 'Soy famosa por tres columnas gigantes de gas y polvo, tan altas que la luz tarda años en recorrerlas.' },
      { emoji: '👶', title: 'Cuna de estrellas', text: 'Dentro de mis pilares, el gas se junta y nacen estrellas nuevas, como huevos a punto de romperse.' },
      { emoji: '🔭', title: 'Una foto famosa', text: 'El telescopio Hubble me hizo una foto tan bonita que se ha hecho famosa en todo el mundo.' },
    ],
  },
];

export const COMET: DeepSpaceObject = {
  id: 'cometa',
  name: 'El Cometa',
  emoji: '☄️',
  kind: 'nebulosa',
  tagline: 'Una bola de hielo con una cola preciosa',
  color: '#bfe3ff',
  facts: [
    { icon: '☃️', label: 'De qué es', value: 'Hielo, polvo y roca: una "bola de nieve sucia"' },
    { icon: '🌬️', label: 'Su cola', value: 'Apunta siempre en contra del Sol' },
    { icon: '☀️', label: 'Brilla', value: 'Al acercarse al Sol se calienta y suelta gas' },
    { icon: '🔁', label: 'Vuelve', value: 'El de Halley pasa cada 76 años' },
  ],
  story: [
    { emoji: '☄️', title: '¡Soy un cometa!', text: 'Soy como una bola de nieve sucia hecha de hielo, polvo y roca, que viaja por el sistema solar en una órbita muy alargada.' },
    { emoji: '☀️', title: 'Mi cola mágica', text: 'Cuando me acerco al Sol, su calor derrite mi hielo y suelto gas y polvo que forman una cola larguísima y brillante.' },
    { emoji: '🌬️', title: 'Siempre en contra del Sol', text: 'Mi cola no va detrás de mí: ¡el viento del Sol la empuja siempre hacia el lado contrario al Sol!' },
    { emoji: '🔁', title: 'Nos vemos otra vez', text: 'Doy vueltas enormes y tardo años en volver. El cometa Halley visita la Tierra una vez cada 76 años.' },
  ],
};

export const ALL_DEEP_SPACE: DeepSpaceObject[] = [MILKY_WAY, SAGITTARIUS_A, COMET, ...UNIVERSE_OBJECTS];

export function getDeepSpaceObject(id: string): DeepSpaceObject | undefined {
  return ALL_DEEP_SPACE.find((o) => o.id === id);
}
