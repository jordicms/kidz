import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import type { Microbe } from '../../data/micro';
import { useApp } from '../../state/store';
import Atmosphere from './Atmosphere';

/**
 * Microbios procedurales (offline, sin assets). Todos se construyen con un
 * tamaño canónico de ~1 unidad de diámetro: la escena los escala luego al
 * tamaño real que les toca según el zoom.
 *
 * Clave del aspecto: los materiales son brillantes y poco rugosos para que
 * el mapa de entorno (<Studio/>) les ponga reflejos, y las membranas llevan
 * un reborde Fresnel (Atmosphere) que da ese look húmedo y gelatinoso.
 */

/* ------------------------------------------------------------------ */
/* Materiales                                                          */
/* ------------------------------------------------------------------ */

/** Membrana: gelatinosa, translúcida y con reflejo. Deja ver el interior. */
function Membrane({ color, opacity = 0.34 }: { color: string; opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={opacity}
      roughness={0.08}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.08}
      envMapIntensity={2.2}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
}

/** Interior húmedo (orgánulos): brillante pero opaco. */
function Wet({ color, rough = 0.28, emissive, emissiveIntensity = 0 }: { color: string; rough?: number; emissive?: string; emissiveIntensity?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={rough}
      metalness={0}
      clearcoat={0.7}
      clearcoatRoughness={0.25}
      envMapIntensity={1.5}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

/** Cristal (caparazón de la diatomea): transmisión real en gama alta. */
function Glass({ color }: { color: string }) {
  const tier = useApp((s) => s.quality.tier);
  if (tier === 'high') {
    return (
      <meshPhysicalMaterial
        color={color}
        transmission={0.92}
        thickness={0.35}
        roughness={0.04}
        metalness={0}
        ior={1.46}
        envMapIntensity={2.4}
        clearcoat={1}
        side={THREE.DoubleSide}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={0.42}
      roughness={0.06}
      metalness={0}
      clearcoat={1}
      envMapIntensity={2.4}
      side={THREE.DoubleSide}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Ayudas geométricas                                                  */
/* ------------------------------------------------------------------ */

/** Puntos repartidos uniformemente sobre una esfera (espiral de Fibonacci). */
function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    pts.push(new THREE.Vector3(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius));
  }
  return pts;
}

/** Tubo a lo largo de una hélice (flagelo bacteriano). */
function helixTube(turns: number, length: number, amp: number, tubeR: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    // La amplitud crece un poco hacia la punta, como un sacacorchos.
    const k = amp * (0.35 + t * 0.65);
    pts.push(new THREE.Vector3(Math.cos(a) * k, Math.sin(a) * k, -t * length));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, tubeR, 6, false);
}

/**
 * Esfera deformable de superficie LISA.
 *
 * `IcosahedronGeometry` viene sin índices: al recalcular las normales tras
 * deformarla, cada triángulo recibe la suya y el bulto sale facetado, como un
 * cristal. Fusionando los vértices duplicados las normales se promedian y la
 * membrana queda suave, que es lo que toca en algo gelatinoso.
 */
function blobGeometry(radius: number, detail: number): THREE.BufferGeometry {
  return mergeVertices(new THREE.IcosahedronGeometry(radius, detail));
}

/** Perfil de disco bicóncavo (glóbulo rojo) revolucionado con Lathe. */
function biconcaveGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = centro, 1 = borde
    const r = t * 0.5;
    // Hundido en el centro y abultado cerca del borde.
    const h = 0.2 * Math.sqrt(Math.max(0, 1 - t * t)) * (0.3 + 1.5 * t * t);
    pts.push(new THREE.Vector2(r, h));
  }
  // Cierra el borde bajando a la mitad inferior.
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = t * 0.5;
    const h = 0.2 * Math.sqrt(Math.max(0, 1 - t * t)) * (0.3 + 1.5 * t * t);
    pts.push(new THREE.Vector2(r, -h));
  }
  return new THREE.LatheGeometry(pts, 40);
}

/* ------------------------------------------------------------------ */
/* Orgánulos reutilizables                                             */
/* ------------------------------------------------------------------ */

