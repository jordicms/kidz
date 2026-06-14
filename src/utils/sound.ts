/**
 * Rugidos sintetizados con la Web Audio API: no descargamos ningún audio,
 * funciona offline. El tono base depende del tamaño del animal (los grandes
 * rugen más grave). Se crea el AudioContext al primer toque (gesto del usuario).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Frecuencia base sugerida a partir de la altura del animal (m). */
export function roarPitchFor(heightM: number): number {
  // Grande -> grave; pequeño/volador -> más agudo.
  return Math.max(55, Math.min(150, 150 - heightM * 7));
}

/** Reproduce un rugido corto. `base` es la frecuencia fundamental en Hz. */
export function playRoar(base = 90): void {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.6, now + 0.07);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

  // Filtro paso-bajo que "abre y cierra" para dar sensación de gruñido.
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1400, now);
  lp.frequency.exponentialRampToValueAtTime(380, now + 0.65);
  lp.connect(out);
  out.connect(ac.destination);

  // Dos osciladores ligeramente desafinados con barrido de tono descendente.
  for (const detune of [0, 7]) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(base * 1.7, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.6, now + 0.55);
    osc.connect(lp);
    osc.start(now);
    osc.stop(now + 0.78);
  }

  // Pequeño soplo de ruido al principio para darle textura.
  const len = Math.floor(ac.sampleRate * 0.25);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0.25, now);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  noise.connect(nGain).connect(lp);
  noise.start(now);
}
