import type { Body } from './types';

export const SUN: Body = {
  id: 'sol',
  name: 'El Sol',
  emoji: '☀️',
  kind: 'estrella',
  tagline: 'Nuestra estrella, una bola gigante de fuego',
  color: '#ffb627',
  texture: { type: 'sun', colors: ['#fff3b0', '#ffb627', '#ff7b00'] },
  scene: { size: 5, distance: 0, orbitSpeed: 0, rotationSpeed: 0.04 },
  facts: [
    { icon: '📏', label: 'Tamaño', value: '109 Tierras en fila cruzan el Sol' },
    { icon: '🌡️', label: 'Temperatura', value: '5.500 °C en la superficie' },
    { icon: '🔥', label: 'En el centro', value: '¡15 millones de grados!' },
    { icon: '💡', label: 'Su luz', value: 'Tarda 8 minutos en llegar a ti' },
    { icon: '🎂', label: 'Edad', value: '4.600 millones de años' },
  ],
  story: [
    {
      emoji: '☀️',
      title: '¡Hola, soy el Sol!',
      text: 'Soy una estrella, una bola gigantesca de gas muy, muy caliente. Sin mí no habría luz, ni calor, ni plantas, ni tú. ¡Soy el corazón del sistema solar!',
    },
    {
      emoji: '🤯',
      title: 'Soy enorme',
      text: 'Dentro de mí cabrían más de un millón de planetas Tierra. Si la Tierra fuera una canica, yo sería una pelota de playa gigante.',
    },
    {
      emoji: '🔥',
      title: 'Mi truco secreto',
      text: 'En mi centro junto átomos de hidrógeno con tanta fuerza que se convierten en helio. Eso libera muchísima energía: así brillo desde hace 4.600 millones de años.',
    },
    {
      emoji: '🧲',
      title: 'Mi familia',
      text: 'Mi gravedad es tan fuerte que sujeta a los 8 planetas, sus lunas, los asteroides y los cometas. ¡Todos bailan a mi alrededor sin parar!',
    },
  ],
  layers: [
    { name: 'Fotosfera', color: '#ffd166', radius: 1, description: 'La "superficie" que brilla y vemos desde la Tierra.' },
    { name: 'Zona convectiva', color: '#ff9e2c', radius: 0.85, description: 'Burbujas de gas caliente que suben y bajan, como agua hirviendo.' },
    { name: 'Zona radiativa', color: '#ff6d00', radius: 0.62, description: 'La luz tarda miles de años en cruzar esta zona.' },
    { name: 'Núcleo', color: '#fff3b0', radius: 0.3, description: '¡La fábrica de energía! 15 millones de grados.' },
  ],
  moons: [],
};

