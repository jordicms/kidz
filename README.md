# 🚀 Kidz Explora

Aplicación educativa para niños que enseña conceptos del mundo de forma
visual, dinámica y divertida. Web primero, exportable a **iOS y Android**
con Capacitor.

## Capítulo 1: El Universo 🪐

- **Sistema solar 3D interactivo**: el Sol, los 8 planetas, planetas enanos
  (Plutón y Ceres), lunas principales, anillos de Saturno, cinturón de
  asteroides y órbitas animadas. Control de velocidad del tiempo (×1, ×3, pausa).
- **Vista detalle de cada astro**: el planeta gira con sus lunas, y un panel
  cuenta su historia en **modo cuento** (con narración por voz en español),
  datos curiosos y sus lunas.
- **Ver el interior**: corte transversal 3D con las capas de cada astro
  (corteza, manto, núcleo...).
- **La Vía Láctea**: galaxia espiral procedural con **Sagitario A\***, el
  agujero negro central (con su historia), y el marcador "¡estamos aquí!"
  para volver al sistema solar.
- **El universo profundo**: la galaxia de Andrómeda, la Nebulosa de Orión,
  la Nebulosa del Cangrejo, un púlsar, las Pléyades y un cuásar — cada uno
  con su visualización 3D y su cuento.

Todo el contenido visual es **procedural** (texturas dibujadas en canvas):
la app no descarga ninguna imagen y funciona 100% offline.

## Capítulo 2: Los Dinosaurios 🦖 (prototipo)

- **La Isla de los Dinosaurios**: una islita 3D (mar, playa, bosque y un volcán)
  por la que pasean dinosaurios. Tócalos para abrir su ficha con cuento narrado,
  datos curiosos, su **era** y una **comparación de tamaño** contigo.
- **Línea del tiempo** (Triásico / Jurásico / Cretácico) para enseñar cuándo
  vivió cada uno de verdad.
- **Pipeline de modelos 3D**: si un dino define `modelUrl`, se carga un **GLB
  real animado** (`useGLTF` + `useAnimations`); si no, se dibuja un dinosaurio
  **procedural low-poly** para que el prototipo funcione offline sin assets.
  Cómo añadir modelos CC0 reales: ver [`public/models/README.md`](public/models/README.md).

## Capítulo 3: El Cuerpo Humano 🫀 (motor anatómico SDF)

- **Anatomía esculpida con SDF** (`src/components/three/body/`): cuerpo, órganos
  (corazón, pulmones con árbol bronquial, cerebro con circunvoluciones, estómago,
  hígado, riñones, intestinos con haustras), cráneo y pelvis se describen como
  campos de distancia con uniones suaves y se poligonizan con *surface nets*
  (`src/utils/sdf.ts`) en mallas lisas con color por vértice y oclusión ambiental
  horneada. Se generan en un **pool de Web Workers** (sin tirones) y se cachean.
- **Escáner holográfico**: al cambiar de capa (piel → grasa → músculos → huesos →
  órganos) o de sistema, un anillo de luz barre el cuerpo y "pela" la capa en
  directo (corte en shader). Modo **rayos X** con silueta Fresnel.
- **Sistemas vivos**: la sangre circula por arterias (rojo) y venas (azul), los
  impulsos viajan por los nervios, el aire entra y sale de los pulmones y la
  comida recorre el tubo digestivo. Etiquetas tipo libro de anatomía.
- **Viajes por dentro** (`src/scenes/journey/`): cada paso es una estación
  reconocible (dientes y lengua, esófago con peristaltismo, estómago con jugos,
  vellosidades, bacterias, tráquea con anillos, bifurcación de bronquios,
  alvéolos con capilares...). El protagonista tiene carita y cambia a la vista
  (el glóbulo se pone rojo brillante al cargar O₂), las partículas muestran los
  intercambios y un **minimapa del cuerpo** enseña dónde estás.
- **Iluminación de estudio procedural** (`src/components/three/Studio.tsx`):
  entorno de softboxes (sin HDRI, offline), fondo degradado y plataforma.
- **Postprocesado ampliado** (`Effects.tsx`): N8AO (oclusión ambiental), SMAA,
  profundidad de campo y aberración cromática opcionales por escena.
- Si se añaden modelos GLB reales (`npm run anatomy`), la ficha del órgano los usa.

## Efectos visuales y rendimiento

- **Postprocesado** (`@react-three/postprocessing`): bloom + viñeta para que el
  Sol, Sagitario A\*, el púlsar, el cuásar y las nebulosas irradien luz de verdad.
- **Atmósferas** con reborde Fresnel en los planetas que la tienen.
- **Transición** tipo "salto al hiperespacio" al cambiar de escena y feedback al
  tocar los astros.
- **Calidad adaptativa** (`src/utils/quality.ts`): detecta el dispositivo y regula
  resolución, antialias, postprocesado y número de partículas; además un
  `PerformanceMonitor` baja la calidad sola si caen los fps, para mantener la
  fluidez en móvil. Se puede forzar un nivel con `?q=high|medium|low` (para QA).

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción en dist/
```

## Exportar a iOS y Android (Capacitor)

La configuración ya está en `capacitor.config.ts`. En una máquina con las
herramientas nativas (Xcode / Android Studio):

```bash
npm run build
npx cap add ios        # primera vez
npx cap add android    # primera vez
npm run cap:sync       # build + copia la web a los proyectos nativos
npx cap open ios       # abre Xcode
npx cap open android   # abre Android Studio
```

## Arquitectura

```
src/
  data/            # contenido educativo (¡añade capítulos aquí!)
    types.ts       # tipos de astros, historias, capas, lunas...
    solarSystem.ts # Sol, planetas, lunas, historias y capas
    deepSpace.ts   # Vía Láctea, Sagitario A*, nebulosas, púlsar...
  scenes/          # escenas 3D (react-three-fiber)
    SolarSystemScene.tsx
    PlanetScene.tsx     # detalle + corte del interior
    GalaxyScene.tsx
    UniverseScene.tsx
  components/
    three/         # piezas 3D reutilizables (CelestialBody)
    ui/            # cuento paginado, datos curiosos, hoja de historia
  screens/         # pantalla de inicio (selector de capítulos)
  state/store.ts   # navegación y velocidad (zustand)
  utils/
    textures.ts    # texturas procedurales en canvas
    speech.ts      # narración por voz (Web Speech API)
```

### Añadir un capítulo nuevo

1. Crea los datos en `src/data/` siguiendo los tipos de `types.ts`.
2. Crea su escena en `src/scenes/`.
3. Añade la vista al store y a `App.tsx`, y la tarjeta en `HomeScreen.tsx`.
