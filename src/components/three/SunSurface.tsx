import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Superficie del Sol con shader animado: plasma hirviendo (fbm turbulento),
 * fulguraciones brillantes y borde incandescente (Fresnel). Emite valores HDR
 * (>1) a propósito para que el bloom y los god rays lo hagan irradiar.
 */

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.55;
    }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos);
    float t = uTime * 0.045;
    // Turbulencia: ruido que distorsiona a otro ruido (plasma en movimiento)
    float q = fbm(p * 3.5 + t);
    float n = fbm(p * 3.5 + q * 1.6 + vec3(t * 1.6, -t, t * 0.5));

    vec3 deep = vec3(0.55, 0.09, 0.0);
    vec3 mid = vec3(1.0, 0.42, 0.02);
    vec3 hot = vec3(1.0, 0.86, 0.45);
    vec3 col = mix(deep, mid, smoothstep(0.25, 0.62, n));
    col = mix(col, hot, smoothstep(0.62, 0.9, n));
    // Fulguraciones puntuales muy brillantes
    col += hot * pow(max(n - 0.72, 0.0) * 4.0, 2.0);
    // Borde incandescente
    float fres = pow(1.0 - abs(dot(normalize(vViewPosition), vNormal)), 2.5);
    col += vec3(1.0, 0.55, 0.15) * fres * 1.1;

    gl_FragColor = vec4(col * 1.6, 1.0);
  }
`;

export default function SunSurface({ size }: { size: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader,
        fragmentShader,
      }),
    [],
  );
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });
  return (
    <mesh material={material}>
      <sphereGeometry args={[size, 64, 64]} />
    </mesh>
  );
}