function Nucleus({ r = 0.18, color = '#8a3a6a', position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[r, 24, 24]} />
        <Wet color={color} rough={0.35} />
      </mesh>
      {/* Nucléolo */}
      <mesh position={[r * 0.3, r * 0.2, r * 0.2]}>
        <sphereGeometry args={[r * 0.36, 14, 14]} />
        <Wet color="#5a1a44" rough={0.5} />
      </mesh>
    </group>
  );
}

/** Mitocondrias: judías con crestas dentro. */
function Mitochondria({ count = 5, spread = 0.34, color = '#e0703a' }) {
  const spots = useMemo(() => fibonacciSphere(count, spread), [count, spread]);
  return (
    <>
      {spots.map((p, i) => (
        <group key={i} position={p} rotation={[i * 1.1, i * 0.7, i * 0.5]}>
          <mesh>
            <capsuleGeometry args={[0.045, 0.11, 4, 10]} />
            <Wet color={color} rough={0.3} emissive="#8a2a10" emissiveIntensity={0.25} />
          </mesh>
          {/* Crestas internas */}
          {[-0.03, 0.01, 0.05].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.032, 0.008, 5, 10]} />
              <Wet color="#ffb08a" rough={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

/** Ribosomas: puntitos por el citoplasma (instanciados, muy baratos). */
function Ribosomes({ count = 60, spread = 0.42 }) {
  const tier = useApp((s) => s.quality.tier);
  const n = tier === 'low' ? Math.round(count * 0.4) : count;
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return fibonacciSphere(n, 1).map((dir, i) => {
      const r = spread * (0.35 + ((i * 37) % 60) / 100);
      dummy.position.copy(dir).multiplyScalar(r);
      dummy.scale.setScalar(0.7 + ((i * 13) % 6) / 10);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [n, spread]);
  return (
    <instancedMesh
      args={[undefined, undefined, matrices.length]}
      ref={(m) => {
        if (!m) return;
        matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
        m.instanceMatrix.needsUpdate = true;
      }}
    >
      <sphereGeometry args={[0.014, 8, 8]} />
      <Wet color="#6a4a8a" rough={0.5} />
    </instancedMesh>
  );
}

/** Aparato de Golgi: pila de sacos aplanados. */
function Golgi({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position} rotation={[0.3, 0.5, 0.2]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, i * 0.028, 0]} scale={[1 - i * 0.13, 1, 1 - i * 0.13]}>
          <torusGeometry args={[0.07, 0.014, 6, 20, Math.PI * 1.4]} />
          <Wet color="#d8a24a" rough={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Microbios                                                           */
/* ------------------------------------------------------------------ */

/** Célula animal: membrana translúcida con núcleo y orgánulos dentro. */
function CellAnimal({ m }: { m: Microbe }) {
  return (
    <group>
      <Nucleus r={0.17} color={m.color2 ?? '#8a3a6a'} position={[0.04, 0.03, 0]} />
      <Mitochondria count={6} spread={0.33} />
      <Ribosomes count={70} spread={0.4} />
      <Golgi position={[-0.24, -0.12, 0.1]} />
      {/* Retículo endoplasmático: cintas onduladas */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.18, -0.05 + i * 0.09, -0.1]} rotation={[1.2, i * 0.6, 0.3]}>
          <torusGeometry args={[0.1, 0.009, 5, 24, Math.PI * 1.2]} />
          <Wet color="#c06a9a" rough={0.4} />
        </mesh>
      ))}
      {/* Membrana (se dibuja al final para que se vea el interior) */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[0.5, 48, 48]} />
        <Membrane color={m.color} opacity={0.3} />
      </mesh>
      <Atmosphere radius={0.42} color={m.color} intensity={0.7} />
    </group>
  );
}

/** Célula vegetal: pared rígida, gran vacuola y cloroplastos verdes. */
function CellPlant({ m }: { m: Microbe }) {
  return (
    <group>
      {/* Vacuola central (globo de agua) */}
      <mesh>
        <sphereGeometry args={[0.3, 28, 28]} />
        <meshPhysicalMaterial
          color="#bfe8ff"
          transparent
          opacity={0.3}
          roughness={0.05}
          clearcoat={1}
          envMapIntensity={2}
          depthWrite={false}
        />
      </mesh>
      <Nucleus r={0.12} color="#5a7a3a" position={[-0.26, 0.14, 0.06]} />
      {/* Cloroplastos: lentejas verdes con granos */}
      {fibonacciSphere(8, 0.36).map((p, i) => (
        <group key={i} position={p} rotation={[i * 0.9, i * 1.3, i * 0.4]}>
          <mesh scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.075, 14, 12]} />
            <Wet color="#4aa83a" rough={0.3} emissive="#1a5a10" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      <Ribosomes count={40} spread={0.4} />
      {/* Membrana interna */}
      <mesh renderOrder={2}>
        <boxGeometry args={[0.94, 0.94, 0.94]} />
        <Membrane color="#c8f0a8" opacity={0.16} />
      </mesh>
      {/* Pared celular: caja rígida con aristas marcadas */}
      <mesh renderOrder={3}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={m.color}
          transparent
          opacity={0.22}
          roughness={0.35}
          clearcoat={0.5}
          envMapIntensity={1.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Glóbulo rojo: disco bicóncavo brillante que gira sobre sí mismo. */
function RedCell({ m }: { m: Microbe }) {
  const geo = useMemo(() => biconcaveGeometry(), []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.25;
      ref.current.rotation.y += 0.004;
    }
  });
  return (
    <group ref={ref} rotation={[0.5, 0, 0]}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={m.color}
          roughness={0.16}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={2}
          sheen={0.6}
          sheenColor="#ff8a8a"
        />
      </mesh>
      <Atmosphere radius={0.42} color="#ff5a5a" intensity={0.45} />
    </group>
  );
}

/** Glóbulo blanco: bulto irregular con núcleo lobulado; se deforma al moverse. */
function WhiteCell({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => blobGeometry(0.46, 4), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      // Bultos que recorren la superficie (pseudópodos suaves).
      const k = 1 + 0.12 * Math.sin(x * 7 + t * 1.4) + 0.1 * Math.cos(y * 6 - t * 1.1) + 0.08 * Math.sin(z * 8 + t * 0.7);
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (ref.current) ref.current.rotation.y += 0.003;
  });
  return (
    <group>
      {/* Núcleo lobulado (varios lóbulos pegados) */}
      {[
        [0.06, 0.05, 0],
        [-0.08, -0.02, 0.05],
        [0.02, -0.09, -0.05],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.12, 18, 18]} />
          <Wet color="#7a86c8" rough={0.4} />
        </mesh>
      ))}
      <Ribosomes count={40} spread={0.34} />
      <mesh ref={ref} geometry={geo} renderOrder={2}>
        <Membrane color={m.color} opacity={0.4} />
      </mesh>
      <Atmosphere radius={0.44} color="#cfe0ff" intensity={0.6} />
    </group>
  );
}

/** Neurona: cuerpo, dendritas ramificadas y axón con vaina de mielina.
 *  Un chispazo recorre el axón: se ve el mensaje viajando. */
function Neuron({ m }: { m: Microbe }) {
  const spark = useRef<THREE.Mesh>(null);
  const dendrites = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const tilt = 0.4 + (i % 3) * 0.25;
        return { a, tilt, len: 0.3 + ((i * 7) % 4) / 14 };
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (!spark.current) return;
    const t = (clock.elapsedTime * 0.7) % 1.6;
    const k = Math.min(1, t / 1.1);
    spark.current.position.z = -0.14 - k * 0.5;
    const mat = spark.current.material as THREE.MeshStandardMaterial;
    mat.opacity = t < 1.1 ? 1 : 0;
    spark.current.visible = t < 1.1;
  });
  return (
    <group>
      {/* Soma */}
      <mesh>
        <sphereGeometry args={[0.17, 26, 26]} />
        <Wet color={m.color} rough={0.22} />
      </mesh>
      <Nucleus r={0.075} color={m.color2 ?? '#7a4ac0'} />
      {/* Dendritas: conos que se ramifican */}
      {dendrites.map((d, i) => (
        <group key={i} rotation={[d.tilt, d.a, 0]}>
          <mesh position={[0, d.len / 2 + 0.1, 0]}>
            <coneGeometry args={[0.035, d.len, 7]} />
            <Wet color={m.color} rough={0.3} />
          </mesh>
          {[-0.5, 0.5].map((s) => (
            <mesh key={s} position={[s * 0.06, d.len + 0.16, 0]} rotation={[0, 0, s * 0.7]}>
              <coneGeometry args={[0.016, 0.16, 6]} />
              <Wet color={m.color} rough={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Axón hacia -Z con mielina segmentada */}
      <mesh position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.6, 10]} />
        <Wet color="#e0d0ff" rough={0.3} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, -0.24 - i * 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.11, 4, 12]} />
          <Wet color="#f6f0ff" rough={0.25} />
        </mesh>
      ))}
      {/* Terminales */}
      {[-1, 0, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, s * 0.05, -0.74]} rotation={[Math.PI / 2, 0, s * 0.5]}>
          <coneGeometry args={[0.022, 0.14, 6]} />
          <Wet color={m.color} rough={0.35} />
        </mesh>
      ))}
      {/* El chispazo que viaja (contenido: con bloom, más brillo lo convierte
          en un fogonazo blanco que tapa la neurona) */}
      <mesh ref={spark}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshStandardMaterial color="#cfe4ff" emissive="#6aa8ff" emissiveIntensity={1.3} transparent />
      </mesh>
    </group>
  );
}

