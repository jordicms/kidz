import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { MeshTierContext, XRayShell } from '../../components/three/body/BodyParts';
import { curveOf } from '../../components/three/body/geo';
import type { Tier } from '../../components/three/body/registry';
import type { JourneyCfg } from './config';
import type { RideState } from './Travelers';

/**
 * Minimapa: el cuerpo en rayos X con el recorrido dibujado y un punto que
 * late donde estás ahora. Responde a la pregunta clave de los niños:
 * "¿y esto dónde está dentro de mí?".
 */
function Route({ cfg, state }: { cfg: JourneyCfg; state: RideState }) {
  const curve = useMemo(() => curveOf(cfg.route), [cfg]);
  const pts = useMemo(() => curve.getSpacedPoints(160), [curve]);
  const dot = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const p = curve.getPointAt(Math.min(0.999, Math.max(0, state.route)));
    dot.current?.position.copy(p);
    halo.current?.position.copy(p);
    const k = 1 + Math.sin(clock.elapsedTime * 6) * 0.35;
    halo.current?.scale.setScalar(k);
  });
  const markers = useMemo(() => cfg.stations.map((s) => curve.getPointAt(Math.min(0.999, s.route[0]))), [cfg, curve]);
  return (
    <group>
      <Line points={pts} color={cfg.routeColor} lineWidth={3} transparent opacity={0.9} />
      {markers.map((m, i) => (
        <mesh key={i} position={m}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={dot}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshBasicMaterial color={cfg.routeColor} transparent opacity={0.45} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function MiniMap({ cfg, state, tier }: { cfg: JourneyCfg; state: RideState; tier: Tier }) {
  // Encuadre: caja del recorrido con margen (y siempre algo de cuerpo alrededor).
  const view = useMemo(() => {
    const box = new THREE.Box3().setFromPoints(cfg.route.map((p) => new THREE.Vector3(...p)));
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const h = Math.max(size.y, size.x * 1.3, 0.9) * 1.35;
    return { c, dist: h / (2 * Math.tan((30 * Math.PI) / 360)) };
  }, [cfg]);
  return (
    <div className="journey-map">
      <Canvas
        camera={{ position: [view.c.x * 0.4, view.c.y, view.dist], fov: 30 }}
        dpr={1}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(view.c.x * 0.4, view.c.y, 0)}
      >
        <MeshTierContext.Provider value={tier === 'high' ? 'medium' : 'low'}>
          <Suspense fallback={null}>
            <XRayShell color="#8fe4ff" />
          </Suspense>
        </MeshTierContext.Provider>
        <Route cfg={cfg} state={state} />
      </Canvas>
    </div>
  );
}
