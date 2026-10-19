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

export type RingMotion = 'counter' | 'co' | 'locked';
export interface MothershipOpts {
  r: number; hpFrac: number; t: number; motion: RingMotion;
  detail?: Detail; hitFlash?: number; hitAngle?: number;
}

const TAU = Math.PI * 2;
const CARDINALS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

export function defaultMotion(surface: 'menu' | 'run'): RingMotion {
  const mm = (globalThis as any).matchMedia;
  if (typeof mm === 'function') {
    try { if (mm('(prefers-reduced-motion: reduce)').matches) return 'locked'; } catch { /* fall through */ }
  }
  return surface === 'menu' ? 'counter' : 'co';
}

function band(ctx: CanvasRenderingContext2D, r: number, width: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, SEGMENT_START, SEGMENT_START + TAU);
  ctx.lineWidth = width;
  ctx.setLineDash(segmentDash(r));
  ctx.stroke();
  ctx.setLineDash([]);
}

function nozzle(ctx: CanvasRenderingContext2D, a: number): void {
  const c = Math.cos(a), s = Math.sin(a);
  const px = -s, py = c;              // perpendicular, for the flare width
  const w0 = 5, w1 = 7;
  ctx.beginPath();
  ctx.moveTo(c * HULL_OUTER + px * w0, s * HULL_OUTER + py * w0);
  ctx.lineTo(c * NOZZLE_OUT + px * w1, s * NOZZLE_OUT + py * w1);
  ctx.lineTo(c * NOZZLE_OUT - px * w1, s * NOZZLE_OUT - py * w1);
  ctx.lineTo(c * HULL_OUTER - px * w0, s * HULL_OUTER - py * w0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

export function drawMothership(ctx: CanvasRenderingContext2D, x: number, y: number, o: MothershipOpts): void {
  const hp = Math.max(0, Math.min(1, o.hpFrac));
  const flash = Math.max(0, Math.min(1, o.hitFlash ?? 0));
  const breath = 1 + Math.sin(o.t / 620) * 0.05;

  const ringAngle = o.motion === 'co' ? (o.t / 52000) * TAU
                  : o.motion === 'counter' ? (o.t / 44000) * TAU : 0;
  const hubAngle = o.motion === 'counter' ? -(o.t / 26000) * TAU : 0;

  ctx.save();
  ctx.setLineDash([]);
  ctx.translate(x, y);
  ctx.scale(o.r / HULL_OUTER, o.r / HULL_OUTER);

  // 1 — membrane
  const memAlpha = (0.18 + 0.22 * hp) * (1 + flash * 0.8);
  ctx.globalAlpha = memAlpha;
  ctx.fillStyle = '#5eead4';
  ctx.beginPath(); ctx.arc(0, 0, MEMBRANE_R, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;

  // 2 — hull band
  ctx.save(); ctx.rotate(ringAngle);
  ctx.strokeStyle = '#243b5c'; ctx.fillStyle = '#243b5c';
  band(ctx, HULL_R, BAND_W);
  ctx.strokeStyle = hp >= 0.5 ? '#5eead4' : hp > 0.25 ? '#fbbf24' : '#f43f5e';
  band(ctx, HULL_R, BAND_W - 9);
  ctx.restore();

  // 3 — lit window row (constant count of 44; dash length scales with radius)
  const winPeriod = (TAU * (HULL_R - 4)) / 44;
  ctx.save();
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, HULL_R - 4, 0, TAU);
  ctx.setLineDash([0.03 * HULL_R, winPeriod - 0.03 * HULL_R]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 4 — engine nozzles + glow
  ctx.save(); ctx.rotate(ringAngle);
  ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = '#38bdf8';
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.9;
  for (const a of CARDINALS) nozzle(ctx, a);
  ctx.fillStyle = '#7dd3fc'; ctx.globalAlpha = 0.85;
  for (const a of CARDINALS) {
    ctx.beginPath(); ctx.arc(Math.cos(a) * (NOZZLE_OUT - 6), Math.sin(a) * (NOZZLE_OUT - 6), 5.5, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // 5 — core hub
  ctx.save(); ctx.rotate(hubAngle);
  ctx.globalAlpha = 0.35 + 0.65 * hp;
  ctx.strokeStyle = '#5eead4'; ctx.fillStyle = '#1b2f4c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const px = Math.cos(a) * CORE_R, py = Math.sin(a) * CORE_R;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#5eead4';
  ctx.beginPath(); ctx.arc(0, 0, 4 * breath, 0, TAU); ctx.fill();
  ctx.restore();

  // 6 — impact flash
  if (flash > 0.01) {
    const a = o.hitAngle ?? 0;
    ctx.globalAlpha = flash * 0.7;
    ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, MEMBRANE_R, a - 0.5, a + 0.5); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
