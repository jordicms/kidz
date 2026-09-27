import { registerBuilder } from './registry';
import { ORGAN_BUILDERS } from './organs';
import { skeletonGeometry } from './skeleton';

/** Registra órganos y esqueleto en el registro de piezas SDF (hilo principal y worker). */
for (const [key, fn] of Object.entries(ORGAN_BUILDERS)) registerBuilder(key, fn);
registerBuilder('skeleton', skeletonGeometry);
