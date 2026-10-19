# Echo Ring Mothership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the saucer mothership with a procedurally-drawn segmented ring station and make it the visual centerpiece of both the main menu and the gameplay arena.

**Architecture:** A new `src/game/mothership.ts` owns all ring drawing, authored in a normalized 200×200 space and scaled by radius so one code path draws both the 54px in-run ship and the full-bleed menu hero. A second canvas `#menu-ship` is added behind the menu overlay. Detail tiering drops micro-detail below a radius threshold so the ship stays legible at gameplay scale.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas 2D, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-16-echo-ring-mothership-design.md`

## Global Constraints

- Colour palette is fixed: hull `#243b5c`/`#1b2f4c`, teal rim `#5eead4`, engine cyan `#38bdf8`, lit windows `#fef3c7`. Do not introduce green or gold — the shipped cyan→violet identity overrides `design-system/echo-spire/MASTER.md`.
- `index.html` is **generated**. Never hand-edit it; edit `scripts/gen_index.py` and re-run the generator.
- `npm test` runs `tsc --noEmit` first. A clean `vite build` is **not** sufficient evidence — a lost import previously shipped through a green build.
- The renderer must never touch the DOM and must not throw for any input in `hpFrac ∈ [0,1]`.
- Respect `prefers-reduced-motion: reduce`; segments stop rotating but membrane and core keep breathing.
- No new runtime dependencies.
- Commit after every task.

---

### Task 1: Ring geometry and constants

Pure, DOM-free maths. Everything else builds on this.

**Files:**
- Create: `src/game/mothership.ts`
- Test: `tests/mothership-geometry.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `HULL_R = 50`, `BAND_W = 16`, `HULL_OUTER = 58`, `HULL_INNER = 42`
  - `CORE_R = 17`, `MEMBRANE_R = 44`, `NOZZLE_OUT = 64`, `RADIATOR_OUT = 72`, `DOCK_R = 34`
  - `DETAIL_MIN_R = 96` (full detail only above this radius; the in-run ring is r=54, so it
    takes the lite path — see the Detail tiering note in the spec)
  - `SEGMENT_START = Math.PI / 4 - GAP_ARC / 2` (≈ 0.5454 rad — half a gap before the diagonal,
    so gap **centres** land on 45/135/225/315 and dash centres land on the cardinals)
  - `segmentDash(r: number): number[]` — 8-entry dash pattern that tiles **exactly once** around the circumference, gaps landing on the diagonals
  - `detailFor(r: number): 'full' | 'lite'`

**Critical correctness note:** the pattern must start at a **gap centre**, not at angle 0. Starting mid-dash means the period does not divide the circumference and the arcs never close. Because the pattern is gap-first, the arc start must sit **half a gap before** the target diagonal: `SEGMENT_START = Math.PI/4 - GAP_ARC/2`. That centres the gaps on 45/135/225/315, which in turn puts the dash centres on the cardinals — where Task 2 places the engine nozzles and radiator fins, while the Task 2 spokes on the diagonals correctly bridge the gaps.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mothership-geometry.test.ts
import { describe, it, expect } from 'vitest';
import { segmentDash, SEGMENT_START, detailFor, DETAIL_MIN_R, HULL_R, HULL_INNER, HULL_OUTER } from '../src/game/mothership.js';

describe('ring geometry', () => {
  it('dash pattern tiles exactly once around the circumference', () => {
    for (const r of [20, 54, 320, 1000]) {
      const total = segmentDash(r).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(2 * Math.PI * r, 6);
    }
  });

  it('produces four equal gaps at the even indices', () => {
    const d = segmentDash(50);
    expect(d).toHaveLength(8);
    const gaps = d.filter((_, i) => i % 2 === 0);
    expect(gaps).toHaveLength(4);
    for (const g of gaps) expect(g).toBeCloseTo(24, 6);
  });

  it('leaves four equal dashes at the odd indices', () => {
    const d = segmentDash(50);
    const dashes = d.filter((_, i) => i % 2 === 1);
    expect(dashes).toHaveLength(4);
    expect(dashes).toEqual([54.5398, 54.5398, 54.5398, 54.5398].map(v => expect.closeTo(v, 3)));
  });

  it('starts half a gap before the diagonal so gap centres land on 45/135/225/315', () => {
    // GAP_ARC is 0.48 rad, so half of it is 0.24. Starting at PI/4 would put a gap's
    // LEADING EDGE on the diagonal and centre it 13.75 degrees past - spokes would then
    // clip into the solid band instead of bridging a gap.
    expect(SEGMENT_START).toBeCloseTo(Math.PI / 4 - 0.24, 9);
  });

  it('drops to lite detail below the radius threshold', () => {
    expect(detailFor(DETAIL_MIN_R)).toBe('full');
    expect(detailFor(DETAIL_MIN_R - 1)).toBe('lite');
    expect(detailFor(54)).toBe('lite');
  });

  it('derives inner and outer hull radii from the band width', () => {
    expect(HULL_OUTER - HULL_R).toBe(8);
    expect(HULL_R - HULL_INNER).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mothership-geometry.test.ts`
