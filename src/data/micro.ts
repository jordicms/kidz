import type { Fact, StoryPage } from './types';

export type MicroKind = 'célula' | 'bacteria' | 'virus' | 'protozoo' | 'hongo' | 'animal' | 'alga' | 'molécula';

export type MicroShape =
  | 'ameba'
  | 'paramecio'
  | 'tardigrado'
  | 'diatomea'
  | 'cell-animal'
  | 'cell-plant'
  | 'neurona'
  | 'rbc'
  | 'wbc'
  | 'levadura'
  | 'rod'
  | 'cocci'
  | 'cyano'
  | 'corona'
  | 'phage'
  | 'dna';

export interface Microbe {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  kind: MicroKind;
  /** Tamaño real aproximado en micrómetros (µm). 1 µm = 0,001 mm. */
  sizeUm: number;
  /** Cómo se lee ese tamaño para un niño. */
  sizeLabel: string;
  color: string;
  color2?: string;
  shape: MicroShape;
  /** Se mueve por su cuenta (nada) o solo flota a la deriva. */
  swims?: boolean;
  facts: Fact[];
  story: StoryPage[];
}

/** Color por tipo de ser (para las etiquetas y las fichas). */
export const KIND_COLORS: Record<MicroKind, string> = {
  célula: '#ff7ab0',
  bacteria: '#6ee7a8',
  virus: '#ffb347',
  protozoo: '#7fd8ff',
  hongo: '#c8a2ff',
  animal: '#ffd166',
  alga: '#4fd0c0',
  molécula: '#ff6f8a',
};

/* ------------------------------------------------------------------ */
/* La escalera del zoom: cada peldaño es un campo de visión más pequeño */
/* ------------------------------------------------------------------ */

export interface MicroScale {
  id: string;
  name: string;
  emoji: string;
  /** Anchura del campo de visión en µm. */
  fovUm: number;
  /** Cómo se dice ese tamaño. */
  label: string;
  /** Objeto cotidiano de referencia a esa escala. */
  reference: string;
  color: string;
}

export const SCALES: MicroScale[] = [
  {
    id: 'lupa',
    name: 'Con lupa',
    emoji: '🔎',
    fovUm: 1000,
    label: '1 mm',
    reference: 'Un grano de sal. ¡Aquí ya viven bichos que no ves a simple vista!',
    color: '#8ab4ff',
  },
  {
    id: 'gota',
    name: 'Una gota de agua',
    emoji: '💧',
    fovUm: 200,
    label: '0,2 mm',
    reference: 'El grosor de un pelo tuyo. En una gota de charco viven miles de seres.',
    color: '#7fd8ff',
  },
  {
    id: 'celulas',
    name: 'Las células',
    emoji: '🔬',
    fovUm: 40,
    label: '40 µm',
    reference: 'Los ladrillos de todos los seres vivos, tú incluido.',
    color: '#ff7ab0',
  },
  {
    id: 'bacterias',
    name: 'Las bacterias',
    emoji: '🦠',
    fovUm: 8,
    label: '8 µm',
    reference: 'En tu cuerpo hay más bacterias que estrellas en la Vía Láctea.',
    color: '#6ee7a8',
  },
  {
    id: 'virus',
    name: 'Los virus',
    emoji: '☣️',
    fovUm: 0.8,
    label: '800 nm',
    reference: 'Tan pequeños que ni el microscopio del colegio los ve.',
    color: '#ffb347',
  },
  {
    id: 'molecula',
    name: 'Las moléculas',
    emoji: '🧬',
    fovUm: 0.02,
    label: '20 nm',
    reference: 'Aquí están las instrucciones para construirte: tu ADN.',
    color: '#ff6f8a',
  },
];

