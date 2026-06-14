# Modelos 3D (GLB)

Modelos animados de los dinosaurios que se empaquetan en la app. La app los
resuelve con `import.meta.glob`, así que funciona aunque la carpeta esté vacía
(usa los dinosaurios procedurales como respaldo).

## Cómo poblarlos

> **Importante: usa modelos ESTÁTICos (sin animación / sin rig).** Los modelos
> "animated"/"rigged" (con esqueleto) no se renderizan de forma fiable aquí
> (salen invisibles o mal escalados). Los modelos estáticos low-poly funcionan
> perfectamente: la app los normaliza de tamaño y los anima por código
> (caminar/cola) igual que a los procedurales.

1. Rellena cada `url` en `src/data/models.manifest.json` con un enlace **directo
   a un .glb estático** (CC0 recomendado):
   - **Poly Pizza** (https://poly.pizza/search/Dinosaur): la mayoría son
     estáticos; el botón *Download* da una URL `.glb`. Evita los marcados como
     "Animated".
   - **Quaternius "LowPoly Dinosaurs"** (CC0, **sin animación**) — distinto del
     pack "Animated Dinosaurs". Conviértelo a `.glb` con Blender si hace falta.
2. Ejecuta:
   ```bash
   npm run models
   ```
   Descarga aquí los archivos como `<id>.glb` (p. ej. `trex.glb`, `triceratops.glb`).
3. `npm run dev`: el dino usará automáticamente su modelo en vez del procedural.

Optimiza los `.glb` si pesan mucho: `npx @gltf-transform/cli optimize in.glb out.glb`.
