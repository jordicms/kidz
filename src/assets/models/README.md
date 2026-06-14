# Modelos 3D (GLB)

Modelos animados de los dinosaurios que se empaquetan en la app. La app los
resuelve con `import.meta.glob`, así que funciona aunque la carpeta esté vacía
(usa los dinosaurios procedurales como respaldo).

## Cómo poblarlos

1. Rellena cada `url` en `src/data/models.manifest.json` con un enlace **directo
   a un .glb** (CC0 recomendado):
   - **Poly Pizza** (https://poly.pizza/search/Dinosaur): el botón *Download* da
     una URL `.glb`.
   - **Quaternius "Animated Dinosaurs"** (CC0): convierte el FBX a `.glb` con
     Blender (`File → Export → glTF 2.0`).
2. Ejecuta:
   ```bash
   npm run models
   ```
   Descarga aquí los archivos como `<id>.glb` (p. ej. `trex.glb`, `triceratops.glb`).
3. `npm run dev`: el dino usará automáticamente su modelo real (con animación de
   andar/correr) en vez del procedural.

Optimiza los `.glb` si pesan mucho: `npx @gltf-transform/cli optimize in.glb out.glb`.