export const MICROBES: Microbe[] = [
  /* ---------------- Peldaño 1–2: los gigantes del microscopio ------- */
  {
    id: 'tardigrado',
    name: 'El Tardígrado',
    emoji: '🐻',
    tagline: 'El "oso de agua" indestructible',
    kind: 'animal',
    sizeUm: 500,
    sizeLabel: 'medio milímetro: como un grano de sal',
    color: '#e8b96a',
    color2: '#c08a3a',
    shape: 'tardigrado',
    swims: true,
    facts: [
      { icon: '🚀', label: 'Increíble', value: '¡Ha sobrevivido en el espacio!' },
      { icon: '🧊', label: 'Aguanta', value: 'Frío extremo, hervir y quedarse seco años' },
      { icon: '🦶', label: 'Patas', value: 'Ocho patitas regordetas con garras' },
      { icon: '🏠', label: 'Vive en', value: 'El musgo, los charcos y hasta tu tejado' },
    ],
    story: [
      { emoji: '🐻', title: '¡Soy el tardígrado!', text: 'Me llaman "oso de agua" porque camino despacito con mis ocho patas regordetas. Mido medio milímetro: casi me ves sin microscopio.' },
      { emoji: '🛡️', title: 'Indestructible', text: 'Cuando el sitio se seca, me hago una bolita y me apago... ¡durante años! Luego llega el agua y vuelvo a la vida como si nada.' },
      { emoji: '🚀', title: 'Astronauta', text: 'Los científicos me llevaron al espacio, sin traje, y sobreviví. Soy el animal más duro que se conoce.' },
    ],
  },
  {
    id: 'ameba',
    name: 'La Ameba',
    emoji: '🫧',
    tagline: 'La gota viva que cambia de forma',
    kind: 'protozoo',
    sizeUm: 400,
    sizeLabel: 'como la punta de un alfiler',
    color: '#a8e6a0',
    color2: '#6ec06a',
    shape: 'ameba',
    swims: true,
    facts: [
      { icon: '🖐️', label: 'Se mueve', value: 'Estirando "brazos" de su propio cuerpo' },
      { icon: '🍽️', label: 'Come', value: 'Rodeando la comida y tragándosela entera' },
      { icon: '1️⃣', label: 'Curiosidad', value: 'Es UNA sola célula, ¡y ya está viva!' },
      { icon: '💧', label: 'Vive en', value: 'Charcos, estanques y suelo húmedo' },
    ],
    story: [
      { emoji: '🫧', title: '¡Soy la ameba!', text: 'No tengo forma fija: soy como una gota de gelatina que se estira por donde quiere ir.' },
      { emoji: '🖐️', title: 'Brazos de mentira', text: 'Para caminar saco un "brazo" de mi propio cuerpo y me vuelco dentro de él. Se llaman pseudópodos.' },
      { emoji: '🍽️', title: 'Como abrazando', text: 'Cuando encuentro comida, la rodeo con mis brazos hasta meterla dentro de mí. ¡No tengo boca!' },
    ],
  },
  {
    id: 'paramecio',
    name: 'El Paramecio',
    emoji: '🥿',
    tagline: 'La zapatilla peluda que nada a toda velocidad',
    kind: 'protozoo',
    sizeUm: 200,
    sizeLabel: 'el grosor de un pelo',
    color: '#9fd8f0',
    color2: '#5aa8d0',
    shape: 'paramecio',
    swims: true,
    facts: [
      { icon: '🌾', label: 'Cilios', value: 'Miles de pelitos que reman a la vez' },
      { icon: '🏃', label: 'Veloz', value: 'Recorre 10 veces su cuerpo cada segundo' },
      { icon: '↩️', label: 'Si choca', value: 'Da marcha atrás y prueba otro camino' },
      { icon: '1️⃣', label: 'Tamaño', value: 'Una única célula, ¡pero enorme!' },
    ],
    story: [
      { emoji: '🥿', title: '¡Soy el paramecio!', text: 'Tengo forma de zapatilla y estoy cubierto de miles de pelitos llamados cilios.' },
      { emoji: '🌾', title: 'Remo con pelos', text: 'Mis cilios reman todos juntos, como un equipo de remo perfectamente coordinado. ¡Así nado rapidísimo!' },
      { emoji: '↩️', title: 'Marcha atrás', text: 'Si me choco con algo, doy marcha atrás, giro un poquito y salgo otra vez. Sin cerebro ni ojos, ¡pero funciona!' },
    ],
  },
  {
    id: 'diatomea',
    name: 'La Diatomea',
    emoji: '💎',
    tagline: 'La joya de cristal del agua',
    kind: 'alga',
    sizeUm: 50,
    sizeLabel: 'la mitad del grosor de un pelo',
    color: '#8ff0e0',
    color2: '#3aa8a0',
    shape: 'diatomea',
    facts: [
      { icon: '💎', label: 'Su casa', value: 'Una caparazón de cristal (¡de vidrio!)' },
      { icon: '🫁', label: 'Regala', value: 'Buena parte del oxígeno que respiras' },
      { icon: '🎨', label: 'Formas', value: 'Miles de dibujos distintos, como copos de nieve' },
      { icon: '☀️', label: 'Come', value: 'Luz del sol, como las plantas' },
    ],
    story: [
      { emoji: '💎', title: '¡Soy una diatomea!', text: 'Soy un alga diminuta que vive dentro de una caparazón de cristal auténtico, con dibujos preciosos.' },
      { emoji: '🫁', title: 'Fábrica de aire', text: 'Aunque soy minúscula, somos tantísimas en el mar que fabricamos una gran parte del oxígeno del planeta. ¡Respiras gracias a mí!' },
      { emoji: '🎨', title: 'Todas distintas', text: 'Hay más de 100.000 clases de diatomeas y cada una tiene su propio dibujo, como los copos de nieve.' },
    ],
  },

  /* ---------------- Peldaño 3: las células --------------------------- */
  {
    id: 'celula-animal',
    name: 'La Célula Animal',
    emoji: '🔴',
    tagline: 'El ladrillo con el que estás construido',
    kind: 'célula',
    sizeUm: 20,
    sizeLabel: 'caben 50 en un milímetro',
    color: '#ff9ec4',
    color2: '#c04a80',
    shape: 'cell-animal',
    facts: [
      { icon: '🧠', label: 'Núcleo', value: 'El jefe: guarda el ADN con las instrucciones' },
      { icon: '🔋', label: 'Mitocondrias', value: 'Las pilas: fabrican la energía' },
      { icon: '🧱', label: 'En tu cuerpo', value: '¡Unos 30 billones de células!' },
      { icon: '🎈', label: 'Membrana', value: 'Su piel elástica, decide qué entra y sale' },
    ],
    story: [
      { emoji: '🔴', title: '¡Soy una célula!', text: 'Soy la pieza más pequeña que está viva. Tú estás hecho de billones de piezas como yo, trabajando juntas.' },
      { emoji: '🧠', title: 'Mi núcleo', text: 'En mi centro guardo el ADN: el libro de instrucciones que dice cómo eres. Es como el ordenador que me manda.' },
      { emoji: '🔋', title: 'Mis pilas', text: 'Tengo unas piezas con forma de judía, las mitocondrias, que convierten tu comida en energía para moverte.' },
    ],
  },
  {
    id: 'celula-vegetal',
    name: 'La Célula Vegetal',
    emoji: '🌿',
    tagline: 'La que come luz del sol',
    kind: 'célula',
    sizeUm: 50,
    sizeLabel: 'más grande que las tuyas',
    color: '#9fe08a',
    color2: '#4a8a3a',
    shape: 'cell-plant',
    facts: [
      { icon: '🟩', label: 'Cloroplastos', value: 'Cocinitas verdes que atrapan la luz' },
      { icon: '🧱', label: 'Pared', value: 'Tiene una pared rígida: por eso las plantas se aguantan' },
      { icon: '💧', label: 'Vacuola', value: 'Un gran globo de agua en el centro' },
      { icon: '🍃', label: 'Fabrica', value: 'Su propia comida... ¡y oxígeno!' },
    ],
    story: [
      { emoji: '🌿', title: '¡Soy una célula de planta!', text: 'Me parezco a las tuyas, pero tengo una pared dura alrededor y unas cocinitas verdes muy especiales.' },
      { emoji: '🟩', title: 'Como luz', text: 'Mis cloroplastos verdes atrapan la luz del sol y con ella fabrico azúcar. ¡Me como la luz!' },
      { emoji: '🫁', title: 'Y suelto aire', text: 'Mientras cocino, suelto oxígeno. Cada bocanada de aire que tomas viene de células como yo.' },
    ],
  },
  {
    id: 'neurona',
    name: 'La Neurona',
    emoji: '⚡',
    tagline: 'La célula que piensa (y manda mensajes)',
    kind: 'célula',
    sizeUm: 25,
    sizeLabel: 'el cuerpo; su cable puede medir ¡un metro!',
    color: '#c8a2ff',
    color2: '#7a4ac0',
    shape: 'neurona',
    facts: [
      { icon: '🧠', label: 'En tu cabeza', value: '¡Unos 86.000 millones!' },
      { icon: '⚡', label: 'Mensajes', value: 'Chispazos eléctricos a 400 km/h' },
      { icon: '🌳', label: 'Forma', value: 'Como un árbol con un cable larguísimo' },
      { icon: '🤝', label: 'Amigas', value: 'Cada una habla con miles de vecinas' },
    ],
    story: [
      { emoji: '⚡', title: '¡Soy una neurona!', text: 'Soy la célula de los nervios y del cerebro. Cuando piensas, recuerdas o mueves un dedo, soy yo trabajando.' },
      { emoji: '📨', title: 'Mando chispazos', text: 'Envío mensajes eléctricos por mi cable larguísimo, a más de 400 kilómetros por hora. ¡Más rápido que un tren bala!' },
      { emoji: '🤝', title: 'Nunca sola', text: 'Yo sola no sirvo de nada: hablo con miles de neuronas vecinas. Todas juntas formamos tus ideas.' },
    ],
  },
  {
    id: 'globulo-rojo',
    name: 'El Glóbulo Rojo',
    emoji: '🩸',
    tagline: 'El repartidor de oxígeno',
    kind: 'célula',
    sizeUm: 7,
    sizeLabel: 'caben 140 en un milímetro',
    color: '#e03a3a',
    color2: '#8a1a1a',
    shape: 'rbc',
    facts: [
      { icon: '🫁', label: 'Su trabajo', value: 'Llevar oxígeno desde los pulmones a todo tu cuerpo' },
      { icon: '🍩', label: 'Forma', value: 'Un donut hundido, para pasar por vasos finísimos' },
      { icon: '🔢', label: 'Cuántos', value: '25 billones dando vueltas por tu sangre' },
      { icon: '🏁', label: 'Su vuelta', value: 'Da la vuelta a tu cuerpo en ¡1 minuto!' },
    ],
    story: [
      { emoji: '🩸', title: '¡Soy un glóbulo rojo!', text: 'Soy el que pinta tu sangre de rojo. Mi trabajo es repartir oxígeno por todo tu cuerpo, sin descanso.' },
      { emoji: '🍩', title: 'Forma de donut', text: 'Estoy hundido por el medio, como un donut sin agujero. Así puedo doblarme y colarme por los vasos más finos.' },
      { emoji: '🏁', title: 'Corredor de fondo', text: 'Doy la vuelta completa a tu cuerpo en un minuto y vivo unos cuatro meses. ¡Y luego me sustituyen por otro nuevo!' },
    ],
  },
  {
    id: 'globulo-blanco',
    name: 'El Glóbulo Blanco',
    emoji: '🛡️',
    tagline: 'El soldado que te defiende',
    kind: 'célula',
    sizeUm: 12,
    sizeLabel: 'un poco mayor que el glóbulo rojo',
    color: '#eef4ff',
    color2: '#8fa8d8',
    shape: 'wbc',
    swims: true,
    facts: [
      { icon: '🛡️', label: 'Su trabajo', value: 'Cazar bacterias y virus que te atacan' },
      { icon: '🍽️', label: 'Ataca', value: 'Se los come enteros (fagocitosis)' },
      { icon: '🧠', label: 'Memoria', value: 'Recuerda a los enemigos para la próxima vez' },
      { icon: '💉', label: 'Vacunas', value: 'Le enseñan a reconocer al enemigo antes de que llegue' },
    ],
    story: [
      { emoji: '🛡️', title: '¡Soy un glóbulo blanco!', text: 'Soy el ejército de tu cuerpo. Patrullo por tu sangre buscando bacterias y virus intrusos.' },
      { emoji: '🍽️', title: 'Me los como', text: 'Cuando encuentro un microbio malo, lo rodeo y me lo trago enterito. Por eso a veces se te pone una herida blanquecina: soy yo, trabajando.' },
      { emoji: '💉', title: 'Aprendo', text: 'Después de una batalla me acuerdo del enemigo. Las vacunas son un entrenamiento: me enseñan la cara del malo sin que te pongas enfermo.' },
    ],
  },
  {
    id: 'levadura',
    name: 'La Levadura',
    emoji: '🍞',
    tagline: 'El hongo que hincha el pan',
    kind: 'hongo',
    sizeUm: 5,
    sizeLabel: 'caben 200 en un milímetro',
    color: '#f0d89a',
    color2: '#b8964a',
    shape: 'levadura',
    facts: [
      { icon: '🍞', label: 'Su magia', value: 'Suelta gas y hace burbujas en la masa' },
      { icon: '🌱', label: 'Se copia', value: 'Le sale un bultito que se convierte en otra levadura' },
      { icon: '🍬', label: 'Come', value: 'Azúcar, ¡le encanta!' },
      { icon: '🔬', label: 'Curiosidad', value: 'Es un hongo, primo de los champiñones' },
    ],
    story: [
      { emoji: '🍞', title: '¡Soy la levadura!', text: 'Soy un hongo de una sola célula, y estoy en el pan, en los bizcochos y en la pizza.' },
      { emoji: '🎈', title: 'Hago burbujas', text: 'Cuando me como el azúcar de la masa, suelto un gas que forma burbujitas. ¡Por eso el pan crece y queda esponjoso!' },
      { emoji: '🌱', title: 'Me copio sola', text: 'Para tener hijos me sale un bultito en el costado que crece y se suelta. ¡Ya es otra levadura igual que yo!' },
    ],
  },

  /* ---------------- Peldaño 4: las bacterias ------------------------ */
  {
    id: 'bacteria',
    name: 'La Bacteria E. coli',
    emoji: '🦠',
    tagline: 'La vecina de tu barriga con motor de hélice',
    kind: 'bacteria',
    sizeUm: 2,
    sizeLabel: 'caben 500 en un milímetro',
    color: '#6ee7a8',
    color2: '#2a9a68',
    shape: 'rod',
    swims: true,
    facts: [
      { icon: '🌀', label: 'Se mueve', value: 'Con colas que giran como hélices de barco' },
      { icon: '👨‍👩‍👧', label: 'Se multiplica', value: 'Se parte en dos ¡cada 20 minutos!' },
      { icon: '🫃', label: 'Vive en', value: 'Tu intestino: casi todas te ayudan' },
      { icon: '🧪', label: 'Curiosidad', value: 'Es el ser vivo más estudiado del mundo' },
    ],
    story: [
      { emoji: '🦠', title: '¡Soy una bacteria!', text: 'Soy un ser vivo de una sola célula, sin núcleo. Tengo forma de salchichita y vivo en tu intestino.' },
      { emoji: '🌀', title: 'Tengo motor', text: 'Mis colas (flagelos) giran de verdad, como la hélice de un barco. Es el único motor giratorio de la naturaleza.' },
      { emoji: '🤝', title: 'No soy mala', text: 'Casi todas mis primas te ayudan: hacemos vitaminas y te protegemos. Solo unas pocas bacterias dan problemas.' },
    ],
  },
  {
    id: 'estreptococo',
    name: 'El Estreptococo',
    emoji: '📿',
    tagline: 'Las bolitas que van en collar',
    kind: 'bacteria',
    sizeUm: 1,
    sizeLabel: 'caben 1.000 en un milímetro',
    color: '#a8d8ff',
    color2: '#4a80c0',
    shape: 'cocci',
    facts: [
      { icon: '📿', label: 'Forma', value: 'Bolitas pegadas en fila, como un collar' },
      { icon: '🤒', label: 'Algunos', value: 'Provocan el dolor de garganta' },
      { icon: '🧀', label: 'Otros', value: '¡Hacen el yogur y el queso!' },
      { icon: '🧼', label: 'Se van', value: 'Lavándote las manos con jabón' },
    ],
    story: [
      { emoji: '📿', title: '¡Somos un collar!', text: 'Somos bacterias redonditas que nos quedamos pegadas en fila después de partirnos, como las cuentas de un collar.' },
      { emoji: '🤒', title: 'A veces molestamos', text: 'Algunos primos nuestros hacen que te duela la garganta. Por eso los médicos dan medicinas llamadas antibióticos.' },
      { emoji: '🧀', title: 'Y a veces ayudamos', text: 'Otros primos convierten la leche en yogur y en queso. ¡Nos comes casi todos los días!' },
    ],
  },
  {
    id: 'cianobacteria',
    name: 'La Cianobacteria',
    emoji: '🫧',
    tagline: 'La que llenó el planeta de aire',
    kind: 'bacteria',
    sizeUm: 4,
    sizeLabel: 'caben 250 en un milímetro',
    color: '#4fd0c0',
    color2: '#1a8a80',
    shape: 'cyano',
    facts: [
      { icon: '🌍', label: 'Su hazaña', value: 'Llenó de oxígeno el aire hace 2.400 millones de años' },
      { icon: '☀️', label: 'Come', value: 'Luz del sol, como las plantas' },
      { icon: '🕰️', label: 'Antigüedad', value: 'De los primeros seres vivos de la Tierra' },
      { icon: '🟩', label: 'Curiosidad', value: 'Los cloroplastos de las plantas ¡fueron cianobacterias!' },
    ],
    story: [
      { emoji: '🫧', title: '¡Soy una cianobacteria!', text: 'Soy muy, muy antigua: estaba aquí mucho antes que los dinosaurios, cuando el aire no se podía respirar.' },
      { emoji: '🌍', title: 'Cambié el planeta', text: 'Aprendí a comer luz del sol y a soltar oxígeno. Entre todas llenamos el aire de oxígeno. ¡Sin nosotras no existirías!' },
      { emoji: '🟩', title: 'Vivo en las plantas', text: 'Hace muchísimo, una célula se tragó a una de mis abuelas y se quedó a vivir dentro. Hoy es el cloroplasto verde de las plantas.' },
    ],
  },

  /* ---------------- Peldaño 5: los virus ---------------------------- */
  {
    id: 'coronavirus',
    name: 'El Coronavirus',
    emoji: '👑',
    tagline: 'La bolita con corona de pinchos',
    kind: 'virus',
    sizeUm: 0.12,
    sizeLabel: '¡caben 8.000 en un milímetro!',
    color: '#ffb347',
    color2: '#c04a2a',
    shape: 'corona',
    facts: [
      { icon: '👑', label: 'Su nombre', value: 'Por sus pinchos: parecen una corona' },
      { icon: '❓', label: '¿Está vivo?', value: 'No del todo: necesita una célula para copiarse' },
      { icon: '🔑', label: 'Los pinchos', value: 'Son la llave para entrar en tus células' },
      { icon: '😷', label: 'Se para con', value: 'Jabón, mascarilla y vacunas' },
    ],
    story: [
      { emoji: '👑', title: '¡Soy un virus!', text: 'Soy tantísimo más pequeño que una bacteria que casi no lo puedes imaginar. Y llevo una corona de pinchos.' },
      { emoji: '❓', title: '¿Vivo o no?', text: 'Soy un caso raro: yo solo no puedo hacer nada, ni comer ni moverme. Solo funciono si entro en una célula.' },
      { emoji: '🔑', title: 'Mis llaves', text: 'Mis pinchos encajan en la cerradura de una célula para colarme dentro. Las vacunas enseñan a tu cuerpo cómo son mis llaves, ¡y así me pilla enseguida!' },
    ],
  },
  {
    id: 'bacteriofago',
    name: 'El Bacteriófago',
    emoji: '🚀',
    tagline: 'El virus con patas que ataca bacterias',
    kind: 'virus',
    sizeUm: 0.2,
    sizeLabel: 'caben 5.000 en un milímetro',
    color: '#b8a2ff',
    color2: '#6a4ac0',
    shape: 'phage',
    facts: [
      { icon: '🚀', label: 'Parece', value: 'Una nave espacial con patas de aterrizaje' },
      { icon: '🦠', label: 'Su presa', value: 'Bacterias, ¡nunca tus células!' },
      { icon: '💉', label: 'Ataca', value: 'Se posa encima y le inyecta su ADN' },
      { icon: '🌊', label: 'Cuántos', value: 'Es el ser más abundante del planeta' },
    ],
    story: [
      { emoji: '🚀', title: '¡Soy un bacteriófago!', text: 'Mi nombre significa "comebacterias". Y sí: parezco una nave espacial diminuta con patas para aterrizar.' },
      { emoji: '💉', title: 'Cómo ataco', text: 'Me poso sobre una bacteria, clavo mi tubo y le inyecto mis instrucciones. La bacteria fabrica cientos de copias mías sin querer.' },
      { emoji: '🩺', title: 'Soy útil', text: 'Como solo atacamos bacterias, los médicos nos están usando para curar infecciones. ¡Un virus que te cura!' },
    ],
  },

  /* ---------------- Peldaño 6: las moléculas ------------------------ */
  {
    id: 'adn',
    name: 'El ADN',
    emoji: '🧬',
    tagline: 'El libro de instrucciones de la vida',
    kind: 'molécula',
    sizeUm: 0.002,
    sizeLabel: '2 nm de ancho: medio millón caben en un milímetro',
    color: '#ff6f8a',
    color2: '#4fd0e0',
    shape: 'dna',
    facts: [
      { icon: '🪜', label: 'Forma', value: 'Una escalera de caracol retorcida' },
      { icon: '🔤', label: 'Su alfabeto', value: 'Solo 4 letras: A, T, C y G' },
      { icon: '📏', label: 'Si lo estiras', value: 'El de UNA célula tuya mide 2 metros' },
      { icon: '🧑‍🤝‍🧑', label: 'Curiosidad', value: 'Tu ADN y el de un chimpancé se parecen un 98%' },
    ],
    story: [
      { emoji: '🧬', title: '¡Soy tu ADN!', text: 'Soy una escalerita retorcida que vive dentro del núcleo de cada una de tus células. Guardo tus instrucciones.' },
      { emoji: '🔤', title: 'Cuatro letras', text: 'Escribo todo con solo cuatro letras: A, T, C y G. Con ellas está escrito el color de tus ojos y lo alto que serás.' },
      { emoji: '📏', title: 'Larguísimo', text: 'Estoy plegadísimo: si estirara el ADN de una sola célula tuya, mediría dos metros. ¡Y el de todo tu cuerpo daría muchas vueltas al Sol!' },
    ],
  },
];

export function getMicrobe(id: string): Microbe | undefined {
  return MICROBES.find((m) => m.id === id);
}

/**
 * Qué se ve a un peldaño de zoom: lo que cabe en el campo de visión y a la vez
 * es lo bastante grande para distinguirse (igual que en un microscopio real).
 *
 * El rango es de 12× como máximo: así, dentro de un peldaño, el mayor y el
 * menor se pueden dibujar juntos a su tamaño real sin que el pequeño quede
 * convertido en un punto invisible.
 *
 * Devuelve ordenados de mayor a menor (se colocan como una escalera de
 * tamaños). Si no encaja nada, coge los tres más cercanos para que ningún
 * peldaño quede vacío.
 */
export function microbesAtScale(scale: MicroScale): Microbe[] {
  const fov = scale.fovUm;
  const found = MICROBES.filter((m) => m.sizeUm <= fov && m.sizeUm >= fov / 12);
  const list = found.length
    ? found
    : [...MICROBES].sort((a, b) => Math.abs(a.sizeUm - fov) - Math.abs(b.sizeUm - fov)).slice(0, 3);
  return [...list].sort((a, b) => b.sizeUm - a.sizeUm);
}
