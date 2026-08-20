import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Sky } from '@react-three/drei';
import { DINOS, ERA_COLORS, type Dino, type DinoEra } from '../data/dinos';
import { useApp } from '../state/store';
import { scaleCount } from '../utils/quality';
import { playRoar, roarPitchFor } from '../utils/sound';
import { createGlowTexture } from '../utils/textures';
import { usePBR } from '../utils/pbr';
import Controls from '../components/three/Controls';
import DinoModel from '../components/three/DinoModel';
import { AdaptiveQuality, IntroFly } from '../components/three/SceneExtras';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/* ------------------------------------------------------------------ */
/* Terreno: colinas reales con ruido determinista                      */
/* ------------------------------------------------------------------ */

const WATER_Y = -1.0;

/* ------------------------------------------------------------------ */
/* Eras jugables: cada una cambia el clima y la vegetación de la isla   */
/* ------------------------------------------------------------------ */
export type EraFilter = DinoEra | 'all';

interface EraEnv {
  sky: { sunPosition: [number, number, number]; turbidity: number; rayleigh: number };
  fog: [string, number, number];
  hemi: [string, string, number];
  sun: { color: string; intensity: number };
  /** Color de la copa de los árboles. */
  leaf: string;
  /** Tintes del terreno (arena / hierba). */
  sand: string;
  grass: string;
  treeMul: number;
  flowerMul: number;
  grassMul: number;
  rockMul: number;
}

const ENV_DEFAULT: EraEnv = {
  sky: { sunPosition: [10, 6, -8], turbidity: 6, rayleigh: 1.2 },
  fog: ['#bcdcf5', 45, 90],
  hemi: ['#bcdcf5', '#5fa052', 0.65],
  sun: { color: '#fff4e0', intensity: 2.2 },
  leaf: '#569a4c',
  sand: '#e2cf96',
  grass: '#569a4c',
  treeMul: 1,
  flowerMul: 1,
  grassMul: 1,
  rockMul: 1,
};

export const ERA_ENV: Record<EraFilter, EraEnv> = {
  all: ENV_DEFAULT,
  // Triásico: árido, cálido y rojizo; poca vegetación y muchas rocas.
  Triásico: {
    sky: { sunPosition: [8, 5, -6], turbidity: 10, rayleigh: 0.6 },
    fog: ['#e8c49a', 36, 80],
    hemi: ['#e8c49a', '#7a5a34', 0.72],
    sun: { color: '#ffd7a0', intensity: 2.5 },
    leaf: '#8a7f3a',
    sand: '#e6c98e',
    grass: '#b3a052',
    treeMul: 0.4,
    flowerMul: 0,
    grassMul: 0.5,
    rockMul: 1.8,
  },
  // Jurásico: exuberante y muy verde; bosques densos.
  Jurásico: {
    sky: { sunPosition: [10, 7, -8], turbidity: 4, rayleigh: 1.6 },
    fog: ['#b6e0c0', 48, 95],
    hemi: ['#cdeecf', '#4f9a48', 0.7],
    sun: { color: '#f6ffe8', intensity: 2.2 },
    leaf: '#3f8a3f',
    sand: '#d8cf96',
    grass: '#4a9a44',
    treeMul: 1.35,
    flowerMul: 0.05,
    grassMul: 1.4,
    rockMul: 0.9,
  },
  // Cretácico: variado y con muchas flores (aparecieron en esta era).
  Cretácico: {
    sky: { sunPosition: [11, 6, -7], turbidity: 6, rayleigh: 1.2 },
    fog: ['#c8e0f5', 45, 90],
    hemi: ['#cfe4ff', '#5fa052', 0.68],
    sun: { color: '#fff2de', intensity: 2.2 },
    leaf: '#569a4c',
    sand: '#e2cf96',
    grass: '#5aa04e',
    treeMul: 1,
    flowerMul: 1.5,
    grassMul: 1,
    rockMul: 1,
  },
};

function hash2(ix: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function fbm2(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise(x * f, z * f);
    f *= 2.1;
    amp *= 0.5;
  }
  return v;
}

/** Altura del terreno en un punto (islote con colinas y costa que se hunde). */
function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const falloff = Math.max(0, 1 - Math.pow(d / 24, 2.4));
  const hills = fbm2(x * 0.11 + 7.3, z * 0.11 + 3.7);
  return falloff * (0.5 + hills * 2.4) - 1.15;
}

