import { EffectComposer, Bloom, Vignette, ToneMapping, N8AO, DepthOfField } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useApp } from '../../state/store';

/**
 * Pipeline de postprocesado reutilizable. El Bloom es el gran salto visual y
 * el ToneMapping ACES al final da el look "de película": sin él, el composer
 * anula el tone mapping por defecto y todo se ve plano y lavado.
 *
 * Se monta solo si la calidad lo permite; en gama baja devuelve null y la
 * escena se renderiza directa (con el ACES por defecto de r3f), sin coste extra.
 *
 * Opcionalmente añade:
 *  - `ao`: oclusión ambiental (N8AO). Oscurece los recovecos y "asienta" los
 *    objetos: sin ella todo parece flotar. Solo en gama alta (cuesta).
 *  - `dof`: profundidad de campo. Desenfoca lo que está fuera del plano de
 *    foco, como una cámara real (o un microscopio). Solo en gama alta.
 */
export default function Effects({
  ao = false,
  dof,
  bloomThreshold = 0.55,
  bloomRadius = 0.7,
}: {
  /** Oclusión ambiental (solo se aplica en gama alta). */
  ao?: boolean;
  /** Profundidad de campo: distancia de foco (0–1) y tamaño del bokeh. */
  dof?: { focusDistance?: number; focalLength?: number; bokehScale?: number };
  bloomThreshold?: number;
  bloomRadius?: number;
} = {}) {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;
  const heavy = quality.tier === 'high';

  return (
    <EffectComposer multisampling={quality.antialias ? 4 : 0}>
      {ao && heavy ? (
        <N8AO aoRadius={1.2} intensity={2.4} distanceFalloff={0.8} quality="medium" halfRes color="#0a0f1c" />
      ) : (
        <></>
      )}
      <Bloom
        intensity={quality.bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={bloomRadius}
      />
      {dof && heavy ? (
        <DepthOfField
          focusDistance={dof.focusDistance ?? 0.012}
          focalLength={dof.focalLength ?? 0.03}
          bokehScale={dof.bokehScale ?? 3}
        />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.28} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
