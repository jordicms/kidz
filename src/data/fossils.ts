import type { DinoEra } from './dinos';

export type Vec3 = [number, number, number];

/** Tipos de hueso que sabe dibujar el componente Skeleton. */
export type BoneKind =
  | 'skull'
  | 'neck'
  | 'ribcage'
  | 'pelvis'
  | 'tail'
  | 'leg'
  | 'arms'
  | 'plates'
  | 'spikes';

export interface Bone {
  id: string;
  /** Nombre para el niño ("Cráneo", "Costillas"…). */
  label: string;
  kind: BoneKind;
  /** Posición final del hueso en el esqueleto montado. */
  pos: Vec3;
  rot?: Vec3;
  scale?: number | Vec3;
  /** Ajusta la forma dentro de un mismo tipo (p. ej. leg 'biped' vs 'column'). */
  variant?: string;
}

export interface Fossil {
  id: string;
  /** Dino vivo enlazado (para "verlo con vida"). */
  dinoId: string;
  name: string;
  emoji: string;
  era: DinoEra;
  /** Dato curioso que aparece al terminar el montaje. */
  hint: string;
  /** Huesos en orden de montaje (de la cabeza a las patas). */
  bones: Bone[];
}

/* ------------------------------------------------------------------ */
/* Esqueletos                                                          */
/* El dino "mira" hacia +Z (morro delante), la cola va hacia -Z.       */
/* La cámara de la escena lo observa de perfil.                        */
/* ------------------------------------------------------------------ */

const TREX: Bone[] = [
  { id: 'skull', label: 'Cráneo', kind: 'skull', pos: [0, 3.05, 3.15], scale: 1.25, variant: 'theropod' },
  { id: 'neck', label: 'Cuello', kind: 'neck', pos: [0, 2.5, 2.2], variant: 'forward' },
  { id: 'ribs', label: 'Costillas', kind: 'ribcage', pos: [0, 2.15, 0.7], scale: [1.5, 1.3, 2.4] },
  { id: 'arms', label: 'Bracitos', kind: 'arms', pos: [0, 2.05, 1.35], scale: 0.6, variant: 'tiny' },
  { id: 'pelvis', label: 'Cadera', kind: 'pelvis', pos: [0, 2.15, -1.0], scale: 1.2 },
  { id: 'tail', label: 'Cola', kind: 'tail', pos: [0, 2.0, -1.7], scale: [1, 1, 1.35], variant: 'theropod' },
  { id: 'legL', label: 'Pata derecha', kind: 'leg', pos: [0.6, 2.15, -0.7], variant: 'biped' },
  { id: 'legR', label: 'Pata izquierda', kind: 'leg', pos: [-0.6, 2.15, -0.7], variant: 'biped' },
];

const STEGO: Bone[] = [
  { id: 'skull', label: 'Cráneo', kind: 'skull', pos: [0, 1.15, 2.7], scale: 0.7, variant: 'small' },
  { id: 'neck', label: 'Cuello', kind: 'neck', pos: [0, 1.3, 2.1], variant: 'short' },
  { id: 'ribs', label: 'Lomo y costillas', kind: 'ribcage', pos: [0, 2.0, 0.4], scale: [1.4, 1.5, 2.2], variant: 'arched' },
  { id: 'pelvis', label: 'Cadera', kind: 'pelvis', pos: [0, 1.95, -1.0], scale: 1.3 },
  { id: 'plates', label: 'Placas', kind: 'plates', pos: [0, 2.6, 0.4], scale: 1 },
  { id: 'tail', label: 'Cola', kind: 'tail', pos: [0, 1.7, -1.9], scale: [1, 1, 1], variant: 'flat' },
  { id: 'spikes', label: 'Pinchos', kind: 'spikes', pos: [0, 1.55, -3.1], scale: 1 },
  { id: 'legsFront', label: 'Patas delanteras', kind: 'leg', pos: [0, 1.6, 1.0], variant: 'frontPair' },
  { id: 'legsBack', label: 'Patas traseras', kind: 'leg', pos: [0, 2.0, -0.9], variant: 'backPair' },
];

const PLATEO: Bone[] = [
  { id: 'skull', label: 'Cráneo', kind: 'skull', pos: [0, 3.35, 2.3], scale: 0.7, variant: 'small' },
  { id: 'neck', label: 'Cuello largo', kind: 'neck', pos: [0, 2.5, 1.6], variant: 'up' },
  { id: 'ribs', label: 'Costillas', kind: 'ribcage', pos: [0, 2.2, 0.3], scale: [1.25, 1.35, 1.9] },
  { id: 'arms', label: 'Brazos con garra', kind: 'arms', pos: [0, 2.05, 1.1], scale: 0.8, variant: 'claw' },
  { id: 'pelvis', label: 'Cadera', kind: 'pelvis', pos: [0, 2.1, -0.85], scale: 1.15 },
  { id: 'tail', label: 'Cola larga', kind: 'tail', pos: [0, 1.95, -1.6], scale: [1, 1, 1.5], variant: 'long' },
  { id: 'legL', label: 'Pata derecha', kind: 'leg', pos: [0.55, 2.1, -0.55], variant: 'biped' },
  { id: 'legR', label: 'Pata izquierda', kind: 'leg', pos: [-0.55, 2.1, -0.55], variant: 'biped' },
];

export const FOSSILS: Fossil[] = [
  {
    id: 'plateosaurus',
    dinoId: 'plateosaurus',
    name: 'Plateosaurus',
    emoji: '🦕',
    era: 'Triásico',
    hint: '¡Uno de los primeros dinosaurios grandes! Vivió hace más de 200 millones de años, en el Triásico.',
    bones: PLATEO,
  },
  {
    id: 'stegosaurus',
    dinoId: 'stegosaurus',
    name: 'Stegosaurus',
    emoji: '🦴',
    era: 'Jurásico',
    hint: 'Sus placas y los pinchos de la cola lo hacían inconfundible. Vivió en el Jurásico.',
    bones: STEGO,
  },
  {
    id: 'trex',
    dinoId: 'trex',
    name: 'Tyrannosaurus Rex',
    emoji: '🦖',
    era: 'Cretácico',
    hint: '¡El rey de los cazadores! Sus dientes eran del tamaño de un plátano. Vivió al final del Cretácico.',
    bones: TREX,
  },
];

export function getFossil(id: string): Fossil | undefined {
  return FOSSILS.find((f) => f.id === id);
}
