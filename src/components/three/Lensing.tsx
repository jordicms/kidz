import * as THREE from 'three';
import { Effect } from 'postprocessing';
import { wrapEffect } from '@react-three/postprocessing';

/**
 * Lente gravitacional (estilizada): distorsiona en pantalla la imagen ya
 * renderizada alrededor del agujero negro, curvando la luz del fondo hacia el
 * horizonte y oscureciendo su interior. Es una aproximación screen-space
 * (no raymarching), barata y vistosa.
 */
const fragmentShader = /* glsl */ `
  uniform vec2 uHole;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uAspect;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 d = uv - uHole;
    d.x *= uAspect;
    float dist = length(d);
    float bend = uStrength * (uRadius * uRadius) / (dist * dist + 0.0008);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    vec2 off = dir * bend;
    off.x /= uAspect;
    vec2 suv = clamp(uv - off, 0.0, 1.0);
    vec4 col = texture(inputBuffer, suv);
    float shadow = smoothstep(uRadius * 0.82, uRadius, dist);
    outputColor = vec4(col.rgb * shadow, 1.0);
  }
`;

interface LensingOptions {
  radius?: number;
  strength?: number;
  aspect?: number;
}

class LensingEffectImpl extends Effect {
  constructor({ radius = 0.14, strength = 0.06, aspect = 1 }: LensingOptions = {}) {
    super('LensingEffect', fragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uHole', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uRadius', new THREE.Uniform(radius)],
        ['uStrength', new THREE.Uniform(strength)],
        ['uAspect', new THREE.Uniform(aspect)],
      ]),
    });
  }
}

export const Lensing = wrapEffect(LensingEffectImpl);
