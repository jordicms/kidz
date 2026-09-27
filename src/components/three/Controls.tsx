import { forwardRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls, type OrbitControlsProps } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useApp } from '../../state/store';

/**
 * Controles de cámara para móvil.
 *
 * Antes cada escena montaba su `OrbitControls` con `enablePan={false}`, así que
 * NO se podía desplazar la vista en ninguna: si algo quedaba fuera de pantalla,
 * era imposible llegar a él. Aquí se centraliza el comportamiento:
 *
 *  - Un dedo gira, dos dedos desplazan y hacen zoom (gestos estándar).
 *  - Amortiguación, para que el movimiento no sea brusco al soltar.
 *  - `ResponsiveFov` recupera la anchura que se pierde en pantallas verticales.
 *  - Botón de recentrar: por muy perdido que te dejes, siempre puedes volver.
 *
 * Las escenas siguen pasando sus propios límites (distancias, ángulos); estas
 * props van al final y por tanto mandan sobre los valores por defecto.
 */

/**
 * Corrige el encuadre en pantallas estrechas.
 *
 * Las cámaras de three usan fov VERTICAL: al girar el móvil a vertical, el alto
 * se mantiene y la anchura visible se hunde, así que la escena se sale por los
 * lados. Aquí se sube el fov vertical lo justo para conservar la MISMA anchura
 * visible que en una pantalla apaisada de referencia.
 */
/**
 * Fov vertical que conserva la anchura visible de una pantalla de referencia.
 *
 * Se exporta porque las escenas que colocan cosas "para que quepan" necesitan
 * el MISMO número: el `viewport` de r3f no se recalcula cuando cambiamos el fov
 * a mano, así que preguntárselo daría una medida obsoleta.
 */
export function responsiveFov(baseFov: number, aspect: number, refAspect = 1.6, maxFov = 100): number {
  const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * refAspect);
  const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hFov / 2) / Math.max(0.2, aspect)));
  return Math.min(maxFov, Math.max(baseFov, needed));
}

/** Tamaño visible (en unidades de mundo) a una distancia dada de la cámara. */
export function visibleSizeAt(baseFov: number, aspect: number, distance: number): { width: number; height: number } {
  const fov = responsiveFov(baseFov, aspect);
  const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  return { width: height * Math.max(0.2, aspect), height };
}

function ResponsiveFov({ refAspect = 1.6, maxFov = 100 }: { refAspect?: number; maxFov?: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  // El fov "de diseño" que puso la escena, guardado antes de tocarlo.
  const baseFov = useRef<number | null>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    if (baseFov.current === null) baseFov.current = cam.fov;
    const base = baseFov.current;
    const aspect = size.width / size.height;
    // Nunca reducimos por debajo del fov de diseño (en pantallas anchas no
    // queremos recortar el alto), solo ampliamos cuando hace falta.
    cam.fov = responsiveFov(base, aspect, refAspect, maxFov);
    cam.updateProjectionMatrix();
  }, [camera, size, refAspect, maxFov]);

  return null;
}

type Props = OrbitControlsProps & {
  /** Segundos a esperar antes de fijar la vista "de casa" (por el vuelo de entrada). */
  homeDelay?: number;
};

/** Se reenvía el ref porque algunas escenas desactivan los controles mientras
 *  dura su vuelo de entrada (ver IntroFly / CameraDirector). */
const Controls = forwardRef<OrbitControlsImpl, Props>(function Controls({ homeDelay = 3.2, ...props }, outerRef) {
  const ref = useRef<OrbitControlsImpl>(null);
  const resetNonce = useApp((s) => s.viewResetNonce);
  const touched = useRef(false);

  // Fija como vista "de casa" la que hay una vez terminado el vuelo de
  // entrada, salvo que el niño ya haya movido la cámara antes.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!touched.current) ref.current?.saveState();
    }, homeDelay * 1000);
    return () => window.clearTimeout(t);
  }, [homeDelay]);

  // El botón de recentrar del HUD incrementa el contador y aquí se obedece.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.reset();
  }, [resetNonce]);

  return (
    <>
      <ResponsiveFov />
      <OrbitControls
        ref={(inst) => {
          ref.current = inst;
          if (typeof outerRef === 'function') outerRef(inst);
          else if (outerRef) outerRef.current = inst;
        }}
        makeDefault
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.09}
        rotateSpeed={0.5}
        panSpeed={0.9}
        zoomSpeed={0.9}
        zoomToCursor={false}
        // Desplazar en el plano de la pantalla es lo que espera el dedo.
        screenSpacePanning
        onStart={() => {
          touched.current = true;
        }}
        {...props}
      />
    </>
  );
});

export default Controls;
