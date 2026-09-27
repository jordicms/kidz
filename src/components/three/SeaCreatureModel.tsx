import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SeaCreature, SeaPattern } from '../../data/ocean';

/**
 * Criaturas marinas procedurales, con tres ideas para que parezcan de verdad:
 *
 *  1. CUERPOS SUAVES. Antes eran cápsulas y esferas con `flatShading`, que se
 *     veían facetadas y de plástico. Ahora el cuerpo es una superficie de
 *     revolución (Lathe) generada a partir de un perfil, así que el contorno
 *     es continuo y aerodinámico como el de un pez real.
 *  2. PIEL PINTADA POR VÉRTICES. El contrasombreado (lomo oscuro y vientre
 *     claro, que es lo que llevan casi todos los peces), las rayas y las
 *     manchas se calculan por vértice. Sale exacto y sin depender de las UV.
 *  3. NADO ONDULANTE. El cuerpo se dobla con una onda que viaja de la cabeza
 *     a la cola, que es como nada un pez: no es la cola girando suelta.
 *
 * Los materiales son poco rugosos y con barniz para que el mapa de entorno
 * (<Studio/>) les dé el brillo mojado.
 */

/* ------------------------------------------------------------------ */
/* Materiales                                                          */
/* ------------------------------------------------------------------ */

/** Piel mojada: brillo especular y un velo iridiscente (sheen). */
function Skin({
  glow,
  rough = 0.3,
  sheen = 0.5,
  sheenColor = '#cfe8ff',
}: {
  glow?: string;
  rough?: number;
  sheen?: number;
  sheenColor?: string;
}) {
  return (
    <meshPhysicalMaterial
      vertexColors
      roughness={rough}
      metalness={0}
      clearcoat={0.9}
      clearcoatRoughness={0.22}
      envMapIntensity={1.5}
      sheen={sheen}
      sheenColor={sheenColor}
      sheenRoughness={0.6}
      emissive={glow ?? '#000000'}
      emissiveIntensity={glow ? 0.55 : 0}
    />
  );
}

/** Material liso de un color (aletas, caparazones, detalles). */
function Plain({
  color,
  rough = 0.35,
  opacity = 1,
  glow,
  side = THREE.DoubleSide,
}: {
  color: string;
  rough?: number;
  opacity?: number;
  glow?: string;
  side?: THREE.Side;
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={rough}
      metalness={0}
      clearcoat={0.7}
      clearcoatRoughness={0.3}
      envMapIntensity={1.4}
      transparent={opacity < 1}
      opacity={opacity}
      side={side}
      emissive={glow ?? '#000000'}
      emissiveIntensity={glow ? 0.6 : 0}
    />
  );
}

/** Gelatina translúcida (medusas, pulpo dumbo). */
function Jelly1({ color, opacity = 0.42, glow }: { color: string; opacity?: number; glow?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={opacity}
      roughness={0.08}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.1}
      envMapIntensity={2.2}
      side={THREE.DoubleSide}
      depthWrite={false}
      emissive={glow ?? color}
      emissiveIntensity={glow ? 0.7 : 0.18}
    />
  );
}

const EYE_DARK = '#0b0d12';

/** Ojo con brillo: esfera oscura + reflejo especular, que da mucha vida. */
function Eye({ position, r = 0.06 }: { position: [number, number, number]; r?: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[r, 14, 14]} />
        <meshPhysicalMaterial color={EYE_DARK} roughness={0.05} clearcoat={1} envMapIntensity={2.6} />
      </mesh>
      <mesh position={[r * 0.36, r * 0.36, r * 0.58]}>
        <sphereGeometry args={[r * 0.2, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cuerpo: superficie de revolución a partir de un perfil              */
/* ------------------------------------------------------------------ */

/** Perfil de un pez: 0 = cola, 1 = morro. Devuelve el radio en cada punto. */
type Profile = (t: number) => number;

/** Perfil de pez estándar: afilado en el morro, ancho al tercio, fino en la cola. */
const fishProfile: Profile = (t) => {
  // Campana desplazada hacia la cabeza + cola que no llega a cero.
  const belly = Math.sin(Math.pow(t, 0.75) * Math.PI);
  return 0.06 + 0.44 * Math.pow(belly, 0.85);
};

/** Perfil de anguila: casi un tubo, con la cabeza algo más gruesa. */
const eelProfile: Profile = (t) => 0.05 + 0.13 * Math.sin(Math.pow(t, 0.5) * Math.PI) + 0.05 * t;

/** Perfil de ballena: morro redondeado y cuerpo muy voluminoso. */
const whaleProfile: Profile = (t) => 0.08 + 0.5 * Math.pow(Math.sin(Math.pow(t, 0.55) * Math.PI), 0.7);

/** Perfil de tiburón: hidrodinámico, hombros anchos y morro puntiagudo. */
const sharkProfile: Profile = (t) => 0.05 + 0.4 * Math.pow(Math.sin(Math.pow(t, 0.85) * Math.PI), 0.9);

/**
 * Cuerpo alargado a lo largo de +Z (el morro mira a +Z, como el resto de la app).
 *
 * Se construye revolucionando el perfil y se achata luego en X, porque los
 * peces son más altos que anchos. Se pinta por vértices con el color del lomo,
 * el del vientre y el dibujo que toque.
 */
function useBody(
  profile: Profile,
  length: number,
  c1: string,
  c2: string,
  pattern: SeaPattern,
  opts: { radial?: number; steps?: number; wide?: number; tall?: number } = {},
): THREE.BufferGeometry {
  const { radial = 18, steps = 16, wide = 0.62, tall = 1 } = opts;
  return useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(new THREE.Vector2(Math.max(0.004, profile(t)), t * length));
    }
    const geo = new THREE.LatheGeometry(pts, radial);
    geo.rotateX(Math.PI / 2); // el eje pasa de +Y a +Z
    geo.translate(0, 0, -length / 2);
    geo.scale(wide, tall, 1);
    paint(geo, c1, c2, pattern, length);
    geo.computeVertexNormals();
    return geo;
  }, [profile, length, c1, c2, pattern, radial, steps, wide, tall]);
}

