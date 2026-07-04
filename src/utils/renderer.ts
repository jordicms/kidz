/**
 * WebGPU experimental (opt-in): renderizado casi nativo donde el dispositivo
 * lo soporta (iOS/Android modernos). Se activa con `?gpu=1` en la URL y, de
 * momento, solo en la escena del Océano (usa materiales estándar, que three
 * convierte automáticamente; nuestros shaders GLSL y el postprocesado siguen
 * en WebGL hasta migrarlos a TSL).
 */

/** true si el usuario pidió WebGPU (?gpu=1) y el navegador lo soporta. */
export function wantsWebGPU(): boolean {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    return new URLSearchParams(window.location.search).get('gpu') === '1';
  } catch {
    return false;
  }
}

/**
 * Fábrica de renderer para el prop `gl` de <Canvas>: intenta WebGPU y, si
 * falla la inicialización, sigue funcionando con WebGL.
 */
export async function webGPURenderer(props: unknown) {
  const THREE = await import('three/webgpu');
  try {
    const renderer = new THREE.WebGPURenderer({ ...(props as object), antialias: true });
    await renderer.init();
    console.info('[kidz] WebGPU activo 🚀');
    return renderer;
  } catch (e) {
    console.warn('[kidz] WebGPU no disponible, usando WebGL', e);
    const { WebGLRenderer } = await import('three');
    return new WebGLRenderer({ ...(props as object), antialias: true });
  }
}