/** Bacteria alargada con flagelos que giran de verdad, como hélices. */
function Rod({ m }: { m: Microbe }) {
  const flagella = useRef<THREE.Group>(null);
  const geo = useMemo(() => helixTube(3.2, 0.75, 0.075, 0.011), []);
  useFrame((_, delta) => {
    if (flagella.current) flagella.current.rotation.z += delta * 9;
  });
  return (
    <group>
      {/* Cuerpo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.19, 0.5, 8, 24]} />
        <meshPhysicalMaterial
          color={m.color}
          roughness={0.3}
          metalness={0}
          clearcoat={0.3}
          clearcoatRoughness={0.25}
          envMapIntensity={0.9}
          emissive={m.color}
          emissiveIntensity={0.18}
        />
      </mesh>
      {/* ADN enrollado dentro (nucleoide) */}
      <mesh rotation={[1.2, 0.4, 0]}>
        <torusKnotGeometry args={[0.1, 0.018, 64, 8, 2, 3]} />
        <Wet color={m.color2 ?? '#1a6a48'} rough={0.4} />
      </mesh>
      {/* Ribosomas */}
      <Ribosomes count={30} spread={0.15} />
      {/* Flagelos: 3 hélices que giran juntas */}
      <group ref={flagella} position={[0, 0, -0.42]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]}>
            <mesh geometry={geo} position={[0.05, 0, 0]}>
              <Wet color="#d8f0e0" rough={0.4} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Pili: pelillos cortos */}
      {fibonacciSphere(10, 0.2).map((p, i) => (
        <mesh key={i} position={p} rotation={[p.y * 3, p.x * 3, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.1, 4]} />
          <Wet color="#c8e8d8" rough={0.5} />
        </mesh>
      ))}
      <Atmosphere radius={0.26} color={m.color} intensity={0.22} />
    </group>
  );
}

