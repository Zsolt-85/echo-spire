import { describe, it, expect } from 'vitest';
import { makeCtx } from './helpers/canvas-stub.js';
import { drawMothership, defaultMotion, HULL_OUTER, type RingMotion } from '../src/game/mothership.js';

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
    drawMothership(a.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked' });
    drawMothership(b.ctx, 100, 100, { r: 108, hpFrac: 1, t: 0, motion: 'locked' });
    const scaleArg = (calls: { op: string; args: unknown[] }[]) =>
      calls.find(c => c.op === 'scale')!.args[0] as number;
    const s1 = scaleArg(a.calls);
    const s2 = scaleArg(b.calls);
    expect(s1).toBeCloseTo(54 / HULL_OUTER, 9);
    expect(s2 / s1).toBeCloseTo(2, 9);
    expect(a.calls.length).toBe(b.calls.length);
  });

  it('applies the exact-tiling segment dash to the hull band', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    const dashCalls = calls.filter(c => c.op === 'setLineDash');
    expect(dashCalls.length).toBeGreaterThan(0);
  });

  it('balances save and restore', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 54, hpFrac: 0.4, t: 1234, motion: 'counter' });
    const saves = calls.filter(c => c.op === 'save').length;
    const restores = calls.filter(c => c.op === 'restore').length;
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
