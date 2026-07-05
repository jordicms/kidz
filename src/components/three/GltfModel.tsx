import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

/**
 * Cargador GLB genérico y robusto: aplana el modelo a mallas estáticas (con la
 * transformación mundial horneada, evita los fallos de las mallas con esqueleto),
 * lo normaliza a una altura objetivo y lo centra en el origen. Ideal para
 * modelos anatómicos reales (cada órgano se coloca luego con su escala).
 */
function Inner({ url, height }: { url: string; height: number }) {
  const { scene } = useGLTF(url);
  const { object, k, offset } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const flat = new THREE.Group();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        const inst = new THREE.Mesh(m.geometry, m.material);
        inst.matrixAutoUpdate = false;
        inst.matrix.copy(m.matrixWorld);
        inst.castShadow = true;
        inst.receiveShadow = true;
        flat.add(inst);
      }
    });
    flat.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(flat);
    if (box.isEmpty() || !Number.isFinite(box.min.y)) {
      return { object: flat, k: 1, offset: [0, 0, 0] as [number, number, number] };
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = size.y > 0 ? height / size.y : 1;
    return {
      object: flat,
      k: scale,
      offset: [-center.x * scale, -center.y * scale, -center.z * scale] as [number, number, number],
    };
  }, [scene, height]);

  return (
    <group scale={k} position={offset}>
      <primitive object={object} />
    </group>
  );
}

export default function GltfModel({ url, height = 1 }: { url: string; height?: number }) {
  return (
    <Suspense fallback={null}>
      <Inner url={url} height={height} />
    </Suspense>
  );
}