/** Malla del terreno con colores por altura: arena → hierba → roca.
 *  Con texturas PBR descargadas (npm run pbr), la hierba real se tiñe por
 *  zonas (el color de vértice multiplica al mapa). */
function Terrain({ env }: { env: EraEnv }) {
  const pbr = usePBR('grass', 26);
  const textured = !!pbr;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(54, 54, 100, 100);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    // Con textura, los colores pasan a ser TINTES sobre la foto de hierba.
    const grassBase = new THREE.Color(env.grass);
    const sand = new THREE.Color(textured ? '#f2e3bd' : env.sand);
    const grassA = new THREE.Color(textured ? '#ffffff' : env.grass);
    const grassB = new THREE.Color(textured ? '#d8e0cc' : grassBase.clone().multiplyScalar(0.82).getStyle());
    const rock = new THREE.Color(textured ? '#c9c2b4' : '#8b8072');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      const varG = fbm2(x * 0.45 + 21, z * 0.45 + 9);
      c.copy(grassA).lerp(grassB, varG);
      if (h < -0.35) c.copy(sand);
      else if (h < 0.05) c.lerpColors(sand, c, (h + 0.35) / 0.4);
      if (h > 1.1) c.lerp(rock, Math.min(1, (h - 1.1) / 0.7));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [textured, env.grass, env.sand]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={1}
        map={pbr?.map}
        normalMap={pbr?.normalMap}
        roughnessMap={pbr?.roughnessMap}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Comportamiento de los dinosaurios (igual que antes)                 */
/* ------------------------------------------------------------------ */

type Registry = Map<string, { pos: THREE.Vector3; diet: Dino['diet'] }>;

const WALK_R = 15; // radio caminable de la isla
const _dir = new THREE.Vector3();

function clampToIsland(v: THREE.Vector3) {
  const d = Math.hypot(v.x, v.z);
  if (d > WALK_R) {
    v.x *= WALK_R / d;
    v.z *= WALK_R / d;
  }
}

function pickWanderTarget(out: THREE.Vector3) {
  const a = Math.random() * Math.PI * 2;
  const r = 3 + Math.random() * 11;
  out.set(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function nearestPrey(reg: Registry, selfId: string, pos: THREE.Vector3): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bd = Infinity;
  reg.forEach((e, id) => {
    if (id === selfId || e.diet !== 'herbívoro') return;
    const d = pos.distanceToSquared(e.pos);
    if (d < bd) {
      bd = d;
      best = e.pos;
    }
  });
  return best;
}

function nearestThreat(reg: Registry, pos: THREE.Vector3, radius: number): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bd = radius * radius;
  reg.forEach((e) => {
    if (e.diet !== 'carnívoro') return;
    const d = pos.distanceToSquared(e.pos);
    if (d < bd) {
      bd = d;
      best = e.pos;
    }
  });
  return best;
}

/** Parte visual común: el modelo (interactivo) y la etiqueta con su era. */
function DinoVisual({ dino, moving, shadow = true }: { dino: Dino; moving: boolean; shadow?: boolean }) {
  const openDino = useApp((s) => s.openDino);
  const blob = useMemo(() => createGlowTexture('blob-shadow', 'rgba(0,0,0,0.8)'), []);
  const tap = () => {
    playRoar(roarPitchFor(dino.heightM));
    openDino(dino.id);
  };
  return (
    <>
      {shadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <circleGeometry args={[Math.min(2.2, dino.heightM * dino.scene.scale * 0.9 + 0.4), 20]} />
          <meshBasicMaterial map={blob} transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}
      <group
        scale={dino.scene.scale}
        onClick={(e) => {
          e.stopPropagation();
          tap();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <DinoModel dino={dino} moving={moving} />
      </group>
      {/* `distanceFactor` hace que la etiqueta se empequeñezca con la distancia,
          como si estuviera en la escena. En la isla hay 15 dinosaurios y, con
          etiquetas de tamaño fijo, en una pantalla estrecha se amontonaban
          unas sobre otras hasta ser ilegibles. */}
      <Html
        center
        position={[0, dino.heightM * dino.scene.scale + 0.8, 0]}
        zIndexRange={[5, 0]}
        distanceFactor={26}
      >
        <div className="body-label" onClick={tap}>
          <span className="chip">
            {dino.emoji} {dino.name.split(' ')[0]}
            <i className="era-pill" style={{ background: ERA_COLORS[dino.era] }}>
              {dino.era}
            </i>
          </span>
        </div>
      </Html>
    </>
  );
}

/** Volador: planea en círculo por el aire con cabeceo e inclinación. */
function FlyingDino({ dino }: { dino: Dino }) {
  const group = useRef<THREE.Group>(null);
  const angle = useRef(dino.scene.path.phase ?? 0);
  const speed = useApp((s) => s.speed);

  useFrame((state, delta) => {
    angle.current += dino.scene.path.speed * speed * delta * 0.18;
    const r = dino.scene.path.radius;
    const a = angle.current;
    const g = group.current;
    if (!g) return;
    const h = (dino.scene.path.height ?? 0) + Math.sin(state.clock.elapsedTime * 1.2) * 0.6;
    g.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    const sign = Math.sign(dino.scene.path.speed) || 1;
    g.rotation.y = Math.atan2(-Math.sin(a) * sign, Math.cos(a) * sign);
    g.rotation.z = Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
  });

  return (
    <group ref={group}>
      <DinoVisual dino={dino} moving={speed > 0} shadow={false} />
    </group>
  );
}

/** Terrestre con comportamiento: los herbívoros deambulan y pastan; si un
 *  carnívoro se acerca, huyen. El carnívoro acecha a la presa más cercana.
 *  La altura sigue las colinas del terreno. */
function GroundDino({ dino, registry }: { dino: Dino; registry: Registry }) {
  const group = useRef<THREE.Group>(null);
  const speed = useApp((s) => s.speed);
  const st = useRef({
    pos: new THREE.Vector3(
      Math.cos(dino.scene.path.phase ?? 0) * dino.scene.path.radius,
      0,
      Math.sin(dino.scene.path.phase ?? 0) * dino.scene.path.radius,
    ),
    heading: 0,
    target: new THREE.Vector3(),
    graze: 0,
    retarget: 2 + Math.random() * 3,
    tilt: 0,
    moving: false,
  });
  // Objetivo inicial.
  useState(() => pickWanderTarget(st.current.target));

  const baseSpeed = Math.abs(dino.scene.path.speed) * 2.4 + 0.4;

  function moveToward(target: THREE.Vector3, spd: number, dt: number): boolean {
    const s = st.current;
    _dir.copy(target).sub(s.pos);
    _dir.y = 0;
    const dist = _dir.length();
    if (dist < 0.3) return true;
    _dir.normalize();
    s.pos.addScaledVector(_dir, Math.min(dist, spd * dt));
    clampToIsland(s.pos);
    s.heading = lerpAngle(s.heading, Math.atan2(_dir.x, _dir.z), 0.15);
    return false;
  }

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = st.current;
    const dt = delta * speed;

    let entry = registry.get(dino.id);
    if (!entry) {
      entry = { pos: new THREE.Vector3(), diet: dino.diet };
      registry.set(dino.id, entry);
    }
    entry.pos.copy(s.pos);

    s.moving = false;
    if (speed > 0) {
      if (dino.diet === 'carnívoro') {
        const prey = nearestPrey(registry, dino.id, s.pos);
        if (prey) {
          s.target.copy(prey);
          if (s.pos.distanceTo(prey) > 3) s.moving = !moveToward(prey, baseSpeed * 0.85, dt);
          else s.heading = lerpAngle(s.heading, Math.atan2(prey.x - s.pos.x, prey.z - s.pos.z), 0.15);
        }
        s.tilt = THREE.MathUtils.lerp(s.tilt, 0, 0.1);
      } else {
        const threat = nearestThreat(registry, s.pos, 5);
        if (threat) {
          // Huye en dirección contraria al depredador.
          s.target.copy(s.pos).addScaledVector(_dir.copy(s.pos).sub(threat).setY(0).normalize(), 6);
          clampToIsland(s.target);
          s.graze = 0;
          s.tilt = THREE.MathUtils.lerp(s.tilt, 0, 0.2);
          s.moving = !moveToward(s.target, baseSpeed * 1.9, dt);
        } else if (s.graze > 0) {
          s.graze -= delta;
          s.tilt = THREE.MathUtils.lerp(s.tilt, 0.22, 0.08); // cabeza abajo, pastando
        } else {
          s.tilt = THREE.MathUtils.lerp(s.tilt, 0, 0.1);
          const arrived = moveToward(s.target, baseSpeed, dt);
          s.moving = !arrived;
          s.retarget -= delta;
          if (arrived || s.retarget <= 0) {
            if (Math.random() < 0.5) s.graze = 2 + Math.random() * 2.5;
            pickWanderTarget(s.target);
            s.retarget = 4 + Math.random() * 4;
          }
        }
      }
    }

    g.position.set(s.pos.x, terrainHeight(s.pos.x, s.pos.z), s.pos.z);
    g.rotation.y = s.heading;
    g.rotation.x = s.tilt;
  });

  return (
    <group ref={group}>
      <DinoVisual dino={dino} moving={speed > 0} />
    </group>
  );
}

function DinoActor({ dino, registry }: { dino: Dino; registry: Registry }) {
  return dino.fly ? <FlyingDino dino={dino} /> : <GroundDino dino={dino} registry={registry} />;
}

/* ------------------------------------------------------------------ */
/* Vegetación y decorado                                               */
/* ------------------------------------------------------------------ */

/** Vaivén suave del viento (pivote en la base). */
function Sway({ children, phase = 0, amp = 0.022 }: { children: ReactNode; phase?: number; amp?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.z = Math.sin(t * 1.3 + phase) * amp;
      ref.current.rotation.x = Math.cos(t * 1.05 + phase * 1.7) * amp * 0.6;
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** Árbol frondoso: tronco + copa de bolas irregulares, mecido por el viento. */
function Tree({ position, scale, phase = 0, leaf = '#569a4c' }: { position: [number, number, number]; scale: number; phase?: number; leaf?: string }) {
  const bark = usePBR('bark', 1);
  const leafDark = useMemo(() => new THREE.Color(leaf).multiplyScalar(0.85).getStyle(), [leaf]);
  const leafLight = useMemo(() => new THREE.Color(leaf).multiplyScalar(1.15).getStyle(), [leaf]);
  return (
    <group position={position} scale={scale}>
      <Sway phase={phase}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 1.1, 8]} />
          <meshStandardMaterial
            color={bark ? '#ffffff' : '#7a5230'}
            flatShading={!bark}
            roughness={1}
            map={bark?.map}
            normalMap={bark?.normalMap}
          />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <icosahedronGeometry args={[0.75, 1]} />
          <meshStandardMaterial color={leafDark} flatShading roughness={1} />
        </mesh>
        <mesh position={[0.48, 1.3, 0.16]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={leaf} flatShading roughness={1} />
        </mesh>
        <mesh position={[-0.42, 1.38, -0.12]} castShadow>
          <icosahedronGeometry args={[0.46, 1]} />
          <meshStandardMaterial color={leafLight} flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 2.1, 0]} castShadow>
          <icosahedronGeometry args={[0.42, 1]} />
          <meshStandardMaterial color={leaf} flatShading roughness={1} />
        </mesh>
      </Sway>
    </group>
  );
}