Expected: FAIL — `Failed to resolve import "../src/game/mothership.js"`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/mothership.ts
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
const N_SEGMENTS = 4;
const GAP_ARC = 0.48;  // angular gap per segment, radians (arc length per unit radius)
export const SEGMENT_START = Math.PI / 4 - GAP_ARC / 2;  // gap CENTRES on the diagonals

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mothership-geometry.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/mothership.ts tests/mothership-geometry.test.ts
git commit -m "feat(mothership): ring geometry constants and segment dash math"
```

---

### Task 2: Canvas test stub

Every later task needs to draw into something without a real canvas.

**Files:**
- Create: `tests/helpers/canvas-stub.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `makeCtx(): { ctx: CanvasRenderingContext2D & { calls: Call[] }; calls: Call[] }`, `installCanvasGlobals(): void`

This file is **not** a test file (no `.test.ts` suffix), so Vitest will not collect it.

`installCanvasGlobals()` exists because `src/game/ships.ts` runs `new Path2D(...)` at **module
scope**, and `Path2D` is `undefined` in Node. Any test importing `render.ts` throws at import time
unless it is stubbed.

- [ ] **Step 1: Create the stub**

```ts
// tests/helpers/canvas-stub.ts
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
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `npx tsc --noEmit`
Expected: no output (clean). Add a test asserting `installCanvasGlobals()` defines `Path2D` and leaves an existing one alone.

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/canvas-stub.ts
git commit -m "test(mothership): recording canvas 2d stub"
```

---

### Task 3: Lite-detail renderer

The tier that must stay legible at 108px: membrane, hull band, lit windows, engine nozzles, core hub.

**Files:**
- Modify: `src/game/mothership.ts`
- Test: `tests/mothership-render.test.ts`

**Interfaces:**
- Consumes: Task 1 (`segmentDash`, `SEGMENT_START`, `HULL_R`, `BAND_W`, `HULL_OUTER`, `HULL_INNER`, `CORE_R`, `MEMBRANE_R`, `NOZZLE_OUT`), Task 2 (`makeCtx`)
- Produces:
  - `type RingMotion = 'counter' | 'co' | 'locked'`
  - `interface MothershipOpts { r: number; hpFrac: number; t: number; motion: RingMotion; detail?: Detail; hitFlash?: number; hitAngle?: number }`
  - `drawMothership(ctx: CanvasRenderingContext2D, x: number, y: number, o: MothershipOpts): void`
  - `defaultMotion(surface: 'menu' | 'run'): RingMotion`

- [ ] **Step 1: Write the failing test**

```ts
// tests/mothership-render.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mothership-render.test.ts`
Expected: FAIL — `drawMothership` / `defaultMotion` not exported

- [ ] **Step 3: Write minimal implementation**

Append to `src/game/mothership.ts`:

```ts
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
  ctx.strokeStyle = hp > 0.5 ? '#5eead4' : hp > 0.25 ? '#fbbf24' : '#f43f5e';
  band(ctx, HULL_R, BAND_W - 9);
  ctx.restore();

  // 3 — lit window row (constant count of 44; dash length scales with radius)
  const winPeriod = (TAU * HULL_R) / 44;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mothership-render.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/mothership.ts tests/mothership-render.test.ts
git commit -m "feat(mothership): lite-detail ring renderer with membrane, windows, nozzles, core"
```

---

### Task 4: Full-detail renderer

The plating hardware. Skipped entirely when `detail === 'lite'`.

**Files:**
- Modify: `src/game/mothership.ts`
- Test: `tests/mothership-render.test.ts`

**Interfaces:**
- Consumes: Task 1 (`detailFor`, `BAND_W`, `HULL_R`, `HULL_OUTER`, `HULL_INNER`, `CORE_R`, `RADIATOR_OUT`, `DOCK_R`), Task 3 (`drawMothership` and its module-local `CARDINALS` constant, `ringAngle` / `hubAngle` locals)
- Produces: no new exports — adds the module-local `DIAGONALS` constant and `spoke()` helper, the `detail` tier resolution local, and the `detail === 'full'` branch inside `drawMothership`

