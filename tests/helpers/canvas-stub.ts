export type Call = { op: string; args: unknown[] };

const PROP_NAMES = [
  'fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'shadowBlur', 'shadowColor',
  'font', 'textAlign', 'textBaseline', 'lineCap', 'lineJoin', 'miterLimit',
  'globalCompositeOperation', 'filter', 'imageSmoothingEnabled',
];

export function makeCtx() {
  const calls: Call[] = [];
  const rec = (op: string, ...args: unknown[]) => { calls.push({ op, args }); };
  const ctx: any = {
    calls,
    canvas: { width: 0, height: 0 },
    save: () => rec('save'),
    restore: () => rec('restore'),
    translate: (...a: number[]) => rec('translate', ...a),
    scale: (...a: number[]) => rec('scale', ...a),
    rotate: (a: number) => rec('rotate', a),
    setTransform: (...a: number[]) => rec('setTransform', ...a),
    beginPath: () => rec('beginPath'),
    closePath: () => rec('closePath'),
    moveTo: (...a: number[]) => rec('moveTo', ...a),
    lineTo: (...a: number[]) => rec('lineTo', ...a),
    arc: (...a: number[]) => rec('arc', ...a),
    arcTo: (...a: number[]) => rec('arcTo', ...a),
    ellipse: (...a: number[]) => rec('ellipse', ...a),
    rect: (...a: number[]) => rec('rect', ...a),
    quadraticCurveTo: (...a: number[]) => rec('quadraticCurveTo', ...a),
    bezierCurveTo: (...a: number[]) => rec('bezierCurveTo', ...a),
    fill: () => rec('fill'),
    stroke: () => rec('stroke'),
    clip: () => rec('clip'),
    fillRect: (...a: number[]) => rec('fillRect', ...a),
    strokeRect: (...a: number[]) => rec('strokeRect', ...a),
    clearRect: (...a: number[]) => rec('clearRect', ...a),
    fillText: (...a: unknown[]) => rec('fillText', ...a),
    strokeText: (...a: unknown[]) => rec('strokeText', ...a),
    measureText: () => ({ width: 0 } as TextMetrics),
    setLineDash: (a: number[]) => rec('setLineDash', a),
    getLineDash: () => [] as number[],
    drawImage: () => rec('drawImage'),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
  };
  for (const p of PROP_NAMES) {
    let v: unknown = '';
    Object.defineProperty(ctx, p, { get: () => v, set: (nv: unknown) => { v = nv; }, configurable: true });
  }
  return { ctx: ctx as CanvasRenderingContext2D & { calls: Call[] }, calls };
}

/**
 * `src/game/ships.ts` builds `SHIP_PATHS` with `new Path2D(...)` at module scope.
 * Node has no Path2D, so any test importing `render.ts` throws on import without this.
 * Call it from `beforeAll`, then load `render.ts` with a dynamic `import()`.
 */
export function installCanvasGlobals(): void {
  const g = globalThis as any;
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class {
      constructor(_d?: string) { /* shape is irrelevant; ships are never drawn in these tests */ }
      addPath(): void { /* no-op */ }
    };
  }
}