export const PLANETS: Body[] = [
  {
    id: 'mercurio',
    name: 'Mercurio',
    emoji: '🪨',
    kind: 'planeta',
    tagline: 'El más pequeño y veloz',
    color: '#b8a99a',
    texture: { type: 'rocky', colors: ['#9c8d7f', '#6e635a'], craters: 80 },
    scene: { size: 0.5, distance: 9, orbitSpeed: 0.5, rotationSpeed: 0.1, phase: 0.5 },
    facts: [
      { icon: '🏃', label: 'Velocidad', value: 'Su año dura solo 88 días' },
      { icon: '🌡️', label: 'Temperatura', value: 'De 430 °C de día a -180 °C de noche' },
      { icon: '📏', label: 'Tamaño', value: 'Poco más grande que la Luna' },
      { icon: '🌙', label: 'Lunas', value: 'Ninguna' },
    ],
    story: [
      {
        emoji: '🏃‍♂️',
        title: '¡Soy Mercurio, el corredor!',
        text: 'Soy el planeta más cercano al Sol y el más rápido de todos. Doy una vuelta completa al Sol en solo 88 días. ¡Mi año es cortísimo!',
      },
      {
        emoji: '🥵🥶',
        title: 'Calor y frío extremos',
        text: 'Como casi no tengo atmósfera, de día me aso a 430 grados y de noche me congelo a 180 bajo cero. ¡Menudo cambio de temperatura!',
      },
      {
        emoji: '🕳️',
        title: 'Lleno de cicatrices',
        text: 'Mi superficie está llena de cráteres, como la Luna. Son las marcas de miles de rocas espaciales que han chocado conmigo durante millones de años.',
      },
      {
        emoji: '🐢',
        title: 'Días larguísimos',
        text: 'Aunque corro mucho alrededor del Sol, giro muy despacio sobre mí mismo. ¡Un solo día en Mercurio dura casi 59 días de la Tierra!',
      },
    ],
    layers: [
      { name: 'Corteza', color: '#9c8d7f', radius: 1, description: 'Roca llena de cráteres.' },
      { name: 'Manto', color: '#c2703f', radius: 0.88, description: 'Una capa fina de roca.' },
      { name: 'Núcleo de hierro', color: '#e8e3d8', radius: 0.75, description: '¡Gigante! Ocupa casi todo el planeta.' },
    ],
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    emoji: '🌕',
    kind: 'planeta',
    tagline: 'El planeta más caliente',
    color: '#e8b04b',
    texture: { type: 'gas', colors: ['#f5d8a7', '#e8b04b', '#c98a3d', '#e8c98a'] },
    scene: { size: 0.85, distance: 13, orbitSpeed: 0.35, rotationSpeed: -0.02, phase: 2.1 },
    facts: [
      { icon: '🌡️', label: 'Temperatura', value: '465 °C, ¡derrite el plomo!' },
      { icon: '🔄', label: 'Curiosidad', value: 'Gira al revés que los demás' },
      { icon: '⏳', label: 'Su día', value: 'Dura más que su año' },
      { icon: '✨', label: 'Brillo', value: 'El "lucero" más brillante del cielo' },
    ],
    story: [
      {
        emoji: '👯',
        title: 'La gemela de la Tierra',
        text: 'Me llaman la gemela de la Tierra porque somos casi del mismo tamaño. Pero no te engañes... ¡por dentro somos muy diferentes!',
      },
      {
        emoji: '🔥',
        title: 'Un horno gigante',
        text: 'Mis nubes espesas atrapan el calor del Sol y no lo dejan escapar. Por eso soy el planeta más caliente de todos: ¡465 grados! Más que un horno de pizza.',
      },
      {
        emoji: '🙃',
        title: 'Giro al revés',
        text: 'Soy muy especial: giro en sentido contrario al resto de planetas. En Venus, el Sol sale por el oeste y se esconde por el este.',
      },
      {
        emoji: '🌟',
        title: 'El lucero del alba',
        text: 'Desde la Tierra me puedes ver al amanecer o al atardecer brillando muchísimo. Mucha gente cree que soy una estrella, ¡pero soy un planeta!',
      },
    ],
    layers: [
      { name: 'Nubes de ácido', color: '#f5d8a7', radius: 1, description: 'Nubes espesas que atrapan el calor.' },
      { name: 'Corteza', color: '#c98a3d', radius: 0.95, description: 'Roca con miles de volcanes.' },
      { name: 'Manto', color: '#b3552e', radius: 0.85, description: 'Roca caliente y blandita.' },
      { name: 'Núcleo', color: '#f0e6d2', radius: 0.5, description: 'Metal fundido en el centro.' },
    ],
    moons: [],
  },
  {
    id: 'tierra',
    name: 'La Tierra',
    emoji: '🌍',
    kind: 'planeta',
    tagline: 'Nuestra casa, el planeta azul',
    color: '#4a90d9',
    texture: { type: 'earth', colors: ['#2c6fbb', '#3f9e4d', '#e8e8e8'] },
    scene: { size: 0.9, distance: 17, orbitSpeed: 0.25, rotationSpeed: 0.3, tilt: 0.41, phase: 4.2 },
    facts: [
      { icon: '🏠', label: 'Especial', value: 'El único planeta con vida conocida' },
      { icon: '💧', label: 'Agua', value: 'El 71% es océano' },
      { icon: '🕐', label: 'Su día', value: '24 horas' },
      { icon: '📅', label: 'Su año', value: '365 días' },
      { icon: '🌙', label: 'Lunas', value: '1, ¡la Luna!' },
    ],
    story: [
      {
        emoji: '🌍',
        title: '¡Bienvenido a casa!',
        text: 'Soy la Tierra, tu planeta. Soy el único lugar del universo donde sabemos que hay vida: plantas, animales, personas... ¡y tú!',
      },
      {
        emoji: '💙',
        title: 'El planeta azul',
        text: 'Desde el espacio me veo azul porque casi tres cuartas partes de mi superficie son océanos. ¡Por eso me llaman el planeta azul!',
      },
      {
        emoji: '🛡️',
        title: 'Mi escudo invisible',
        text: 'Tengo una atmósfera que te da aire para respirar y un campo magnético que te protege de los rayos peligrosos del Sol. ¡Soy tu escudo!',
      },
      {
        emoji: '📍',
        title: 'En el sitio perfecto',
        text: 'Estoy a la distancia justa del Sol: ni demasiado cerca (me quemaría) ni demasiado lejos (me congelaría). Los científicos lo llaman la "zona habitable".',
      },
      {
        emoji: '🌙',
        title: 'Mi compañera de viaje',
        text: 'La Luna me acompaña desde hace miles de millones de años. Gracias a ella hay mareas en el mar y noches con su luz plateada.',
      },
    ],
    layers: [
      { name: 'Corteza', color: '#3f9e4d', radius: 1, description: 'Donde vives tú: continentes y fondo del mar.' },
      { name: 'Manto', color: '#e0622e', radius: 0.95, description: 'Roca caliente que se mueve muy despacio.' },
      { name: 'Núcleo externo', color: '#f5a623', radius: 0.55, description: 'Metal líquido que crea nuestro escudo magnético.' },
      { name: 'Núcleo interno', color: '#fff1c1', radius: 0.2, description: 'Una bola de hierro sólido, ¡tan caliente como el Sol!' },
    ],
    moons: [
      {
        id: 'luna',
        name: 'La Luna',
        emoji: '🌙',
        fact: 'Los astronautas dejaron sus huellas allí en 1969, ¡y siguen intactas!',
        size: 0.25,
        distance: 1.8,
        speed: 1.2,
        color: '#cfcfcf',
      },
    ],
  },
  {
    id: 'marte',
    name: 'Marte',
    emoji: '🔴',
    kind: 'planeta',
    tagline: 'El planeta rojo',
    color: '#d1603d',
    texture: { type: 'rocky', colors: ['#c1502e', '#8f3a22'], craters: 35, caps: '#f5f0e8' },
    scene: { size: 0.7, distance: 21.5, orbitSpeed: 0.2, rotationSpeed: 0.28, tilt: 0.44, phase: 1.3 },
    facts: [
      { icon: '🏔️', label: 'Récord', value: 'Tiene el volcán más grande: Monte Olimpo' },
      { icon: '🤖', label: 'Visitantes', value: 'Robots de la Tierra lo exploran' },
      { icon: '🕐', label: 'Su día', value: '24 horas y 37 minutos' },
      { icon: '🌙', label: 'Lunas', value: '2: Fobos y Deimos' },
    ],
    story: [
      {
        emoji: '🔴',
        title: '¡Soy Marte, el planeta rojo!',
        text: 'Soy rojo porque mi suelo está lleno de óxido de hierro... ¡sí, como el hierro oxidado! Soy como un desierto gigante de arena roja.',
      },
      {
        emoji: '🏔️',
        title: 'El volcán campeón',
        text: 'Tengo el volcán más grande de todo el sistema solar: el Monte Olimpo. ¡Es tres veces más alto que el Everest, la montaña más alta de la Tierra!',
      },
      {
        emoji: '🤖',
        title: 'Mis amigos robots',
        text: 'Los humanos me han enviado robots con ruedas llamados rovers. Recorren mi superficie, sacan fotos y buscan pistas de si alguna vez hubo agua y vida aquí.',
      },
      {
        emoji: '🚀',
        title: 'Tu próximo destino',
        text: 'Quizá cuando seas mayor, los humanos vengan a visitarme. ¡Sería el primer planeta que pisáis aparte de la Tierra! ¿Te apuntas al viaje?',
      },
    ],
    layers: [
      { name: 'Corteza', color: '#c1502e', radius: 1, description: 'Polvo y roca de color rojo óxido.' },
      { name: 'Manto', color: '#8a3a1e', radius: 0.92, description: 'Roca que antes tenía volcanes activos.' },
      { name: 'Núcleo', color: '#e8c170', radius: 0.45, description: 'Hierro y azufre, parte líquido.' },
    ],
    moons: [
      { id: 'fobos', name: 'Fobos', emoji: '🥔', fact: 'Tiene forma de patata y cada vez está más cerca de Marte.', size: 0.08, distance: 1.2, speed: 2, color: '#8a7d72' },
      { id: 'deimos', name: 'Deimos', emoji: '🪨', fact: 'Es diminuta: cabría dentro de una ciudad grande.', size: 0.06, distance: 1.7, speed: 1.3, color: '#9a8d80' },
    ],
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    emoji: '🟠',
    kind: 'planeta',
    tagline: 'El gigante del sistema solar',
    color: '#d9a066',
    texture: {
      type: 'gas',
      colors: ['#e8d5b5', '#c98a4b', '#f0e2c8', '#b5683a', '#e8d5b5', '#d9a066'],
      spot: { color: '#c0392b', x: 0.68, y: 0.62, w: 0.14, h: 0.08 },
    },
    scene: { size: 2.6, distance: 33, orbitSpeed: 0.11, rotationSpeed: 0.5, phase: 5.1 },
    facts: [
      { icon: '👑', label: 'Récord', value: 'El planeta más grande: 1.300 Tierras caben dentro' },
      { icon: '🌀', label: 'Gran Mancha Roja', value: 'Una tormenta más grande que la Tierra' },
      { icon: '🕐', label: 'Su día', value: 'Solo 10 horas, ¡el más rápido girando!' },
      { icon: '🌙', label: 'Lunas', value: '¡Más de 90!' },
    ],
    story: [
      {
        emoji: '👑',
        title: '¡Soy Júpiter, el rey!',
        text: 'Soy el planeta más grande de todos. Dentro de mí cabrían más de 1.300 Tierras. Soy tan grande que peso más que todos los demás planetas juntos.',
      },
      {
        emoji: '💨',
        title: 'Hecho de gas',
        text: 'No tengo suelo donde pisar: soy una bola gigante de gas. Si intentaras aterrizar en mí, te hundirías entre mis nubes de colores.',
      },
      {
        emoji: '🌀',
        title: 'Mi tormenta eterna',
        text: '¿Ves mi mancha roja? Es una tormenta gigante que lleva girando más de 350 años. ¡Es tan grande que la Tierra entera cabría dentro!',
      },
      {
        emoji: '🛡️',
        title: 'El guardaespaldas',
        text: 'Mi gravedad es tan fuerte que atrapo muchos asteroides y cometas que podrían chocar con la Tierra. ¡Soy el guardaespaldas del sistema solar!',
      },
      {
        emoji: '🌙',
        title: 'Mi pandilla de lunas',
        text: 'Tengo más de 90 lunas. Las cuatro más famosas las descubrió Galileo hace 400 años con uno de los primeros telescopios: Ío, Europa, Ganímedes y Calisto.',
      },
    ],
    layers: [
      { name: 'Nubes', color: '#e8d5b5', radius: 1, description: 'Bandas de nubes de colores que giran a toda velocidad.' },
      { name: 'Hidrógeno líquido', color: '#c98a4b', radius: 0.88, description: 'Un océano de gas tan apretado que se vuelve líquido.' },
      { name: 'Hidrógeno metálico', color: '#8a6a9e', radius: 0.6, description: 'Tan apretado que se comporta como un metal brillante.' },
      { name: 'Núcleo', color: '#f0d9a8', radius: 0.2, description: 'Posiblemente roca y hielo, ¡nadie lo ha visto!' },
    ],
    moons: [
      { id: 'io', name: 'Ío', emoji: '🌋', fact: 'Está llena de volcanes en erupción, ¡parece una pizza!', size: 0.18, distance: 3.5, speed: 1.6, color: '#e8d44b' },
      { id: 'europa', name: 'Europa', emoji: '🧊', fact: 'Bajo su hielo hay un océano. ¿Habrá peces espaciales?', size: 0.16, distance: 4.3, speed: 1.2, color: '#d8e0e8' },
      { id: 'ganimedes', name: 'Ganímedes', emoji: '🏆', fact: 'La luna más grande del sistema solar, ¡mayor que Mercurio!', size: 0.26, distance: 5.2, speed: 0.9, color: '#a89880' },
      { id: 'calisto', name: 'Calisto', emoji: '🕳️', fact: 'Es el objeto con más cráteres de todo el sistema solar.', size: 0.24, distance: 6.2, speed: 0.7, color: '#7d7468' },
    ],
  },
  {
    id: 'saturno',
    name: 'Saturno',
    emoji: '🪐',
    kind: 'planeta',
    tagline: 'El señor de los anillos',
    color: '#e3c98a',
    texture: { type: 'gas', colors: ['#f0e2c0', '#e3c98a', '#d4b06a', '#efe0bd', '#c9a55c'] },
    scene: {
      size: 2.2,
      distance: 41,
      orbitSpeed: 0.08,
      rotationSpeed: 0.45,
      tilt: 0.47,
      phase: 2.8,
      rings: { inner: 2.8, outer: 4.6, color: '#d8c79a', opacity: 0.85 },
    },
    facts: [
      { icon: '💍', label: 'Anillos', value: 'Hechos de billones de trocitos de hielo' },
      { icon: '🛁', label: 'Curiosidad', value: 'Flotaría en una bañera gigante' },
      { icon: '🌙', label: 'Lunas', value: '¡Más de 140, el récord!' },
      { icon: '📅', label: 'Su año', value: '29 años de la Tierra' },
    ],
    story: [
      {
        emoji: '💍',
        title: '¡Mira mis anillos!',
        text: 'Soy Saturno, el planeta más elegante. Mis anillos son famosos en todo el sistema solar. ¿A que son bonitos?',
      },
      {
        emoji: '🧊',
        title: '¿De qué están hechos?',
        text: 'Mis anillos parecen sólidos, pero en realidad son billones de trocitos de hielo y roca, desde granitos de arena hasta pedazos como casas, todos girando a mi alrededor.',
      },
      {
        emoji: '🛁',
        title: 'El planeta flotador',
        text: 'Aquí va un secreto: soy tan ligero que, si existiera una bañera gigante llena de agua, ¡flotaría como un patito de goma!',
      },
      {
        emoji: '🌙',
        title: 'Mi luna misteriosa',
        text: 'Mi luna Titán es muy especial: tiene nubes, ríos y lagos... ¡pero no de agua, sino de metano! Es el único satélite con atmósfera espesa.',
      },
    ],
    layers: [
      { name: 'Nubes', color: '#f0e2c0', radius: 1, description: 'Nubes doradas con vientos rapidísimos.' },
      { name: 'Hidrógeno líquido', color: '#d4b06a', radius: 0.85, description: 'Gas apretado hasta volverse líquido.' },
      { name: 'Hidrógeno metálico', color: '#9a7daa', radius: 0.5, description: 'Aquí se crea su campo magnético.' },
      { name: 'Núcleo', color: '#f5e0b0', radius: 0.22, description: 'Roca y hielo más grande que la Tierra.' },
    ],
    moons: [
      { id: 'titan', name: 'Titán', emoji: '🟠', fact: 'Tiene lagos y ríos de metano y una atmósfera naranja.', size: 0.24, distance: 5.6, speed: 0.8, color: '#d9a23b' },
      { id: 'encelado', name: 'Encélado', emoji: '⛲', fact: 'Lanza géiseres de agua helada al espacio desde su polo sur.', size: 0.1, distance: 4.9, speed: 1.4, color: '#e8eef2' },
    ],
  },
  {
    id: 'urano',
    name: 'Urano',
    emoji: '🩵',
    kind: 'planeta',
    tagline: 'El planeta tumbado',
    color: '#7fd4d4',
    texture: { type: 'ice', colors: ['#9fe0e0', '#7fd4d4', '#5fb8c9'] },
    scene: { size: 1.4, distance: 48, orbitSpeed: 0.06, rotationSpeed: 0.35, tilt: 1.71, phase: 0.9, rings: { inner: 1.8, outer: 2.4, color: '#a8d8d8', opacity: 0.3 } },
    facts: [
      { icon: '🤸', label: 'Curiosidad', value: 'Gira tumbado de lado' },
      { icon: '🥶', label: 'Temperatura', value: '-220 °C, ¡brrr!' },
      { icon: '💎', label: 'Sorpresa', value: 'Puede que lluevan diamantes' },
      { icon: '📅', label: 'Su año', value: '84 años de la Tierra' },
    ],
    story: [
      {
        emoji: '🤸',
        title: '¡Soy Urano, el acróbata!',
        text: 'Todos los planetas giran como peonzas, pero yo giro tumbado de lado, ¡como una rueda! Quizá un choque gigante hace mucho tiempo me dejó así.',
      },
      {
        emoji: '🩵',
        title: 'Azul verdoso',
        text: 'Mi color tan bonito viene de un gas llamado metano que hay en mis nubes. Atrapa la luz roja del Sol y refleja la azul y la verde.',
      },
      {
        emoji: '🥶',
        title: 'El más friolero',
        text: 'Soy el planeta más frío del sistema solar: ¡220 grados bajo cero! Soy un gigante de hielo, junto a mi hermano Neptuno.',
      },
      {
        emoji: '💎',
        title: 'Lluvia de diamantes',
        text: 'Los científicos creen que muy dentro de mí la presión es tan grande que el carbono se aprieta y se aprieta... ¡hasta convertirse en diamantes que caen como lluvia!',
      },
    ],
    layers: [
      { name: 'Atmósfera', color: '#9fe0e0', radius: 1, description: 'Hidrógeno, helio y metano (¡el que me da el color!).' },
      { name: 'Manto helado', color: '#4a90b8', radius: 0.8, description: 'Un océano espeso de agua, amoniaco y metano helados.' },
      { name: 'Núcleo', color: '#c9b896', radius: 0.25, description: 'Una bola de roca pequeña en el centro.' },
    ],
    moons: [
      { id: 'titania', name: 'Titania', emoji: '🧚', fact: 'Sus lunas tienen nombres de personajes de cuentos y obras de teatro.', size: 0.12, distance: 2.6, speed: 1, color: '#b8b0a8' },
    ],
  },
  {
    id: 'neptuno',
    name: 'Neptuno',
    emoji: '🔵',
    kind: 'planeta',
    tagline: 'El planeta de los vientos salvajes',
    color: '#3d5ec9',
    texture: {
      type: 'ice',
      colors: ['#5a7de0', '#3d5ec9', '#2a44a8'],
      spot: { color: '#1e2f7a', x: 0.4, y: 0.45, w: 0.12, h: 0.07 },
    },
    scene: { size: 1.35, distance: 54, orbitSpeed: 0.05, rotationSpeed: 0.32, phase: 3.7 },
    facts: [
      { icon: '💨', label: 'Vientos', value: '2.000 km/h, ¡los más rápidos!' },
      { icon: '🔭', label: 'Descubrimiento', value: 'Lo encontraron con matemáticas antes que con telescopios' },
      { icon: '📅', label: 'Su año', value: '165 años de la Tierra' },
      { icon: '📍', label: 'Posición', value: 'El planeta más lejano del Sol' },
    ],
    story: [
      {
        emoji: '🔵',
        title: 'El último de la fila',
        text: 'Soy Neptuno, el planeta más lejano del Sol. Desde aquí, el Sol se ve como una estrella muy brillante, pero pequeñita. ¡Vivo casi a oscuras!',
      },
      {
        emoji: '💨',
        title: 'Vientos de récord',
        text: 'Mis vientos son los más rápidos del sistema solar: ¡soplan a 2.000 kilómetros por hora! Cinco veces más rápido que el peor huracán de la Tierra.',
      },
      {
        emoji: '🧮',
        title: 'Me encontraron con mates',
        text: 'Soy el único planeta descubierto con matemáticas. Unos científicos notaron que algo "empujaba" a Urano, hicieron cálculos y dijeron: "¡ahí tiene que haber un planeta!". Y ahí estaba yo.',
      },
      {
        emoji: '🐌',
        title: 'Un año eterno',
        text: 'Tardo 165 años de la Tierra en dar una vuelta al Sol. Desde que me descubrieron en 1846, ¡solo he cumplido un año neptuniano!',
      },
    ],
    layers: [
      { name: 'Atmósfera', color: '#5a7de0', radius: 1, description: 'Nubes azules con tormentas gigantes.' },
      { name: 'Manto helado', color: '#2d4aa8', radius: 0.8, description: 'Agua, amoniaco y metano superapretados.' },
      { name: 'Núcleo', color: '#c9b896', radius: 0.25, description: 'Roca y hielo, parecido al de Urano.' },
    ],
    moons: [
      { id: 'triton', name: 'Tritón', emoji: '🔄', fact: 'Orbita al revés: quizá fue capturado por Neptuno.', size: 0.14, distance: 2.5, speed: -0.9, color: '#d8c8c0' },
    ],
  },
];

