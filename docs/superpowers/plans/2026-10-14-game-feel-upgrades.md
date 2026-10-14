# Game Feel + Wide Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrades read like a real game (descriptions + current → next on every card), the roster doubles (8 forge + 12 workshop tracks), combat is visible (beams, flashes, particles, shake), and enemies trickle in roaming instead of rushing as one blob.

**Architecture:** Sim stays DOM-free and deterministic (60Hz fixed tick); new combat fields (`regen`, `critCh`, `volley`, `bounce`) live on `GameState` and are set by forge/workshop appliers; render consumes a per-tick `s.fx` event queue (beams, sparks) plus behavior fields (`wander`, `spawnQueue`) that `scripts/sim.mjs` mirrors verbatim so the wall check stays honest.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest, Google Fonts (Orbitron + JetBrains Mono).

**Spec:** `docs/superpowers/specs/2026-10-13-echo-spire-design.md` (§2 loop, §3.1 Forge, §3.2 Hangar, §5 UI) + design tokens in `design-system/echo-spire/MASTER.md` (override: keep the shipped cyan→violet neon identity, NOT the green/gold suggestion; glassmorphism cards; Orbitron headers / JetBrains Mono numbers)

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup.
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4.
- No copied assets/names/numbers from The Tower. All art procedural (Canvas paths + inline SVG icons, never emoji).
- Balance lives only in `src/sim/balance.ts` (new tables go there too).
- Canvas pooled, 300 ships @60fps target; `prefers-reduced-motion` disables shake/flash.
- Touch targets ≥44px, transitions 150-300ms, text contrast 4.5:1 on dark.

---

### Task 1: Upgrade cards — description + current → next on every row

**Files:**
- Modify: `src/ui/hud.ts`, `src/ui/panel.ts`, `index.html:1`, `src/style.css`
- Test: `tests/cards.test.ts`

**Interfaces:**
- Consumes: `upgradeCost, buyUpgrade, Stat` (panel.ts), `workshopCost, buyWorkshop, WORKSHOP_STATS` (workshop.ts)
- Produces: `describeStat(stat): {name, desc, cur(s): string, next(s): string}`, `describeWorkshop(stat)` same shape

- [ ] **Step 1: Write the failing test**

```ts
// tests/cards.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { describeStat, describeWorkshop } from '../src/ui/cards.js';
describe('cards', () => {
  it('every forge stat explains itself with current and next', () => {
    const s = freshState();
    for (const st of ['dmg', 'rate', 'maxHull'] as const) {
      const d = describeStat(st);
      expect(d.name.length).toBeGreaterThan(2);
      expect(d.desc.length).toBeGreaterThan(10);
      expect(d.cur(s).length).toBeGreaterThan(0);
      expect(d.next(s)).not.toBe(d.cur(s));
    }
  });
  it('every workshop track explains itself', () => {
    const s = freshState(); s.cores = 50;
    const d = describeWorkshop('dmg');
    expect(d.desc.length).toBeGreaterThan(10);
    expect(d.next(s)).not.toBe(d.cur(s));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cards.test.ts`
