# Fotos reales (empaquetadas)

Aquí van las fotos reales que se muestran en las fichas (astros y dinosaurios).
La app las resuelve con `import.meta.glob`, así que funciona aunque la carpeta
esté vacía (simplemente no se muestra la foto).

## Cómo poblarlas

```bash
node scripts/fetch-photos.mjs      # o: npm run photos
```

Descarga las imágenes definidas en `src/data/photos.manifest.json` aquí, como
`<key>.<ext>` (p. ej. `tierra.jpg`, `trex-fossil.jpg`, `trex-life.jpg`).

- **Astros**: fotos de la NASA (dominio público).
- **Dinosaurios**: foto de **fósil/esqueleto** + **reconstrucción** de paleoarte
  (muchas CC BY-SA → se conserva la atribución en `CREDITS.md`).

Si alguna URL falla, el script lo indica: corrige esa entrada del manifiesto
(nombre de archivo en Wikimedia Commons) y reejecuta. Después, conviene
optimizar las imágenes para no engordar la app.
