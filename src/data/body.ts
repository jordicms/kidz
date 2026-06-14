import type { BodySystem, Journey, Layer, Organ } from './types';

/** Capas del cuerpo, de fuera hacia dentro (radius = fracción del grosor). */
export const BODY_LAYERS: Layer[] = [
  { name: 'Piel', color: '#f0b48a', radius: 1, description: 'Tu envoltura: te protege y siente el tacto, el calor y el frío.' },
  { name: 'Grasa', color: '#f7e0a3', radius: 0.9, description: 'Una capa blandita que guarda calor y energía.' },
  { name: 'Músculos', color: '#c0504d', radius: 0.78, description: 'Tiran de los huesos para que te puedas mover.' },
  { name: 'Huesos', color: '#efe7d2', radius: 0.6, description: 'Tu esqueleto: el armazón que te sostiene.' },
  { name: 'Órganos', color: '#b5544b', radius: 0.42, description: 'El corazón, los pulmones, el estómago... ¡tus máquinas internas!' },
];

/** Sistemas/aparatos del cuerpo (color para resaltarlos). */
export const SYSTEMS: BodySystem[] = [
  { id: 'oseo', name: 'Óseo', emoji: '🦴', color: '#efe7d2' },
  { id: 'muscular', name: 'Muscular', emoji: '💪', color: '#c0504d' },
  { id: 'circulatorio', name: 'Circulatorio', emoji: '🫀', color: '#e23b3b' },
  { id: 'respiratorio', name: 'Respiratorio', emoji: '🫁', color: '#7fb3ff' },
  { id: 'digestivo', name: 'Digestivo', emoji: '🍎', color: '#e8a23b' },
  { id: 'nervioso', name: 'Nervioso', emoji: '🧠', color: '#d18ad1' },
];