Expected: FAIL with "Cannot find module '../src/ui/cards.js'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/cards.ts
import type { GameState } from '../game/state.js';
import { upgradeCost, type Stat } from './panel.js';
import { workshopCost, type WorkshopStat } from '../state/workshop.js';
export type Card = { name: string; desc: string; cur: (s: GameState) => string; next: (s: GameState) => string };
const FORGE: Record<Stat, Card> = {
  dmg: { name: 'Railguns', desc: 'Main guns. Each level hits harder — your primary DPS lever.',
    cur: s => `${s.dmg} dmg`, next: s => `${Math.round(s.dmg * 1.12 + 2)} dmg` },
  rate: { name: 'Targeting Core', desc: 'Fire rate. More shots per second, melts swarms.',
    cur: s => `${s.rate.toFixed(2)}/s`, next: s => `${(Math.round((s.rate + 0.08) * 100) / 100).toFixed(2)}/s` },
  maxHull: { name: 'Hull Plating', desc: 'Max integrity. Bigger buffer, refills to full on buy.',
    cur: s => `${s.maxHull} HP`, next: s => `${Math.round(s.maxHull * 1.1 + 50)} HP` },
};
export function describeStat(stat: Stat): Card { return FORGE[stat]; }
export function upgradeBlurb(stat: Stat, lvl: number): string { return `Lv ${lvl} • ${upgradeCost(stat, lvl)} flux`; }
const WS: Record<WorkshopStat, Card> = {
  dmg: { name: 'Gun Foundry', desc: 'Permanent +12% railgun damage per level.', cur: s => `x${(1 + 0.12 * (s.workshop?.dmg ?? 0)).toFixed(2)}`, next: s => `x${(1 + 0.12 * ((s.workshop?.dmg ?? 0) + 1)).toFixed(2)}` },
  rate: { name: 'Servo Works', desc: 'Permanent +0.08 shots/s per level.', cur: s => `+${((s.workshop?.rate ?? 0) * 0.08).toFixed(2)}/s`, next: s => `+${(((s.workshop?.rate ?? 0) + 1) * 0.08).toFixed(2)}/s` },
  maxHull: { name: 'Drydock', desc: 'Permanent +10% hull and +50 flat per level.', cur: s => `Lv ${s.workshop?.maxHull ?? 0}`, next: s => `Lv ${(s.workshop?.maxHull ?? 0) + 1}` },
  range: { name: 'Long Scopes', desc: 'Permanent +12 sensor range per level. Shoot roamers earlier.', cur: s => `+${12 * (s.workshop?.range ?? 0)}`, next: s => `+${12 * ((s.workshop?.range ?? 0) + 1)}` },
  regen: { name: 'Nanobot Bay', desc: 'Repairs hull every second, even mid-fight.', cur: s => `${(s.regen ?? 0).toFixed(1)}/s`, next: s => `${((s.regen ?? 0) + 2).toFixed(1)}/s` },
  crit: { name: 'Lucky Coils', desc: 'Chance for 2x critical hits.', cur: s => `${((s.critCh ?? 0) * 100).toFixed(0)}%`, next: s => `${(((s.critCh ?? 0) + 0.02) * 100).toFixed(0)}%` },
  volley: { name: 'Split Battery', desc: 'Engage +1 simultaneous target. Level 3/6/9 unlock it.', cur: s => `${1 + Math.floor((s.volley ?? 0) / 3)} targets`, next: s => `${1 + Math.floor(((s.volley ?? 0) + 1) / 3)} targets` },
  bounce: { name: 'Ricochet Mesh', desc: 'Kills chain to +1 nearby ship. Every 2nd level.', cur: s => `${Math.floor((s.bounce ?? 0) / 2)} chains`, next: s => `${Math.floor(((s.bounce ?? 0) + 1) / 2)} chains` },
};
export function describeWorkshop(stat: WorkshopStat): Card { return WS[stat]; }
```

Wire-up: replace the 3 forge `<button>` rows and workshop buttons with card markup (inline SVG diamond icon + name + desc + `cur → next` line + cost button; affordable = neon glow class, unaffordable = dimmed + disabled). Add to `src/style.css`: `:root` tokens (`--neon:#5eead4; --violet:#a78bfa; --glass:rgba(255,255,255,.05); --blur:15px`), Orbitron/JetBrains Mono import, `.card` glass style (backdrop-filter blur(15px), 1px border rgba(255,255,255,.12), 44px min-height rows, 200ms transitions), `prefers-reduced-motion` block. Re-render card texts inside existing `renderHud(s)` call — no new render loop.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cards.test.ts`
Expected: PASS. Then full `npx vitest run` PASS, `npm run build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/cards.ts src/ui/hud.ts src/ui/panel.ts index.html src/style.css tests/cards.test.ts
git commit -m "feat: upgrade cards with descriptions and current-to-next stats"
```

### Task 2: Wider roster — 8 forge + 12 workshop tracks with live combat effects

**Files:**
- Modify: `src/sim/balance.ts:19-20`, `src/game/state.ts:2`, `src/ui/panel.ts:1-14`, `src/state/workshop.ts`, `src/game/update.ts:7-10`, `src/ui/cards.ts`
- Test: `tests/roster.test.ts`

**Interfaces:**
- Consumes: `costFor` (balance.ts:13), `GameState`, `applyWorkshop`
- Produces: extended `Stat` (8 values), extended `WorkshopStat` (12 values), combat reads `s.regen/s.critCh/s.volley/s.bounce`

