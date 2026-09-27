import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useApp } from '../../state/store';

/**
 * Iluminación de estudio fotográfico 100% procedural (sin descargar HDRIs,
 * funciona offline): un entorno de "softboxes" que da reflejos realistas a los
 * materiales PBR (órganos húmedos, esmalte, ojos...), más fondo degradado y
 * plataforma con sombra de contacto.
 */
export function StudioEnvironment({ tint = '#6fd8ff', warm = '#ff9a7a', intensity = 1 }: { tint?: string; warm?: string; intensity?: number }) {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={intensity}>
      {/* Softbox cenital grande */}
      <Lightformer form="rect" intensity={2.2} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
      {/* Softbox frontal-izquierdo (luz principal) */}
      <Lightformer form="rect" intensity={2.6} position={[-4, 2, 4]} rotation-y={Math.PI / 4} scale={[3, 5, 1]} />
      {/* Contraluces de color: dan el borde brillante "de película" */}
      <Lightformer form="ring" color={tint} intensity={3} position={[5, 1, -3]} scale={3} />
      <Lightformer form="ring" color={warm} intensity={2} position={[-5, -1, -3]} scale={2.5} />
      {/* Suelo tenue */}
      <Lightformer form="rect" intensity={0.4} position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#556" />
    </Environment>
  );
}

const backdropVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const backdropFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float h = vDir.y * 0.5 + 0.5;
    vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
    // Halo suave detrás del sujeto
    float g = exp(-pow(length(vec2(vDir.x, vDir.y * 1.4 - 0.05)) / 0.55, 2.0)) * step(0.0, -vDir.z);
    c += uGlow * g * 0.35;
    // Motas de luz muy sutiles (sensación de profundidad)
    vec2 q = vec2(atan(vDir.z, vDir.x) * 90.0, vDir.y * 90.0);
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float dotMask = smoothstep(0.18, 0.0, length(f));
    float s = step(0.985, hash(cell)) * dotMask * (0.5 + 0.5 * sin(uTime * 1.5 + hash(cell + 3.0) * 6.28));
    c += s * uGlow * 0.35;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Fondo esférico con degradado, halo y motas (no afecta a la iluminación). */
export function GradientBackdrop({ top = '#1b2a4a', bottom = '#07090f', glow = '#3fa9d6', radius = 40 }: { top?: string; bottom?: string; glow?: string; radius?: number }) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uGlow: { value: new THREE.Color(glow) },
      uTime: { value: 0 },
    }),
    [top, bottom, glow],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVert,
        fragmentShader: backdropFrag,
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={radius} renderOrder={-10} material={material}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}

/** Plataforma holográfica con anillos que giran + sombra de contacto suave. */
export function HoloPlatform({ y = -1.6, radius = 1.1, color = '#5fe3ff' }: { y?: number; radius?: number; color?: string }) {
  const tier = useApp((s) => s.quality.tier);
  const ring = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.25;
  });
  return (
    <group position={[0, y, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#0e1626" roughness={0.35} metalness={0.6} />
      </mesh>
      <group ref={ring} rotation-x={-Math.PI / 2}>
        <mesh>
          <ringGeometry args={[radius * 0.97, radius, 96]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <mesh>
          <ringGeometry args={[radius * 0.7, radius * 0.715, 96, 1, 0, Math.PI * 1.4]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
        </mesh>
        <mesh rotation-z={Math.PI}>
          <ringGeometry args={[radius * 0.8, radius * 0.81, 96, 1, 0, Math.PI * 0.6]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
        </mesh>
      </group>
      {tier !== 'low' && (
        <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={radius * 3} blur={2.4} far={2.2} resolution={512} color="#000814" />
      )}
    </group>
  );
}
