import type { Vec3 } from '../../utils/sdf';
import { AIR_ROUTE, BLOOD_ROUTE, DIGESTIVE_ROUTE } from '../../components/three/body/networks';

/**
 * Guion visual de cada viaje: una "estación" por paso de la historia, cada una
 * con su propio escenario (forma del túnel, colores, animación de las paredes y
 * decorados) y su tramo en el minimapa del cuerpo.
 */

export type DecorKind =
  | 'valves' // válvulas del corazón que se abren y cierran
  | 'companions' // otros glóbulos rojos, blancos y plaquetas viajando contigo
  | 'alveoliWall' // racimos de alvéolos en las paredes (pulmón visto desde la sangre)
  | 'tissueCells' // células del cuerpo en las paredes de los capilares
  | 'teeth' // dientes y lengua en la boca
  | 'acid' // burbujas de jugo gástrico
  | 'villi' // vellosidades del intestino delgado
  | 'bacteria' // bacterias amigas del intestino grueso
  | 'hairs' // pelitos de la nariz
  | 'fork' // bifurcación de los bronquios
  | 'alveoliRoom' // la sala final de alvéolos con capilares
  | 'exit'; // luz de salida al final

export interface StationCfg {
  place: string;
  emoji: string;
  /** Longitud del tramo de túnel (unidades). */
  length: number;
  /** Segundos que dura el tramo a velocidad normal. */
  duration: number;
  /** Radio del túnel en este tramo. */
  radius: number;
  color: string;
  color2: string;
  fog: string;
  light: string;
  rings?: { period: number; amp: number };
  haustra?: { period: number; amp: number };
  folds?: { count: number; amp: number };
  peristalsis?: number;
  beat?: number;
  breath?: number;
  decor: DecorKind[];
  /** Tramo [inicio, fin] del recorrido en el minimapa (0–1; puede ir al revés). */
  route: [number, number];
}

export interface JourneyCfg {
  route: Vec3[];
  routeColor: string;
  stations: StationCfg[];
  /** Semilla de las curvas del túnel. */
  seed: number;
}