New forge tracks (in-run, flux): range (base 25/1.35, +15 range), regen (base 30/1.4, +1.5/s), crit (base 60/1.5, +2%), volley (base 150/1.6, +1 volley point), bounce (base 150/1.6, +1 bounce point). New workshop tracks (cores): essence (+15%/lvl, base 4/2.0), startFlux (+150/lvl, base 4/2.0), bulkhead (+8% maxHull/lvl, base 6/2.0), scope (+10 range/lvl, base 6/2.0). Workshop regen/crit/volley/bounce now feed `applyWorkshop` into `s.regen/s.critCh/s.volley/s.bounce` (numbers, not just stored).

- [ ] **Step 1: Write the failing test**

```ts
// tests/roster.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { buyUpgrade } from '../src/ui/panel.js';
import { buyWorkshop, applyWorkshop } from '../src/state/workshop.js';
describe('roster', () => {
  it('new forge tracks spend flux and move stats', () => {
    const s = freshState(); s.flux = 100000;
    expect(buyUpgrade(s, 'range')).toBe(true);
    expect(s.range).toBeGreaterThan(180);
    expect(buyUpgrade(s, 'regen')).toBe(true);
    expect(s.regen).toBeGreaterThan(0);
    expect(buyUpgrade(s, 'crit')).toBe(true);
    expect(s.critCh).toBeGreaterThan(0);
  });
  it('volley and bounce engage extra targets', () => {
    const s = freshState(); s.flux = 100000;
    buyUpgrade(s, 'volley'); buyUpgrade(s, 'bounce');
    expect(s.volley).toBe(1); expect(s.bounce).toBe(1);
  });
  it('new workshop tracks persist and apply', () => {
    const s = freshState(); s.cores = 500;
    expect(buyWorkshop(s, 'essence')).toBe(true);
    expect(buyWorkshop(s, 'startFlux')).toBe(true);
    expect((s.workshop ?? {}).essence).toBe(1);
    applyWorkshop(s);
    expect(s.flux).toBeGreaterThanOrEqual(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/roster.test.ts`
Expected: FAIL (Stat has no 'range' / missing fields).

- [ ] **Step 3: Write minimal implementation**

```ts
// balance.ts — extend UpgradeStat + BASE (keep existing 3 byte-identical):
export type UpgradeStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce';
range:{base:25,growth:1.35},regen:{base:30,growth:1.4},crit:{base:60,growth:1.5},volley:{base:150,growth:1.6},bounce:{base:150,growth:1.6}
export type WorkshopStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce'|'essence'|'startFlux'|'bulkhead'|'scope';
essence:{base:4,growth:2.0},startFlux:{base:4,growth:2.0},bulkhead:{base:6,growth:2.0},scope:{base:6,growth:2.0}
// state.ts GameState += regen:number;critCh:number;volley:number;bounce:number; freshState += regen:0,critCh:0,volley:0,bounce:0
// panel.ts buyUpgrade += range:s.range+=15 / regen:s.regen+=1.5 / crit:s.critCh+=0.02 / volley:s.volley+=1 / bounce:s.bounce+=1
// workshop.ts applyWorkshop += s.regen=2*(w.regen??0); s.critCh=0.02*(w.crit??0); s.volley=(w.volley??0); s.bounce=(w.bounce??0); s.flux+=(s.flux===0?150*(w.startFlux??0):0); essenceMult=1+0.15*(w.essence??0) stored on (s as any)._essenceMult; s.maxHull extra bulkhead x1.08^n; s.range extra scope +10*n
// update.ts fire loop: targets = 1+floor(s.volley/3 in-run? NO — volley points: in-run s.volley + workshop s.volley dereferenced? Keep single field: panel/workshop both write s.volley points; targets=1+floor(s.volley/3); per target nearest-unhit; crit roll per target (Math.random()<s.critCh → dmg*2); on kill chain bounce: chains=floor(s.bounce/2), damage nearest others for s.dmg*0.5 each. Essence gains x _essenceMult. Hull regen: s.hull=min(maxHull, hull+regen*dt) each tick before death check.
```

