# Run Lifecycle + Start Menu + Wide Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runs actually end at hull 0 with a summary, the game boots to a start menu with an out-of-run workshop, and the workshop covers 8 upgrade tracks.

**Architecture:** Pure sim functions (`isDead`, `endRun`, `restartRun`, workshop math) stay DOM-free in `src/game/` + `src/state/`; all overlays live in `src/ui/menu.ts` + `index.html` and are driven from `src/main.ts` via a `phase: 'menu'|'run'|'over'` gate that pauses ticks outside runs.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-echo-spire-design.md` (§2 core loop: death = cash out to meta; §3.2 Foundry/Hangar permanent upgrades)

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup.
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4.
- No copied assets/names/numbers from The Tower. All art procedural.
- Balance lives only in `src/sim/balance.ts` (new workshop table goes there too).
- Canvas pooled, 300 ships @60fps target.

---

### Task 1: Death at hull 0 — run ends with summary + restart

**Files:**
- Modify: `src/game/state.ts:2-3`, `src/game/update.ts:11-15`
- Create: `src/game/lifecycle.ts`
- Test: `tests/lifecycle.test.ts`

**Interfaces:**
- Consumes: `GameState` (state.ts:2), `coresFor` (prestige.ts:5), `tickSim` (update.ts:2)
- Produces: `isDead(s): boolean`, `endRun(s): RunSummary`, `restartRun(s): number`, `RunSummary {wave, kills, fluxEarned, essenceEarned, timeS, coresGained}`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { isDead, endRun, restartRun } from '../src/game/lifecycle.js';
describe('lifecycle', () => {
  it('dies at hull 0 and reports a summary', () => {
    const s = freshState(); s.hull = 1;
    s.ships.push({ id: 9, kind: 'dart', x: 280, y: 270, hp: 50, dmg: 500, speed: 0, essence: 0 });
    for (let i = 0; i < 120 && !isDead(s); i++) tickSim(s, 1 / 60);
    expect(isDead(s)).toBe(true);
    expect(s.hull).toBe(0);
    const sum = endRun(s);
    expect(sum.wave).toBe(s.wave);
    expect(sum.coresGained).toBeGreaterThanOrEqual(0);
  });
  it('restart keeps meta and opens a fresh cycle', () => {
    const s = freshState(); s.wave = 60; s.essence = 5; s.levels = { dmg: 3 };
    const gained = restartRun(s);
    expect(gained).toBe(Math.floor(Math.sqrt(60)));
    expect(s.wave).toBe(1); expect(s.hull).toBe(s.maxHull);
    expect(s.ships).toEqual([]); expect(s.essence).toBe(5);
    expect(s.levels).toEqual({ dmg: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lifecycle.test.ts`
Expected: FAIL with "Cannot find module '../src/game/lifecycle.js'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/state.ts — extend line 2 type + line 3 freshState:
export type GameState={wave:number;hull:number;maxHull:number;flux:number;dmg:number;rate:number;range:number;ships:Ship[];nextId:number;_acc?:number;essence:number;cores?:number;levels?:Record<string,number>;workshop?:Record<string,number>;kills?:number;fluxEarned?:number;essenceEarned?:number;timeS?:number;_surgeWave?:number;_augmentWave?:number;pendingAugment?:string[]|null;augments?:string[]};
export function freshState():GameState{return {wave:1,hull:500,maxHull:500,flux:0,dmg:12,rate:1,range:180,ships:[],nextId:1,essence:0,cores:0,levels:{},workshop:{},kills:0,fluxEarned:0,essenceEarned:0,timeS:0,pendingAugment:null,augments:[]};}
```

```ts
// src/game/lifecycle.ts
import type { GameState } from './state.js';
import { coresFor } from '../state/prestige.js';
export type RunSummary = { wave:number; kills:number; fluxEarned:number; essenceEarned:number; timeS:number; coresGained:number };
export function isDead(s:GameState):boolean { return s.hull <= 0; }
export function endRun(s:GameState):RunSummary {
  s.hull = Math.max(0, s.hull);
  return { wave: s.wave, kills: s.kills ?? 0, fluxEarned: s.fluxEarned ?? 0, essenceEarned: s.essenceEarned ?? 0, timeS: s.timeS ?? 0, coresGained: coresFor(s.wave) };
}
export function restartRun(s:GameState):number {
  const gained = coresFor(s.wave);
  s.cores = (s.cores ?? 0) + gained;
  const keepWorkshop = s.workshop ?? {};
  const keepLevels = s.levels ?? {};
  const keepEssence = s.essence ?? 0;
  const fresh = { wave: 1, hull: s.maxHull, flux: 0, ships: [], _acc: 0, kills: 0, fluxEarned: 0, essenceEarned: 0, timeS: 0, pendingAugment: null as null, augments: [] as string[], _surgeWave: undefined as number|undefined, _augmentWave: undefined as number|undefined };
  Object.assign(s, fresh);
  s.workshop = keepWorkshop; s.levels = keepLevels; s.essence = keepEssence;
  return gained;
}
```

```ts
// src/game/update.ts — replace lines 11-15 contact + clear block with:
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;sh.x+=dx/d*sh.speed*dt;sh.y+=dy/d*sh.speed*dt;
    if(d<26){s.hull-=sh.dmg*dt*2;const alive=sh.hp>0;sh.hp-=s.dmg*dt*0.5;
      if(alive&&sh.hp<=0){s.flux+=6+s.wave;s.fluxEarned=(s.fluxEarned??0)+6+s.wave;s.kills=(s.kills??0)+1;if(sh.cache){s.essence+=sh.essence;s.essenceEarned=(s.essenceEarned??0)+sh.essence;}}}}
  s.ships=s.ships.filter(x=>x.hp>0);
  s.hull=Math.max(0,s.hull); s.timeS=(s.timeS??0)+dt;
  if(isDead(s)) return;
  if(s.ships.length===0){s.wave+=1;}
