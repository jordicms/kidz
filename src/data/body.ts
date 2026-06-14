import type { BodySystem, Layer, Organ } from './types';

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
  // Más órganos (pulmones, cerebro, estómago, huesos...) se añadirán aquí.
];

export function getOrgan(id: string): Organ | undefined {
  return ORGANS.find((o) => o.id === id);
}