/** Palmera low-poly con tronco curvado y hojas en abanico, mecida. */
function Palm({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  const bark = usePBR('bark', 1);
  const trunkProps = {
    color: bark ? '#e8d8c0' : '#8a6a42',
    flatShading: !bark,
    roughness: 1,
    map: bark?.map,
    normalMap: bark?.normalMap,
  } as const;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <Sway phase={rotation * 3} amp={0.03}>
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.12]} castShadow>
          <cylinderGeometry args={[0.09, 0.13, 1, 8]} />
          <meshStandardMaterial {...trunkProps} />
        </mesh>
        <mesh position={[0.16, 1.3, 0]} rotation={[0, 0, 0.24]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 1, 8]} />
          <meshStandardMaterial {...trunkProps} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <group key={i} position={[0.32, 1.85, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
            <mesh position={[0.55, 0.05, 0]} rotation={[0, 0, -1.95]} scale={[0.3, 1.15, 0.06]} castShadow>
              <coneGeometry args={[0.5, 1, 4]} />
              <meshStandardMaterial color="#3f9e4d" flatShading roughness={1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </Sway>
    </group>
  );
}

/** Matas de hierba instanciadas por toda la pradera. */
function GrassTufts({ count }: { count: number }) {
  const matrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    let i = 0;
    let tries = 0;
    while (list.length < count && tries < count * 4) {
      tries++;
      const a = i * 2.399 + hash2(i, 3) * 0.7;
      const r = 2 + hash2(i, 7) * 15;
      i++;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      if (h < 0.0 || Math.hypot(x + 9, z + 9) < 5.5) continue;
      dummy.position.set(x, h + 0.12, z);
      dummy.rotation.set(0, hash2(i, 13) * Math.PI, 0);
      dummy.scale.setScalar(0.7 + hash2(i, 17) * 0.9);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  return (
    <instancedMesh
      args={[undefined, undefined, matrices.length]}
      ref={(mesh) => {
        if (!mesh) return;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
      }}
    >
      <coneGeometry args={[0.07, 0.32, 4]} />
      <meshStandardMaterial color="#4d9448" flatShading roughness={1} />
    </instancedMesh>
  );
}

/** Rocas repartidas por la isla. */
function Rocks({ count }: { count: number }) {
  const pbr = usePBR('rock', 1.4);
  const matrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count * 3 && list.length < count; i++) {
      const a = i * 2.71 + hash2(i, 23);
      const r = 3 + hash2(i, 29) * 15;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      if (h < -0.4 || Math.hypot(x + 9, z + 9) < 5) continue;
      dummy.position.set(x, h + 0.06, z);
      dummy.rotation.set(hash2(i, 31) * Math.PI, hash2(i, 37) * Math.PI, 0);
      dummy.scale.setScalar(0.16 + hash2(i, 41) * 0.4);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  return (
    <instancedMesh
      castShadow
      args={[undefined, undefined, matrices.length]}
      ref={(mesh) => {
        if (!mesh) return;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
      }}
    >
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color={pbr ? '#e8e2d6' : '#8b8072'}
        flatShading={!pbr}
        roughness={1}
        map={pbr?.map}
        normalMap={pbr?.normalMap}
        roughnessMap={pbr?.roughnessMap}
      />
    </instancedMesh>
  );
}

/** Flores de colores salpicadas por la hierba. */
function Flowers({ count }: { count: number }) {
  const flowers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i * 2.399) % (Math.PI * 2);
        const r = 3 + ((i * 53) % 130) / 10;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = terrainHeight(x, z);
        return {
          key: i,
          pos: [x, Math.max(h, -0.2), z] as [number, number, number],
          color: ['#ff6ec7', '#ffd166', '#ffffff', '#ff8c42'][i % 4],
          s: 0.7 + ((i * 13) % 5) / 10,
          onGrass: h > 0.0,
        };
      }).filter((f) => f.onGrass),
    [count],
  );
  return (
    <>
      {flowers.map((f) => (
        <group key={f.key} position={f.pos} scale={f.s}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 4]} />
            <meshStandardMaterial color="#3f7d3a" flatShading />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color={f.color} flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Mariposa que revolotea por la isla batiendo las alas. */
function Butterfly({ seed }: { seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const color = ['#ff6ec7', '#ffd166', '#7fb3ff', '#b8f26e'][seed % 4];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (0.22 + (seed % 3) * 0.06) + seed * 2.1;
    const r = 4 + (seed % 5) * 2.4;
    const g = ref.current;
    if (g) {
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      g.position.set(x, terrainHeight(x, z) + 1.4 + Math.sin(t * 2.3 + seed) * 0.4, z);
      g.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(clock.elapsedTime * 13 + seed) * 0.85;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={ref} scale={0.2}>
      <group ref={wingL}>
        <mesh position={[-0.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.8]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={wingR}>
        <mesh position={[0.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.8]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh>
        <capsuleGeometry args={[0.07, 0.5, 3, 6]} />
        <meshBasicMaterial color="#40342a" />
      </mesh>
    </group>
  );
}

/** Volcán VIVO: lava que palpita, columna de humo, chispas y luz naranja. */
function Volcano() {
  const quality = useApp((s) => s.quality);
  const lava = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const emberRefs = useRef<(THREE.Sprite | null)[]>([]);
  const smokeMap = useMemo(() => createGlowTexture('smoke-puff', 'rgba(120,110,115,0.9)'), []);
  const emberMap = useMemo(() => createGlowTexture('ember', 'rgba(255,160,60,1)'), []);
  const baseY = useMemo(() => terrainHeight(-9, -9) - 0.2, []);
  const nSmoke = quality.tier === 'low' ? 0 : 6;
  const nEmber = quality.tier === 'low' ? 0 : 8;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 1.1 + Math.sin(t * 2.1) * 0.4 + Math.sin(t * 5.3) * 0.2;
    if (lava.current) lava.current.emissiveIntensity = pulse;
    if (light.current) light.current.intensity = 2 + pulse * 1.5;
    for (let i = 0; i < nSmoke; i++) {
      const s = smokeRefs.current[i];
      if (!s) continue;
      const k = (t * 0.12 + i / nSmoke) % 1;
      s.position.set(Math.sin(i * 2.3 + t * 0.4) * (0.3 + k), 5 + k * 4.5, Math.cos(i * 1.7) * 0.3);
      s.scale.setScalar(0.9 + k * 2.6);
      (s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.4;
    }
    for (let i = 0; i < nEmber; i++) {
      const e = emberRefs.current[i];
      if (!e) continue;
      const k = (t * 0.55 + i / nEmber) % 1;
      e.position.set(Math.sin(i * 2.1) * k, 4.7 + k * 2.4, Math.cos(i * 1.3) * k);
      e.scale.setScalar(0.14 + (1 - k) * 0.12);
      (e.material as THREE.SpriteMaterial).opacity = 1 - k;
    }
  });

  return (
    <group position={[-9, baseY, -9]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[4, 5, 20]} />
        <meshStandardMaterial color="#6b5648" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <coneGeometry args={[1.2, 1, 16]} />
        <meshStandardMaterial ref={lava} color="#ff7a30" emissive="#ff5a1a" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 5.4, 0]} color="#ff7a30" intensity={3} distance={16} decay={2} />
      {Array.from({ length: nSmoke }).map((_, i) => (
        <sprite
          key={`s${i}`}
          ref={(el) => {
            smokeRefs.current[i] = el;
          }}
        >
          <spriteMaterial map={smokeMap} transparent depthWrite={false} opacity={0.35} />
        </sprite>
      ))}
      {Array.from({ length: nEmber }).map((_, i) => (
        <sprite
          key={`e${i}`}
          ref={(el) => {
            emberRefs.current[i] = el;
          }}
        >
          <spriteMaterial map={emberMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Mar con olas y destellos: vértices ondulando + relieve animado (bump). */
function Water() {
  const quality = useApp((s) => s.quality);
  const seg = quality.tier === 'high' ? 44 : quality.tier === 'medium' ? 30 : 14;
  const geo = useMemo(() => new THREE.PlaneGeometry(170, 170, seg, seg), [seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  const bump = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < 256; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        const v = 110 + Math.floor(fbm2(x * 0.06, y * 0.06) * 120);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 7);
    return t;
  }, []);

  useFrame((s, delta) => {
    const t = s.clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.12 + t) * 0.26 + Math.cos(y * 0.18 + t * 0.8) * 0.26);
    }
    pos.needsUpdate = true;
    if (quality.tier === 'high') geo.computeVertexNormals();
    bump.offset.x += delta * 0.016;
    bump.offset.y += delta * 0.009;
  });

  return (
    <mesh geometry={geo} position={[0, WATER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#2678b8"
        transparent
        opacity={0.92}
        roughness={0.26}
        metalness={0.08}
        bumpMap={bump}
        bumpScale={0.9}
      />
    </mesh>
  );
}

/** Espuma en la orilla, latiendo como olas que rompen. */
function ShoreFoam() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ref.current?.scale.setScalar(1 + Math.sin(t * 0.8) * 0.012);
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.18 + Math.sin(t * 0.8) * 0.07;
  });
  return (
    <mesh ref={ref} position={[0, WATER_Y + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[20.4, 23, 72]} />
      <meshBasicMaterial color="#eaf6ff" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

/** Nubes low-poly que se desplazan lentamente (se omiten en gama baja). */
function Clouds() {
  const ref = useRef<THREE.Group>(null);
  const quality = useApp((s) => s.quality);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += 0.012 * d;
  });
  if (quality.tier === 'low') return null;
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    const r = 16 + ((i * 7) % 9);
    return { key: i, pos: [Math.cos(a) * r, 13 + (i % 3) * 2, Math.sin(a) * r] as [number, number, number] };
  });
  return (
    <group ref={ref}>
      {clouds.map((c) => (
        <group key={c.key} position={c.pos}>
          {[[0, 0, 0], [1.6, -0.2, 0.3], [-1.5, -0.1, -0.2]].map((p, j) => (
            <mesh key={j} position={p as [number, number, number]}>
              <sphereGeometry args={[1.3, 8, 8]} />
              <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Postprocesado de la isla: bloom contenido (escena diurna) + ACES. */
function IslandEffects() {
  const quality = useApp((s) => s.quality);
  if (!quality.postprocessing) return null;
  return (
    <EffectComposer multisampling={quality.antialias ? 4 : 0}>
      <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur radius={0.6} />
      <Vignette eskil={false} offset={0.3} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export default function DinoIslandScene() {
  const quality = useApp((s) => s.quality);
  const [era, setEra] = useState<EraFilter>('all');
  const env = ERA_ENV[era];
  const registry = useMemo<Registry>(() => new Map(), [era]);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);
  const shownDinos = useMemo(() => (era === 'all' ? DINOS : DINOS.filter((d) => d.era === era)), [era]);
  const trees = useMemo(() => {
    const n = Math.max(2, Math.round(scaleCount(18, quality, 7) * env.treeMul));
    return Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.6;
      const r = 4 + ((i * 37) % 12);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      return {
        key: i,
        position: [x, h, z] as [number, number, number],
        scale: 0.85 + ((i * 13) % 7) / 10,
        ok: h > 0.05 && Math.hypot(x + 9, z + 9) > 6,
      };
    })
      .filter((t) => t.ok)
      .slice(0, n);
  }, [quality, env.treeMul]);
  const palms = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.25;
        const r = 18.6 + ((i * 7) % 3) * 0.5;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return {
          key: i,
          position: [x, terrainHeight(x, z), z] as [number, number, number],
          rotation: a + 1.2,
          scale: 0.9 + ((i * 11) % 5) / 10,
        };
      }),
    [],
  );
  const butterflies = quality.tier === 'low' ? 2 : 5;
  const eraChips: { key: EraFilter; label: string }[] = [
    { key: 'all', label: '🌍 Todas' },
    { key: 'Triásico', label: 'Triásico' },
    { key: 'Jurásico', label: 'Jurásico' },
    { key: 'Cretácico', label: 'Cretácico' },
  ];

  return (
    <>
      <div className="scene-canvas">
        <Canvas
          shadows={quality.tier === 'high' ? 'soft' : quality.tier === 'medium'}
          camera={{ position: [0, 12, 26], fov: 55 }}
          dpr={quality.dpr}
          gl={{ antialias: quality.antialias }}
        >
          <Sky sunPosition={env.sky.sunPosition} turbidity={env.sky.turbidity} rayleigh={env.sky.rayleigh} />
          <fog attach="fog" args={env.fog} />
          <hemisphereLight args={env.hemi} />
          <directionalLight
            position={[10, 16, 4]}
            intensity={env.sun.intensity}
            color={env.sun.color}
            castShadow
            shadow-mapSize={quality.tier === 'high' ? [2048, 2048] : [1024, 1024]}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
          <Terrain env={env} />
          <Volcano />
          <Water />
          <ShoreFoam />
          <Clouds />
          {trees.map((t) => (
            <Tree key={t.key} position={t.position} scale={t.scale} phase={t.key} leaf={env.leaf} />
          ))}
          {palms.map((p) => (
            <Palm key={p.key} position={p.position} rotation={p.rotation} scale={p.scale} />
          ))}
          <GrassTufts count={Math.round(scaleCount(260, quality, 70) * env.grassMul)} />
          <Rocks count={Math.round(scaleCount(24, quality, 10) * env.rockMul)} />
          <Flowers count={Math.round(scaleCount(26, quality, 10) * env.flowerMul)} />
          {Array.from({ length: butterflies }).map((_, i) => (
            <Butterfly key={i} seed={i + 1} />
          ))}
          {shownDinos.map((d) => (
            <DinoActor key={d.id} dino={d} registry={registry} />
          ))}
          <Controls
            ref={controlsRef as never}
            minDistance={10}
            maxDistance={50}
            maxPolarAngle={Math.PI * 0.49}
            target={[0, 1, 0]}
          />
          <IntroFly from={[0, 30, 64]} to={[0, 12, 26]} look={[0, 1, 0]} duration={2.6} controls={controlsRef} />
          <AdaptiveQuality />
          <IslandEffects />
        </Canvas>
      </div>

      <div className="era-selector">
        <div className="control-row">
          {eraChips.map((c) => (
            <button
              key={c.key}
              className={`chip-btn${era === c.key ? ' active' : ''}`}
              onClick={() => setEra(c.key)}
              style={c.key !== 'all' && era !== c.key ? { borderColor: ERA_COLORS[c.key as DinoEra] } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
