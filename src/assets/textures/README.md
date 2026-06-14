# Texturas de superficie de los astros

Mapas equirectangulares (foto-realistas) que se aplican a la esfera de cada
astro. La app los resuelve con `import.meta.glob`; si falta el de un astro, se
usa su textura **procedural** de siempre.

## Cómo poblarlos

```bash
npm run textures
```

Descarga las imágenes definidas en `src/data/textures.manifest.json` aquí, como
`<id>.<ext>` (p. ej. `tierra.jpg`, `jupiter.jpg`). La mayoría son de
**Solar System Scope** (CC BY 4.0) → se genera `CREDITS-textures.md` con la
atribución. Si alguna URL falla, el script lo indica; corrige esa entrada y
reejecuta. Conviene optimizar las imágenes para no engordar la app.