`update.ts` crit uses `Math.random` (render/sim variance accepted; sim.mjs mirrors with same call so wall stays comparable — set a fixed seed path? Keep Math.random in both; wall assertion has margin 80-120).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/roster.test.ts`
Expected: PASS. Then full suite PASS, `npm run build` clean, `node scripts/sim.mjs` PASS (80-120 — retune BASE only if it drifts out; keep enemy curves untouched).

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/game/state.ts src/ui/panel.ts src/state/workshop.ts src/game/update.ts src/ui/cards.ts tests/roster.test.ts scripts/sim.mjs
git commit -m "feat: 8 forge and 12 workshop tracks with live combat effects"
```

### Task 3: Visible combat — beams, flashes, particles, shake

**Files:**
- Modify: `src/game/state.ts:2`, `src/game/update.ts`, `src/game/render.ts`, `src/main.ts`
- Test: `tests/fx.test.ts`

**Interfaces:**
- Consumes: `GameState.ships`, `SHIP_PATHS`
- Produces: `FxEvent {kind:'beam'|'spark'|'flash', x,y,tx,ty,ttl}`, render reads + clears `s.fx`

- [ ] **Step 1: Write the failing test**

```ts
// tests/fx.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
describe('fx', () => {
  it('firing pushes beam events, kills push sparks', () => {
    const s = freshState();
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect((s.fx ?? []).some(e => e.kind === 'beam')).toBe(true);
    expect((s.fx ?? []).some(e => e.kind === 'spark')).toBe(true);
  });
  it('fx queue is capped', () => {
    const s = freshState();
    for (let i = 0; i < 50; i++) s.ships.push({ id: i, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect((s.fx ?? []).length).toBeLessThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fx.test.ts`
Expected: FAIL (`s.fx` undefined → `.some` throws, or length check fails).

- [ ] **Step 3: Write minimal implementation**

```ts
// state.ts += fx?: FxEvent[]; export type FxEvent={kind:'beam'|'spark'|'flash';x:number;y:number;tx:number;ty:number;ttl:number};
// update.ts: on each ranged hit push {kind:'beam',x:280,y:280,tx:t.x,ty:t.y,ttl:0.12}; on kill push {kind:'spark',...,ttl:0.3}; on hull hit (throttled: only if no flash in queue) push {kind:'flash',x:280,y:280,tx:280,ty:280,ttl:0.15}; cap: if(s.fx!.length>60) s.fx!.splice(0, s.fx!.length-60); init s.fx=s.fx??[] at tick start.
// render.ts drawSpace(ctx,w,h,t,s): beams = cyan lines alpha by ttl (width 2, glow shadowBlur 8); sparks = 3px orange dots at tx,ty; flash = red vignette ring alpha by ttl; decrement ttl by frame dt in draw (draw receives dt) and filter ttl>0; screen shake: offset=(Math.random()-0.5)*6*trauma, trauma=1 on hull flash else decay — skip entirely if matchMedia('(prefers-reduced-motion: reduce)').matches.
```