export const JOURNEY_CFG: Record<string, JourneyCfg> = {
  sangre: {
    route: BLOOD_ROUTE,
    routeColor: '#ff4d4d',
    seed: 3,
    stations: [
      {
        place: 'Dentro del corazón',
        emoji: '🫀',
        length: 24,
        duration: 8,
        radius: 3.4,
        color: '#7d1020',
        color2: '#c23a48',
        fog: '#2a0409',
        light: '#ff8a8a',
        beat: 1,
        decor: ['valves', 'companions'],
        route: [0, 0.05],
      },
      {
        place: 'Una gran arteria',
        emoji: '🛣️',
        length: 34,
        duration: 7,
        radius: 1.7,
        color: '#8e1626',
        color2: '#d4505c',
        fog: '#300409',
        light: '#ffb0a0',
        beat: 0.35,
        decor: ['companions'],
        route: [0.05, 0.16],
      },
      {
        place: 'Los pulmones',
        emoji: '🫁',
        length: 30,
        duration: 9,
        radius: 1.05,
        color: '#b0485e',
        color2: '#f0a0b4',
        fog: '#2a0a1a',
        light: '#b8dcff',
        breath: 1,
        decor: ['alveoliWall', 'companions'],
        route: [0.16, 0.3],
      },
      {
        place: 'Por todo el cuerpo',
        emoji: '🖐️',
        length: 32,
        duration: 9,
        radius: 1.0,
        color: '#9a3040',
        color2: '#e8a070',
        fog: '#28080c',
        light: '#ffd9a0',
        decor: ['tissueCells', 'companions'],
        route: [0.3, 0.66],
      },
      {
        place: 'De vuelta por una vena',
        emoji: '🔁',
        length: 34,
        duration: 8,
        radius: 1.6,
        color: '#4a1a4a',
        color2: '#7a4aa0',
        fog: '#12061c',
        light: '#a8b8ff',
        beat: 0.25,
        decor: ['companions', 'exit'],
        route: [0.66, 1],
      },
    ],
  },
  comida: {
    route: DIGESTIVE_ROUTE,
    routeColor: '#ffb347',
    seed: 11,
    stations: [
      {
        place: 'La boca',
        emoji: '👄',
        length: 22,
        duration: 8,
        radius: 3.2,
        color: '#b0424e',
        color2: '#f08a94',
        fog: '#2a080c',
        light: '#ffd6c0',
        decor: ['teeth'],
        route: [0, 0.06],
      },
      {
        place: 'El esófago',
        emoji: '⬇️',
        length: 30,
        duration: 7,
        radius: 1.1,
        color: '#b4525a',
        color2: '#e8948e',
        fog: '#2a0a0c',
        light: '#ffd0c0',
        peristalsis: 1,
        folds: { count: 6, amp: 0.18 },
        decor: [],
        route: [0.06, 0.25],
      },
      {
        place: 'El estómago',
        emoji: '🧪',
        length: 30,
        duration: 9,
        radius: 3.6,
        color: '#b0584a',
        color2: '#e8a060',
        fog: '#241406',
        light: '#e8ffa0',
        folds: { count: 14, amp: 0.35 },
        decor: ['acid'],
        route: [0.25, 0.42],
      },
      {
        place: 'El intestino delgado',
        emoji: '🌀',
        length: 34,
        duration: 9,
        radius: 1.35,
        color: '#c06a6a',
        color2: '#f4b8a0',
        fog: '#2a0c0a',
        light: '#ffe8a8',
        peristalsis: 0.7,
        decor: ['villi'],
        route: [0.42, 0.74],
      },
      {
        place: 'El intestino grueso',
        emoji: '🦠',
        length: 32,
        duration: 8,
        radius: 1.9,
        color: '#8a4a3a',
        color2: '#c88a60',
        fog: '#1c0e06',
        light: '#d8ffb0',
        haustra: { period: 3.2, amp: 0.45 },
        decor: ['bacteria', 'exit'],
        route: [0.74, 1],
      },
    ],
  },
  aire: {
    route: AIR_ROUTE,
    routeColor: '#9fe6ff',
    seed: 7,
    stations: [
      {
        place: 'La nariz',
        emoji: '👃',
        length: 22,
        duration: 8,
        radius: 2.2,
        color: '#b04a58',
        color2: '#f0a0a8',
        fog: '#240a10',
        light: '#e0f4ff',
        decor: ['hairs'],
        route: [0, 0.2],
      },
      {
        place: 'La tráquea',
        emoji: '🌬️',
        length: 32,
        duration: 7,
        radius: 1.5,
        color: '#a86070',
        color2: '#f4e0e0',
        fog: '#1c0c16',
        light: '#d8f0ff',
        rings: { period: 1.6, amp: 0.22 },
        decor: [],
        route: [0.2, 0.62],
      },
      {
        place: 'Los bronquios',
        emoji: '🌳',
        length: 28,
        duration: 8,
        radius: 1.15,
        color: '#b06880',
        color2: '#f0c8d0',
        fog: '#1c0c1a',
        light: '#c8e8ff',
        rings: { period: 1.4, amp: 0.1 },
        decor: ['fork'],
        route: [0.62, 0.82],
      },
      {
        place: 'Los alvéolos',
        emoji: '🫧',
        length: 26,
        duration: 10,
        radius: 3.0,
        color: '#c06a86',
        color2: '#ffc0d4',
        fog: '#240a1c',
        light: '#b8e0ff',
        breath: 1,
        decor: ['alveoliRoom'],
        route: [0.82, 1],
      },
      {
        place: '¡Afuera!',
        emoji: '💨',
        length: 30,
        duration: 7,
        radius: 1.4,
        color: '#9a6070',
        color2: '#e0c0c8',
        fog: '#161020',
        light: '#e8f0ff',
        rings: { period: 1.6, amp: 0.18 },
        decor: ['exit'],
        route: [1, 0],
      },
    ],
  },
};
