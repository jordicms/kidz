import { createContext, useContext, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Materiales del cuerpo humano:
 * - Tejido PBR (MeshPhysical) con aspecto húmedo (clearcoat) y "sheen" que
 *   imita la luz que atraviesa la piel. Soporta el CORTE animado del escáner:
 *   todo lo que está por encima de `uCut` desaparece y el borde brilla.
 * - Rayos X / holograma: silueta Fresnel translúcida con líneas de escaneo,
 *   para ver los órganos dentro del cuerpo sin perder la referencia.
 */

export interface CutUniforms {
  uCut: { value: number };
  uCutOn: { value: number };
  /** +1: se ve lo que queda por DEBAJO del corte; -1: lo de ENCIMA. */
  uCutDir: { value: number };
  uGlowColor: { value: THREE.Color };
}

export function makeCutUniforms(): CutUniforms {
  return { uCut: { value: 10 }, uCutOn: { value: 0 }, uCutDir: { value: 1 }, uGlowColor: { value: new THREE.Color('#5ff2ff') } };
}

/** Uniforms de corte compartidos por todas las piezas de una capa. */
export const CutContext = createContext<CutUniforms | null>(null);

/** Inyecta el corte del escáner en un shader de material estándar de three. */
function injectCut(shader: THREE.WebGLProgramParametersWithUniforms, cut: CutUniforms) {
  shader.uniforms.uCut = cut.uCut;
  shader.uniforms.uCutOn = cut.uCutOn;
  shader.uniforms.uCutDir = cut.uCutDir;
  shader.uniforms.uGlowColor = cut.uGlowColor;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCutPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vCutPos;\nuniform float uCut;\nuniform float uCutOn;\nuniform float uCutDir;\nuniform vec3 uGlowColor;',
    )
    .replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif (uCutOn > 0.5 && (vCutPos.y - uCut) * uCutDir > 0.0) discard;',
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float cutBand = uCutOn * (1.0 - smoothstep(0.0, 0.05, abs(uCut - vCutPos.y)));
      totalEmissiveRadiance += uGlowColor * cutBand * 4.0;
      if (!gl_FrontFacing && uCutOn > 0.5) { diffuseColor.rgb *= 0.35; totalEmissiveRadiance += uGlowColor * 0.12; }`,
    );
}

function patchCut(mat: THREE.Material, cut: CutUniforms) {
  mat.onBeforeCompile = (shader) => injectCut(shader, cut);
  mat.customProgramCacheKey = () => 'kidz-cut';
}

export interface TissueProps {
  color?: string;
  vertexColors?: boolean;
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  side?: THREE.Side;
}

/** Crea (y actualiza) un material de tejido con soporte de corte. */
export function useTissueMaterial(p: TissueProps): THREE.MeshPhysicalMaterial {
  const cut = useContext(CutContext);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial();
    if (cut) patchCut(m, cut);
    return m;
  }, [cut]);
  useEffect(() => {
    mat.color.set(p.color ?? '#ffffff');
    mat.vertexColors = p.vertexColors ?? true;
    mat.roughness = p.roughness ?? 0.55;
    mat.metalness = p.metalness ?? 0;
    mat.clearcoat = p.clearcoat ?? 0;
    mat.clearcoatRoughness = p.clearcoatRoughness ?? 0.35;
    mat.sheen = p.sheen ?? 0;
    mat.sheenColor.set(p.sheenColor ?? '#ffffff');
    mat.sheenRoughness = 0.6;
    const o = p.opacity ?? 1;
    mat.transparent = o < 1;
    mat.opacity = o;
    mat.depthWrite = o >= 0.6;
    mat.emissive.set(p.emissive ?? '#000000');
    mat.emissiveIntensity = p.emissiveIntensity ?? 1;
    mat.side = cut ? THREE.DoubleSide : (p.side ?? THREE.FrontSide);
    mat.needsUpdate = true;
  }, [mat, cut, p.color, p.vertexColors, p.roughness, p.metalness, p.clearcoat, p.clearcoatRoughness, p.sheen, p.sheenColor, p.opacity, p.emissive, p.emissiveIntensity, p.side]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/* ------------------------------------------------------------------ */
/* Rayos X / holograma                                                 */
/* ------------------------------------------------------------------ */

const xrayVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * wp;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vY = wp.y;
    gl_Position = projectionMatrix * mv;
  }
`;

const xrayFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uScan;
  uniform float uCut;
  uniform float uCutOn;
  uniform float uCutDir;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    if (uCutOn > 0.5 && (vY - uCut) * uCutDir > 0.0) discard;
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    float lines = 0.5 + 0.5 * sin(vY * 160.0 - uTime * 3.0);
    // Barrido luminoso que recorre el cuerpo de arriba abajo.
    float sweep = exp(-pow((vY - (1.9 - mod(uTime * 0.6, 4.2))) / 0.05, 2.0)) * uScan;
    float a = (f * 0.9 + 0.035 + lines * 0.025 * f + sweep * 0.25) * uOpacity;
    gl_FragColor = vec4(uColor * (0.6 + f * 1.4 + sweep * 0.8), a);
  }
