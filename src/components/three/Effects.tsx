import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useApp } from '../../state/store';

/**
 * Pipeline de postprocesado reutilizable. El Bloom es el gran salto visual:
 * todo lo que dibujamos brillante (el Sol, Sagitario A*, el púlsar, el cuásar,
 * las nebulosas...) pasa a irradiar luz de verdad.
 *
 * Se monta solo si la calidad lo permite; en gama baja devuelve null y la
 * escena se renderiza directa, sin coste extra.
 */
export default function Effects() {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;

  return (
    <EffectComposer multisampling={quality.antialias ? 4 : 0}>
      <Bloom
        intensity={quality.bloomIntensity}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={0.7}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.7} />
    </EffectComposer>
  );
}