Note: Task 3 deliberately does NOT declare `DIAGONALS`, `spoke()`, or the `detail` local, because nothing in Task 3 consumes them — adding them there would be dead code that a task-scoped review correctly flags. They are introduced here, where they are first used.

- [ ] **Step 1: Add failing tests**

Append to `tests/mothership-render.test.ts`:

```ts
describe('drawMothership — full detail', () => {
  it('draws strictly more than the lite tier at the same radius', () => {
    const lite = makeCtx(); const full = makeCtx();
    drawMothership(lite.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'lite' });
    drawMothership(full.ctx, 100, 100, { r: 54, hpFrac: 1, t: 0, motion: 'locked', detail: 'full' });
    expect(full.calls.length - lite.calls.length).toBeGreaterThan(10);
  });

  it('adds panel ticks, spokes, radiators and docking collars', () => {
    const { ctx, calls } = makeCtx();
    drawMothership(ctx, 100, 100, { r: 200, hpFrac: 1, t: 0, motion: 'locked', detail: 'full' });
    const ops = calls.map(c => c.op);
    expect(ops.filter(o => o === 'setLineDash').length).toBeGreaterThanOrEqual(4);
    expect(ops.filter(o => o === 'fillRect').length).toBeGreaterThanOrEqual(4);
    expect(ops.filter(o => o === 'lineTo').length).toBeGreaterThanOrEqual(8);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mothership-render.test.ts`
Expected: FAIL — full tier currently draws the same as lite

- [ ] **Step 3: Write minimal implementation**

In `src/game/mothership.ts`, make three additions.

**First**, next to the existing `const CARDINALS = ...` line, add the diagonal constant:

```ts
const DIAGONALS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
```

**Second**, add the `spoke()` helper above `drawMothership`:

```ts
function spoke(ctx: CanvasRenderingContext2D, a: number, r0: number, r1: number): void {
  const c = Math.cos(a), s = Math.sin(a);
  ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * r1, s * r1); ctx.stroke();
}
```

**Third**, inside `drawMothership`, add the tier resolution next to `const hp = ...`:

```ts
  const detail = o.detail ?? detailFor(o.r);
```

Then insert this block **after** the hull band and **before** the window row:

```ts
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
    const ventPeriod = (TAU * HULL_R) / 8;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mothership-render.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/mothership.ts tests/mothership-render.test.ts
git commit -m "feat(mothership): full plating detail — radiators, panel ticks, vents, bevels, trusses, docking collars"
```

---

### Task 5: Wire into gameplay, remove the saucer

**Files:**
- Modify: `src/game/render.ts:1` (import) and `:32` (call site)
- Modify: `src/game/ships.ts:9` (delete old `drawMothership`)
- Test: `tests/mothership-integration.test.ts`

**Interfaces:**
- Consumes: Task 3 (`drawMothership`, `defaultMotion`), Task 1 (`HULL_OUTER`)
- Produces: gameplay renders the ring at `r = 54`, motion `'co'` (or `'locked'` under reduced motion)

`ships.ts` keeps `SHIP_PATHS` and all enemy rendering. Only `drawMothership` is removed.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mothership-integration.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mothership-integration.test.ts`
Expected: FAIL — `render.ts` still imports from `ships.js`

- [ ] **Step 3: Update the import and call site**

In `src/game/render.ts`, change line 1 from:

```ts
import {drawMothership,SHIP_PATHS} from './ships.js';
```

to:

```ts
import {SHIP_PATHS} from './ships.js';
import {drawMothership, defaultMotion} from './mothership.js';
```

Change line 32 from:

```ts
drawMothership(ctx,w/2,h/2,hpFrac,t);
```

to:

```ts
drawMothership(ctx,w/2,h/2,{r:54,hpFrac,t,motion:defaultMotion('run')});
```

- [ ] **Step 4: Delete the old renderer**

Remove the entire `export function drawMothership(...) { ... }` block from `src/game/ships.ts` (starts at line 9 and runs to the end of that function). Leave `SHIP_PATHS` untouched.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/mothership-integration.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 6: Run the full gate**

Run: `npm test`
Expected: all suites pass, no `error TS`

Run: `npm run build`
Expected: clean build

- [ ] **Step 7: Commit**

```bash
git add src/game/render.ts src/game/ships.ts tests/mothership-integration.test.ts
git commit -m "feat(mothership): render the echo ring in-game, drop the saucer renderer"
```

---

### Task 6: Menu hero canvas

**Files:**
- Modify: `scripts/gen_index.py` (insert canvas at line 64, before `<div class="menu-sheet">`)
- Modify: `index.html` (regenerated)
- Modify: `src/main.ts` (lines 8–9 for the canvas handles; line 63 for the draw call)
- Modify: `src/style.css` (line 20 `#menu-overlay` rule; new `#menu-ship` rule)
- Test: `tests/menu-ship.test.ts`

