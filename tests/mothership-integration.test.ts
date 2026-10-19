import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeCtx, installCanvasGlobals } from './helpers/canvas-stub.js';
import { freshState } from '../src/game/state.js';
import { MEMBRANE_R } from '../src/game/mothership.js';

// render.ts pulls in ships.ts, which runs `new Path2D()` at module scope.
// Install the stub first, then load render.ts dynamically so module evaluation
// happens after installCanvasGlobals() has run.
let drawSpace: typeof import('../src/game/render.js')['drawSpace'];
let impactFeedback: typeof import('../src/game/render.js')['impactFeedback'];
beforeAll(async () => {
  installCanvasGlobals();
  ({ drawSpace, impactFeedback } = await import('../src/game/render.js'));
});

describe('gameplay renders the echo ring', () => {
  it('draws without throwing for the real arena', () => {
    const { ctx } = makeCtx();
    expect(() => drawSpace(ctx, 560, 560, 1000, freshState(), 0.016)).not.toThrow();
  });

  it('draws the ring: the arena emits far more ops than a bare clear', () => {
    const { ctx, calls } = makeCtx();
    drawSpace(ctx, 560, 560, 1000, freshState(), 0.016);
    expect(calls.filter(c => c.op === 'arc').length).toBeGreaterThan(3);
    expect(calls.length).toBeGreaterThan(50);
  });

  it('no longer imports drawMothership from ships.js', () => {
    const src = readFileSync('src/game/render.ts', 'utf8');
    expect(src).not.toMatch(/drawMothership[^;\n]*ships\.js/);
    expect(src).toMatch(/from '\.\/mothership\.js'/);
  });

  it('ships.ts no longer exports the old saucer renderer', () => {
    const src = readFileSync('src/game/ships.ts', 'utf8');
    expect(src).not.toMatch(/export function drawMothership/);
  });

  it('derives impact flash and angle from the flash event', () => {
    expect(impactFeedback(undefined, 280, 280)).toEqual({ hitFlash: 0, hitAngle: 0 });
    const s = freshState();
    s.fx = [{ kind: 'flash', x: 380, y: 280, tx: 380, ty: 280, ttl: 0.075 }];
    expect(impactFeedback(s, 280, 280).hitFlash).toBeCloseTo(0.5, 9);
    expect(impactFeedback(s, 280, 280).hitAngle).toBeCloseTo(0, 9);
    s.fx = [{ kind: 'flash', x: 280, y: 380, tx: 280, ty: 380, ttl: 0.15 }];
    expect(impactFeedback(s, 280, 280).hitAngle).toBeCloseTo(Math.PI / 2, 9);
  });

  it('flares the ring at the impact angle during play', () => {
    const s = freshState();
    s.fx = [{ kind: 'flash', x: 380, y: 280, tx: 380, ty: 280, ttl: 0.15 }];
    const { ctx, calls } = makeCtx();
    drawSpace(ctx, 560, 560, 1000, s, 0.016);
    const flares = calls.filter(c =>
      c.op === 'arc' && c.args[2] === MEMBRANE_R &&
      Math.abs(((c.args[4] as number) - (c.args[3] as number)) - 1) < 1e-9
    );
    expect(flares.length).toBe(1);
    expect(((flares[0].args[3] as number) + (flares[0].args[4] as number)) / 2).toBeCloseTo(0, 9);
  });
});