/** Estreptococo: bolitas pegadas en cadena, como un collar. */
function Cocci({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.15;
  });
  return (
    <group ref={ref}>
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i - 2;
        return (
          <group key={i} position={[t * 0.2, Math.sin(t * 0.8) * 0.06, 0]}>
            <mesh>
              <sphereGeometry args={[0.115, 22, 22]} />
              <meshPhysicalMaterial
                color={m.color}
                roughness={0.26}
                metalness={0}
                clearcoat={0.35}
                envMapIntensity={0.95}
                emissive={m.color}
                emissiveIntensity={0.16}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.05, 12, 12]} />
              <Wet color={m.color2 ?? '#4a80c0'} rough={0.4} />
            </mesh>
          </group>
        );
      })}
      <Atmosphere radius={0.34} color={m.color} intensity={0.2} />
    </group>
  );
}

/** Cianobacteria: filamento de celdas con granos, se ondula suavemente. */
function Cyano({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ref.current?.children.forEach((c, i) => {
      c.position.y = Math.sin(t * 0.9 + i * 0.7) * 0.045;
    });
  });
  return (
    <group>
      <group ref={ref}>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} position={[(i - 2) * 0.22, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.11, 0.1, 6, 18]} />
              <meshPhysicalMaterial
                color={m.color}
                roughness={0.32}
                metalness={0}
                clearcoat={0.3}
                envMapIntensity={0.9}
                emissive={m.color}
                emissiveIntensity={0.18}
              />
            </mesh>
            {/* Granos internos (donde guarda la comida) */}
            {[-0.04, 0.04].map((z) => (
              <mesh key={z} position={[0, 0.02, z]}>
                <sphereGeometry args={[0.03, 10, 10]} />
                <Wet color="#0f6a60" rough={0.4} emissive="#0a4a44" emissiveIntensity={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <Atmosphere radius={0.34} color={m.color} intensity={0.2} />
    </group>
  );
}

/** Coronavirus: esfera con corona de espículas. */
function Corona({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  const spikes = useMemo(() => fibonacciSphere(34, 0.3), []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return (
    <group ref={ref}>
      {/* Envoltura */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshPhysicalMaterial
          color={m.color}
          roughness={0.22}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.15}
          envMapIntensity={2}
        />
      </mesh>
      {/* ARN dentro (se intuye) */}
      <mesh rotation={[0.6, 0.9, 0]}>
        <torusKnotGeometry args={[0.14, 0.02, 60, 8, 3, 4]} />
        <Wet color="#8a2a10" rough={0.5} />
      </mesh>
      {/* Espículas con cabeza (la "corona") */}
      {spikes.map((p, i) => {
        const dir = p.clone().normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const e = new THREE.Euler().setFromQuaternion(q);
        return (
          <group key={i} position={dir.clone().multiplyScalar(0.3)} rotation={[e.x, e.y, e.z]}>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.012, 0.016, 0.1, 6]} />
              <Wet color={m.color2 ?? '#c04a2a'} rough={0.3} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <Wet color="#ff6a3a" rough={0.25} emissive="#8a2000" emissiveIntensity={0.35} />
            </mesh>
          </group>
        );
      })}
      <Atmosphere radius={0.36} color="#ffb347" intensity={0.6} />
    </group>
  );
}

/** Bacteriófago: cabeza icosaédrica, cola y patas de aterrizaje. */
function Phage({ m }: { m: Microbe }) {
  const legs = [0, 1, 2, 3, 4, 5];
  return (
    <group>
      {/* Cabeza */}
      <mesh position={[0, 0.3, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshPhysicalMaterial
          color={m.color}
          roughness={0.16}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={2.2}
          flatShading
        />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 12]} />
        <Wet color={m.color2 ?? '#6a4ac0'} rough={0.3} />
      </mesh>
      {/* Cola (vaina con anillos) */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.28, 12]} />
        <Wet color="#d8ccff" rough={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.04 - i * 0.055, 0]}>
          <torusGeometry args={[0.042, 0.009, 6, 14]} />
          <Wet color={m.color2 ?? '#6a4ac0'} rough={0.35} />
        </mesh>
      ))}
      {/* Placa base */}
      <mesh position={[0, -0.21, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.035, 6]} />
        <Wet color={m.color2 ?? '#6a4ac0'} rough={0.3} />
      </mesh>
      {/* Patas */}
      {legs.map((i) => {
        const a = (i / legs.length) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.07, -0.27, 0]} rotation={[0, 0, -0.7]}>
              <cylinderGeometry args={[0.008, 0.008, 0.14, 5]} />
              <Wet color="#e8e0ff" rough={0.4} />
            </mesh>
            <mesh position={[0.13, -0.35, 0]} rotation={[0, 0, -1.4]}>
              <cylinderGeometry args={[0.007, 0.007, 0.1, 5]} />
              <Wet color="#e8e0ff" rough={0.4} />
            </mesh>
          </group>
        );
      })}
      <Atmosphere radius={0.34} color={m.color} intensity={0.28} />
    </group>
  );
}

