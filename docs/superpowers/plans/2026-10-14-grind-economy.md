# Grind Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance to a slow infinite grind (stall ~30, first collapse 40-60), ship the Training Academy idle threads with feature unlocks, move ultimates to Stellar Shards, and migrate saves to v2 with a clean break.

**Architecture:** Numbers change only in `src/sim/balance.ts`; Training is a new DOM-free module (`src/state/training.ts`) reusing the Lab time formula, ticked in real time with a 12h offline advance cap; shards flow through three weighted hooks with bosses as the only new spawn type; save v2 resets v1 saves with a menu notice.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-14-economy-grind-design.md`

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup (v1→v2 reset is explicit version policy with menu notice — the sanctioned path).
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4 (+x8 unlockable).
- No copied assets/names/numbers from The Tower. All art procedural (Canvas + inline SVG, never emoji).
- Balance lives only in `src/sim/balance.ts`.
- Canvas pooled, 300 ships @60fps target; `prefers-reduced-motion` respected.
- Touch targets ≥44px, transitions 150-300ms, contrast 4.5:1.

---

### Task 1: Economy retune — slow income, sharp teeth

**Files:**
- Modify: `src/sim/balance.ts:13-15`, `src/game/update.ts` (3 kill-credit sites + contact line + regen line untouched), `scripts/sim.mjs` (mirror), `src/ui/hud.ts` (flux/min + per-kill line)
- Test: `tests/economy.test.ts`

**Interfaces:**
- Consumes: `costFor` (balance.ts:13)
- Produces: new `BASE` table, `FLUX_KILL` formula, piecewise `enemyHp`, doubled contact DPS (consumed by sim + Task 4 harmlessly)

New numbers (verbatim, all in balance.ts):
- Forge BASE: dmg {30,1.32}, rate {44,1.36}, maxHull {40,1.34}, range {50,1.43}, regen {60,1.48}, crit {120,1.58}, volley {300,1.68}, bounce {300,1.68}. (Old: 15/1.24, 22/1.28, 20/1.26, 25/1.35, 30/1.4, 60/1.5, 150/1.6, 150/1.6.)
- `export function fluxForKill(wave:number):number { return 3 + Math.floor(wave / 2); }`
- `export function enemyHp(wave:number):number { const base = 10*Math.pow(1.05,wave); const tail = wave<=40 ? Math.pow(wave,1.25) : Math.pow(40,1.25) + (Math.pow(wave,1.35)-Math.pow(40,1.35)); return Math.round(base+tail); }` (continuous at 40 by construction)
- Contact DPS: `s.hull -= sh.dmg*dt*2` → `s.hull -= sh.dmg*dt*4`.
- All three kill-credit sites (`flux+=6+wave` ranged, bounce, contact): replace amount with `fluxForKill(s.wave)`.
- Essence audit: grep every `essence+=` site; the ONLY sanctioned source is cache-ship kills (`if (t.cache)` / `if (sh.cache)`). Any other credit (mult applied outside cache, surge bonus, offline) is the flood bug — delete it. `_essenceMult` applies to cache gains only.

- [ ] **Step 1: Write the failing test**

```ts
// tests/economy.test.ts
import { describe, it, expect } from 'vitest';
import { costFor, fluxForKill, enemyHp, BASE } from '../src/sim/balance.js';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
describe('economy', () => {
  it('forge costs roughly tripled', () => {
    expect(BASE.dmg.base).toBe(30); expect(costFor(30, 1.32, 0)).toBe(30);
  });
  it('kill income is explicit and slower', () => {
    expect(fluxForKill(1)).toBe(3); expect(fluxForKill(10)).toBe(8);
  });
  it('hp curve bends up past 40, continuous at 40', () => {
    expect(enemyHp(50)).toBeGreaterThan(enemyHp(40));
  });
  it('only cache kills grant essence', () => {
    const s = freshState(); s.dmg = 100000;
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.essence ?? 0).toBe(0);
    expect(s.flux).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/economy.test.ts`
Expected: FAIL (BASE.dmg.base is 15; fluxForKill missing).

- [ ] **Step 3: Write minimal implementation**

Apply the numbers above. Mirror the new `BASE`, `fluxForKill`, `enemyHp` in `scripts/sim.mjs` verbatim. HUD: topbar line `Flux/min + per-kill` — compute per-kill via `fluxForKill(s.wave)` and per-min as kills-last-60s tracked on state (`_kpm` timestamps? Minimal: show `fluxForKill` per kill + lifetime `fluxEarned/timeS` rate: `${Math.round(fluxEarned/max(1,timeS)*60)}/min`). Add `<span class="pill">Income <b id="hud-income">-</b></span>` + txt() line.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/economy.test.ts`
Expected: PASS. Then full suite PASS, build clean. Sim wall is re-targeted in Task 4's balance pass — do NOT chase 40-60 yet; note current wall in report.

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/game/update.ts scripts/sim.mjs src/ui/hud.ts index.html tests/economy.test.ts
git commit -m "feat: slow-burn economy retune with audited essence"
```

### Task 2: Training Academy — idle threads that unlock features

**Files:**
- Create: `src/state/training.ts`
- Modify: `src/sim/balance.ts` (TRAIN_* consts), `src/main.ts` (gates + tick hook + hydrate), `src/ui/hud.ts` + `index.html` (Academy tab UI), `src/game/update.ts` (auto-forge hook), `src/game/state.ts` (training field)
- Delete: `src/state/lab.ts`, `tests/lab_echo.test.ts` (migrate its lab asserts into training.test.ts; move the echoDps assert to tests/echo.test.ts importing `src/game/echo.ts`)
- Test: `tests/training.test.ts`, `tests/echo.test.ts`

**Interfaces:**
- Consumes: `costFor` (balance), `buyUpgrade` (panel.ts, pure — no DOM), `GameState`
- Produces: `startResearch(s, thread, skill): boolean`, `progressTraining(s, nowMs): void`, `trainingLevel(s, skill): number`, `speedUnlocked(s): 1|2|4|8`, `TRAIN_SKILLS`, `THREADS` (consumed by Task 4 harmlessly)

Constants (balance.ts): `TRAIN_TIME_BASE_S=60`, `TRAIN_TIME_GROWTH=1.6`, `TRAIN_OFFLINE_CAP_HRS=12`, `GUNNERY_PCT=0.02`, thread unlocks `THREAD_2_CMD=2, THREAD_3_CMD=4, THREAD_4_CMD=6`, gates `SPEED2_LOG=1, SPEED4_LOG=4, SPEED8_LOG=8, AUTOFORGE_ENG=4, WAVESKIP_CMD=5`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/training.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, progressTraining, trainingLevel, speedUnlocked, researchTime } from '../src/state/training.js';
describe('training', () => {
  it('research takes 60 x 1.6^level seconds', () => {
    expect(researchTime(0)).toBe(60); expect(researchTime(1)).toBe(96);
  });
  it('completes in real time and levels the skill', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    expect(startResearch(s, 't0', 'gunnery')).toBe(true);
    progressTraining(s, Date.now() + 61 * 1000);
    expect(trainingLevel(s, 'gunnery')).toBe(1);
  });
  it('one active research per thread', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    startResearch(s, 't0', 'gunnery');
    expect(startResearch(s, 't0', 'logistics')).toBe(false);
  });
  it('speed gates follow logistics', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    expect(speedUnlocked(s)).toBe(1);
    s.training.levels.logistics = 1; expect(speedUnlocked(s)).toBe(2);
    s.training.levels.logistics = 4; expect(speedUnlocked(s)).toBe(4);
    s.training.levels.logistics = 8; expect(speedUnlocked(s)).toBe(8);
  });
});
```

```ts
// tests/echo.test.ts
import { describe, it, expect } from 'vitest';
import { echoDps } from '../src/game/echo.js';
describe('echo', () => { it('pays 15% of recorded dps', () => { expect(echoDps(100)).toBe(15); }); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/training.test.ts tests/echo.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/state/training.ts
import { TRAIN_TIME_BASE_S, TRAIN_TIME_GROWTH, TRAIN_OFFLINE_CAP_HRS } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type Skill = 'gunnery' | 'logistics' | 'engineering' | 'command';
export const TRAIN_SKILLS: Skill[] = ['gunnery', 'logistics', 'engineering', 'command'];
export const THREADS = ['t0', 't1', 't2', 't3'] as const;
export type ThreadState = { skill: Skill; doneAt: number };
export function researchTime(level: number): number { return Math.round(TRAIN_TIME_BASE_S * Math.pow(TRAIN_TIME_GROWTH, level)); }
function store(s: GameState): { levels: Partial<Record<Skill, number>>; threads: Record<string, ThreadState> } {
  const t = (s as any).training ?? ((s as any).training = { levels: {}, threads: {} });
  return t;
}
function threadUnlocked(s: GameState, thread: string): boolean {
  if (thread === 't0') return true;
  const cmd = trainingLevel(s, 'command');
  const need = thread === 't1' ? 2 : thread === 't2' ? 4 : 6;
  return cmd >= need;
}
export function startResearch(s: GameState, thread: string, skill: Skill, nowMs = Date.now()): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as any) || !TRAIN_SKILLS.includes(skill)) return false;
  if (t.threads[thread] || !threadUnlocked(s, thread)) return false;
  t.threads[thread] = { skill, doneAt: nowMs + researchTime(trainingLevel(s, skill)) * 1000 };
  return true;
}
export function progressTraining(s: GameState, nowMs = Date.now()): void {
  const t = store(s);
  for (const id of Object.keys(t.threads)) {
    const r = t.threads[id];
    if (nowMs >= r.doneAt) { t.levels[r.skill] = (t.levels[r.skill] ?? 0) + 1; delete t.threads[id]; }
  }
}
export function advanceOffline(s: GameState, elapsedMs: number): void {
  progressTraining(s, Date.now() - Math.max(0, elapsedMs - TRAIN_OFFLINE_CAP_HRS * 3600e3));
}
export function trainingLevel(s: GameState, skill: Skill): number { return store(s).levels[skill] ?? 0; }
export function speedUnlocked(s: GameState): 1 | 2 | 4 | 8 {
  const l = trainingLevel(s, 'logistics');
  return l >= 8 ? 8 : l >= 4 ? 4 : l >= 1 ? 2 : 1;
}
```

Wiring: main.ts calls `progressTraining(s)` every 5s interval + on load (after hydrate, before loop); hydrate `saved.training`; persist via spread (already `{...s}`). Speed buttons: `wire('btn-speed-2', ...)` checks `speedUnlocked(s) >= 2` else flashes requirement; x8 button added to dock (`btn-speed-8`, hidden until unlocked — renderHud toggles display). Auto-forge in update.ts tick: `if ((s.timeS??0) % 1 < dt && trainingLevel(s,'engineering') >= 4) buyCheapest(s)` where `buyCheapest` tries the 8 forge stats in cost order via `buyUpgrade` (import from panel.ts — pure, no cycle: panel imports state-type + balance only). Wave-skip: menu toggle `btn-skip` visible when command>=5; launch sets `s.wave = skipOn ? 10 : 1` (fresh cycle otherwise identical to restartRun path — implement as `s.wave=10` after restartRun+applyWorkshop in the launch handler when enabled).
Academy UI: menu tab `tab-menu-academy` switching menu overlay between workshop view and academy view (`menu-view-workshop` / `menu-view-academy` divs); 4 thread cards each showing skill select (4 small buttons), active research + countdown, level. Countdown text updates in renderHud (1s granularity fine).
Gunnery effect: `applyWorkshop`-adjacent — implement `trainingMult(s) = 1 + 0.02*gunnery` applied in update.ts fire damage: `dmgEff = s.dmg * trainingMult(s)` (single place: compute at tick top, replace `s.dmg` in the three hit lines). Engineering offline: offline flux x (1+0.05*level) in save withOffline? Save is generic — apply in main.ts hydrate: `s.flux += round(offlineFlux * (1+0.05*eng))`. Keep withOffline untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/training.test.ts tests/echo.test.ts`
Expected: PASS. Full suite PASS (delete lab.ts + lab_echo.test.ts in same commit), build clean.

- [ ] **Step 5: Commit**

```bash
git add src/state/training.ts src/sim/balance.ts src/main.ts src/ui/hud.ts index.html src/game/update.ts src/game/state.ts src/state/lab.ts tests/training.test.ts tests/echo.test.ts tests/lab_echo.test.ts
git commit -m "feat: training academy with feature unlocks"
```

### Task 3: Stellar Shards + boss hook + ultimates move

**Files:**
- Modify: `src/sim/balance.ts` (SHARD_* + ULT_COST in shards), `src/game/ultimates.ts` (buyUlt/canFire in shards), `src/game/spawning.ts` + `src/game/update.ts` (dreadnought boss), `src/game/render.ts` (boss draw), `src/state/prestige.ts` + `src/game/lifecycle.ts` (collapse bonus), `src/ui/hud.ts` + `index.html` (shard pill, unlock cards in shards), `src/game/state.ts` (shards field), `scripts/sim.mjs` (boss mirror)
- Test: `tests/shards.test.ts`

**Interfaces:**
- Consumes: `costFor`, `ULT_COST` shape, `GameState`, `coresFor`
- Produces: `shardIncome` weights, boss kill → +1 shard (consumed by Task 4 assertions only)

Constants: `SHARD_W_BOSS=1, SHARD_W_COLLAPSE=1, SHARD_W_MILESTONE=0`, `BOSS_EVERY=25`, `BOSS_HP_MULT=10, BOSS_DMG_MULT=3`, `ULT_COST={nova:2,overdrive:3,aegis:5}`. `collapseShardBonus(wave)=floor(sqrt(wave)/10)` in prestige.ts, called in collapseRun AND restartRun (lifecycle imports it — prestige imports state-type only, no cycle).

- [ ] **Step 1: Write the failing test**

```ts
// tests/shards.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { buyUlt, canFire } from '../src/game/ultimates.js';
import { collapseShardBonus } from '../src/state/prestige.js';
describe('shards', () => {
  it('boss kills drop exactly 1 shard, normal kills drop 0', () => {
    const s = freshState(); s.dmg = 1000000;
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.shards ?? 0).toBe(0);
    s.ships.push({ id: 2, kind: 'hex', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0, boss: true });
    tickSim(s, 1);
    expect(s.shards ?? 0).toBe(1);
  });
  it('collapse bonus scales with wave', () => {
    expect(collapseShardBonus(49)).toBe(0);
    expect(collapseShardBonus(100)).toBe(1);
  });
  it('ultimates cost shards, not essence', () => {
    const s = freshState(); s.essence = 9999; s.shards = 0;
    expect(buyUlt(s, 'nova')).toBe(false);
    s.shards = 5;
    expect(buyUlt(s, 'nova')).toBe(true);
    expect(s.essence).toBe(9999);
  });
  it('unlocked ultimates still fire on charge', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false }; s.shards = 0; s.ultCharge = 100;
    expect(canFire(s, 'nova')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shards.test.ts`
Expected: FAIL (no boss/shards/buyUlt-in-shards).

- [ ] **Step 3: Write minimal implementation**

```ts
// balance.ts append:
export const SHARD_W_BOSS = 1; export const SHARD_W_COLLAPSE = 1; export const SHARD_W_MILESTONE = 0;
export const BOSS_EVERY = 25; export const BOSS_HP_MULT = 10; export const BOSS_DMG_MULT = 3;
export const ULT_COST = { nova: 2, overdrive: 3, aegis: 5 } as const;
// (replaces old essence ULT_COST — update ultimates.ts import source unchanged, values change)
// state.ts Ship += boss?: boolean; GameState += shards?: number; freshState += shards: 0
// spawning.ts spawnWave: if (s.wave % BOSS_EVERY === 0 && s.wave > 0) push dreadnought {kind:'hex', hp: enemyHp*10, dmg: enemyDmg*3, speed: 10, essence: 0, boss: true, behavior:'seeker', wander: 0} at angle 0 (counts OUTSIDE budget, does not consume _queue)
// update.ts kill credits: boss slain → s.shards=(s.shards??0)+SHARD_W_BOSS (all three credit sites mirror the essence pattern); nova credit loop also grants boss shards.
// render.ts: boss ships drawn scale 1.6 with gold stroke (same branch as cache, condition cache||boss).
// prestige.ts: export function collapseShardBonus(w): number { return w < 50 ? 0 : Math.floor(Math.sqrt(w) / 10); } — collapseRun += shards; lifecycle restartRun += same import.
// ultimates.ts buyUlt: currency essence → shards (s.shards). canFire/fireUlt untouched.
// hud unlock cards + topbar shard pill (id hud-shards); main hydrate saved.shards.
```

Dreadnought counts outside budget so wave-clear math is unchanged. Boss ring position: same ring math, angle 0.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shards.test.ts`
Expected: PASS. Full suite PASS, build clean. (Wall re-target: Task 4.)

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/game/ultimates.ts src/game/spawning.ts src/game/update.ts src/game/render.ts src/state/prestige.ts src/game/lifecycle.ts src/ui/hud.ts index.html src/game/state.ts scripts/sim.mjs tests/shards.test.ts
git commit -m "feat: stellar shards with boss hook, ultimates move off essence"
```

### Task 4: Balance pass — wall 40-60, grind projections, migration, README

**Files:**
- Modify: `scripts/sim.mjs` (new wall assert + academy projection), `src/state/save.ts` (v2 + legacy detect), `src/main.ts` (notice), `index.html` (notice + peak line), `src/ui/menu.ts` (peak/best callout), `src/ui/hud.ts` (only if numbers move UI), `README.md`
- Test: `tests/migration.test.ts`

**Interfaces:**
- Consumes: everything above
- Produces: green wall 40-60, v2 migration, updated README

- [ ] **Step 1: Write the failing test**

```ts
// tests/migration.test.ts
import { describe, it, expect } from 'vitest';
import { saveGame, loadGame, SAVE_KEY } from '../src/state/save.js';
function raw(): any { return JSON.parse((globalThis as any).localStorage.getItem(SAVE_KEY)); }
describe('migration', () => {
  it('v2 loads; v1 snapshot resets to fresh with legacy flag', () => {
    saveGame({ wave: 60, flux: 500, ts: Date.now(), v: 1 } as any);
    expect(loadGame()).toBeNull();
    expect(raw().v).toBe(1);
    saveGame({ wave: 60, flux: 500, ts: Date.now(), v: 2 } as any);
    expect(loadGame()).not.toBeNull();
  });
});
```

loadGame change: after parse, `if (d.v !== SAVE_VERSION) return null` (with SAVE_VERSION=2). Legacy detect: `export function hadLegacySave(): boolean { try { const r = store().getItem(SAVE_KEY); if (!r) return false; const d = JSON.parse(r); return d && typeof d === 'object' && d.v !== SAVE_VERSION; } catch { return false; } }` — backup slot: check primary only (backup mirrors primary version by construction).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/migration.test.ts`
Expected: FAIL (v1 snapshot still loads — version unchecked).

- [ ] **Step 3: Write minimal implementation**

```ts
// save.ts: SAVE_VERSION = 2; loadGame read(): after parse, if (d.v !== SAVE_VERSION) return null (before withOffline — no offline gains for legacy).
// main.ts boot: if (hadLegacySave()) show notice element (menu-notice textContent = 'Economy rebalanced — fresh start') then wipeSave() so the v1 bytes are gone and backup follows on next persist.
// menu.ts showGameOver: append peak callout — set('over-peak', ...) with `Wave ${sum.wave}` + `NEW BEST` when sum.wave > best passed in (extend signature showGameOver(sum, best) — update main.ts call sites; menu.test covers phases only, unaffected).
// index.html: menu-notice div in menu-sheet + over-peak line in over-overlay.
// sim.mjs: wall assert 40-60 zero-meta cheapest-affordable; add 30-day academy projection: simulate thread schedule (t0 always busy, costs from researchTime) printing unlock days for x2/x4/auto-forge; assert x2 day<=1, x4 day<=3 (tune TRAIN_* only if violated — enemy/forge numbers frozen after Task 1 except ±10% cost growth trims).
```

Balance loop within this task: run sim, if wall outside 40-60 trim ONLY forge growth ±0.02 or flux ±1 (document final numbers in commit). No enemy curve changes (Task 1 locked them).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/migration.test.ts`
Expected: PASS. Full suite PASS, build clean, `node scripts/sim.mjs` PASS (wall 40-60 + projection asserts).

- [ ] **Step 5: Commit**

```bash
git add src/state/save.ts src/main.ts index.html scripts/sim.mjs tests/migration.test.ts README.md src/ui/menu.ts
git commit -m "feat: v2 save migration, wall 40-60, grind docs"
```

README: Training Academy section (threads, costs, unlocks), Shards section (sources, costs), updated wall/economy numbers, v2 reset note.

## Self-Review
- Spec coverage: §3 retune → Task 1 (numbers, audit, explicit income); §4 academy → Task 2 (threads, gates, auto-forge, wave-skip, lab deletion); §5 shards → Task 3 (hooks, boss, ultimates move); §6 pacing/migration/testing → Task 4 (callout? game-over peak-wave callout — add to Task 4 hud touch: over-peak element. Include: index.html over-overlay peak line + menu.ts set. Fold into Task 4 Step 3).
- Placeholder scan: no TBD/TODO; numbers exact throughout.
- Type consistency: `Skill/ThreadState` in training.ts; `UltId` still from ULT_COST; `WaveIntel` untouched; tab catalogs gain no new ids except ultimates (already exists); `shards` optional-number pattern matches cores/essence.