export const ORGANS: Organ[] = [
  {
    id: 'corazon',
    name: 'El Corazón',
    emoji: '🫀',
    system: 'circulatorio',
    color: '#d8324a',
    position: [-0.25, 1.15, 0.35],
    tagline: 'La bomba que nunca descansa',
    facts: [
      { icon: '💓', label: 'Latidos', value: '¡Unas 100.000 veces al día!' },
      { icon: '✊', label: 'Tamaño', value: 'Más o menos como tu puño' },
      { icon: '🩸', label: 'Su trabajo', value: 'Empuja la sangre por todo el cuerpo' },
      { icon: '🔁', label: 'Sin parar', value: 'Late de día y de noche, toda tu vida' },
    ],
    story: [
      {
        emoji: '🫀',
        title: '¡Hola, soy tu corazón!',
        text: 'Soy un músculo del tamaño de tu puño y vivo en tu pecho, un poco hacia la izquierda. Mi trabajo es muy importante: bombear sangre a todo tu cuerpo.',
      },
      {
        emoji: '💓',
        title: 'Pum-pum, pum-pum',
        text: 'Ese sonido es mi latido. Late más de 100.000 veces cada día, ¡sin descansar nunca! Cuando corres o juegas, late más rápido para darte más energía.',
      },
      {
        emoji: '🩸',
        title: 'Un repartidor incansable',
        text: 'La sangre lleva oxígeno y comida a cada rinconcito de tu cuerpo. Yo soy la bomba que la empuja por unos tubos llamados venas y arterias.',
      },
      {
        emoji: '🏃',
        title: 'Cuídame bien',
        text: 'Si te mueves, juegas y comes fruta y verdura, me pongo fuerte y contento. ¡El ejercicio es mi comida favorita!',
      },
    ],
  },
  {
    id: 'pulmones',
    name: 'Los Pulmones',
    emoji: '🫁',
    system: 'respiratorio',
    color: '#e58aa0',
    position: [0, 0.6, 0.15],
    tagline: 'Dos globos que te dan aire',
    facts: [
      { icon: '🌬️', label: 'Respiras', value: 'Unas 20.000 veces al día' },
      { icon: '🎈', label: 'Cómo son', value: 'Como dos esponjas llenas de aire' },
      { icon: '💨', label: 'Su trabajo', value: 'Cogen oxígeno y sueltan el aire usado' },
      { icon: '🏃', label: 'Al correr', value: 'Respiras más fuerte para coger más aire' },
    ],
    story: [
      { emoji: '🫁', title: '¡Somos tus pulmones!', text: 'Somos dos y vivimos en tu pecho, uno a cada lado del corazón. Nos hinchamos y deshinchamos cada vez que respiras.' },
      { emoji: '🌬️', title: 'Coger aire bueno', text: 'Cuando coges aire, atrapamos el oxígeno y se lo damos a la sangre para repartirlo por todo el cuerpo.' },
      { emoji: '💨', title: 'Soltar aire usado', text: 'Al soltar el aire, echamos fuera un gas que ya no sirve, el dióxido de carbono. ¡Por eso respiramos sin parar!' },
      { emoji: '🤧', title: 'Cuídanos', text: 'El humo y el aire sucio nos sientan fatal. El aire limpio y el ejercicio nos hacen fuertes.' },
    ],
  },
  {
    id: 'cerebro',
    name: 'El Cerebro',
    emoji: '🧠',
    system: 'nervioso',
    color: '#e0a6d6',
    position: [0, 1.5, 0.0],
    tagline: 'El jefe que controla todo',
    facts: [
      { icon: '🎮', label: 'Su trabajo', value: 'Controla todo tu cuerpo' },
      { icon: '⚡', label: 'Mensajes', value: 'Manda señales rapidísimas por los nervios' },
      { icon: '💭', label: 'Piensa', value: 'Sueña, recuerda, aprende e imagina' },
      { icon: '😴', label: 'Descanso', value: 'Mientras duermes, ordena lo aprendido' },
    ],
    story: [
      { emoji: '🧠', title: '¡Hola, soy tu cerebro!', text: 'Vivo dentro de tu cabeza, bien protegido por el cráneo. Soy el jefe: doy órdenes a todo tu cuerpo.' },
      { emoji: '⚡', title: 'Mensajero veloz', text: 'Mando mensajes por unos cables llamados nervios. Por eso, si tocas algo caliente, ¡apartas la mano al instante!' },
      { emoji: '💭', title: 'La máquina de pensar', text: 'Conmigo piensas, recuerdas, hablas, juegas y aprendes cosas nuevas cada día.' },
      { emoji: '😴', title: 'También descanso', text: 'Cuando duermes, aprovecho para ordenar todo lo que has aprendido. ¡Dormir me hace más listo!' },
    ],
  },
  {
    id: 'estomago',
    name: 'El Estómago',
    emoji: '🍎',
    system: 'digestivo',
    color: '#e8a23b',
    position: [0.1, 0.0, 0.32],
    tagline: 'La bolsa donde empieza la digestión',
    facts: [
      { icon: '🥣', label: 'Cómo es', value: 'Una bolsa elástica que se estira' },
      { icon: '🧪', label: 'Jugos', value: 'Deshace la comida con jugos especiales' },
      { icon: '⏳', label: 'Tiempo', value: 'La comida pasa unas horas dentro' },
      { icon: '🌀', label: 'Se mueve', value: 'Amasa la comida como una batidora' },
    ],
    story: [
      { emoji: '🍎', title: '¡Soy el estómago!', text: 'Cuando comes, la comida baja por un tubo y llega a mí. Soy como una bolsa que se estira para guardarla.' },
      { emoji: '🌀', title: 'A batir', text: 'Me muevo y amaso la comida, mezclándola con mis jugos hasta convertirla en una papilla.' },
      { emoji: '🧪', title: 'Jugos mágicos', text: 'Mis jugos deshacen la comida en trocitos diminutos para que el cuerpo pueda aprovecharla.' },
      { emoji: '➡️', title: 'Sigue el viaje', text: 'Luego la papilla pasa al intestino, donde se cogen las vitaminas y la energía. ¡La digestión es un viaje largo!' },
    ],
  },
  {
    id: 'huesos',
    name: 'El Esqueleto',
    emoji: '🦴',
    system: 'oseo',
    color: '#efe7d2',
    position: [0, 0, 0],
    tagline: 'El armazón que te sostiene',
    facts: [
      { icon: '🦴', label: 'Cuántos', value: 'Unos 206 huesos de mayor' },
      { icon: '👶', label: 'De bebé', value: '¡Naciste con más de 300!' },
      { icon: '🛡️', label: 'Protegen', value: 'El cráneo guarda el cerebro' },
      { icon: '💪', label: 'Fuertes', value: 'Más duros que algunos metales' },
    ],
    story: [
      { emoji: '🦴', title: '¡Somos tus huesos!', text: 'Juntos formamos el esqueleto: el armazón que te mantiene de pie y te da forma.' },
      { emoji: '🛡️', title: 'Tu armadura', text: 'También protegemos lo más importante: el cráneo guarda el cerebro y las costillas, el corazón y los pulmones.' },
      { emoji: '🤸', title: 'Para moverte', text: 'Los músculos tiran de nosotros y así puedes correr, saltar y bailar.' },
      { emoji: '🥛', title: 'Cómo crecemos', text: 'Para ser fuertes nos encanta el calcio (leche, queso) y que te muevas mucho.' },
    ],
  },
  {
    id: 'musculos',
    name: 'Los Músculos',
    emoji: '💪',
    system: 'muscular',
    color: '#c0504d',
    position: [0, 0, 0],
    tagline: 'Los motores del movimiento',
    facts: [
      { icon: '🔢', label: 'Cuántos', value: 'Más de 600 en todo el cuerpo' },
      { icon: '🤸', label: 'Su trabajo', value: 'Tiran de los huesos para moverte' },
      { icon: '😊', label: 'Hasta sonríes', value: 'Usas músculos para sonreír' },
      { icon: '🏋️', label: 'Se hacen fuertes', value: 'Con ejercicio crecen y se fortalecen' },
    ],
    story: [
      { emoji: '💪', title: '¡Somos tus músculos!', text: 'Estamos por todo tu cuerpo, pegados a los huesos. Cuando nos apretamos, tiramos de ellos y te mueves.' },
      { emoji: '🤸', title: 'En equipo', text: 'Trabajamos por parejas: uno tira y el otro se relaja. Así doblas y estiras el brazo, por ejemplo.' },
      { emoji: '❤️', title: 'Hasta el corazón', text: 'El corazón también es un músculo, ¡el más incansable de todos!' },
      { emoji: '🏃', title: 'Más fuertes', text: 'Cuanto más juegas y te mueves, más fuertes nos ponemos.' },
    ],
  },
];