/** Ameba: masa que se deforma continuamente sacando pseudópodos. */
function Ameba({ m }: { m: Microbe }) {
  const geo = useMemo(() => blobGeometry(0.44, 4), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.75;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      // Varias ondas lentas superpuestas: brazos que salen y se recogen.
      const k =
        1 +
        0.3 * Math.sin(x * 4 + t) * Math.cos(y * 3 - t * 0.7) +
        0.2 * Math.sin(z * 5 - t * 1.1) +
        0.14 * Math.cos(x * 7 + z * 5 + t * 0.5);
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group>
      <Nucleus r={0.1} color="#4a8a3a" position={[0.05, 0, 0]} />
      {/* Vacuolas (burbujas de agua y comida) */}
      {[
        [-0.16, 0.1, 0.05],
        [0.14, -0.14, -0.06],
        [-0.05, -0.08, 0.16],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.06 + i * 0.012, 14, 14]} />
          <meshPhysicalMaterial
            color="#d8ffd0"
            transparent
            opacity={0.4}
            roughness={0.05}
            clearcoat={1}
            envMapIntensity={2}
            depthWrite={false}
          />
        </mesh>
      ))}
      <Ribosomes count={40} spread={0.3} />
      <mesh geometry={geo} renderOrder={2}>
        <Membrane color={m.color} opacity={0.42} />
      </mesh>
      <Atmosphere radius={0.46} color={m.color} intensity={0.55} />
    </group>
  );
}