/** Ruido determinista para las manchas. */
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Pinta la piel por vértices.
 *
 * El contrasombreado (lomo oscuro, vientre claro) es lo que hace que un pez
 * parezca un pez: en el mar camufla por arriba contra el fondo oscuro y por
 * abajo contra la luz de la superficie.
 */
function paint(geo: THREE.BufferGeometry, c1: string, c2: string, pattern: SeaPattern, length: number) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(c1);
  const belly = new THREE.Color(c2);
  const col = new THREE.Color();

  // Alto real del cuerpo, para normalizar el contrasombreado.
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const hy = Math.max(0.0001, bb.max.y - bb.min.y);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // 0 abajo, 1 arriba
    const up = (y - bb.min.y) / hy;
    // Con rayas o manchas el contrasombreado va MUY suave: si no, aclara medio
    // cuerpo y se pierde el color propio (un pez payaso salía casi blanco).
    const shade =
      pattern === 'countershade' || pattern === 'plain'
        ? THREE.MathUtils.smoothstep(up, 0.28, 0.72)
        : THREE.MathUtils.smoothstep(up, -0.15, 0.3);
    col.copy(belly).lerp(top, shade);

    if (pattern === 'stripes') {
      // Bandas perpendiculares al cuerpo (como el pez payaso).
      const band = Math.sin((z / length) * Math.PI * 5.5);
      if (band > 0.45) col.lerp(belly, 0.85);
    } else if (pattern === 'spots') {
      // Lunares repartidos, más densos en el lomo.
      const n = hash3(Math.round(x * 26), Math.round(y * 26), Math.round(z * 14));
      if (n > 0.82 && up > 0.3) col.lerp(belly, 0.8);
    }

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Nado ondulante: dobla el cuerpo con una onda que recorre el eje.
 *
 * La amplitud crece hacia la cola (la cabeza casi no se mueve), que es
 * exactamente cómo se propaga el impulso en un pez de verdad.
 */
function useUndulation(
  geo: THREE.BufferGeometry,
  { amp = 0.16, freq = 3.2, speed = 4, length = 2 }: { amp?: number; freq?: number; speed?: number; length?: number } = {},
) {
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useFrame(({ clock }) => {
    const pos = geo.attributes.position;
    const t = clock.elapsedTime * speed;
    for (let i = 0; i < pos.count; i++) {
      const z = base[i * 3 + 2];
      // 1 en la cola (z = -L/2), 0 en el morro.
      const k = THREE.MathUtils.clamp(0.5 - z / length, 0, 1);
      pos.setX(i, base[i * 3] + Math.sin((z / length) * freq * Math.PI - t) * amp * k * k);
    }
    pos.needsUpdate = true;
  });
}

/* ------------------------------------------------------------------ */
/* Aletas: siluetas curvas en vez de conos                             */
/* ------------------------------------------------------------------ */

/**
 * Aleta plana con forma orgánica. `sweep` estira la punta hacia atrás y
 * `notch` marca la hendidura del borde (como en las caudales bifurcadas).
 */
function finGeometry(len: number, height: number, sweep = 0.5, notch = 0): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(len * 0.35, height * 0.85, len, height);
  if (notch > 0) s.quadraticCurveTo(len * (1 - notch * 0.5), height * 0.45, len * (1 - notch), height * 0.3);
  s.quadraticCurveTo(len * (0.5 + sweep * 0.3), height * 0.1, len * 0.15, -height * 0.06);
  s.lineTo(0, 0);
  return new THREE.ShapeGeometry(s, 12);
}

