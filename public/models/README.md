# Modelos 3D de dinosaurios (GLB)

El prototipo funciona **sin modelos** (dibuja dinosaurios procedurales low-poly).
Para usar modelos reales animados, coloca aquí los archivos `.glb` y activa el
`modelUrl` en `src/data/dinos.ts`.

## Dónde conseguirlos (CC0, gratis, animados)

- **Quaternius** – "Animated Dinosaurs" (CC0, sin atribución): rigged con
  animaciones de idle/andar/correr/atacar. Viene en FBX/OBJ/Blend, conviértelo a
  GLB con Blender (`File → Export → glTF 2.0 .glb`) o con `FBX2glTF`.
  https://quaternius.com/packs/animateddinosaurs.html
- **Poly Pizza** – modelos `.glb` listos, CC0/CC-BY, descarga directa:
  https://poly.pizza/search/Dinosaur
- **Sketchfab** – filtra "Downloadable" + licencias CC; revisa la licencia de
  cada modelo.

## Cómo activarlo

1. Guarda el modelo aquí, p. ej. `public/models/trex.glb`.
2. En `src/data/dinos.ts`, en el dino correspondiente, descomenta/añade:
   ```ts
   modelUrl: '/models/trex.glb',
   ```
3. `npm run dev`. El loader (`useGLTF` + `useAnimations`) reproducirá su
   animación de andar automáticamente.

## Consejos

- Mantén cada modelo **ligero** (< ~300 KB). Optimiza con
  [gltf-transform](https://gltf-transform.dev/) (`gltf-transform optimize in.glb out.glb`)
  o Draco/Meshopt.
- Para CC-BY, añade los créditos en un `CREDITS.md` del proyecto.
- Los `.glb` se empaquetan en el build, así que la app **sigue funcionando
  100% offline** también en iOS/Android (Capacitor).
