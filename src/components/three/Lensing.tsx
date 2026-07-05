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
  uniform float uRingGain;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // El aspecto se saca de la resolución (uniform de postprocessing): así el
    // efecto no se recrea al redimensionar la vista (barra del navegador en iOS).
    float uAspect = resolution.x / resolution.y;
    vec2 d = uv - uHole;
    d.x *= uAspect;
    float dist = length(d);
    float bend = uStrength * (uRadius * uRadius) / (dist * dist + 0.0008);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    vec2 off = dir * bend;
    off.x /= uAspect;
    // Dispersión cromática: cada color se curva un poco distinto (arcoíris
    // gravitacional en el borde del horizonte).
    float r = texture(inputBuffer, clamp(uv - off * 1.07, 0.0, 1.0)).r;
    float g = texture(inputBuffer, clamp(uv - off, 0.0, 1.0)).g;
    float b = texture(inputBuffer, clamp(uv - off * 0.93, 0.0, 1.0)).b;
    float shadow = smoothstep(uRadius * 0.82, uRadius, dist);
    vec3 col = vec3(r, g, b) * shadow;
    // Anillo de fotones (Einstein): brillo intenso justo en el borde de sombra,
    // que el bloom amplifica. Da el aro luminoso realista alrededor del horizonte.
    float ring = exp(-pow((dist - uRadius * 0.93) / (uRadius * 0.1), 2.0));
    col += vec3(1.0, 0.72, 0.38) * ring * uRingGain;
    outputColor = vec4(col, 1.0);
  }
`;

interface LensingOptions {
  radius?: number;
  strength?: number;
  ringGain?: number;
}

class LensingEffectImpl extends Effect {
  constructor({ radius = 0.14, strength = 0.06, ringGain = 0 }: LensingOptions = {}) {
    super('LensingEffect', fragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uHole', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uRadius', new THREE.Uniform(radius)],
        ['uStrength', new THREE.Uniform(strength)],
        ['uRingGain', new THREE.Uniform(ringGain)],
      ]),
    });
  }
}

export const Lensing = wrapEffect(LensingEffectImpl);