function Fin({
  position,
  rotation,
  scale = 1,
  color,
  len = 0.5,
  height = 0.4,
  sweep = 0.5,
  notch = 0,
  opacity = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  color: string;
  len?: number;
  height?: number;
  sweep?: number;
  notch?: number;
  opacity?: number;
}) {
  const geo = useMemo(() => finGeometry(len, height, sweep, notch), [len, height, sweep, notch]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={scale}>
      <Plain color={color} rough={0.4} opacity={opacity} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Criaturas                                                           */
/* ------------------------------------------------------------------ */

/** Pez genérico: sirve para el pez payaso, el linterna y cualquier pez nuevo. */
function Fish({ c }: { c: SeaCreature }) {
  const long = c.body?.long ?? 1;
  const tall = c.body?.tall ?? 1;
  const L = 2 * long;
  const c2 = c.color2 ?? c.color;
  const geo = useBody(fishProfile, L, c.color, c2, c.pattern ?? 'countershade', { tall, wide: 0.5 });
  useUndulation(geo, { amp: 0.1 * long, freq: 3, speed: 5.5, length: L });
  const tail = useRef<THREE.Group>(null);
  const pect = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (tail.current) tail.current.rotation.y = Math.sin(t * 5.5 - 1.1) * 0.5;
    if (pect.current) pect.current.rotation.z = Math.sin(t * 4) * 0.28;
  });
  const fin = c2;
  return (
    <group>
      <mesh geometry={geo}>
        <Skin glow={c.glow} rough={0.22} sheen={0.7} />
      </mesh>
      {/* Caudal */}
      <group ref={tail} position={[0, 0, -L * 0.48]}>
        <Fin position={[0, 0, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} color={fin} len={0.42 * L} height={0.34 * L} notch={0.35} opacity={0.95} />
        <Fin position={[0, 0, 0]} rotation={[0, Math.PI / 2, -Math.PI / 2]} color={fin} len={0.42 * L} height={0.34 * L} notch={0.35} opacity={0.95} />
      </group>
      {/* Dorsal */}
      <Fin position={[0, 0.24 * tall, 0.05 * L]} rotation={[0, Math.PI / 2, 0]} color={fin} len={0.5 * L} height={0.2 * L} sweep={0.8} opacity={0.9} />
      {/* Pectorales */}
      <group ref={pect}>
        {[-1, 1].map((s) => (
          <Fin
            key={s}
            position={[s * 0.15, -0.02, 0.2 * L]}
            rotation={[0, 0, s * 0.5]}
            scale={[s, 1, 1]}
            color={fin}
            len={0.28 * L}
            height={0.16 * L}
            opacity={0.85}
          />
        ))}
      </group>
      {/* Luces del pez linterna */}
      {c.glow &&
        Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[0.13, -0.12 * tall, -L * 0.35 + (i / 8) * L * 0.7]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={c.glow} toneMapped={false} />
          </mesh>
        ))}
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.13, 0.08 * tall, L * 0.4]} r={0.055 * long} />
      ))}
    </group>
  );
}

/** Ballena (y delfín y orca): cuerpo liso enorme y cola horizontal que bate. */
function Whale({ c }: { c: SeaCreature }) {
  const L = 3.2;
  const c2 = c.color2 ?? c.color;
  const geo = useBody(whaleProfile, L, c.color, c2, 'countershade', { wide: 0.78, radial: 20 });
  useUndulation(geo, { amp: 0.1, freq: 1.7, speed: 2.4, length: L });
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.x = Math.sin(clock.elapsedTime * 2.4 - 1) * 0.32;
  });
  return (
    <group>
      <mesh geometry={geo}>
        <Skin rough={0.34} sheen={0.35} />
      </mesh>
      {/* Aleta dorsal */}
      <Fin position={[0, 0.42, -0.1]} rotation={[0, Math.PI / 2, 0]} color={c.color} len={0.5} height={0.32} sweep={0.9} />
      {/* Pectorales largas (las de la jorobada son enormes) */}
      {[-1, 1].map((s) => (
        <Fin
          key={s}
          position={[s * 0.34, -0.16, 0.42]}
          rotation={[0.2, 0, s * 1.1]}
          scale={[s, 1, 1]}
          color={c2}
          len={0.95}
          height={0.3}
          sweep={0.7}
        />
      ))}
      {/* Cola horizontal */}
      <group ref={tail} position={[0, 0, -L * 0.45]}>
        {[-1, 1].map((s) => (
          <Fin
            key={s}
            position={[0, 0, -0.1]}
            rotation={[0, s > 0 ? 0 : Math.PI, 0]}
            color={c.color}
            len={0.75}
            height={0.26}
            sweep={0.9}
            notch={0.2}
          />
        ))}
      </group>
      {/* Surcos de la garganta */}
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} position={[x, -0.34, 0.75]} rotation={[0, 0, 0]}>
          <capsuleGeometry args={[0.012, 0.7, 3, 6]} />
          <Plain color={c2} rough={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.3, 0.08, L * 0.36]} r={0.06} />
      ))}
    </group>
  );
}

/** Tiburón: silueta afilada, cola vertical y branquias. */
function Shark({ c }: { c: SeaCreature }) {
  const long = c.body?.long ?? 1;
  const L = 2.8 * long;
  const c2 = c.color2 ?? c.color;
  const geo = useBody(sharkProfile, L, c.color, c2, c.pattern ?? 'countershade', { wide: 0.66, radial: 20 });
  useUndulation(geo, { amp: 0.13, freq: 2.4, speed: 3.4, length: L });
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * 3.4 - 1.2) * 0.4;
  });
  return (
    <group>
      <mesh geometry={geo}>
        <Skin rough={0.42} sheen={0.25} />
      </mesh>
      {/* Dorsal grande */}
      <Fin position={[0, 0.3, 0.05]} rotation={[0, Math.PI / 2, 0]} color={c.color} len={0.6} height={0.5} sweep={0.95} />
      {/* Segunda dorsal */}
      <Fin position={[0, 0.24, -L * 0.3]} rotation={[0, Math.PI / 2, 0]} color={c.color} len={0.26} height={0.18} sweep={0.9} />
      {/* Pectorales */}
      {[-1, 1].map((s) => (
        <Fin
          key={s}
          position={[s * 0.28, -0.14, 0.45]}
          rotation={[0.1, 0, s * 1.25]}
          scale={[s, 1, 1]}
          color={c.color}
          len={0.7}
          height={0.26}
          sweep={0.85}
        />
      ))}
      {/* Caudal vertical asimétrica */}
      <group ref={tail} position={[0, 0, -L * 0.46]}>
        <Fin position={[0, 0, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} color={c.color} len={0.7} height={0.5} sweep={0.9} />
        <Fin position={[0, 0, 0]} rotation={[0, Math.PI / 2, -Math.PI / 2]} color={c.color} len={0.4} height={0.34} sweep={0.9} />
      </group>
      {/* Branquias */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0.24, -0.02, L * 0.22 - i * 0.09]} rotation={[0, 0, 0.25]}>
          <capsuleGeometry args={[0.008, 0.22, 3, 5]} />
          <Plain color="#2a3038" rough={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.17, 0.1, L * 0.38]} r={0.05} />
      ))}
    </group>
  );
}

