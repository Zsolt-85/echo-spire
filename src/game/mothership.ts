export const HULL_R = 50;
export const BAND_W = 16;
export const HULL_OUTER = HULL_R + BAND_W / 2;   // 58
export const HULL_INNER = HULL_R - BAND_W / 2;   // 42
export const CORE_R = 17;
export const MEMBRANE_R = 44;
export const NOZZLE_OUT = 64;
export const RADIATOR_OUT = 72;
export const DOCK_R = 34;
export const DETAIL_MIN_R = 40;

const N_SEGMENTS = 4;
const GAP_ARC = 0.48;  // angular gap per segment, radians (arc length per unit radius)

export const SEGMENT_START = Math.PI / 4 - GAP_ARC / 2;

export function segmentDash(r: number): number[] {
  const gap = GAP_ARC * r;
  const dash = (2 * Math.PI * r - N_SEGMENTS * gap) / N_SEGMENTS;
  const out: number[] = [];
  for (let i = 0; i < N_SEGMENTS; i++) { out.push(gap, dash); }
  return out;
}

export type Detail = 'full' | 'lite';
export function detailFor(r: number): Detail {
  return r >= DETAIL_MIN_R ? 'full' : 'lite';
}
