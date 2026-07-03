import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useApp } from '../../state/store';

/**
 * Pipeline de postprocesado reutilizable. El Bloom es el gran salto visual y
 * el ToneMapping ACES al final da el look "de película": sin él, el composer
 * anula el tone mapping por defecto y todo se ve plano y lavado.
 *
 * Se monta solo si la calidad lo permite; en gama baja devuelve null y la
 * escena se renderiza directa (con el ACES por defecto de r3f), sin coste extra.
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
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