/** Manta: alas triangulares que baten y cola de látigo. */
function Ray({ c }: { c: SeaCreature }) {
  const wings = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? '#eef4f8';
  const wing = useMemo(() => {
    // Ala: triángulo con borde curvo, como la de una manta.
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.7, 0.15, 1.5, -0.1);
    s.quadraticCurveTo(0.8, -0.35, 0.15, -0.5);
    s.lineTo(0, 0);
    return new THREE.ShapeGeometry(s, 16);
  }, []);
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 1.5);
    wings.current?.children.forEach((w, i) => {
      w.rotation.z = (i === 0 ? 1 : -1) * f * 0.45;
    });
  });
  return (
    <group>
      {/* Cuerpo aplanado */}
      <mesh scale={[0.55, 0.16, 0.9]}>
        <sphereGeometry args={[0.6, 22, 16]} />
        <Plain color={c.color} rough={0.34} />
      </mesh>
      <mesh position={[0, -0.02, 0]} scale={[0.5, 0.13, 0.85]}>
        <sphereGeometry args={[0.6, 20, 14]} />
        <Plain color={c2} rough={0.34} />
      </mesh>
      {/* Alas */}
      <group ref={wings}>
        {[-1, 1].map((s) => (
          <group key={s} rotation={[0, 0, 0]}>
            <mesh geometry={wing} rotation={[Math.PI / 2, 0, 0]} scale={[s, 1, 1]} position={[s * 0.28, 0, 0.1]}>
              <Plain color={c.color} rough={0.36} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Lóbulos cefálicos (los "cuernos" de la boca) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.14, -0.04, 0.52]} rotation={[0.4, 0, 0]}>
          <capsuleGeometry args={[0.035, 0.12, 4, 8]} />
          <Plain color={c.color} rough={0.4} />
        </mesh>
      ))}
      {/* Cola de látigo */}
      <mesh position={[0, 0.02, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.045, 1.1, 8]} />
        <Plain color={c.color} rough={0.45} />
      </mesh>
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.24, 0.02, 0.42]} r={0.045} />
      ))}
    </group>
  );
}

/** Tortuga marina: caparazón con placas y aletas que reman. */
function Turtle({ c }: { c: SeaCreature }) {
  const flip = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? '#c8b06a';
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 2) * 0.55;
    flip.current?.children.forEach((g, i) => {
      g.rotation.x = (i % 2 === 0 ? 1 : -1) * f * 0.5;
      g.rotation.z = (i < 2 ? 1 : -1) * (0.3 + f * 0.35) * (i % 2 === 0 ? 1 : -1);
    });
  });
  return (
    <group>
      {/* Caparazón: cúpula suave */}
      <mesh scale={[1, 0.42, 1.25]}>
        <sphereGeometry args={[0.58, 26, 18]} />
        <Plain color="#2f6b3c" rough={0.5} />
      </mesh>
      {/* Placas del caparazón */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.34, 0.2, Math.sin(a) * 0.42]} scale={[0.22, 0.05, 0.26]}>
            <sphereGeometry args={[1, 10, 8]} />
            <Plain color="#3f8a4c" rough={0.55} />
          </mesh>
        );
      })}
      {/* Peto claro */}
      <mesh position={[0, -0.16, 0]} scale={[0.86, 0.16, 1.1]}>
        <sphereGeometry args={[0.58, 20, 14]} />
        <Plain color={c2} rough={0.45} />
      </mesh>
      {/* Cabeza y cuello */}
      <mesh position={[0, 0.02, 0.68]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.11, 0.16, 5, 12]} />
        <Plain color={c.color} rough={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.84]} scale={[1, 0.85, 1.15]}>
        <sphereGeometry args={[0.15, 16, 14]} />
        <Plain color={c.color} rough={0.38} />
      </mesh>
      {/* Aletas */}
      <group ref={flip}>
        {[
          [-1, 0.42, 0.34],
          [1, 0.42, 0.34],
          [-1, 0.3, -0.5],
          [1, 0.3, -0.5],
        ].map(([s, x, z], i) => (
          <group key={i} position={[(s as number) * (x as number), -0.04, z as number]}>
            <Fin
              position={[0, 0, 0]}
              rotation={[Math.PI / 2, 0, (s as number) * 0.5]}
              scale={[s as number, 1, 1]}
              color={c.color}
              len={i < 2 ? 0.62 : 0.34}
              height={i < 2 ? 0.24 : 0.18}
              sweep={0.8}
            />
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.09, 0.06, 0.94]} r={0.04} />
      ))}
    </group>
  );
}

