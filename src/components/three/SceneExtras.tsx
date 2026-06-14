import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useApp } from '../../state/store';
import { createGlowTexture } from '../../utils/textures';
import { getSurfaceTextureUrl } from '../../utils/surfaceTextures';

/**
 * Fondo estelar real (mapa equirectangular de la Vía Láctea) si está descargado
 * en src/assets/textures/stars.*; si no, no hace nada (se mantiene el color y las
 * estrellas procedurales de la escena).
 */
export function SpaceBackground({ keys = ['stars'] }: { keys?: string[] }) {
  const { scene } = useThree();
  useEffect(() => {
    let url: string | undefined;
    for (const k of keys) {
      url = getSurfaceTextureUrl(k);
      if (url) break;
    }
    if (!url) return;
    let alive = true;
    const prev = scene.background;
    new THREE.TextureLoader().load(url, (tex) => {
      if (!alive) return;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
    });
    return () => {
      alive = false;
      scene.background = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, keys.join('|')]);
  return null;
}

/**
 * Vigila los fps dentro del Canvas y baja un escalón de calidad si el
 * dispositivo no rinde, manteniendo la fluidez sin intervención del usuario.
 */
export function AdaptiveQuality() {
  const degrade = useApp((s) => s.degradeQuality);
  return <PerformanceMonitor flipflops={2} onDecline={degrade} onFallback={degrade} />;
}

/** Una estrella fugaz: aparece, cruza el cielo y se desvanece, luego espera. */
function ShootingStar({ radius }: { radius: number }) {
  const sprite = useRef<THREE.Sprite>(null);
  const glow = useMemo(() => createGlowTexture('shooting-star', 'rgba(255,255,255,0.95)'), []);
  const st = useRef({
    wait: 1 + Math.random() * 6,
    active: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    ang: 0,
    life: 0,
    dur: 1,
  });

  useFrame((_, delta) => {
    const s = st.current;
    const sp = sprite.current;
    if (!sp) return;

    if (!s.active) {
      s.wait -= delta;
      if (s.wait > 0) {
        sp.visible = false;
        return;
      }
      // Aparece en la parte alta de la esfera y cae en diagonal.
      const theta = Math.random() * Math.PI * 2;
      s.pos.set(Math.cos(theta) * radius, radius * (0.25 + Math.random() * 0.5), Math.sin(theta) * radius);
      s.vel
        .set(Math.random() - 0.5, -(0.4 + Math.random() * 0.5), Math.random() - 0.5)
        .normalize()
        .multiplyScalar(radius * 1.1);
      s.ang = Math.atan2(s.vel.y, s.vel.x);
      s.life = 0;
      s.dur = 0.7 + Math.random() * 0.6;
      s.active = true;
      sp.visible = true;
    }

    s.life += delta;
    s.pos.addScaledVector(s.vel, delta);
    sp.position.copy(s.pos);

    const k = s.life / s.dur;
    const mat = sp.material as THREE.SpriteMaterial;
    mat.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.9;
    mat.rotation = s.ang;
    sp.scale.set(radius * 0.16, radius * 0.018, 1);

    if (k >= 1) {
      s.active = false;
      s.wait = 2 + Math.random() * 6;
      sp.visible = false;
    }
  });

  return (
    <sprite ref={sprite} visible={false}>
      <spriteMaterial
        map={glow}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

/** Varias estrellas fugaces de adorno (solo si la calidad lo permite). */
export function ShootingStars({ count = 2, radius = 120 }: { count?: number; radius?: number }) {
  const enabled = useApp((s) => s.quality.shootingStars);
  if (!enabled) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ShootingStar key={i} radius={radius} />
      ))}
    </>
  );
}
