import { afterEach, describe, expect, it } from 'vitest';
import { installCanvasGlobals, makeCtx } from './helpers/canvas-stub.js';

type Path2DConstructor = typeof Path2D;
const globals = globalThis as unknown as { Path2D?: Path2DConstructor };
const originalPath2D = globals.Path2D;

afterEach(() => {
  if (originalPath2D === undefined) {
    delete globals.Path2D;
  } else {
    globals.Path2D = originalPath2D;
  }
});

describe('canvas stub', () => {
  it('records draw calls in order', () => {
    const { ctx, calls } = makeCtx();

    ctx.save();
    ctx.translate(1, 2);
    ctx.fillStyle = 'red';
    ctx.arc(0, 0, 5, 0, 1);
    ctx.stroke();

    expect(calls).toEqual([
      { op: 'save', args: [] },
      { op: 'translate', args: [1, 2] },
      { op: 'arc', args: [0, 0, 5, 0, 1] },
      { op: 'stroke', args: [] },
    ]);
  });

  it('exposes the same calls array as ctx.calls', () => {
    const { ctx, calls } = makeCtx();

    ctx.fillRect(0, 0, 1, 1);

    expect(ctx.calls).toBe(calls);
    expect(ctx.calls).toHaveLength(1);
  });

  it('round-trips style property writes', () => {
    const { ctx } = makeCtx();

    ctx.fillStyle = '#abc';

    expect(ctx.fillStyle).toBe('#abc');
  });

  it('returns a numeric text measurement', () => {
    const { ctx } = makeCtx();

    const metrics = ctx.measureText('hello');

    expect(typeof metrics.width).toBe('number');
    expect(Number.isFinite(metrics.width)).toBe(true);
  });

  it('records line dashes and returns an array', () => {
    const { ctx, calls } = makeCtx();

    ctx.setLineDash([1, 2]);

    expect(calls).toContainEqual({ op: 'setLineDash', args: [[1, 2]] });
    expect(Array.isArray(ctx.getLineDash())).toBe(true);
  });
});

describe('installCanvasGlobals', () => {
  it('defines Path2D when it is absent', () => {
    delete globals.Path2D;

    installCanvasGlobals();

    expect(typeof globals.Path2D).toBe('function');
    const path = new globals.Path2D!('x');
    expect(typeof path.addPath).toBe('function');
    expect(() => path.addPath(new globals.Path2D!())).not.toThrow();
  });

  it('is idempotent', () => {
    delete globals.Path2D;

    installCanvasGlobals();
    const installed = globals.Path2D;

    expect(() => installCanvasGlobals()).not.toThrow();
    expect(globals.Path2D).toBe(installed);
  });

  it('leaves an existing Path2D alone', () => {
    class Sentinel {}
    globals.Path2D = Sentinel as unknown as Path2DConstructor;

    installCanvasGlobals();

    expect(globals.Path2D).toBe(Sentinel);
  });
});