/** Medusa: campana translúcida que pulsa, con tentáculos y brazos orales. */
function JellyFish({ c }: { c: SeaCreature }) {
  const bell = useRef<THREE.Mesh>(null);
  const arms = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? c.color;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = 1 + Math.sin(t * 2) * 0.14;
    bell.current?.scale.set(p, 1.5 - p * 0.42, p);
    if (arms.current) {
      arms.current.rotation.y = Math.sin(t * 0.6) * 0.2;
      arms.current.children.forEach((a, i) => {
        a.rotation.x = Math.sin(t * 1.8 + i * 0.6) * 0.16;
      });
    }
  });
  return (
    <group>
      <mesh ref={bell}>
        <sphereGeometry args={[0.55, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <Jelly1 color={c.color} opacity={0.46} />
      </mesh>
      {/* Nervios de la campana */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, -0.06, Math.sin(a) * 0.4]} rotation={[0, -a, 0.22]}>
            <capsuleGeometry args={[0.006, 0.34, 3, 5]} />
            <Plain color={c2} rough={0.3} opacity={0.75} glow={c2} />
          </mesh>
        );
      })}
      {/* Brazos orales (los anchos del centro) */}
      <group ref={arms}>
        {Array.from({ length: 4 }).map((_, i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.1, -0.45, Math.sin(a) * 0.1]} rotation={[0, -a, 0]}>
              <capsuleGeometry args={[0.05, 0.55, 4, 8]} />
              <Jelly1 color={c2} opacity={0.4} />
            </mesh>
          );
        })}
      </group>
      {/* Tentáculos finos del borde */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.46, -0.62, Math.sin(a) * 0.46]}>
            <capsuleGeometry args={[0.007, 1.2, 3, 5]} />
            <Plain color={c2} rough={0.25} opacity={0.5} glow={c2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Pulpo: manto liso y ocho brazos que se enroscan. El dumbo lleva aletas. */
function Octopus({ c }: { c: SeaCreature }) {
  const arms = useRef<THREE.Group>(null);
  const ears = useRef<THREE.Group>(null);
  const dumbo = c.id === 'pulpo-dumbo';
  const c2 = c.color2 ?? c.color;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    arms.current?.children.forEach((arm, i) => {
      arm.rotation.x = 0.7 + Math.sin(t * 1.5 + i * 0.8) * 0.3;
      arm.rotation.z = Math.sin(t * 1.1 + i) * 0.18;
    });
    ears.current?.children.forEach((e, i) => {
      e.rotation.z = (i === 0 ? 1 : -1) * (0.3 + Math.sin(t * 2.2) * 0.35);
    });
  });
  return (
    <group>
      {/* Manto */}
      <mesh position={[0, 0.28, 0]} scale={[1, 1.2, 1.05]}>
        <sphereGeometry args={[0.42, 24, 20]} />
        {dumbo ? <Jelly1 color={c.color} opacity={0.72} glow={c.glow} /> : <Plain color={c.color} rough={0.32} />}
      </mesh>
      {/* Aletas de "orejas" del pulpo dumbo */}
      {dumbo && (
        <group ref={ears}>
          {[-1, 1].map((s) => (
            <Fin
              key={s}
              position={[s * 0.3, 0.55, 0]}
              rotation={[Math.PI / 2, 0, s * 0.4]}
              scale={[s, 1, 1]}
              color={c2}
              len={0.42}
              height={0.26}
              opacity={0.9}
            />
          ))}
        </group>
      )}
      {/* Brazos con ventosas */}
      <group ref={arms}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26]} rotation={[0.7, -a, 0]}>
              <mesh position={[0, -0.36, 0]} rotation={[0.25, 0, 0]}>
                <capsuleGeometry args={[0.055, 0.62, 5, 10]} />
                <Plain color={c.color} rough={0.34} />
              </mesh>
              {[0.15, 0.35, 0.55].map((d) => (
                <mesh key={d} position={[0.045, -0.15 - d * 0.7, 0.02]}>
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <Plain color={c2} rough={0.4} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.19, 0.34, 0.34]} r={0.075} />
      ))}
    </group>
  );
}

/** Calamar gigante: manto cónico, aletas y dos tentáculos larguísimos. */
function Squid({ c }: { c: SeaCreature }) {
  const arms = useRef<THREE.Group>(null);
  const tent = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? c.color;
  const mantle = useBody((t) => 0.03 + 0.34 * Math.sin(Math.pow(t, 1.3) * Math.PI * 0.9), 1.9, c.color, c2, 'countershade', {
    wide: 1,
    radial: 20,
  });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    arms.current?.children.forEach((a, i) => {
      a.rotation.x = 0.25 + Math.sin(t * 1.6 + i) * 0.22;
    });
    tent.current?.children.forEach((a, i) => {
      a.rotation.x = 0.1 + Math.sin(t * 1.2 + i * 2) * 0.3;
    });
  });
  return (
    <group>
      {/* Manto apuntando hacia atrás (-Z) */}
      <mesh geometry={mantle} rotation={[0, Math.PI, 0]} position={[0, 0, -0.3]}>
        <Skin rough={0.3} sheen={0.8} sheenColor="#ffd0c0" />
      </mesh>
      {/* Aletas triangulares de la punta */}
      {[-1, 1].map((s) => (
        <Fin
          key={s}
          position={[s * 0.1, 0, -1.15]}
          rotation={[Math.PI / 2, 0, s * 1.5]}
          scale={[s, 1, 1]}
          color={c.color}
          len={0.4}
          height={0.3}
          opacity={0.95}
        />
      ))}
      {/* Ocho brazos */}
      <group ref={arms} position={[0, 0, 0.5]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0]} rotation={[0.25, 0, 0]}>
              <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.035, 0.78, 5, 8]} />
                <Plain color={c.color} rough={0.36} />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* Dos tentáculos de caza, mucho más largos */}
      <group ref={tent} position={[0, 0, 0.5]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.1, -0.04, 0]}>
            <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.028, 1.7, 7]} />
              <Plain color={c2} rough={0.4} />
            </mesh>
            {/* Maza del extremo, con ventosas */}
            <mesh position={[0, 0, 1.72]} scale={[1, 1, 1.6]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <Plain color={c2} rough={0.35} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Ojos enormes: su rasgo más famoso */}
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.24, 0.06, 0.42]} r={0.15} />
      ))}
    </group>
  );
}

