/** Una página del cuento que se narra sobre un astro. */
export interface StoryPage {
  emoji: string;
  title: string;
  text: string;
}

/** Una capa del interior de un astro (de fuera hacia dentro). */
export interface Layer {
  name: string;
  color: string;
  /** Radio de la capa como fracción del radio total (0–1). */
  radius: number;
  description: string;
}

/** Dato curioso que se muestra en tarjetas. */
export interface Fact {
  icon: string;
  label: string;
  value: string;
}

/** Aparato/sistema del cuerpo humano. */
export interface BodySystem {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

/** Órgano del cuerpo humano. */
export interface Organ {
  id: string;
  name: string;
  emoji: string;
  /** Sistema al que pertenece (id de BodySystem). */
  system: string;
  color: string;
  /** Posición dentro de la figura, en unidades de escena. */
  position: [number, number, number];
  tagline: string;
  facts: Fact[];
  story: StoryPage[];
}

/** Viaje guiado por dentro del cuerpo (recorrido cinematográfico). */
export interface Journey {
  id: string;
  title: string;
  emoji: string;
  system: string;
  /** Color del "túnel" (vaso, tubo digestivo, vía aérea). */
  tubeColor: string;
  /** Color del viajero (glóbulo rojo, bocado de comida, burbuja de aire). */
  travelerColor: string;
  /** Pasos narrados que se muestran a lo largo del recorrido. */
  steps: string[];
}

/** Luna que orbita un planeta. */
export interface Moon {
  id: string;
  name: string;
  emoji: string;
  fact: string;
  /** Tamaño, distancia y velocidad en unidades de escena. */
  size: number;
  distance: number;
  speed: number;
  color: string;
}

/** Configuración de la textura procedural de un astro. */
export interface TextureConfig {
  type: 'sun' | 'gas' | 'rocky' | 'earth' | 'ice';
  /** Colores base (de polo a polo en gaseosos, mezcla en rocosos). */
  colors: string[];
  /** Número de cráteres para cuerpos rocosos. */
  craters?: number;
  /** Color de los casquetes polares (Marte, por ejemplo). */
  caps?: string;
  /** Gran mancha (Júpiter, Neptuno): posición y tamaño relativos. */
  spot?: { color: string; x: number; y: number; w: number; h: number };
}

export interface SceneConfig {
  /** Radio del astro en unidades de escena. */
  size: number;
  /** Distancia al Sol en unidades de escena. */
  distance: number;
  /** Velocidad orbital (radianes/segundo a velocidad ×1). */
  orbitSpeed: number;
  /** Excentricidad de la órbita (0 = círculo). */
  eccentricity?: number;
  /** Giro de la elipse (orientación del perihelio), en radianes. */
  periapsis?: number;
  /** Inclinación de la órbita respecto al plano, en radianes. */
  inclination?: number;
  /** Velocidad de rotación sobre sí mismo. */
  rotationSpeed: number;
  /** Inclinación del eje en radianes. */
  tilt?: number;
  /** Ángulo inicial en la órbita para que no salgan alineados. */
  phase?: number;
  rings?: { inner: number; outer: number; color: string; opacity?: number };
  /** Halo atmosférico (reborde Fresnel) para planetas con atmósfera. */
  atmosphere?: { color: string; intensity?: number };
}

export interface Body {
  id: string;
  name: string;
  emoji: string;
  kind: 'estrella' | 'planeta' | 'planeta enano';
  tagline: string;
  color: string;
  texture: TextureConfig;
  scene: SceneConfig;
  facts: Fact[];
  story: StoryPage[];
  layers: Layer[];
  moons: Moon[];
}

/** Objeto del espacio profundo (galaxias, nebulosas, púlsares...). */
export interface DeepSpaceObject {
  id: string;
  name: string;
  emoji: string;
  kind: 'agujero negro' | 'galaxia' | 'nebulosa' | 'púlsar' | 'cúmulo' | 'cuásar';
  tagline: string;
  color: string;
  facts: Fact[];
  story: StoryPage[];
}
