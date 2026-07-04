# Texturas PBR (Poly Haven, CC0)

Sets de difuso + normales + rugosidad para materiales realistas (terreno,
rocas, troncos). Se descargan con:

```bash
npm run pbr
```

según `src/data/pbr.manifest.json` → `<key>-{diff,nor,rough}.jpg`. La app las
aplica sola si existen (`src/utils/pbr.ts`); sin ellas usa colores planos.
Licencia CC0 (se genera `CREDITS-pbr.md`).
