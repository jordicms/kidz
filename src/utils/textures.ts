import * as THREE from 'three';
import type { TextureConfig } from '../data/types';

/**
 * Texturas procedurales dibujadas en canvas: la app no necesita descargar
 * imágenes, funciona 100% offline (importante para iOS/Android).
 */

const cache = new Map<string, THREE.Texture>();

/** RNG con semilla para que cada astro tenga siempre el mismo aspecto. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return `#${ca.lerp(cb, t).getHexString()}`;
}

/** Color a lo largo de una paleta (t entre 0 y 1). */
function paletteColor(colors: string[], t: number): string {
  if (colors.length === 1) return colors[0];
  const clamped = Math.min(0.9999, Math.max(0, t));
  const scaled = clamped * (colors.length - 1);
  const i = Math.floor(scaled);
  return lerpColor(colors[i], colors[i + 1], scaled - i);
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  rand: () => number,
  wobble: number,
) {
  const phase = rand() * Math.PI * 2;
  const freq = 2 + rand() * 3;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const wave = wobble * Math.sin(t * Math.PI * freq * 2 + phase);
    // Repite la paleta un par de veces para conseguir más bandas
    const bandT = (t * 2 + wave) % 1;
    ctx.fillStyle = paletteColor(colors, bandT < 0 ? bandT + 1 : bandT);
    ctx.fillRect(0, y, w, 1);
  }
}

function drawSpot(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spot: NonNullable<TextureConfig['spot']>,
) {
  const cx = spot.x * w;
  const cy = spot.y * h;
  const rx = spot.w * w * 0.5;
  const ry = spot.h * h * 0.5;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  grad.addColorStop(0, spot.color);
  grad.addColorStop(0.7, spot.color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCraters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  rand: () => number,
) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = h * 0.1 + rand() * h * 0.8;
    const r = 3 + rand() * 14;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.18, r * 0.85, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
}

function drawSpeckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  alpha: number,
) {
  for (let i = 0; i < 2500; i++) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    const r = 1 + rand() * 3;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPolarCaps(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  for (const top of [true, false]) {
    const grad = ctx.createLinearGradient(0, top ? 0 : h, 0, top ? h * 0.14 : h - h * 0.14);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, top ? 0 : h - h * 0.14, w, h * 0.14);
  }
}

function drawContinents(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  land: string,
) {
  // Cada continente es un grupo de blobs solapados
  for (let c = 0; c < 9; c++) {
    const cx = rand() * w;
    const cy = h * 0.18 + rand() * h * 0.64;
    const blobs = 6 + Math.floor(rand() * 10);
    for (let b = 0; b < blobs; b++) {
      const x = cx + (rand() - 0.5) * w * 0.14;
      const y = cy + (rand() - 0.5) * h * 0.18;
      const r = 8 + rand() * 30;
      ctx.fillStyle = lerpColor(land, '#2d7a3a', rand() * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Repetición horizontal para que la textura no tenga costura
      ctx.beginPath();
      ctx.arc(x > w / 2 ? x - w : x + w, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 3 + Math.floor(rand() * 5);
    for (let j = 0; j < len; j++) {
      ctx.beginPath();
      ctx.arc(x + j * 14, y + (rand() - 0.5) * 8, 5 + rand() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSunGranules(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
) {
  for (let i = 0; i < 1800; i++) {
    const t = rand();
    ctx.fillStyle =
      t > 0.6 ? 'rgba(255,255,220,0.16)' : t > 0.3 ? 'rgba(255,140,0,0.14)' : 'rgba(200,60,0,0.12)';
    const r = 4 + rand() * 16;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createBodyTexture(id: string, config: TextureConfig): THREE.Texture {
  const key = `body:${id}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const w = 1024;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = mulberry32(hashString(id));

  switch (config.type) {
    case 'sun': {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      config.colors.forEach((c, i) => grad.addColorStop(i / (config.colors.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      drawSunGranules(ctx, w, h, rand);
      break;
    }
    case 'gas': {
      drawBands(ctx, w, h, config.colors, rand, 0.06);
      drawSpeckle(ctx, w, h, rand, 0.02);
      if (config.spot) drawSpot(ctx, w, h, config.spot);
      break;
    }
    case 'ice': {
      drawBands(ctx, w, h, config.colors, rand, 0.02);
      if (config.spot) drawSpot(ctx, w, h, config.spot);
      break;
    }
    case 'rocky': {
      ctx.fillStyle = config.colors[0];
      ctx.fillRect(0, 0, w, h);
      // Manchas grandes del segundo color
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = lerpColor(config.colors[0], config.colors[1] ?? config.colors[0], rand());
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 15 + rand() * 60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawSpeckle(ctx, w, h, rand, 0.05);
      if (config.craters) drawCraters(ctx, w, h, config.craters, rand);
      if (config.caps) drawPolarCaps(ctx, w, h, config.caps);
      break;
    }
    case 'earth': {
      const [ocean, land, ice] = config.colors;
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, w, h);
      drawContinents(ctx, w, h, rand, land);
      drawPolarCaps(ctx, w, h, ice);
      drawClouds(ctx, w, h, rand);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Textura de anillos: círculos concéntricos translúcidos (mapea sobre RingGeometry plano). */
export function createRingTexture(id: string, color: string): THREE.Texture {
  const key = `ring:${id}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(hashString(key));
  const center = size / 2;
  for (let r = size * 0.28; r < size * 0.5; r += 2.5) {
    const alpha = 0.15 + rand() * 0.55;
    ctx.strokeStyle = lerpColor(color, '#ffffff', rand() * 0.3);
    ctx.globalAlpha = alpha * (rand() > 0.92 ? 0.15 : 1); // huecos tipo división de Cassini
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

/** Reduce el alfa de un color rgб()/rgba() para crear paradas intermedias suaves. */
function fadeColor(color: string, factor: number): string {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color;
  const parts = m[1].split(',').map((p) => p.trim());
  const [r, g, b] = parts;
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  return `rgba(${r}, ${g}, ${b}, ${(a * factor).toFixed(3)})`;
}

/** Sprite circular con degradado radial: brillos, halos, nubes de nebulosa... */
export function createGlowTexture(key: string, inner: string, outer = 'rgba(0,0,0,0)'): THREE.Texture {
  const cacheKey = `glow:${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, fadeColor(inner, 0.55));
  grad.addColorStop(0.7, fadeColor(inner, 0.16));
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  cache.set(cacheKey, texture);
  return texture;
}

/**
 * Disco de acreción: degradado horizontal (interior caliente → exterior frío)
 * pensado para mapearse de forma radial en un anillo (UV remapeada). Brilla
 * mucho a propósito para que el bloom lo capte.
 */
export function createAccretionTexture(): THREE.Texture {
  const cacheKey = 'accretion-disk';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const w = 512;
  const h = 8;
  const { canvas, ctx } = makeCanvas(w, h);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.06, 'rgba(225,240,255,1)');
  grad.addColorStop(0.2, 'rgba(255,244,214,1)');
  grad.addColorStop(0.42, 'rgba(255,170,70,1)');
  grad.addColorStop(0.68, 'rgba(205,70,30,0.9)');
  grad.addColorStop(1.0, 'rgba(60,12,6,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapT = THREE.RepeatWrapping;
  cache.set(cacheKey, texture);
  return texture;
}
