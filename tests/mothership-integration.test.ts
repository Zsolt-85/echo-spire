import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeCtx, installCanvasGlobals } from './helpers/canvas-stub.js';
import { freshState } from '../src/game/state.js';

// render.ts pulls in ships.ts, which runs `new Path2D()` at module scope.
// Install the stub first, then load render.ts dynamically so module evaluation
// happens after installCanvasGlobals() has run.
let drawSpace: typeof import('../src/game/render.js')['drawSpace'];
beforeAll(async () => {
  installCanvasGlobals();
  ({ drawSpace } = await import('../src/game/render.js'));
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
});
