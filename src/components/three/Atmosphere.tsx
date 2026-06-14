import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Halo atmosférico con reborde Fresnel: una esfera un pelín mayor que el
 * planeta, dibujada por dentro (BackSide), que brilla más en los bordes.
 * Da sensación de aire/atmósfera y, con el bloom, queda precioso.
 */
export default function Atmosphere({
  radius,
  color,
  intensity = 1,
}: {
  radius: number;
  color: string;
  intensity?: number;
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uPower: { value: 3.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uPower);
          gl_FragColor = vec4(uColor, fresnel * uIntensity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color, intensity]);

  return (
    <mesh material={material} scale={radius * 1.22}>
      <sphereGeometry args={[1, 48, 48]} />
    </mesh>
  );
}