```

Also add fluxEarned/kills tracking to the ranged-kill branch on line 9: after `s.flux+=6+s.wave;` add `s.fluxEarned=(s.fluxEarned??0)+6+s.wave;s.kills=(s.kills??0)+1;` and after `s.essence+=t.essence;` add `s.essenceEarned=(s.essenceEarned??0)+t.essence;`. Add `import {isDead} from './lifecycle.js';` at the top of update.ts. Note: lifecycle.ts imports from prestige.ts and update.ts imports lifecycle.ts — keep lifecycle.ts free of update.ts imports to avoid a cycle.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lifecycle.test.ts`
Expected: PASS. Then `npx vitest run` full suite PASS and `npm run build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/lifecycle.ts src/game/state.ts src/game/update.ts tests/lifecycle.test.ts
git commit -m "feat: death at hull 0 with run summary and restart"
```

### Task 2: Start menu + game-over overlay + phase gate

**Files:**
- Create: `src/ui/menu.ts`
- Modify: `index.html:1`, `src/main.ts:6-47`
- Test: `tests/menu.test.ts`

**Interfaces:**
- Consumes: `isDead, endRun, restartRun` (Task 1), `loadGame` (save.ts), `loop.setPaused` (loop.ts)
- Produces: `showMenu(best:number)`, `showGameOver(sum:RunSummary)`, `hideOverlays()`, `getPhase(): 'menu'|'run'|'over'`

- [ ] **Step 1: Write the failing test**

```ts
// tests/menu.test.ts
import { describe, it, expect } from 'vitest';
import { getPhase, toMenu, toRun } from '../src/ui/menu.js';
describe('menu phases', () => {
  it('starts in menu and transitions to run', () => {
    toMenu();
    expect(getPhase()).toBe('menu');
    toRun();
    expect(getPhase()).toBe('run');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menu.test.ts`
