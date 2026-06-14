import { useMemo } from 'react';
import * as THREE from 'three';
import type { Body } from '../../data/types';
import { createBodyTexture, createRingTexture, createGlowTexture } from '../../utils/textures';
import Atmosphere from './Atmosphere';

interface Props {
  body: Body;
  /** Escala extra sobre body.scene.size (la vista detalle lo agranda). */
  scale?: number;
}

/** Esfera con textura procedural, anillos e inclinación. El Sol además brilla. */
export default function CelestialBody({ body, scale = 1 }: Props) {
  const size = body.scene.size * scale;
  const texture = useMemo(() => createBodyTexture(body.id, body.texture), [body]);
  const isSun = body.kind === 'estrella';

  const glow = useMemo(
    () => (isSun ? createGlowTexture('sun-glow', 'rgba(255,200,80,0.9)') : null),
    [isSun],
  );
  const corona = useMemo(
    () => (isSun ? createGlowTexture('sun-corona', 'rgba(255,150,40,0.55)') : null),
    [isSun],
  );

  const atmosphere = body.scene.atmosphere;

  return (
    <group rotation={[0, 0, body.scene.tilt ?? 0]}>
      <mesh>
        <sphereGeometry args={[size, 48, 48]} />
        {isSun ? (
          // toneMapped=false mantiene el color a tope para que el bloom lo capte.
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
        )}
      </mesh>
      {isSun && glow && corona && (
        <>
          <sprite scale={[size * 5.2, size * 5.2, 1]}>
            <spriteMaterial
              map={corona}
              transparent
              opacity={0.7}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          <sprite scale={[size * 3.2, size * 3.2, 1]}>
            <spriteMaterial
              map={glow}
              transparent
              opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        </>
      )}
      {atmosphere && (
        <Atmosphere radius={size} color={atmosphere.color} intensity={atmosphere.intensity ?? 1} />
      )}
      {body.scene.rings && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[size * (body.scene.rings.inner / body.scene.size), size * (body.scene.rings.outer / body.scene.size), 96]}
          />
          <meshBasicMaterial
            map={createRingTexture(body.id, body.scene.rings.color)}
            transparent
            opacity={body.scene.rings.opacity ?? 0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