`;

/** Material de silueta Fresnel translúcida (modo rayos X). */
export function XRayMaterial({ color = '#6fd8ff', opacity = 1, scan = true }: { color?: string; opacity?: number; scan?: boolean }) {
  const cut = useContext(CutContext);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uScan: { value: scan ? 1 : 0 },
      uCut: cut?.uCut ?? { value: 10 },
      uCutOn: cut?.uCutOn ?? { value: 0 },
      uCutDir: cut?.uCutDir ?? { value: 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cut],
  );
  useEffect(() => {
    uniforms.uColor.value.set(color);
    uniforms.uOpacity.value = opacity;
    uniforms.uScan.value = scan ? 1 : 0;
  }, [color, opacity, scan, uniforms]);
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  // Material creado a mano: R3F copia los uniforms de <shaderMaterial> y se
  // perderían las referencias compartidas con el escáner.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: xrayVert,
        fragmentShader: xrayFrag,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

/* ------------------------------------------------------------------ */
/* Flujo animado (sangre por los vasos, impulsos por los nervios)      */
/* ------------------------------------------------------------------ */

/**
 * Material de tubo con pulsos luminosos que avanzan a lo largo del uv.x
 * (en unidades de longitud reales), en el sentido en que circula el flujo.
 */
export function useFlowMaterial({
  color,
  glow,
  speed = 0.5,
  spacing = 0.12,
  width = 0.25,
  intensity = 2.5,
  roughness = 0.4,
}: {
  color: string;
  glow: string;
  speed?: number;
  spacing?: number;
  width?: number;
  intensity?: number;
  roughness?: number;
}) {
  const cut = useContext(CutContext);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const u = {
      uTime: { value: 0 },
      uGlow: { value: new THREE.Color(glow) },
      uSpeed: { value: speed },
      uSpacing: { value: spacing },
      uWidth: { value: width },
      uIntensity: { value: intensity },
    };
    m.userData.u = u;
    m.onBeforeCompile = (shader) => {
      if (cut) injectCut(shader, cut);
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFlowUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlowUv = uv;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec2 vFlowUv;\nuniform float uTime;\nuniform vec3 uGlow;\nuniform float uSpeed;\nuniform float uSpacing;\nuniform float uWidth;\nuniform float uIntensity;',
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float ph = fract(vFlowUv.x / uSpacing - uTime * uSpeed / uSpacing);
          float pulse = smoothstep(0.0, uWidth * 0.5, ph) * (1.0 - smoothstep(uWidth * 0.5, uWidth, ph));
          totalEmissiveRadiance += uGlow * (0.18 + pulse * uIntensity);`,
        );
    };
    m.customProgramCacheKey = () => (cut ? 'kidz-flow-cut' : 'kidz-flow');
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut]);
  useEffect(() => {
    const u = mat.userData.u;
    mat.color.set(color);
    u.uGlow.value.set(glow);
    u.uSpeed.value = speed;
    u.uSpacing.value = spacing;
    u.uWidth.value = width;
    u.uIntensity.value = intensity;
  }, [mat, color, glow, speed, spacing, width, intensity]);
  useFrame((_, dt) => {
    mat.userData.u.uTime.value += dt;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}
