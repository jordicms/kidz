export type Star3 = [number, number, number];

export interface Constellation {
  id: string;
  name: string;
  emoji: string;
  myth: string;
  stars: Star3[];
  /** Pares de índices de estrellas que se unen con líneas. */
  lines: [number, number][];
}

/** Constelaciones (posiciones artísticas en la bóveda, z hacia el fondo). */
export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'osa-mayor',
    name: 'Osa Mayor',
    emoji: '🐻',
    myth: 'El "Carro" o "Cazo" del cielo. Sus dos estrellas del final apuntan siempre a la Estrella Polar, que señala el norte. ¡Es la brújula de los exploradores!',
    stars: [
      [-19, 12, -26],
      [-17, 11.4, -26],
      [-15, 11, -26],
      [-13, 11.2, -26],
      [-12.5, 9.6, -26],
      [-14.6, 9, -26],
      [-15.4, 10.8, -26],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    id: 'orion',
    name: 'Orión',
    emoji: '🏹',
    myth: 'El gran cazador. Sus tres estrellas en fila son el "Cinturón de Orión". La roja Betelgeuse es su hombro y la azul Rigel, su pie.',
    stars: [
      [-1, 9, -24],
      [4, 9, -24],
      [0.5, 4.5, -24],
      [2, 4, -24],
      [3.5, 3.5, -24],
      [-1, -0.5, -24],
      [4.5, -0.5, -24],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    id: 'casiopea',
    name: 'Casiopea',
    emoji: '👑',
    myth: 'Una reina presumida sentada en su trono. Se reconoce por su forma de "W" (o de "M") en el cielo.',
    stars: [
      [11, 10, -26],
      [13, 12, -26],
      [15, 10.5, -26],
      [17, 12, -26],
      [19, 10, -26],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    id: 'cruz-del-sur',
    name: 'Cruz del Sur',
    emoji: '✝️',
    myth: 'La más famosa del cielo del sur. Su brazo largo apunta hacia el Polo Sur, así que ayuda a orientarse a quien vive bajo el ecuador.',
    stars: [
      [14, 1.5, -24],
      [14, -5, -24],
      [11.5, -2, -24],
      [16.5, -2, -24],
    ],
    lines: [
      [0, 1],
      [2, 3],
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    emoji: '🦁',
    myth: 'El león. Su cabeza y melena dibujan una hoz (como un signo de interrogación al revés) y su cuerpo, un triángulo.',
    stars: [
      [-18, 3, -24],
      [-16.5, 1.5, -24],
      [-16, -0.2, -24],
      [-14, -1, -24],
      [-10.5, -1.6, -24],
      [-13, -3.2, -24],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 3],
    ],
  },
];
