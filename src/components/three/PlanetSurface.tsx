import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getSurfaceTextureUrl } from '../../utils/surfaceTextures';

/**
 * Superficie de planeta con iluminación día/noche real: terminador suave,
 * lado nocturno oscuro (con luces de ciudad si hay textura `<id>-night`),
 * brillo especular del océano y capa de nubes girando (`<id>-clouds`).
 * El Sol se asume en el origen (vista sistema solar); en la vista detalle
 * (planeta en el origen) usa la dirección de la luz de esa escena.
 */

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;
const DEFAULT_SUN = new THREE.Vector3(8, 4, 6).normalize();
const _world = new THREE.Vector3();

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform float uHasNight;
  uniform vec3 uSunDir;
  uniform float uSpec;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.06, 0.2, ndl);

    vec3 base = texture2D(uDay, vUv).rgb;
    vec3 dayCol = base * (0.16 + 1.05 * max(ndl, 0.0));
    vec3 nightCol = base * 0.035;
    // Luces de ciudad en el lado oscuro (si hay textura nocturna)
    nightCol += texture2D(uNight, vUv).rgb * uHasNight * vec3(1.0, 0.9, 0.7) * 1.4;
    vec3 col = mix(nightCol, dayCol, day);

    // Reflejo especular (océanos)
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 h = normalize(uSunDir + viewDir);
    col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 48.0) * uSpec * day;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function PlanetSurface({
  bodyId,
  size,
  map,
  spec = 0.06,
}: {
  bodyId: string;
  size: number;
  map: THREE.Texture;
  spec?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [cloudsTex, setCloudsTex] = useState<THREE.Texture | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uDay: { value: map },
          uNight: { value: BLACK },
          uHasNight: { value: 0 },
          uSunDir: { value: DEFAULT_SUN.clone() },
          uSpec: { value: spec },
        },
        vertexShader,
        fragmentShader,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uDay.value = map;
  }, [map, material]);
  useEffect(() => {
    material.uniforms.uSpec.value = spec;
  }, [spec, material]);

  // Luces nocturnas y nubes reales, si están descargadas (npm run textures)
  useEffect(() => {
    let alive = true;
    const nightUrl = getSurfaceTextureUrl(`${bodyId}-night`);
    if (nightUrl) {
      new THREE.TextureLoader().load(nightUrl, (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        material.uniforms.uNight.value = t;
        material.uniforms.uHasNight.value = 1;
      });
    }
    const cloudsUrl = getSurfaceTextureUrl(`${bodyId}-clouds`);
    if (cloudsUrl) {
      new THREE.TextureLoader().load(cloudsUrl, (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setCloudsTex(t);
      });
    }
    return () => {
      alive = false;
    };
  }, [bodyId, material]);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.getWorldPosition(_world);
      const dir = material.uniforms.uSunDir.value as THREE.Vector3;
      // Sol en el origen; si el planeta ESTÁ en el origen (vista detalle),
      // usa la dirección de la luz de esa escena.
      if (_world.lengthSq() > 0.4) dir.copy(_world).multiplyScalar(-1).normalize();
      else dir.copy(DEFAULT_SUN);
    }
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.012 * delta;
  });

  return (
    <group ref={group}>
      <mesh material={material}>
        <sphereGeometry args={[size, 48, 48]} />
      </mesh>
      {cloudsTex && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[size * 1.015, 48, 48]} />
          <meshStandardMaterial
            map={cloudsTex}
            alphaMap={cloudsTex}
            transparent
            opacity={0.9}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      )}
    </group>
  );
}