/** Paramecio: zapatilla cubierta de cilios que reman en oleadas. */
function Paramecium({ m }: { m: Microbe }) {
  const cilia = useRef<THREE.InstancedMesh>(null);
  const tier = useApp((s) => s.quality.tier);
  const nCilia = tier === 'low' ? 60 : tier === 'medium' ? 110 : 170;
  // Puntos sobre un elipsoide alargado (la zapatilla).
  const seeds = useMemo(() => {
    const dirs = fibonacciSphere(nCilia, 1);
    return dirs.map((d) => ({
      dir: d.clone(),
      pos: new THREE.Vector3(d.x * 0.17, d.y * 0.15, d.z * 0.46),
      phase: d.z * 6,
    }));
  }, [nCilia]);

  useFrame(({ clock }) => {
    const mesh = cilia.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      // Oleada metacronal: cada cilio va un pelín retrasado respecto al vecino.
      const wave = Math.sin(t * 7 - s.phase);
      const dir = s.dir.clone().normalize();
      dir.z += wave * 0.5;
      dir.normalize();
      dummy.position.copy(s.pos);
      dummy.quaternion.setFromUnitVectors(up, dir);
      dummy.scale.set(1, 1 + wave * 0.18, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Cuerpo: elipsoide alargado, un poco asimétrico */}
      <mesh scale={[0.36, 0.32, 1]} renderOrder={2}>
        <sphereGeometry args={[0.5, 36, 28]} />
        <Membrane color={m.color} opacity={0.55} />
      </mesh>
      {/* Macronúcleo y vacuolas */}
      <Nucleus r={0.09} color={m.color2 ?? '#5aa8d0'} position={[0, 0, -0.05]} />
      {[
        [0.05, 0.04, 0.22],
        [-0.06, -0.03, -0.24],
        [0.04, -0.05, 0.02],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshPhysicalMaterial color="#eaffff" transparent opacity={0.45} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} />
        </mesh>
      ))}
      {/* Surco oral */}
      <mesh position={[0.13, 0, 0.12]} rotation={[0, 0.5, 0.4]}>
        <torusGeometry args={[0.09, 0.022, 8, 18, Math.PI]} />
        <Wet color="#3a80a8" rough={0.35} />
      </mesh>
      {/* Cilios */}
      <instancedMesh ref={cilia} args={[undefined, undefined, seeds.length]}>
        <coneGeometry args={[0.008, 0.19, 4]} />
        <Wet color="#dff4ff" rough={0.4} />
      </instancedMesh>
      {/* Halo con la forma alargada del cuerpo, no una burbuja redonda */}
      <group scale={[0.42, 0.38, 1.05]}>
        <Atmosphere radius={0.5} color={m.color} intensity={0.55} />
      </group>
    </group>
  );
}

