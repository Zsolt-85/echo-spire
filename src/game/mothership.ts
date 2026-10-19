export const HULL_R = 50;
export const BAND_W = 16;
export const HULL_OUTER = HULL_R + BAND_W / 2;   // 58
export const HULL_INNER = HULL_R - BAND_W / 2;   // 42
export const CORE_R = 17;
export const MEMBRANE_R = 44;
export const NOZZLE_OUT = 64;
export const RADIATOR_OUT = 72;
export const DOCK_R = 34;
export const DETAIL_MIN_R = 96;
export const MENU_MIN_R = 320;
export const MENU_RING_SPAN = 0.58;

export function menuRingRadius(vw: number, vh: number): number {
  return Math.max(MENU_MIN_R, Math.max(vw, vh) * MENU_RING_SPAN);
}

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
const DIAGONALS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

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

function spoke(ctx: CanvasRenderingContext2D, a: number, r0: number, r1: number): void {
  const c = Math.cos(a), s = Math.sin(a);
  ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * r1, s * r1); ctx.stroke();
}

export function drawMothership(ctx: CanvasRenderingContext2D, x: number, y: number, o: MothershipOpts): void {
  const hp = Math.max(0, Math.min(1, o.hpFrac));
  const detail = o.detail ?? detailFor(o.r);
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

  if (detail === 'full') {
    // radiators — translucent fins behind the hull at the cardinals
    ctx.save(); ctx.rotate(ringAngle);
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#4b7fb8';
    for (const a of CARDINALS) {
      ctx.save(); ctx.rotate(a);
      ctx.fillRect(HULL_OUTER, -5, RADIATOR_OUT - HULL_OUTER, 10);
      ctx.restore();
    }
    ctx.restore();

    // panel ticks — 12 radial dividers across the band
    ctx.save(); ctx.rotate(ringAngle);
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#5f89b8'; ctx.lineWidth = BAND_W - 2;
    ctx.beginPath(); ctx.arc(0, 0, HULL_R, 0, TAU);
    const tickPeriod = (TAU * HULL_R) / 12;
    ctx.setLineDash([0.025 * HULL_R, tickPeriod - 0.025 * HULL_R]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    // vents — dark slots along the outer band
    ctx.save(); ctx.rotate(ringAngle);
    ctx.globalAlpha = 0.85; ctx.strokeStyle = '#12233b'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, HULL_R + 3, 0, TAU);
    const ventPeriod = (TAU * (HULL_R + 3)) / 8;
    ctx.setLineDash([4, ventPeriod - 4]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    // hull bevels — outer highlight and inner shadow
    ctx.save(); ctx.rotate(ringAngle);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, HULL_OUTER - 1.5, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#0f1e34'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, HULL_INNER + 1.5, 0, TAU); ctx.stroke();
    ctx.restore();

    // truss spokes — hub to ring on the diagonals
    ctx.save();
    ctx.strokeStyle = '#3a638f'; ctx.lineWidth = 7;
    for (const a of DIAGONALS) spoke(ctx, a, CORE_R - 3, HULL_INNER);
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.8;
    for (const a of DIAGONALS) spoke(ctx, a, CORE_R - 3, HULL_INNER);
    ctx.restore();

    // docking collars — inner hardware on the diagonals
    ctx.save(); ctx.rotate(hubAngle);
    ctx.fillStyle = '#35598a'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 0.8;
    for (const a of DIAGONALS) {
      ctx.save(); ctx.rotate(a); ctx.translate(DOCK_R, 0); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6.5, -6.5, 13, 13);
      ctx.strokeRect(-6.5, -6.5, 13, 13);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

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
