import { EffectComposer, Bloom, Vignette, ToneMapping, N8AO, DepthOfField, ChromaticAberration, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';
import { useApp } from '../../state/store';

export interface EffectsProps {
  /** Oclusión ambiental (N8AO): sombras de contacto en pliegues y huecos. Solo gama alta/media. */
  ao?: boolean | { radius?: number; intensity?: number };
  /** Umbral de luminancia a partir del cual algo brilla (bloom). */
  bloomThreshold?: number;
  /** Multiplicador sobre la intensidad de bloom del preset de calidad. */
  bloomScale?: number;
  /** Profundidad de campo (desenfoque cinematográfico). Solo gama alta. */
  dof?: { focusDistance?: number; focalLength?: number; bokehScale?: number };
  /** Aberración cromática sutil en los bordes (sensación de lente / velocidad). */
  chromatic?: number;
  /** Oscurecimiento de los bordes. */
  vignette?: number;
  /** Radio del bloom. */
  bloomRadius?: number;
}

const chromaOffset = new Vector2();

/**
 * Pipeline de postprocesado reutilizable. El Bloom es el gran salto visual y
 * el ToneMapping ACES al final da el look "de película": sin él, el composer
 * anula el tone mapping por defecto y todo se ve plano y lavado.
 *
 * Opcionales por escena: N8AO (oclusión ambiental), profundidad de campo y
 * aberración cromática. Se degradan solos según la calidad del dispositivo.
 * En gama baja devuelve null y la escena se renderiza directa (con el ACES por
 * defecto de r3f), sin coste extra.
 */
export default function Effects({ ao, bloomThreshold = 0.55, bloomScale = 1, bloomRadius = 0.7, dof, chromatic, vignette = 0.7 }: EffectsProps = {}) {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;
  const high = quality.tier === 'high';
  const aoOpts = typeof ao === 'object' ? ao : {};
  // `ao` a secas (como lo usan las escenas previas) solo en gama alta; con
  // opciones explícitas también en media, a media resolución.
  const aoOn = typeof ao === 'object' ? true : !!ao && high;
  chromaOffset.set(chromatic ?? 0, (chromatic ?? 0) * 0.6);

  return (
    <EffectComposer multisampling={aoOn ? 0 : quality.antialias ? 4 : 0}>
      <>{aoOn ? (
        <N8AO
          halfRes={!high}
          quality={high ? 'high' : 'performance'}
          aoRadius={aoOpts.radius ?? 0.4}
          distanceFalloff={0.6}
          intensity={aoOpts.intensity ?? 2.2}
          color="#050208"
        />
      ) : null}</>
      <>{dof && high ? (
        <DepthOfField focusDistance={dof.focusDistance ?? 0.02} focalLength={dof.focalLength ?? 0.05} bokehScale={dof.bokehScale ?? 3} />
      ) : null}</>
      <Bloom
        intensity={quality.bloomIntensity * bloomScale}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={bloomRadius}
      />
      <>{chromatic ? <ChromaticAberration offset={chromaOffset} radialModulation modulationOffset={0.35} blendFunction={BlendFunction.NORMAL} /> : null}</>
      <Vignette eskil={false} offset={0.28} darkness={vignette} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <>{aoOn ? <SMAA /> : null}</>
    </EffectComposer>
  );
}