/** Tardígrado: cuerpo segmentado y ocho patas que caminan. */
function Tardigrade({ m }: { m: Microbe }) {
  const legRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 3.5;
    legRefs.current.forEach((g, i) => {
      if (!g) return;
      const side = i % 2 === 0 ? 0 : Math.PI;
      g.rotation.x = Math.sin(t + i * 0.9 + side) * 0.45;
    });
  });
  const segments = [0, 1, 2, 3];
  return (
    <group rotation={[0, 0, 0]}>
      {/* Cabeza */}
      <mesh position={[0, 0.02, 0.34]}>
        <sphereGeometry args={[0.17, 22, 20]} />
        <Wet color={m.color} rough={0.3} />
      </mesh>
      {/* Boca tubular */}
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.1, 12]} />
        <Wet color={m.color2 ?? '#c08a3a'} rough={0.35} />
      </mesh>
      {/* Cuerpo por segmentos, se va estrechando */}
      {segments.map((i) => (
        <mesh key={i} position={[0, 0, 0.16 - i * 0.19]}>
          <sphereGeometry args={[0.2 - i * 0.014, 22, 20]} />
          <Wet color={m.color} rough={0.28} />
        </mesh>
      ))}
      {/* Ocho patas regordetas con garras */}
      {segments.map((i) =>
        [-1, 1].map((s) => {
          const idx = i * 2 + (s > 0 ? 1 : 0);
          return (
            <group
              key={`${i}-${s}`}
              position={[s * 0.15, -0.1, 0.14 - i * 0.19]}
              ref={(el) => {
                legRefs.current[idx] = el;
              }}
            >
              <mesh position={[s * 0.04, -0.07, 0]} rotation={[0, 0, s * 0.4]}>
                <capsuleGeometry args={[0.045, 0.08, 4, 10]} />
                <Wet color={m.color} rough={0.32} />
              </mesh>
              {/* Garritas */}
              {[-1, 0, 1].map((c) => (
                <mesh key={c} position={[s * 0.07 + c * 0.02, -0.16, c * 0.02]} rotation={[0, 0, s * 0.6]}>
                  <coneGeometry args={[0.012, 0.05, 5]} />
                  <Wet color="#4a3a20" rough={0.4} />
                </mesh>
              ))}
            </group>
          );
        }),
      )}
      {/* Ojitos */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.08, 0.45]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="#1a1008" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Diatomea: caparazón de cristal con simetría radial. Es la joya del capítulo. */
function Diatom({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y += 0.006;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.12;
    }
  });
  const spokes = 18;
  return (
    <group ref={ref} rotation={[0.5, 0, 0]}>
      {/* Cuerpo: pastillero de cristal */}
      <mesh>
        <cylinderGeometry args={[0.45, 0.45, 0.2, 48, 1, false]} />
        <Glass color={m.color} />
      </mesh>
      {/* Costillas radiales (el dibujo del cristal) */}
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.26, 0.012, 0.02]} />
            <Wet color="#eafffb" rough={0.1} />
          </mesh>
        );
      })}
      {/* Anillos concéntricos */}
      {[0.42, 0.3, 0.17].map((r) => (
        <mesh key={r} position={[0, 0.104, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.011, 8, 48]} />
          <Wet color="#d8fff8" rough={0.08} />
        </mesh>
      ))}
      {/* Poros del borde */}
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <Wet color="#9fe8dd" rough={0.15} />
          </mesh>
        );
      })}
      {/* Cloroplastos dorados dentro */}
      {fibonacciSphere(6, 0.25).map((p, i) => (
        <mesh key={i} position={[p.x, p.y * 0.25, p.z]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <Wet color="#d8a83a" rough={0.3} emissive="#8a5a00" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <Atmosphere radius={0.5} color="#8ff0e0" intensity={0.8} />
    </group>
  );
}

/** Levadura: célula redonda con una yema creciendo al costado. */
function Yeast({ m }: { m: Microbe }) {
  const bud = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // La yema crece y se reinicia: se ve cómo se multiplica.
    const k = 0.3 + ((clock.elapsedTime * 0.18) % 1) * 0.75;
    bud.current?.scale.setScalar(k);
  });
  return (
    <group>
      {/* Célula madre */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[0.36, 30, 30]} />
        <Membrane color={m.color} opacity={0.5} />
      </mesh>
      <Nucleus r={0.12} color={m.color2 ?? '#b8964a'} />
      {/* Vacuola */}
      <mesh position={[-0.13, -0.1, 0.06]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshPhysicalMaterial color="#fff8e0" transparent opacity={0.42} roughness={0.06} clearcoat={1} envMapIntensity={2} depthWrite={false} />
      </mesh>
      <Ribosomes count={40} spread={0.28} />
      {/* Yema */}
      <group ref={bud} position={[0.36, 0.16, 0]}>
        <mesh renderOrder={2}>
          <sphereGeometry args={[0.2, 22, 22]} />
          <Membrane color={m.color} opacity={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.06, 12, 12]} />
          <Wet color={m.color2 ?? '#b8964a'} rough={0.4} />
        </mesh>
      </group>
      {/* Cicatriz de una yema anterior */}
      <mesh position={[-0.3, 0.18, 0.05]} rotation={[0, 0, -0.6]}>
        <torusGeometry args={[0.06, 0.014, 8, 16]} />
        <Wet color="#c8a86a" rough={0.4} />
      </mesh>
      <Atmosphere radius={0.38} color={m.color} intensity={0.3} />
    </group>
  );
}