/** Anguila morena: cuerpo larguísimo que serpentea. */
function Eel({ c }: { c: SeaCreature }) {
  const L = 3.4;
  const c2 = c.color2 ?? c.color;
  const geo = useBody(eelProfile, L, c.color, c2, c.pattern ?? 'spots', { wide: 0.8, radial: 14, steps: 22 });
  // Onda de mayor amplitud y más ciclos: así serpentea de verdad.
  useUndulation(geo, { amp: 0.42, freq: 4.5, speed: 3.2, length: L });
  return (
    <group>
      <mesh geometry={geo}>
        <Skin rough={0.26} sheen={0.6} sheenColor="#e8f0c0" />
      </mesh>
      {/* Aleta continua del lomo */}
      <Fin position={[0, 0.12, -0.2]} rotation={[0, Math.PI / 2, 0]} color={c2} len={2.6} height={0.12} sweep={1} opacity={0.85} />
      {/* Boca entreabierta */}
      <mesh position={[0, -0.05, L * 0.46]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.16]} />
        <Plain color="#3a1a1a" rough={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.07, 0.07, L * 0.45]} r={0.032} />
      ))}
    </group>
  );
}

/** Caballito de mar: cuerpo curvado, hocico y cola enroscada. */
function Seahorse({ c }: { c: SeaCreature }) {
  const fin = useRef<THREE.Mesh>(null);
  const c2 = c.color2 ?? c.color;
  // Cuerpo en curva: anillos que siguen una S.
  const rings = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13;
        return {
          y: 0.62 - t * 1.05,
          z: Math.sin(t * 2.2) * 0.16,
          r: 0.13 * Math.sin(0.35 + t * 2.1) + 0.03,
          rot: Math.cos(t * 2.2) * 0.5,
        };
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (fin.current) fin.current.rotation.y = Math.sin(clock.elapsedTime * 14) * 0.3;
  });
  return (
    <group>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]} rotation={[r.rot, 0, 0]} scale={[0.8, 1, 1]}>
          <sphereGeometry args={[r.r, 12, 10]} />
          <Plain color={i % 2 === 0 ? c.color : c2} rough={0.42} />
        </mesh>
      ))}
      {/* Cabeza inclinada y hocico */}
      <mesh position={[0, 0.72, 0.04]} rotation={[0.5, 0, 0]} scale={[0.8, 1, 1.1]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <Plain color={c.color} rough={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0.22]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.05, 0.24, 10]} />
        <Plain color={c.color} rough={0.4} />
      </mesh>
      {/* Corona */}
      <mesh position={[0, 0.86, -0.04]} rotation={[-0.4, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <Plain color={c2} rough={0.45} />
      </mesh>
      {/* Aleta dorsal que vibra */}
      <mesh ref={fin} position={[0, 0.2, -0.14]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 0.16]} />
        <Plain color={c2} rough={0.4} opacity={0.8} />
      </mesh>
      {/* Cola enroscada */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = i * 0.9;
        const rad = 0.13 * (1 - i / 9);
        return (
          <mesh key={i} position={[0, -0.5 - i * 0.03, 0.18 + Math.sin(a) * rad]} scale={[0.7, 1, 1]}>
            <sphereGeometry args={[0.045 - i * 0.004, 10, 8]} />
            <Plain color={c.color} rough={0.45} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.085, 0.76, 0.1]} r={0.032} />
      ))}
    </group>
  );
}

