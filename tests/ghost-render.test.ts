import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { freshState } from '../src/game/state.js';
import { installCanvasGlobals, makeCtx } from './helpers/canvas-stub.js';

// render.ts pulls in ships.ts, which constructs Path2D at module scope. Install
// the stub before dynamically importing so module evaluation happens afterwards.
let drawGhost: typeof import('../src/game/render.js')['drawGhost'];
let drawSpace: typeof import('../src/game/render.js')['drawSpace'];
beforeAll(async () => {
  installCanvasGlobals();
  ({ drawGhost, drawSpace } = await import('../src/game/render.js'));
});

const trace = () => ({
  v: 1 as const, runId: 'g', seed: 1,
  samples: [[0, 3, 0.5, 20, 15]] as [number, number, number, number, number][],
  finalWave: 3, finalKills: 15, durationMs: 0,
});

describe('ghost rendering', () => {
  it('draws a static translucent ring without screen shake', () => {
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), beginPath: vi.fn(),
      arc: vi.fn(), stroke: vi.fn(), globalAlpha: 1, strokeStyle: '', lineWidth: 1 } as any;
    drawGhost(ctx, 490, 470, { hullFrac: 0.5, dmg: 20 }, 1000);
    expect(ctx.translate).toHaveBeenCalledWith(490, 470);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.globalAlpha).toBe(1); // restored; no shake transform
  });

  it('uses a 0.35-alpha violet 28px arc swept to the hull fraction', () => {
    const { ctx, calls } = makeCtx();
    drawGhost(ctx, 490, 470, { hullFrac: 0.5, dmg: 20 }, 1000);
    expect(calls.map(c => c.op)).toEqual(['save', 'translate', 'beginPath', 'arc', 'stroke', 'restore']);
    expect(calls[1].args).toEqual([490, 470]);
    expect(calls[3].args).toEqual([0, 0, 28, 0, Math.PI]);
    expect(ctx.strokeStyle).toBe('#a78bfa');
    expect(ctx.lineWidth).toBe(2);
  });

  it('draws the active ghost in the free corner, outside the shake transform', () => {
    const s = freshState();
    s.ghostTrace = trace();
    s.ghostT = 0;
    const { ctx, calls } = makeCtx();
    drawSpace(ctx, 560, 560, 1000, s, 0.016);
    expect(calls.some(c => c.op === 'translate' && c.args[0] === 490 && c.args[1] === 470)).toBe(true);
    expect(calls.some(c => c.op === 'arc' && c.args[2] === 28 &&
      Math.abs((c.args[4] as number) - Math.PI) < 1e-9)).toBe(true);
  });

  it('skips the ring when there is no trace or no sample at ghostT', () => {
    const bare = freshState();
    const noTrace = makeCtx();
    drawSpace(noTrace.ctx, 560, 560, 1000, bare, 0.016);
    expect(noTrace.calls.some(c => c.op === 'translate' && c.args[0] === 490 && c.args[1] === 470)).toBe(false);

    const s = freshState();
    s.ghostTrace = trace();
    s.ghostT = 9999; // past the trace: ghostAt returns null
    const outOfRange = makeCtx();
    drawSpace(outOfRange.ctx, 560, 560, 1000, s, 0.016);
    expect(outOfRange.calls.some(c => c.op === 'translate' && c.args[0] === 490 && c.args[1] === 470)).toBe(false);
  });

  it('keeps the ghost static (no shake) under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      const s = freshState();
      s.ghostTrace = trace();
      s.ghostT = 0;
      s.fx = [{ kind: 'flash', x: 300, y: 300, tx: 300, ty: 300, ttl: 0.15 }];
      const { ctx, calls } = makeCtx();
      drawSpace(ctx, 560, 560, 1000, s, 0.016);
      expect(calls.some(c => c.op === 'arc' && c.args[2] === 28 &&
        Math.abs((c.args[4] as number) - Math.PI) < 1e-9)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('writes the comparison pill from the active ghost, or -', async () => {
    const nodes = new Map<string, any>();
    const mk = () => ({
      textContent: '', className: '', hidden: false, disabled: false, style: {}, dataset: {},
      childElementCount: 0,
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      appendChild() {}, replaceChildren() {}, addEventListener() {}, setAttribute() {},
    });
    (globalThis as any).document = {
      getElementById: (id: string) => { if (!nodes.has(id)) nodes.set(id, mk()); return nodes.get(id); },
      createElement: () => mk(), querySelectorAll: () => [], addEventListener() {},
    };
    try {
      const { renderHud } = await import('../src/ui/hud.js');
      const s = freshState();
      renderHud(s);
      expect(nodes.get('hud-ghost')?.textContent).toBe('-');
      s.ghostTrace = trace();
      s.ghostT = 0;
      renderHud(s);
      expect(nodes.get('hud-ghost')?.textContent).toBe('Wave 3 · 15 kills');
    } finally {
      delete (globalThis as any).document;
    }
  });

  it('generator output carries the echo pill, share button, and their styles', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('src/style.css', 'utf8');
    expect(html).toContain('<span class="pill">Echo <b id="hud-ghost">-</b></span>');
    expect(html).toContain('id="btn-share"');
    expect(css).toContain('#hud-ghost');
    expect(css).toContain('#btn-share');
  });
});