/** ADN: doble hélice con sus peldaños de colores. */
function Dna({ m }: { m: Microbe }) {
  const ref = useRef<THREE.Group>(null);
  const tier = useApp((s) => s.quality.tier);
  const rungs = tier === 'low' ? 12 : 22;
  const turns = 2.4;
  const height = 1.5;

  const strands = useMemo(() => {
    const make = (offset: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const a = t * Math.PI * 2 * turns + offset;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.2, t * height - height / 2, Math.sin(a) * 0.2));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.028, 8, false);
    };
    return [make(0), make(Math.PI)];
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5;
  });

  const pairColors = ['#ff6f8a', '#4fd0e0', '#ffd166', '#8af06e'];

  return (
    <group ref={ref}>
      {strands.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial
            color={i === 0 ? m.color : m.color2 ?? '#4fd0e0'}
            roughness={0.15}
            metalness={0.1}
            clearcoat={1}
            envMapIntensity={2.4}
          />
        </mesh>
      ))}
      {/* Peldaños: los pares de bases (A-T, C-G) */}
      {Array.from({ length: rungs }).map((_, i) => {
        const t = i / (rungs - 1);
        const a = t * Math.PI * 2 * turns;
        const y = t * height - height / 2;
        const c1 = pairColors[i % 2 === 0 ? 0 : 2];
        const c2 = pairColors[i % 2 === 0 ? 1 : 3];
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, -a, 0]}>
            <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.2, 8]} />
              <Wet color={c1} rough={0.25} emissive={c1} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.2, 8]} />
              <Wet color={c2} rough={0.25} emissive={c2} emissiveIntensity={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Selector                                                            */
/* ------------------------------------------------------------------ */

export default function MicrobeModel({ microbe }: { microbe: Microbe }): ReactNode {
  switch (microbe.shape) {
    case 'cell-animal':
      return <CellAnimal m={microbe} />;
    case 'cell-plant':
      return <CellPlant m={microbe} />;
    case 'rbc':
      return <RedCell m={microbe} />;
    case 'wbc':
      return <WhiteCell m={microbe} />;
    case 'neurona':
      return <Neuron m={microbe} />;
    case 'rod':
      return <Rod m={microbe} />;
    case 'cocci':
      return <Cocci m={microbe} />;
    case 'cyano':
      return <Cyano m={microbe} />;
    case 'corona':
      return <Corona m={microbe} />;
    case 'phage':
      return <Phage m={microbe} />;
    case 'ameba':
      return <Ameba m={microbe} />;
    case 'paramecio':
      return <Paramecium m={microbe} />;
    case 'tardigrado':
      return <Tardigrade m={microbe} />;
    case 'diatomea':
      return <Diatom m={microbe} />;
    case 'levadura':
      return <Yeast m={microbe} />;
    case 'dna':
      return <Dna m={microbe} />;
  }
}