export const DWARF_PLANETS: Body[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    emoji: '🥔',
    kind: 'planeta enano',
    tagline: 'El rey del cinturón de asteroides',
    color: '#a89a8a',
    texture: { type: 'rocky', colors: ['#8f857a', '#6b6258'], craters: 50 },
    scene: { size: 0.28, distance: 26.5, orbitSpeed: 0.15, rotationSpeed: 0.2, phase: 5.8 },
    facts: [
      { icon: '🏆', label: 'Récord', value: 'El objeto más grande del cinturón de asteroides' },
      { icon: '💧', label: 'Sorpresa', value: 'Tiene agua helada y puntos brillantes de sal' },
      { icon: '📏', label: 'Tamaño', value: '940 km, como España de punta a punta' },
    ],
    story: [
      {
        emoji: '🥇',
        title: 'El jefe del cinturón',
        text: 'Soy Ceres, el objeto más grande del cinturón de asteroides. Soy tan grande y redondo que los científicos me llaman "planeta enano", como a Plutón.',
      },
      {
        emoji: '✨',
        title: 'Mis luces misteriosas',
        text: 'Tengo unos puntos brillantes en mis cráteres que durante años fueron un misterio. ¡Resultaron ser sal! Como la del mar, pero espacial.',
      },
      {
        emoji: '🧊',
        title: 'Agua escondida',
        text: 'Debajo de mi superficie guardo muchísima agua helada. Algunos científicos piensan que hace mucho tiempo pude tener un océano.',
      },
    ],
    layers: [
      { name: 'Corteza', color: '#8f857a', radius: 1, description: 'Polvo, roca y sales brillantes.' },
      { name: 'Manto helado', color: '#b8d4e0', radius: 0.8, description: 'Mucha agua congelada.' },
      { name: 'Núcleo', color: '#7a6a55', radius: 0.45, description: 'Roca apretada.' },
    ],
    moons: [],
  },
  {
    id: 'pluton',
    name: 'Plutón',
    emoji: '🤍',
    kind: 'planeta enano',
    tagline: 'El pequeño con un corazón',
    color: '#d8c0a8',
    texture: { type: 'rocky', colors: ['#d8c0a8', '#a8907a'], craters: 15, caps: '#f0ebe0' },
    scene: { size: 0.32, distance: 60, orbitSpeed: 0.04, rotationSpeed: 0.1, phase: 1.8 },
    facts: [
      { icon: '💔', label: 'Historia', value: 'Fue planeta hasta 2006, ahora es planeta enano' },
      { icon: '🤍', label: 'Curiosidad', value: 'Tiene un glaciar con forma de corazón' },
      { icon: '🥶', label: 'Temperatura', value: '-230 °C' },
      { icon: '📅', label: 'Su año', value: '248 años de la Tierra' },
    ],
    story: [
      {
        emoji: '👋',
        title: '¡Hola! Soy Plutón',
        text: 'Vivo lejísimos, en el borde helado del sistema solar. Durante 76 años fui el noveno planeta, pero en 2006 los científicos me cambiaron a "planeta enano". ¡Yo sigo igual de contento!',
      },
      {
        emoji: '🤍',
        title: 'Mi corazón gigante',
        text: 'Cuando la nave New Horizons me visitó en 2015, descubrió que tengo un glaciar enorme con forma de corazón. ¡Es mi marca más famosa!',
      },
      {
        emoji: '👫',
        title: 'Mi mejor amiga',
        text: 'Mi luna Caronte es tan grande comparada conmigo que bailamos juntos: los dos giramos alrededor de un punto entre ambos, como dos patinadores cogidos de las manos.',
      },
      {
        emoji: '🧊',
        title: 'Frío, frío, frío',
        text: 'Aquí hace tanto frío (230 grados bajo cero) que el aire que respiras en la Tierra se congelaría y caería como nieve.',
      },
    ],
    layers: [
      { name: 'Corteza de hielo', color: '#d8c0a8', radius: 1, description: 'Hielo de nitrógeno y metano.' },
      { name: 'Manto helado', color: '#b8cfdf', radius: 0.85, description: 'Quizá esconde un océano de agua líquida.' },
      { name: 'Núcleo', color: '#8a7560', radius: 0.5, description: 'Roca en el centro.' },
    ],
    moons: [
      { id: 'caronte', name: 'Caronte', emoji: '🩶', fact: 'Es tan grande que Plutón y ella bailan juntos.', size: 0.14, distance: 1, speed: 0.8, color: '#9a9a9a' },
    ],
  },
];

/** Todos los cuerpos con historia propia del sistema solar. */
export const ALL_BODIES: Body[] = [SUN, ...PLANETS, ...DWARF_PLANETS];

export function getBody(id: string): Body | undefined {
  return ALL_BODIES.find((b) => b.id === id);
}

/** Cinturón de asteroides: radios interior y exterior en unidades de escena. */
export const ASTEROID_BELT = { inner: 24.5, outer: 28.5, count: 900 };