**Interfaces:**
- Consumes: Task 3 (`drawMothership`, `defaultMotion`)
- Produces:
  - `menuRingRadius(vw: number, vh: number): number` exported from `src/game/mothership.ts`
  - `#menu-ship` canvas present in the generated `index.html`

- [ ] **Step 1: Write the failing test**

```ts
// tests/menu-ship.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { menuRingRadius } from '../src/game/mothership.js';

describe('menu hero canvas', () => {
  it('is emitted by the generator into index.html', () => {
    const gen = readFileSync('scripts/gen_index.py', 'utf8');
    expect(gen).toContain('id="menu-ship"');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('id="menu-ship"');
  });

  it('sits inside the menu overlay, before the sheet, so the sheet paints over it', () => {
    const html = readFileSync('index.html', 'utf8');
    const overlay = html.indexOf('id="menu-overlay"');
    const canvas = html.indexOf('id="menu-ship"');
    const sheet = html.indexOf('class="menu-sheet"');
    expect(overlay).toBeGreaterThan(-1);
    expect(canvas).toBeGreaterThan(overlay);
    expect(sheet).toBeGreaterThan(canvas);
  });

  it('main.ts draws the menu ring', () => {
    const src = readFileSync('src/main.ts', 'utf8');
    expect(src).toContain("getElementById('menu-ship')");
    expect(src).toContain('menuRingRadius');
  });

  it('the overlay is no longer near-opaque', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('#menu-overlay{');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).not.toMatch(/rgba\(2,4,8,\.92\)/);
    expect(rule).toMatch(/radial-gradient/);
    expect(css).toMatch(/#menu-ship\{[^}]*position:absolute/);
    expect(css).toMatch(/#menu-ship\{[^}]*pointer-events:none/);
  });

  it('keeps the sheet above the hero canvas', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('.menu-sheet{');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).toMatch(/position:relative/);
    expect(rule).toMatch(/z-index:1/);
  });

  it('ring radius always exceeds half the largest viewport dimension', () => {
    for (const [vw, vh] of [[1920, 1080], [1280, 800], [390, 844], [360, 640]] as const) {
      const r = menuRingRadius(vw, vh);
      expect(r * 2).toBeGreaterThan(Math.max(vw, vh));
    }
  });

  it('clamps to a sensible minimum on tiny viewports', () => {
    expect(menuRingRadius(200, 150)).toBe(320);
  });

  it('spans 58% of the larger viewport dimension', () => {
    expect(menuRingRadius(2000, 1000)).toBeCloseTo(1160, 6);
    expect(menuRingRadius(1000, 2000)).toBeCloseTo(1160, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menu-ship.test.ts`
Expected: FAIL — no `menuRingRadius` export, no `menu-ship`

- [ ] **Step 3: Add `menuRingRadius`**

Append to `src/game/mothership.ts`:

```ts
export const MENU_MIN_R = 320;
export const MENU_RING_SPAN = 0.58;
export function menuRingRadius(vw: number, vh: number): number {
  return Math.max(MENU_MIN_R, Math.max(vw, vh) * MENU_RING_SPAN);
}
```

The span is a fraction of the viewport's **larger** dimension, so `2r > max(vw,vh)` holds on every
aspect ratio and the ring is cropped by the edges. Do NOT divide by `HULL_OUTER` here: `r` is
already the hull-outer pixel radius that `drawMothership` scales by, so dividing yields ~16px at
1920 wide and the minimum clamp would always win.

- [ ] **Step 4: Emit the canvas from the generator**

In `scripts/gen_index.py`, change:

```
<div id="menu-overlay">
<div class="menu-sheet">
```

to:

```
<div id="menu-overlay">
<canvas id="menu-ship" aria-hidden="true"></canvas>
<div class="menu-sheet">
```

- [ ] **Step 5: Regenerate the shell**

Run: `python scripts/gen_index.py`
Expected: regenerates `index.html` and reports 12 workshop / 8 forge / 3 ultimates

- [ ] **Step 6: Draw it from the main loop**

