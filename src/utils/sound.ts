/**
 * Rugidos sintetizados con la Web Audio API: no descargamos ningún audio,
 * funciona offline. El tono base depende del tamaño del animal (los grandes
 * rugen más grave). Se crea el AudioContext al primer toque (gesto del usuario).
 */

let ctx: AudioContext | null = null;
let muted = false;

/** Silencia/activa todo el audio de la app (efectos y ambientes). */
export function setMuted(m: boolean): void {
  muted = m;
  if (m) stopAmbient();
}

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
  if (muted) return;
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

/** Un golpe grave y corto (para el "lub" y el "dub" del latido). */
function thump(ac: AudioContext, freq: number, at: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.18);
}

/** Reproduce unos latidos "lub-dub" a las pulsaciones indicadas. */
export function playHeartbeat(bpm = 90, beats = 3): void {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const period = 60 / bpm;
  for (let i = 0; i < beats; i++) {
    const t = ac.currentTime + i * period;
    thump(ac, 70, t, 0.6); // lub
    thump(ac, 55, t + period * 0.28, 0.42); // dub
  }
}

/** "Whoosh" para las transiciones entre escenas (ruido con barrido de filtro). */
export function playWhoosh(): void {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.7);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(180, now);
  bp.frequency.exponentialRampToValueAtTime(2200, now + 0.28);
  bp.frequency.exponentialRampToValueAtTime(250, now + 0.65);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.35, now + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(now);
}

/* ------------------------------------------------------------------ */
/* Ambientes por escena (drones y texturas suaves, todo sintetizado)   */
/* ------------------------------------------------------------------ */

export type AmbientKind = 'space' | 'island' | 'body' | 'ocean';

let ambient: { kind: AmbientKind; stops: (() => void)[]; gain: GainNode } | null = null;

function noiseSource(ac: AudioContext): AudioBufferSourceNode {
  const len = Math.floor(ac.sampleRate * 2);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function drone(ac: AudioContext, out: AudioNode, freq: number, level: number, lfoHz = 0.06): () => void {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = level;
  // LFO que respira sobre el volumen
  const lfo = ac.createOscillator();
  lfo.frequency.value = lfoHz;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = level * 0.4;
  lfo.connect(lfoGain).connect(g.gain);
  osc.connect(g).connect(out);
  osc.start();
  lfo.start();
  return () => {
    osc.stop();
    lfo.stop();
  };
}

/** Chirrido corto de pájaro (dos barridos descendentes). */
function birdChirp(ac: AudioContext, out: AudioNode) {
  const now = ac.currentTime;
  for (const d of [0, 0.14]) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2400 + Math.random() * 600, now + d);
    o.frequency.exponentialRampToValueAtTime(1600, now + d + 0.09);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now + d);
    g.gain.exponentialRampToValueAtTime(0.08, now + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.11);
    o.connect(g).connect(out);
    o.start(now + d);
    o.stop(now + d + 0.13);
  }
}

/** Blip de burbuja (barrido ascendente cortito). */
function bubbleBlip(ac: AudioContext, out: AudioNode) {
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(500 + Math.random() * 300, now);
  o.frequency.exponentialRampToValueAtTime(1400, now + 0.09);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 0.12);
}

/** Arranca el ambiente de una escena (con fundido). Idempotente por tipo. */
export function startAmbient(kind: AmbientKind): void {
  if (muted) return;
  if (ambient?.kind === kind) return;
  stopAmbient();
  const ac = getCtx();
  if (!ac) return;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ac.currentTime + 1.6);
  gain.connect(ac.destination);
  const stops: (() => void)[] = [];

  if (kind === 'space') {
    stops.push(drone(ac, gain, 55, 0.045, 0.05));
    stops.push(drone(ac, gain, 82.4, 0.03, 0.08));
  } else if (kind === 'ocean') {
    stops.push(drone(ac, gain, 41, 0.05, 0.05));
    const noise = noiseSource(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const ng = ac.createGain();
    ng.gain.value = 0.05;
    noise.connect(lp).connect(ng).connect(gain);
    noise.start();
    stops.push(() => noise.stop());
    const t = window.setInterval(() => bubbleBlip(ac, gain), 1400 + Math.random() * 1200);
    stops.push(() => window.clearInterval(t));
  } else if (kind === 'island') {
    // Olas: ruido filtrado con vaivén lento
    const noise = noiseSource(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    const ng = ac.createGain();
    ng.gain.value = 0.06;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain).connect(ng.gain);
    noise.connect(lp).connect(ng).connect(gain);
    noise.start();
    lfo.start();
    stops.push(() => {
      noise.stop();
      lfo.stop();
    });
    const t = window.setInterval(() => {
      if (Math.random() < 0.75) birdChirp(ac, gain);
    }, 3200);
    stops.push(() => window.clearInterval(t));
  } else if (kind === 'body') {
    stops.push(drone(ac, gain, 68, 0.028, 0.07));
    const beat = () => {
      const now = ac.currentTime;
      thumpInto(ac, gain, 70, now, 0.22);
      thumpInto(ac, gain, 55, now + 0.24, 0.15);
    };
    beat();
    const t = window.setInterval(beat, 900);
    stops.push(() => window.clearInterval(t));
  }

  ambient = { kind, stops, gain };
}

/** Golpe grave enviado a un nodo concreto (para el latido ambiental). */
function thumpInto(ac: AudioContext, out: AudioNode, freq: number, at: number, gainV: number) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gainV, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.18);
}

/** Detiene el ambiente actual con un fundido corto. */
export function stopAmbient(): void {
  if (!ambient) return;
  const a = ambient;
  ambient = null;
  const ac = ctx;
  if (ac) {
    a.gain.gain.setValueAtTime(a.gain.gain.value, ac.currentTime);
    a.gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5);
  }
  window.setTimeout(() => {
    a.stops.forEach((s) => {
      try {
        s();
      } catch {
        /* ya parado */
      }
    });
    a.gain.disconnect();
  }, 550);
}