/** Estrella de mar: cinco brazos con relieve y piecitos por debajo. */
function Starfish({ c }: { c: SeaCreature }) {
  const c2 = c.color2 ?? c.color;
  const arm = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.12);
    s.quadraticCurveTo(0.4, 0.12, 0.95, 0.03);
    s.quadraticCurveTo(0.4, -0.12, 0, -0.12);
    s.lineTo(0, 0.12);
    return new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 10 });
  }, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // Ondea muy despacio los brazos, como cuando camina.
    ref.current?.children.forEach((a, i) => {
      a.rotation.x = Math.sin(clock.elapsedTime * 0.8 + i * 1.2) * 0.12;
    });
  });
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={ref}>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <mesh geometry={arm} position={[0, 0, -0.045]}>
              <Plain color={c.color} rough={0.62} />
            </mesh>
            {/* Piecitos con ventosa por la cara de abajo */}
            {[0.3, 0.5, 0.7].map((d) => (
              <mesh key={d} position={[d, 0, -0.07]}>
                <sphereGeometry args={[0.028, 8, 8]} />
                <Plain color={c2} rough={0.5} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {/* Disco central con verrugas */}
      <mesh scale={[1, 1, 0.5]}>
        <sphereGeometry args={[0.22, 18, 14]} />
        <Plain color={c.color} rough={0.6} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.09]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <Plain color={c2} rough={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Cangrejo ermitaño: concha en espiral + patas y pinzas que se mueven. */
function Crab({ c }: { c: SeaCreature }) {
  const legs = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? '#e8d0a8';
  // Concha: tubo que sigue una espiral logarítmica (queda muy convincente).
  const shell = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 3.6;
      const r = 0.08 + Math.pow(t, 1.5) * 0.42;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.9, -t * 0.22));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 70, 0.001, 10, false);
  }, []);
  const shellRadius = useMemo(() => {
    // El tubo engorda hacia la boca de la concha: se hace a mano por vértices.
    const g = shell.clone();
    const pos = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const t = i / pos.count;
      const grow = 0.02 + Math.pow(t, 1.4) * 0.2;
      pos.setXYZ(i, pos.getX(i) + n.getX(i) * grow, pos.getY(i) + n.getY(i) * grow, pos.getZ(i) + n.getZ(i) * grow);
    }
    g.computeVertexNormals();
    return g;
  }, [shell]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    legs.current?.children.forEach((l, i) => {
      l.rotation.z = Math.sin(t * 3 + i * 0.8) * 0.22;
    });
  });
  return (
    <group>
      <mesh geometry={shellRadius} rotation={[0, 0.4, 0]}>
        <Plain color={c2} rough={0.4} />
      </mesh>
      {/* Cuerpo que asoma */}
      <mesh position={[0, -0.1, 0.34]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.18, 16, 14]} />
        <Plain color={c.color} rough={0.4} />
      </mesh>
      {/* Patas */}
      <group ref={legs}>
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <group key={`${s}-${i}`} position={[s * 0.14, -0.18, 0.3 - i * 0.1]}>
              <mesh position={[s * 0.12, -0.08, 0]} rotation={[0, 0, s * 0.9]}>
                <capsuleGeometry args={[0.022, 0.2, 3, 6]} />
                <Plain color={c.color} rough={0.45} />
              </mesh>
              <mesh position={[s * 0.22, -0.2, 0]} rotation={[0, 0, s * 0.3]}>
                <capsuleGeometry args={[0.016, 0.18, 3, 6]} />
                <Plain color={c.color} rough={0.45} />
              </mesh>
            </group>
          )),
        )}
      </group>
      {/* Pinzas (una más grande, como los ermitaños) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.16, -0.06, 0.48]} rotation={[0, 0, s * 0.4]} scale={s > 0 ? 1.3 : 1}>
          <mesh rotation={[0, 0, s * 0.6]}>
            <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
            <Plain color={c.color} rough={0.4} />
          </mesh>
          {[1, -1].map((k) => (
            <mesh key={k} position={[s * 0.06, k * 0.035, 0.11]} rotation={[0, 0, k * 0.3]}>
              <coneGeometry args={[0.026, 0.12, 8]} />
              <Plain color={c.color} rough={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Ojos en pedúnculos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.07, 0.03, 0.46]} rotation={[0.8, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
            <Plain color={c.color} rough={0.45} />
          </mesh>
          <Eye position={[s * 0.07, 0.1, 0.5]} r={0.033} />
        </group>
      ))}
    </group>
  );
}

/** Nautilus: concha en espiral a rayas y un ramo de tentáculos. */
function Nautilus({ c }: { c: SeaCreature }) {
  const tent = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? '#b0603a';
  const shell = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const a = t * Math.PI * 4.2;
      const r = 0.04 + Math.pow(t, 1.7) * 0.58;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.001, 12, false);
    const pos = g.attributes.position;
    const n = g.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(c.color);
    const stripe = new THREE.Color(c2);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = i / pos.count;
      const grow = 0.012 + Math.pow(t, 1.5) * 0.26;
      pos.setXYZ(i, pos.getX(i) + n.getX(i) * grow, pos.getY(i) + n.getY(i) * grow, pos.getZ(i) + n.getZ(i) * grow);
      // Rayas radiales, como las del nautilus de verdad.
      col.copy(Math.sin(t * 90) > 0.35 ? stripe : base);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [c.color, c2]);
  useFrame(({ clock }) => {
    tent.current?.children.forEach((a, i) => {
      a.rotation.x = Math.sin(clock.elapsedTime * 1.4 + i) * 0.2;
    });
  });
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={shell} scale={[1, 1, 0.62]}>
        <meshPhysicalMaterial vertexColors roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} envMapIntensity={1.9} />
      </mesh>
      {/* Tentáculos que salen de la boca de la concha */}
      <group ref={tent} position={[0.6, 0, 0]}>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <group key={i} position={[0, Math.sin(a) * 0.1, Math.cos(a) * 0.07]}>
              <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.016, 0.2, 3, 6]} />
                <Plain color="#f0d0a8" rough={0.4} />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* Capucha */}
      <mesh position={[0.52, 0.12, 0]} rotation={[0, 0, -0.5]} scale={[1, 0.6, 0.9]}>
        <sphereGeometry args={[0.18, 14, 12]} />
        <Plain color={c2} rough={0.45} />
      </mesh>
      <Eye position={[0.56, -0.06, 0.14]} r={0.045} />
      <Eye position={[0.56, -0.06, -0.14]} r={0.045} />
    </group>
  );
}