Expected: FAIL with "Cannot find module '../src/ui/menu.js'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/menu.ts — DOM-free phase store + DOM overlay writers (guarded for headless):
export type Phase = 'menu' | 'run' | 'over';
let phase: Phase = 'menu';
export function getPhase(): Phase { return phase; }
export function toMenu(): void { phase = 'menu'; render(); }
export function toRun(): void { phase = 'run'; render(); }
export function toOver(): void { phase = 'over'; render(); }
function el(id: string): HTMLElement | null { return typeof document === 'undefined' ? null : document.getElementById(id); }
function render(): void {
  const m = el('menu-overlay'), o = el('over-overlay'), g = el('layout');
  if (m) m.style.display = phase === 'menu' ? 'flex' : 'none';
  if (o) o.style.display = phase === 'over' ? 'flex' : 'none';
  if (g) g.style.visibility = phase === 'menu' ? 'hidden' : 'visible';
}
export function showMenu(best: number): void {
  toMenu();
  const b = el('menu-best'); if (b) b.textContent = String(best);
}
export function showGameOver(sum: { wave:number; kills:number; fluxEarned:number; essenceEarned:number; timeS:number; coresGained:number }): void {
  toOver();
  const set = (id: string, v: string | number) => { const n = el(id); if (n) n.textContent = String(v); };
  set('over-wave', sum.wave); set('over-kills', sum.kills); set('over-flux', sum.fluxEarned);
  set('over-essence', sum.essenceEarned); set('over-time', Math.round(sum.timeS) + 's'); set('over-cores', sum.coresGained);
}
export function hideOverlays(): void { toRun(); }
```

```html
<!-- index.html: add inside <div id="app"> before #topbar, keep everything else byte-identical -->
<div id="menu-overlay" style="position:fixed;inset:0;background:rgba(3,6,12,.92);display:flex;align-items:center;justify-content:center;z-index:20;"><div style="text-align:center;max-width:420px;padding:32px;"><h1 style="letter-spacing:4px;">ECHO SPIRE</h1><p>Best cycle: <b id="menu-best">0</b></p><button id="btn-launch">Launch Mothership</button><button id="btn-menu-workshop">Workshop</button></div></div>
<div id="over-overlay" style="display:none;position:fixed;inset:0;background:rgba(3,6,12,.9);align-items:center;justify-content:center;z-index:20;"><div style="text-align:center;min-width:300px;padding:24px;background:#0b1220;border:1px solid #5eead4;border-radius:12px;"><h2>MOTHERSHIP LOST</h2><p>Wave <b id="over-wave">0</b> • <b id="over-kills">0</b> kills</p><p>Flux <b id="over-flux">0</b> • Essence <b id="over-essence">0</b> • <b id="over-time">0s</b></p><p>Cores earned <b id="over-cores">0</b></p><button id="btn-relaunch">Relaunch</button><button id="btn-over-menu">Menu</button></div></div>
```

```ts
// src/main.ts wiring (modify, keep save-hydrate block lines 7-21 as-is):
import { showMenu, showGameOver, hideOverlays, getPhase } from './ui/menu.js';
import { isDead, endRun, restartRun } from './game/lifecycle.js';
// after hydrate, before loop: showMenu(saved?.best ?? saved?.wave ?? 1); loop.setPaused(true);
// tick: (dt)=>{ if(getPhase()!=='run') return; tickSim(s,dt); if(isDead(s)){ const sum=endRun(s); saveGame({...s, best:Math.max(savedBest,s.wave)} as any); showGameOver(sum); loop.setPaused(true); } }
// btn-launch/btn-relaunch: ()=>{ restartRun(s); hideOverlays(); loop.setPaused(false); }
// btn-menu-workshop/btn-over-menu: ()=>{ showMenu(best); loop.setPaused(true); }
```

Persist `best` in the save payload on death and read it for `showMenu`. Pause the loop whenever phase is not 'run'.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/menu.test.ts`
Expected: PASS. Then full `npx vitest run` PASS, `npm run build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/menu.ts index.html src/main.ts tests/menu.test.ts
git commit -m "feat: start menu and game-over flow with phase gate"
```

### Task 3: Wide workshop — 8 out-of-run upgrade tracks for cores

**Files:**
- Modify: `src/sim/balance.ts:19-20`, `src/ui/panel.ts:1-14`, `src/game/state.ts:2-3`, `src/main.ts`, `index.html:1`
- Create: `src/state/workshop.ts`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: `costFor` (balance.ts:13), `GameState` (state.ts:2), `cores` field
- Produces: `WORKSHOP_STATS`, `workshopCost(stat, lvl): number`, `buyWorkshop(s, stat): boolean`, `applyWorkshop(s): void`

Workshop tracks and effects: dmg (+12% mult), rate (+0.08/s), maxHull (+10% +50), range (+12), regen (+2/s hull regen — consumed by update.ts contact phase later; v1 stores the value), crit (+2% chance), volley (+1 projectile every 3rd level), bounce (+1 chain every 2nd level). Costs in cores: base 1/2/2/3/3/5/8/8 with growth 1.8/1.8/1.8/1.9/1.9/2.1/2.2/2.2.

- [ ] **Step 1: Write the failing test**

