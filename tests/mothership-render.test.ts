import { describe, it, expect } from 'vitest';
import { makeCtx } from './helpers/canvas-stub.js';
import { drawMothership, defaultMotion, HULL_OUTER, HULL_R, segmentDash, type RingMotion } from '../src/game/mothership.js';

const MOTIONS: RingMotion[] = ['counter', 'co', 'locked'];

describe('drawMothership — lite tier', () => {
  it('never throws across the full hull range, every motion, and both detail tiers', () => {
    for (const hpFrac of [0, 0.25, 0.5, 0.75, 1]) {
      for (const motion of MOTIONS) {
        for (const detail of ['lite', 'full'] as const) {
          const { ctx } = makeCtx();
          expect(() => drawMothership(ctx, 100, 100, { r: 54, hpFrac, t: 0, motion, detail })).not.toThrow();
        }
      }
    }
    const { ctx } = makeCtx();
    expect(() => drawMothership(ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', hitFlash: 1, hitAngle: 0.5 })).not.toThrow();
  });

  it('emits draw operations', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked' });
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.some(c => c.op === 'arc')).toBe(true);
    expect(calls.some(c => c.op === 'fill')).toBe(true);
    expect(calls.some(c => c.op === 'stroke')).toBe(true);
  });

  it('scales with radius: doubling r doubles the recorded scale, and op count is radius-independent', () => {
    const a = makeCtx();
    const b = makeCtx();
    drawMothership(a.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    drawMothership(b.ctx, 100, 100, { r: 108, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    const scaleArg = (calls: { op: string; args: unknown[] }[]) =>
      calls.find(c => c.op === 'scale')!.args[0] as number;
    const s1 = scaleArg(a.calls);
    const s2 = scaleArg(b.calls);
    expect(s1).toBeCloseTo(54 / HULL_OUTER, 9);
    expect(s2 / s1).toBeCloseTo(2, 9);
    expect(a.calls.length).toBeGreaterThan(10);
    expect(a.calls.length).toBe(b.calls.length);
  });

  it('applies the exact-tiling segment dash to the hull band', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    const dashCalls = calls.filter(c => c.op === 'setLineDash');
    const dashArgs = dashCalls.map(c => c.args[0] as number[]);
    expect(dashArgs).toContainEqual(segmentDash(HULL_R));
    expect(dashArgs).toContainEqual([]);
  });

  it('balances save and restore', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 54, hpFrac: 0.4, t: 1234, motion: 'counter' });
    const saves = calls.filter(c => c.op === 'save').length;
    const restores = calls.filter(c => c.op === 'restore').length;
    expect(saves).toBeGreaterThan(0);
    expect(saves).toBe(restores);
  });

  it('defaults motion per surface and honours reduced-motion', () => {
    const g = globalThis as any;
    const real = g.matchMedia;
    try {
      g.matchMedia = (q: string) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} });
      expect(defaultMotion('menu')).toBe('locked');
      expect(defaultMotion('run')).toBe('locked');
      g.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {} });
      expect(defaultMotion('menu')).toBe('counter');
      expect(defaultMotion('run')).toBe('co');
      g.matchMedia = undefined;
      expect(defaultMotion('menu')).toBe('counter');
    } finally {
      if (real === undefined) delete g.matchMedia; else g.matchMedia = real;
    }
  });
});

describe('drawMothership — full detail', () => {
  it('draws strictly more than the lite tier at the same radius', () => {
    const lite = makeCtx(); const full = makeCtx();
    drawMothership(lite.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    drawMothership(full.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'full' });
    expect(full.calls.length - lite.calls.length).toBeGreaterThan(10);
  });

  it('adds panel ticks, spokes, radiators and docking collars', () => {
    const lite = makeCtx();
    const full = makeCtx();
    drawMothership(lite.ctx, 100, 100, { r: 200, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    drawMothership(full.ctx, 100, 100, { r: 200, hpFrac: 1, t: 0, motion: 'locked', detail: 'full' });
    const count = (calls: { op: string }[], op: string) => calls.filter(c => c.op === op).length;
    expect(count(full.calls, 'setLineDash') - count(lite.calls, 'setLineDash')).toBeGreaterThanOrEqual(4);
    expect(count(full.calls, 'fillRect') - count(lite.calls, 'fillRect')).toBeGreaterThanOrEqual(4);
    expect(count(full.calls, 'lineTo') - count(lite.calls, 'lineTo')).toBeGreaterThanOrEqual(8);
  });

  it('is identical in call count across every hull value (detail is hull-independent)', () => {
    const counts = [0, 0.5, 1].map(hp => {
      const { ctx, calls } = makeCtx();
      drawMothership(ctx, 100, 100, { r: 200, hpFrac: hp, t: 0, motion: 'locked', detail: 'full' });
      return calls.length;
    });
    expect(new Set(counts).size).toBe(1);
  });
});