/** Pez luna: un disco enorme con dos aletas altísimas. */
function Mola({ c }: { c: SeaCreature }) {
  const fins = useRef<THREE.Group>(null);
  const c2 = c.color2 ?? '#dfe8ef';
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 1.1);
    fins.current?.children.forEach((x, i) => {
      x.rotation.z = (i === 0 ? 1 : -1) * f * 0.3;
    });
  });
  return (
    <group>
      {/* Cuerpo: disco achatado */}
      <mesh scale={[0.24, 1, 0.9]}>
        <sphereGeometry args={[0.62, 26, 20]} />
        <Plain color={c.color} rough={0.38} />
      </mesh>
      <mesh position={[0, -0.14, 0.02]} scale={[0.22, 0.7, 0.8]}>
        <sphereGeometry args={[0.62, 22, 16]} />
        <Plain color={c2} rough={0.38} />
      </mesh>
      {/* Aletas dorsal y ventral, larguísimas */}
      <group ref={fins}>
        {[1, -1].map((s) => (
          <Fin
            key={s}
            position={[0, s * 0.55, -0.05]}
            rotation={[0, Math.PI / 2, s > 0 ? 0 : Math.PI]}
            color={c.color}
            len={0.34}
            height={0.62}
            sweep={0.95}
          />
        ))}
      </group>
      {/* Cola recortada, la seña del pez luna */}
      <mesh position={[0, 0, -0.6]} scale={[0.18, 0.5, 0.12]}>
        <sphereGeometry args={[0.62, 14, 12]} />
        <Plain color={c.color} rough={0.42} />
      </mesh>
      {/* Boquita redonda */}
      <mesh position={[0, 0.06, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.02, 8, 14]} />
        <Plain color="#6a7480" rough={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.11, 0.2, 0.48]} r={0.06} />
      ))}
    </group>
  );
}

/** Rape abisal: cuerpo hinchado, dientes de aguja y farolillo con luz real. */
function Angler({ c }: { c: SeaCreature }) {
  const lure = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const c2 = c.color2 ?? '#8af0e8';
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.7 + Math.sin(t * 3.2) * 0.3 + Math.sin(t * 8.7) * 0.1;
    if (light.current) light.current.intensity = 2.6 * pulse;
    const m = lure.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 2.4 * pulse;
    if (lure.current) lure.current.position.y = 0.74 + Math.sin(t * 1.3) * 0.05;
  });
  return (
    <group>
      {/* Cuerpo abultado */}
      <mesh scale={[0.86, 0.95, 1.05]}>
        <sphereGeometry args={[0.5, 22, 18]} />
        <Plain color={c.color} rough={0.5} />
      </mesh>
      {/* Boca enorme */}
      <mesh position={[0, -0.1, 0.4]} rotation={[0.45, 0, 0]} scale={[0.82, 0.4, 0.5]}>
        <sphereGeometry args={[0.44, 16, 14]} />
        <Plain color="#140f1a" rough={0.7} />
      </mesh>
      {/* Dientes arriba y abajo */}
      {[-1, 1].map((row) =>
        Array.from({ length: 7 }).map((_, i) => (
          <mesh
            key={`${row}-${i}`}
            position={[-0.24 + i * 0.08, row > 0 ? 0.02 : -0.16, 0.6]}
            rotation={[row > 0 ? Math.PI : 0, 0, 0]}
          >
            <coneGeometry args={[0.019, 0.13, 5]} />
            <Plain color="#eef4f2" rough={0.25} />
          </mesh>
        )),
      )}
      {/* Caña e ilicio */}
      <mesh position={[0, 0.55, 0.3]} rotation={[0.6, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.5, 6]} />
        <Plain color={c.color} rough={0.5} />
      </mesh>
      <mesh ref={lure} position={[0, 0.74, 0.56]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.74, 0.56]} color={c2} intensity={2.6} distance={8} decay={2} />
      {/* Aleta caudal pequeña */}
      <Fin position={[0, 0, -0.5]} rotation={[0, Math.PI / 2, Math.PI / 2]} color={c.color} len={0.34} height={0.28} />
      <Fin position={[0, 0, -0.5]} rotation={[0, Math.PI / 2, -Math.PI / 2]} color={c.color} len={0.34} height={0.28} />
      {[-1, 1].map((s) => (
        <Eye key={s} position={[s * 0.26, 0.16, 0.4]} r={0.05} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Selector                                                            */
/* ------------------------------------------------------------------ */

export default function SeaCreatureModel({ creature }: { creature: SeaCreature }): ReactNode {
  switch (creature.shape) {
    case 'whale':
      return <Whale c={creature} />;
    case 'turtle':
      return <Turtle c={creature} />;
    case 'shark':
      return <Shark c={creature} />;
    case 'jelly':
      return <JellyFish c={creature} />;
    case 'octopus':
      return <Octopus c={creature} />;
    case 'fish':
      return <Fish c={creature} />;
    case 'ray':
      return <Ray c={creature} />;
    case 'seahorse':
      return <Seahorse c={creature} />;
    case 'starfish':
      return <Starfish c={creature} />;
    case 'crab':
      return <Crab c={creature} />;
    case 'eel':
      return <Eel c={creature} />;
    case 'squid':
      return <Squid c={creature} />;
    case 'nautilus':
      return <Nautilus c={creature} />;
    case 'mola':
      return <Mola c={creature} />;
    case 'angler':
    default:
      return <Angler c={creature} />;
  }
}