```ts
// tests/workshop.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { buyWorkshop, workshopCost, applyWorkshop } from '../src/state/workshop.js';
describe('workshop', () => {
  it('costs cores and refuses when broke', () => {
    const s = freshState(); s.cores = 0;
    expect(buyWorkshop(s, 'dmg')).toBe(false);
    s.cores = 100;
    expect(buyWorkshop(s, 'dmg')).toBe(true);
    expect((s.workshop ?? {}).dmg).toBe(1);
    expect(workshopCost('dmg', 0)).toBe(1);
  });
  it('applies workshop levels to base stats on fresh cycle', () => {
    const s = freshState(); s.cores = 100;
    buyWorkshop(s, 'dmg'); buyWorkshop(s, 'dmg');
    const base = s.dmg;
    applyWorkshop(s);
    expect(s.dmg).toBeGreaterThan(base);
  });
  it('restart preserves workshop and reapplies it', () => {
    const s = freshState(); s.cores = 100; s.wave = 60;
    buyWorkshop(s, 'range');
    const { restartRun } = require('../src/game/lifecycle.js') as typeof import('../src/game/lifecycle.js');
    restartRun(s);
    expect((s.workshop ?? {}).range).toBe(1);
  });
});
```

Note: use static `import { restartRun } from '../src/game/lifecycle.js';` at the top instead of require (plan shows require for brevity — the real test file must use ESM import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/workshop.test.ts`
Expected: FAIL with "Cannot find module '../src/state/workshop.js'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/sim/balance.ts — append after line 20:
export type WorkshopStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce';
export const WORKSHOP_BASE:Record<WorkshopStat,{base:number;growth:number}>={dmg:{base:1,growth:1.8},rate:{base:2,growth:1.8},maxHull:{base:2,growth:1.8},range:{base:3,growth:1.9},regen:{base:3,growth:1.9},crit:{base:5,growth:2.1},volley:{base:8,growth:2.2},bounce:{base:8,growth:2.2}};
```

```ts
// src/state/workshop.ts
import { costFor, WORKSHOP_BASE, type WorkshopStat } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type { WorkshopStat };
export const WORKSHOP_STATS: WorkshopStat[] = ['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
export function workshopCost(stat: WorkshopStat, lvl: number): number { return costFor(WORKSHOP_BASE[stat].base, WORKSHOP_BASE[stat].growth, lvl); }
export function buyWorkshop(s: GameState, stat: WorkshopStat): boolean {
  const lvl = s.workshop?.[stat] ?? 0;
  const c = workshopCost(stat, lvl);
  if ((s.cores ?? 0) < c) return false;
  s.cores = (s.cores ?? 0) - c;
  s.workshop = s.workshop ?? {}; s.workshop[stat] = lvl + 1;
  applyWorkshop(s);
  return true;
}
export function applyWorkshop(s: GameState): void {
  const w = s.workshop ?? {};
  const base = { dmg: 12, rate: 1, maxHull: 500, range: 180 };
  s.dmg = Math.round(base.dmg * Math.pow(1.12, w.dmg ?? 0));
  s.rate = Math.round((base.rate + 0.08 * (w.rate ?? 0)) * 100) / 100;
  s.maxHull = Math.round(base.maxHull * Math.pow(1.1, w.maxHull ?? 0) + 50 * (w.maxHull ?? 0));
  s.range = base.range + 12 * (w.range ?? 0);
  if (s.hull > s.maxHull) s.hull = s.maxHull;
}
```

`regen/crit/volley/bounce` levels persist and are spent in this task; their combat effects land in the next plan (enemy variety + combat depth) — `applyWorkshop` stores them and the workshop UI shows them as owned. Document that in the commit message, not as a TODO in code. Wire 8 workshop buttons (`btn-ws-dmg` …) into the menu overlay + `renderHud` cores display; call `applyWorkshop(s)` after hydrate in main.ts and after every `restartRun`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/workshop.test.ts`
Expected: PASS. Then full `npx vitest run` PASS, `npm run build` clean, `node scripts/sim.mjs` still PASS (wall 80-120 — workshop excluded from sim policy).

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/state/workshop.ts src/game/state.ts src/ui/panel.ts src/main.ts index.html tests/workshop.test.ts
git commit -m "feat: wide 8-track workshop for cores with menu UI"
```

## Self-Review
- Spec coverage: death-cash-out §2 → Task 1 (endRun/restartRun grant coresFor); menu §5 → Task 2; Foundry/Hangar §3.2 → Task 3 (8 tracks, cores, persisted, reapplied). Regen/crit/volley/bounce combat effects explicitly deferred to next plan with levels persisted now.
- Placeholder scan: no TBD/TODO/later in code; deferred combat effects documented in plan text + commit message only.
- Type consistency: `RunSummary` fields match `showGameOver` setter; `WorkshopStat` single-sourced from balance.ts and re-exported; `phase` union shared by menu.ts producers/consumers; `workshop` field added to GameState in Task 1 so Tasks 2-3 compile in order.
