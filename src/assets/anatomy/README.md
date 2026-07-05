# Modelos anatómicos reales (GLB)

Modelos de órganos/esqueleto/cuerpo que la app usa en el capítulo del Cuerpo
Humano. Si falta uno, se usa su versión **procedural**.

## Cómo poblarlos

1. Rellena cada `url` en `src/data/anatomy.manifest.json` con un enlace **directo
   a un .glb**. Fuentes recomendadas (ver `_fuentes` en el manifiesto):
   - **BodyParts3D / Anatomography** (CC BY-SA) — anatomía completa por piezas.
   - **NIH 3D** (3d.nih.gov) — muchos modelos CC0; convierte STL→GLB.
   - **Z-Anatomy** (CC BY-SA) — abre el .blend y exporta a .glb.
   - **Sketchfab** — filtra Downloadable + CC.
2. Ejecuta:
   ```bash
   npm run anatomy
   ```
   Descarga aquí `<key>.glb` (corazon, pulmones, cerebro, estomago, intestinos,
   huesos, musculos, cuerpo).
3. `npm run dev`: el órgano/cuerpo usará el modelo real automáticamente.

Optimiza los `.glb` (Draco/meshopt) con `npx @gltf-transform/cli optimize in.glb out.glb`.
Las piezas CC BY-SA guardan su atribución en `CREDITS-anatomy.md`.