In `src/main.ts`, after line 9 (`const ctx=cv.getContext('2d')!;`) add:

```ts
const mcv=document.getElementById('menu-ship') as HTMLCanvasElement|null;
const mctx=mcv?mcv.getContext('2d')!:null;
function fitMenu(){if(!mcv)return;mcv.width=Math.ceil(innerWidth*devicePixelRatio);mcv.height=Math.ceil(innerHeight*devicePixelRatio);}
fitMenu();addEventListener('resize',fitMenu);
```

Then, inside the draw callback on line 63, after `ctx.restore();` and **before** `renderHud(s);`, insert:

```ts
if(mctx&&getPhase()==='menu'){mctx.save();mctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);mctx.clearRect(0,0,innerWidth,innerHeight);drawMothership(mctx,innerWidth/2,innerHeight/2,{r:menuRingRadius(innerWidth,innerHeight),hpFrac:1,t:now,motion:defaultMotion('menu')});mctx.restore();}
```

Add the imports to the existing `mothership` import on line 1:

```ts
import {drawMothership, defaultMotion, menuRingRadius} from './game/mothership.js';
```

- [ ] **Step 7: Style it**

In `src/style.css`, change the `#menu-overlay` rule on line 20 from:

```
background:rgba(2,4,8,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
```

to:

```
background:radial-gradient(ellipse at 50% 50%,rgba(2,4,8,.05) 0%,rgba(2,4,8,.5) 70%,rgba(2,4,8,.78) 100%);backdrop-filter:none;-webkit-backdrop-filter:none;
```

And extend the **existing** `.menu-sheet` rule on line 21 (do not add a duplicate selector):

```
.menu-sheet{max-width:820px;width:100%;margin:28px 16px 48px;position:relative;z-index:1;}
```

Add the new canvas rule immediately after the `#menu-overlay` rule:

```
#menu-ship{position:absolute;inset:0;width:100%;height:100%;opacity:.5;pointer-events:none;z-index:0;}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/menu-ship.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 9: Run the full gate**

Run: `npm test && npm run build`
Expected: all pass, clean build

- [ ] **Step 10: Commit**

```bash
git add scripts/gen_index.py index.html src/main.ts src/style.css src/game/mothership.ts tests/menu-ship.test.ts
git commit -m "feat(mothership): show the echo ring behind the main menu"
```

---

### Task 7: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above
- Produces: nothing new

- [ ] **Step 1: Update the README**

Find the section describing the mothership or visuals and replace it with an accurate description. It must state: the mothership is a segmented ring station drawn procedurally on canvas; it is visible behind the main menu as well as in the arena; it counter-rotates in the menu and co-rotates in runs; micro-detail is dropped automatically at small radii; reduced-motion users see a static ring.

- [ ] **Step 2: Run the complete gate**

```bash
npm test
npm run build
node scripts/sim.mjs
```

Expected:
- typecheck clean, all suites pass
- clean build
- sim: `wave=50`, `RESULT: wall at wave 50`, `ACADEMY VERDICT: PASS`, `VERDICT: PASS`

- [ ] **Step 3: Confirm no stray files**

Run: `git status --short`
Expected: only `README.md` modified

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe the echo ring mothership"
```

- [ ] **Step 5: Hand off for visual confirmation**

Automated browser QA is unavailable in this environment (`agent-browser` fails with `Unknown: ChildProcess.kill`). Ask the maintainer to confirm at `http://localhost:5173/`:
1. The ring is visible behind the main menu and cropped by all four edges
2. Menu text is still readable over the ring (the main regression risk)
3. At gameplay scale the ship reads as a plated ring, not grey mush

---

## Self-Review

**Spec coverage:** every spec section maps to a task — geometry/detail tiering (1, 4), renderer with membrane and hull feedback (3), menu surface and overlay transparency (6), reduced motion (3), files and testing (1–7). Design decisions are carried into Global Constraints.

**Placeholder scan:** no TBD/TODO; every step contains real code or a real command.

**Type consistency:** `MothershipOpts`, `RingMotion`, `Detail`, `segmentDash`, `drawMothership`, `defaultMotion`, `menuRingRadius` are each defined in exactly one task and consumed with matching signatures. `DIAGONALS` is introduced in Task 3 and first used in Task 4. `RADIATOR_OUT` and `DOCK_R` are declared in Task 1 and first used in Task 4.

**Known risk carried from the spec:** lowering `#menu-overlay` opacity could hurt text contrast; Task 7 step 5 makes this an explicit manual check rather than assuming it.