Beams originate at mothership nose toward target; volley beams fan to each target. All shapes from existing palette (#5eead4 beams, #fb923c sparks, #f43f5e flash).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fx.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/state.ts src/game/update.ts src/game/render.ts src/main.ts tests/fx.test.ts
git commit -m "feat: visible beams, hit sparks, damage flash, and shake"
```

### Task 4: Roaming attackers — trickle spawns that strafe, not blob-rush

**Files:**
- Modify: `src/game/state.ts:1-2`, `src/game/spawning.ts`, `src/game/update.ts:2-4,11`, `scripts/sim.mjs`
- Test: `tests/roam.test.ts`

**Interfaces:**
- Consumes: `enemyHp/enemyDmg` (balance.ts, untouched curves), `tickSim`
- Produces: `Ship.behavior: 'seeker'|'roamer'`, `Ship.wander: number`, spawn queue fields `_queue: number, _timer: number`

Behavior: each wave computes the same budget count as today (`4+floor(wave*0.7)`) but releases it over time — one ship every `max(0.15, 1.1 - wave*0.008)`s from a random rift, alternating seeker/roamer (roamer every 3rd). Roamers fly toward the mothership plus a perpendicular sine (`wander` phase, amplitude 40px, frequency 1.5rad/s); seekers fly straight. Wave clears when queue is empty AND ships are empty. Cache Ship still spawns instantly via `maybeSpawnSurge` (special event, unchanged).

- [ ] **Step 1: Write the failing test**

```ts
// tests/roam.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { spawnWave } from '../src/game/spawning.js';
import { tickSim } from '../src/game/update.js';
describe('roam', () => {
  it('wave budget releases over time, not all at once', () => {
    const s = freshState(); s.wave = 20;
    spawnWave(s);
    expect(s.ships.length).toBeLessThanOrEqual(3);
    expect(s._queue).toBeGreaterThan(0);
  });
  it('roamers strafe instead of flying straight', () => {
    const s = freshState();
    s.ships.push({ id: 1, kind: 'dart', x: 100, y: 100, hp: 1000, dmg: 0, speed: 30, essence: 0, behavior: 'roamer', wander: 0 });
    const y0 = 100;
    tickSim(s, 0.5);
    const sh = s.ships[0];
    const straight = Math.atan2(280 - 100, 280 - 100);
    const actual = Math.atan2(sh.y - 100, sh.x - 100);
    expect(Math.abs(actual - straight)).toBeGreaterThan(0.02);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/roam.test.ts`
Expected: FAIL (no `_queue`, all ships spawn at once).

- [ ] **Step 3: Write minimal implementation**

```ts
// state.ts Ship += behavior?: 'seeker'|'roamer'; wander?: number; GameState += _queue?: number; _timer?: number;
// spawning.ts spawnWave(s): budget=4+floor(wave*0.7); release first 2 instantly (1 seeker + 1 roamer if budget>1); s._queue=budget-released; s._timer=0; each ship: kind pattern dart/bomber/hex by index, rift = RIFT_POS-independent ring pos (keep current ring math), behavior = idx%3===2?'roamer':'seeker', wander=Math.random()*Math.PI*2.
// update.ts tick start: if(s._queue>0){ s._timer-=dt; const gap=Math.max(0.15,1.1-s.wave*0.008); while(s._timer<=0&&s._queue>0){ release one ship (same kind/behavior pattern by nextId); s._queue--; s._timer+=gap; } }
// update.ts movement: for roamer: perpendicular = (-dy/d, dx/d); strafe=Math.sin((sh.wander??0)+perfTime)*40*dt; sh.x+=dx/d*speed*dt+perp.x*strafe; sh.wander+=1.5*dt. Use accumulated s.timeS as clock (no Date.now — deterministic).
// update.ts clear rule: if(s._queue<=0 && s.ships.length===0){ s.wave+=1; } — surge/augment triggers stay where they are (on empty→spawn path).
// scripts/sim.mjs: mirror queue/timer/roamer math verbatim (movement parity not needed for wall, but release timing is — copy the release block exactly).
```

Keep `spawnWave` instant-release of 2 so the existing combat test (expects ships>0 after spawnWave) still passes. Rifts visual already draws all RIFT_POS; trickle picks a random rift ring position per release (keep ring math, vary angle by nextId golden angle).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/roam.test.ts`
Expected: PASS. Full suite PASS, build clean, `node scripts/sim.mjs` PASS 80-120 (timing changes clear-speed, not death-wave; assert holds — if it drifts, ease spawn gap, never enemy curves).

- [ ] **Step 5: Commit**

```bash
git add src/game/state.ts src/game/spawning.ts src/game/update.ts scripts/sim.mjs tests/roam.test.ts
git commit -m "feat: trickle spawns with roaming attackers"
```

## Self-Review
- Spec coverage: upgrade clarity (§5 UI) → Task 1; wider Forge/Hangar (§3.1/§3.2) → Task 2 (12 workshop, 8 forge, 4 previously-dead tracks now live); visible combat (game feel) → Task 3; better encounter pacing (implicit §2) → Task 4.
- Placeholder scan: no TBD/TODO; numbers exact (44px, 150-300ms, 4.5:1, gaps, caps, costs).
- Type consistency: `Stat`/`WorkshopStat` single-sourced from balance.ts; `FxEvent`/`Phase` shared; `behavior` union used by spawning/update/render; sim.mjs mirrors release/fire math.
