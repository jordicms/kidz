/// <reference lib="webworker" />
import { buildPiece, type Tier } from '../components/three/body/registry';
import '../components/three/body/pieces';

/** Worker: construye mallas SDF y las devuelve como arrays transferibles. */
self.onmessage = (e: MessageEvent<{ id: number; key: string; tier: Tier }>) => {
  const { id, key, tier } = e.data;
  try {
    const g = buildPiece(key, tier);
    const position = (g.attributes.position.array as Float32Array).slice();
    const normal = (g.attributes.normal.array as Float32Array).slice();
    const color = g.attributes.color ? (g.attributes.color.array as Float32Array).slice() : null;
    const index = (g.index!.array as Uint16Array | Uint32Array).slice();
    const transfer: Transferable[] = [position.buffer, normal.buffer, index.buffer];
    if (color) transfer.push(color.buffer);
    (self as unknown as Worker).postMessage({ id, position, normal, color, index }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
