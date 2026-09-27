import type { ReactNode } from 'react';
import type { Bone, Vec3 } from '../../data/fossils';

/* ------------------------------------------------------------------ */
/* Material del hueso según su estado en el montaje                     */
/* ------------------------------------------------------------------ */

export type BoneState = 'placed' | 'ghost' | 'active';

function mat(state: BoneState) {
  if (state === 'ghost')
    return { color: '#d8cfb4', roughness: 1, flatShading: true, transparent: true, opacity: 0.16, depthWrite: false, emissive: '#000000', emissiveIntensity: 0 } as const;
  if (state === 'active')
    return { color: '#fff3d0', roughness: 0.85, flatShading: true, transparent: false, opacity: 1, depthWrite: true, emissive: '#ffb070', emissiveIntensity: 0.9 } as const;
  return { color: '#e8dfc6', roughness: 1, flatShading: true, transparent: false, opacity: 1, depthWrite: true, emissive: '#000000', emissiveIntensity: 0 } as const;
}

function asVec3(s: number | Vec3 | undefined, d = 1): Vec3 {
  if (s === undefined) return [d, d, d];
  return typeof s === 'number' ? [s, s, s] : s;
}

function bezier(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
}

/* ------------------------------------------------------------------ */
/* Piezas concretas                                                    */
/* ------------------------------------------------------------------ */

function Skull({ m, variant }: { m: ReturnType<typeof mat>; variant?: string }) {
  const long = variant === 'theropod';
  return (
    <group>
      {/* Cráneo */}
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.44, long ? 0.62 : 0.5]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Morro */}
      <mesh position={[0, -0.04, long ? 0.62 : 0.42]} castShadow>
        <boxGeometry args={[0.32, 0.3, long ? 0.7 : 0.42]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Mandíbula */}
      <mesh position={[0, -0.24, long ? 0.5 : 0.32]} castShadow>
        <boxGeometry args={[0.3, 0.12, long ? 0.95 : 0.6]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Cuencas de los ojos */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.08, long ? 0.36 : 0.28]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#2a2418" roughness={1} />
        </mesh>
      ))}
      {/* Dientes del theropod */}
      {long &&
        Array.from({ length: 6 }).map((_, i) =>
          [-0.13, 0.13].map((x) => (
            <mesh key={`${i}-${x}`} position={[x, -0.16, 0.55 + i * 0.12]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.03, 0.14, 6]} />
              <meshStandardMaterial color="#f4eede" roughness={0.9} />
            </mesh>
          )),
        )}
    </group>
  );
}

function Vert({ pos, r, m }: { pos: Vec3; r: number; m: ReturnType<typeof mat> }) {
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, r * 1.6, 8]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Apófisis (pincho superior de la vértebra) */}
      <mesh position={[0, r * 1.2, 0]} castShadow>
        <coneGeometry args={[r * 0.5, r * 1.6, 6]} />
        <meshStandardMaterial {...m} />
      </mesh>
    </group>
  );
}

function Neck({ m, variant }: { m: ReturnType<typeof mat>; variant?: string }) {
  const end: Vec3 = variant === 'up' ? [0, 1.05, 0.75] : variant === 'short' ? [0, 0.12, 0.6] : [0, 0.7, 0.95];
  const ctrl: Vec3 = variant === 'up' ? [0, 0.75, 0.2] : variant === 'short' ? [0, 0.3, 0.32] : [0, 0.6, 0.45];
  const n = 5;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const t = i / (n - 1);
        return <Vert key={i} pos={bezier([0, 0, 0], ctrl, end, t)} r={0.16 - t * 0.05} m={m} />;
      })}
    </>
  );
}

function Tail({ m, variant, scale }: { m: ReturnType<typeof mat>; variant?: string; scale: Vec3 }) {
  const zLen = scale[2];
  const end: Vec3 =
    variant === 'long' ? [0, -0.6, -3.0 * zLen] : variant === 'flat' ? [0, -0.25, -1.5 * zLen] : [0, -0.15, -2.7 * zLen];
  const ctrl: Vec3 = variant === 'long' ? [0, 0.05, -1.5 * zLen] : [0, 0.05, -1.2 * zLen];
  const n = 7;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const t = i / (n - 1);
        return <Vert key={i} pos={bezier([0, 0, 0], ctrl, end, t)} r={0.2 - t * 0.15} m={m} />;
      })}
    </>
  );
}

function Ribcage({ m, scale, variant }: { m: ReturnType<typeof mat>; scale: Vec3; variant?: string }) {
  const [w, h, len] = scale;
  const arched = variant === 'arched';
  const segs = 6;
  return (
    <group>
      {Array.from({ length: segs }).map((_, i) => {
        const t = i / (segs - 1);
        const z = (0.5 - t) * len; // de delante (+) a atrás (-)
        const arch = arched ? Math.sin(t * Math.PI) * 0.35 * h : 0;
        const y = arch;
        return (
          <group key={i}>
            <Vert pos={[0, y + 0.35 * h, z]} r={0.16} m={m} />
            {/* Un par de costillas por segmento (menos en los extremos) */}
            {i > 0 && i < segs - 1 &&
              [-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[side * 0.28 * w, y - 0.05 * h, z]}
                  rotation={[0.15, 0, side * 0.55]}
                  castShadow
                >
                  <capsuleGeometry args={[0.05, 0.9 * h, 3, 6]} />
                  <meshStandardMaterial {...m} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

function Pelvis({ m }: { m: ReturnType<typeof mat> }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.34, 0.7]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Palas ilíacas hacia arriba */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.28, 0.28, 0]} rotation={[0, 0, s * 0.3]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.55]} />
          <meshStandardMaterial {...m} />
        </mesh>
      ))}
    </group>
  );
}