export const JOURNEYS: Journey[] = [
  {
    id: 'sangre',
    title: 'Viaje de un glóbulo rojo',
    emoji: '🩸',
    system: 'circulatorio',
    tubeColor: '#7a1322',
    travelerColor: '#ff4d4d',
    steps: [
      '¡Hola! Soy un glóbulo rojo. Viajo por tus venas y arterias llevando oxígeno.',
      'Salgo del corazón a toda velocidad por una gran arteria.',
      'Llego a los pulmones y cargo oxígeno fresco, ¡como llenar una mochila!',
      'Reparto el oxígeno por todo el cuerpo, hasta la punta de los dedos.',
      'Vuelvo al corazón para empezar otra vez. ¡Doy vueltas sin parar!',
    ],
  },
  {
    id: 'comida',
    title: 'El viaje de la comida',
    emoji: '🍎',
    system: 'digestivo',
    tubeColor: '#8a4a24',
    travelerColor: '#c98a4b',
    steps: [
      'Soy un bocado de comida. Empiezo mi viaje en la boca, masticado en trocitos.',
      'Bajo por un tubo, el esófago, hasta el estómago.',
      'En el estómago me amasan y me deshacen con jugos especiales.',
      'En el intestino se cogen mis vitaminas y mi energía para el cuerpo.',
      '¡Lo que no sirve se va al final del viaje! Fin del recorrido.',
    ],
  },
  {
    id: 'aire',
    title: 'El viaje del aire',
    emoji: '💨',
    system: 'respiratorio',
    tubeColor: '#3a5a8a',
    travelerColor: '#bfe3ff',
    steps: [
      'Soy una bocanada de aire. Entro por la nariz, calentito y limpio.',
      'Bajo por la tráquea, un tubo con anillos como una manguera.',
      'Me reparto por los bronquios hacia los dos pulmones.',
      'Llego a unas bolsitas diminutas: aquí el oxígeno pasa a la sangre.',
      '¡Y al soltar el aire, salgo llevándome lo que ya no sirve!',
    ],
  },
];

export function getOrgan(id: string): Organ | undefined {
  return ORGANS.find((o) => o.id === id);
}

export function getJourney(id: string): Journey | undefined {
  return JOURNEYS.find((j) => j.id === id);
}

/** Órganos discretos que se muestran dentro de la figura (no capas enteras). */
export const INNER_ORGAN_IDS = ['corazon', 'pulmones', 'cerebro', 'estomago'] as const;

/** Órgano representativo de cada sistema (para el toggle de sistemas). */
export const SYSTEM_ORGAN: Record<string, string> = {
  circulatorio: 'corazon',
  respiratorio: 'pulmones',
  nervioso: 'cerebro',
  digestivo: 'estomago',
  oseo: 'huesos',
  muscular: 'musculos',
};