function Toes({ m }: { m: ReturnType<typeof mat> }) {
  return (
    <>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} position={[x, -0.02, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.28, 6]} />
          <meshStandardMaterial {...m} />
        </mesh>
      ))}
    </>
  );
}

function Column({ m, len }: { m: ReturnType<typeof mat>; len: number }) {
  return (
    <group>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <capsuleGeometry args={[0.12, len, 4, 8]} />
        <meshStandardMaterial {...m} />
      </mesh>
      <group position={[0, -len, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.14, 0.4]} />
          <meshStandardMaterial {...m} />
        </mesh>
        <Toes m={m} />
      </group>
    </group>
  );
}

function Leg({ m, variant }: { m: ReturnType<typeof mat>; variant?: string }) {
  if (variant === 'frontPair' || variant === 'backPair') {
    const len = variant === 'frontPair' ? 1.55 : 1.95;
    return (
      <>
        {[-0.5, 0.5].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Column m={m} len={len} />
          </group>
        ))}
      </>
    );
  }
  // Pata bípeda (fémur adelante, tibia atrás, pie con dedos)
  return (
    <group>
      {/* Articulación de la cadera */}
      <mesh>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Fémur */}
      <mesh position={[0, -0.55, 0.22]} rotation={[-0.35, 0, 0]} castShadow>
        <capsuleGeometry args={[0.14, 1.0, 4, 8]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Rodilla */}
      <mesh position={[0, -1.05, 0.5]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Tibia */}
      <mesh position={[0, -1.5, 0.32]} rotation={[0.5, 0, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.95, 4, 8]} />
        <meshStandardMaterial {...m} />
      </mesh>
      {/* Pie */}
      <group position={[0, -1.98, 0.28]}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.12, 0.42]} />
          <meshStandardMaterial {...m} />
        </mesh>
        <Toes m={m} />
      </group>
    </group>
  );
}

function Arms({ m, variant }: { m: ReturnType<typeof mat>; variant?: string }) {
  const claw = variant === 'claw';
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.35, 0, 0]}>
          <mesh position={[0, -0.2, 0.1]} rotation={[0.6, 0, 0]} castShadow>
            <capsuleGeometry args={[0.06, claw ? 0.5 : 0.28, 3, 6]} />
            <meshStandardMaterial {...m} />
          </mesh>
          {claw && (
            <mesh position={[0, -0.5, 0.32]} rotation={[Math.PI / 1.6, 0, 0]}>
              <coneGeometry args={[0.05, 0.22, 6]} />
              <meshStandardMaterial {...m} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

function Plates({ m }: { m: ReturnType<typeof mat> }) {
  const zs = [1.4, 0.95, 0.5, 0.05, -0.4, -0.85, -1.3];
  return (
    <>
      {zs.map((z, i) => {
        const big = i === 3 ? 1.15 : 1;
        return (
          <mesh key={z} position={[0, Math.sin((i / (zs.length - 1)) * Math.PI) * 0.25, z]} rotation={[0, 0, 0]} castShadow>
            <coneGeometry args={[0.34 * big, 0.6 * big, 4]} />
            <meshStandardMaterial {...m} />
          </mesh>
        );
      })}
    </>
  );
}

function Spikes({ m }: { m: ReturnType<typeof mat> }) {
  const conf: { x: number; z: number; rz: number }[] = [
    { x: -0.22, z: 0.12, rz: 0.6 },
    { x: 0.22, z: 0.12, rz: -0.6 },
    { x: -0.2, z: -0.18, rz: 0.8 },
    { x: 0.2, z: -0.18, rz: -0.8 },
  ];
  return (
    <>
      {conf.map((c, i) => (
        <mesh key={i} position={[c.x, 0.1, c.z]} rotation={[Math.PI / 2, 0, c.rz]} castShadow>
          <coneGeometry args={[0.07, 0.6, 8]} />
          <meshStandardMaterial {...m} />
        </mesh>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pieza genérica: coloca y orienta el hueso y elige su geometría      */
/* ------------------------------------------------------------------ */

export function BonePiece({ bone, state }: { bone: Bone; state: BoneState }) {
  const m = mat(state);
  const s = asVec3(bone.scale);
  let inner: ReactNode = null;
  switch (bone.kind) {
    case 'skull':
      inner = <Skull m={m} variant={bone.variant} />;
      break;
    case 'neck':
      inner = <Neck m={m} variant={bone.variant} />;
      break;
    case 'tail':
      inner = <Tail m={m} variant={bone.variant} scale={s} />;
      break;
    case 'ribcage':
      inner = <Ribcage m={m} scale={s} variant={bone.variant} />;
      break;
    case 'pelvis':
      inner = <Pelvis m={m} />;
      break;
    case 'leg':
      inner = <Leg m={m} variant={bone.variant} />;
      break;
    case 'arms':
      inner = <Arms m={m} variant={bone.variant} />;
      break;
    case 'plates':
      inner = <Plates m={m} />;
      break;
    case 'spikes':
      inner = <Spikes m={m} />;
      break;
  }
  // El cuello, la cola, las costillas y las placas ya llevan su propia escala
  // interna; para el resto aplicamos la escala uniforme del hueso.
  const applyScale: Vec3 = bone.kind === 'tail' || bone.kind === 'ribcage' ? [1, 1, 1] : s;
  return (
    <group position={bone.pos} rotation={bone.rot} scale={applyScale}>
      {inner}
    </group>
  );
}
