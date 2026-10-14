# Reset + Intel + Tabs + Ultimates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can wipe their save clean, see what each wave throws at them, switch upgrade categories via tabs, and charge + fire three ultimate weapons.

**Architecture:** Pure sim/data functions stay DOM-free (`wipeSave`, `waveIntel`, tab catalog, ultimate math in `src/game/` + `src/state/`); tab switching is a tiny DOM-free store in `src/ui/tabs.ts` rendered by existing `renderHud`; ultimates ride the tick (`charge` on kills, timed `odUntil`/`aegisUntil` windows) with buttons in the dock. Save key and tick contract unchanged.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-echo-spire-design.md` (§2 loop/death, §3.2 Hangar, §5 UI)

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup (wipe is explicit user action with two-step confirm — the only sanctioned delete).
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4.
- No copied assets/names/numbers from The Tower. All art procedural (Canvas + inline SVG, never emoji).
- Balance lives only in `src/sim/balance.ts` (new ultimate numbers go there too).
- Canvas pooled, 300 ships @60fps target; `prefers-reduced-motion` respected.
- Touch targets ≥44px, transitions 150-300ms, contrast 4.5:1.

---

### Task 1: Wipe all data — clean slate with two-step confirm

**Files:**
- Modify: `src/state/save.ts:25-38`, `index.html` (menu footer), `src/main.ts:51-55`
- Test: `tests/wipe.test.ts`

**Interfaces:**
- Consumes: `SAVE_KEY` (save.ts:5), store abstraction (save.ts:27)
- Produces: `wipeSave(): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/wipe.test.ts
import { describe, it, expect } from 'vitest';
import { saveGame, loadGame, wipeSave } from '../src/state/save.js';
describe('wipe', () => {
  it('removes primary, backup, and memory so load returns null', () => {
    saveGame({ wave: 60, flux: 500, ts: Date.now(), v: 1 } as any);
    expect(loadGame()).not.toBeNull();
    wipeSave();
    expect(loadGame()).toBeNull();
  });
  it('fresh state after wipe starts at wave 1 with zero meta', async () => {
    const { freshState } = await import('../src/game/state.js');
    wipeSave();
    const s = freshState();
    expect(s.wave).toBe(1); expect(s.cores ?? 0).toBe(0); expect(s.essence).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wipe.test.ts`
Expected: FAIL with "wipeSave is not a function" (or not exported).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/state/save.ts — extend store() with removeItem, then:
function remove(key: string): void { try { store().removeItem(key); } catch { /* never throw */ } }
export function wipeSave(): void {
  remove(SAVE_KEY); remove(SAVE_KEY + '.bak');
  try { mem.clear(); } catch { /* never throw */ }
}
```

store() needs `removeItem` on its interface + both branches (localStorage passthrough + `mem.delete`). Keep `saveGame`/`loadGame` byte-identical otherwise.

```html
<!-- index.html menu-sheet footer (keep all existing ids): -->
<div class="menu-danger"><button id="btn-wipe">Wipe all data</button></div>
```

```ts
// src/main.ts — two-step confirm, then reload to a clean boot:
wire('btn-wipe', () => {
  const b = document.getElementById('btn-wipe');
  if (b && b.dataset.armed === '1') { wipeSave(); location.reload(); return; }
  if (b) {
    b.dataset.armed = '1'; const t = b.textContent; b.textContent = 'Sure? Click again to erase everything';
    setTimeout(() => { b.dataset.armed = ''; if (t) b.textContent = t; }, 3000);
  }
});
```

`location.reload()` is the clean reset: fresh module state + menu boot, no stale queues. Guard `typeof location !== 'undefined'` for headless safety (test never clicks).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wipe.test.ts`
Expected: PASS. Then full `npx vitest run` PASS, `npm run build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/state/save.ts index.html src/main.ts tests/wipe.test.ts
git commit -m "feat: wipe-all-data with two-step confirm"
```

### Task 2: Enemy intel — wave HP / damage readout

**Files:**
- Modify: `src/game/spawning.ts:1-12`, `src/ui/hud.ts:11-43`, `index.html` (topbar), `src/style.css`
- Test: `tests/intel.test.ts`

**Interfaces:**
- Consumes: `enemyHp/enemyDmg` (balance.ts:14-15)
- Produces: `waveIntel(wave): {count, hp, dmg, speed}`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intel.test.ts
import { describe, it, expect } from 'vitest';
import { waveIntel } from '../src/game/spawning.js';
import { enemyHp, enemyDmg } from '../src/sim/balance.js';
describe('intel', () => {
  it('reports count, hp, dmg, speed for a wave', () => {
    const w = waveIntel(10);
    expect(w.count).toBe(4 + Math.floor(10 * 0.7));
    expect(w.hp).toBe(enemyHp(10));
    expect(w.dmg).toBe(enemyDmg(10));
    expect(w.speed).toBeGreaterThan(22);
  });
  it('wave 1 is weaker than wave 50', () => {
    expect(waveIntel(50).hp).toBeGreaterThan(waveIntel(1).hp);
    expect(waveIntel(50).count).toBeGreaterThan(waveIntel(1).count);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intel.test.ts`
Expected: FAIL with "waveIntel is not a function" (or not exported).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/spawning.ts — append (keep spawnWave byte-identical):
export type WaveIntel = { count: number; hp: number; dmg: number; speed: number };
export function waveIntel(wave: number): WaveIntel {
  return { count: 4 + Math.floor(wave * 0.7), hp: enemyHp(wave), dmg: enemyDmg(wave), speed: 22 + wave * 0.4 };
}
```

```html
<!-- index.html topbar: append (keep existing ids) -->
<span class="pill">Wave intel <b id="hud-intel">-</b></span>
```

```ts
// src/ui/hud.ts renderHud — append before renderAugmentModal(s):
{
  const w = waveIntel(s.wave);
  txt('hud-intel', `${w.count} ships • ${w.hp} HP • ${w.dmg} dmg`);
}
```

Import `waveIntel` from `../game/spawning.js`. Format HP compact for late waves (`1.2K` when ≥10000: `w.hp>=10000 ? (w.hp/1000).toFixed(1)+'K' : String(w.hp)`). Style: reuse `#topbar .pill` (exists). On small screens the topbar wraps — acceptable, no new CSS required beyond existing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intel.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS (untouched).

- [ ] **Step 5: Commit**

```bash
git add src/game/spawning.ts src/ui/hud.ts index.html tests/intel.test.ts
git commit -m "feat: enemy wave intel readout"
```

### Task 3: Category tabs for Forge and Workshop

**Files:**
- Create: `src/ui/tabs.ts`
- Modify: `index.html` (tab bars), `src/ui/hud.ts`, `src/main.ts:29-38`, `src/style.css`
- Test: `tests/tabs.test.ts`

**Interfaces:**
- Consumes: `Stat` (panel.ts), `WorkshopStat` (workshop.ts)
- Produces: `FORGE_CATS`, `WS_CATS: {id, label, stats[]}[]`, `getForgeTab/setForgeTab`, `getWsTab/setWsTab`

Catalog (every track in exactly one tab):
- Forge Weapons: dmg, rate, crit, volley, bounce. Forge Hull: maxHull, regen. Forge Systems: range.
- Workshop Offense: dmg, rate, crit, volley, bounce. Workshop Defense: maxHull, bulkhead, regen. Workshop Systems: range, scope, essence, startFlux. (Ultimates tab lands in Task 4.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/tabs.test.ts
import { describe, it, expect } from 'vitest';
import { FORGE_CATS, WS_CATS, getForgeTab, setForgeTab, getWsTab, setWsTab } from '../src/ui/tabs.js';
import type { Stat } from '../src/ui/panel.js';
import { WORKSHOP_STATS } from '../src/state/workshop.js';
describe('tabs', () => {
  it('every forge stat is in exactly one tab', () => {
    const all: Stat[] = ['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
    for (const st of all) {
      const hits = FORGE_CATS.filter(c => (c.stats as readonly string[]).includes(st));
      expect(hits.length).toBe(1);
    }
  });
  it('every workshop track is in exactly one tab', () => {
    for (const st of WORKSHOP_STATS) {
      const hits = WS_CATS.filter(c => (c.stats as readonly string[]).includes(st as string));
      expect(hits.length).toBe(1);
    }
  });
  it('tab store round-trips and rejects unknown ids', () => {
    setForgeTab('hull'); expect(getForgeTab()).toBe('hull');
    setForgeTab('nope'); expect(getForgeTab()).toBe('hull');
    setWsTab('systems'); expect(getWsTab()).toBe('systems');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tabs.test.ts`
Expected: FAIL with "Cannot find module '../src/ui/tabs.js'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/tabs.ts — DOM-free store + catalog (guards for headless rendering live in hud.ts):
import type { Stat } from './panel.js';
export type TabCat = { id: string; label: string; stats: readonly string[] };
export const FORGE_CATS: TabCat[] = [
  { id: 'weapons', label: 'Weapons', stats: ['dmg', 'rate', 'crit', 'volley', 'bounce'] },
  { id: 'hull', label: 'Hull', stats: ['maxHull', 'regen'] },
  { id: 'systems', label: 'Systems', stats: ['range'] },
];
export const WS_CATS: TabCat[] = [
  { id: 'offense', label: 'Offense', stats: ['dmg', 'rate', 'crit', 'volley', 'bounce'] },
  { id: 'defense', label: 'Defense', stats: ['maxHull', 'bulkhead', 'regen'] },
  { id: 'systems', label: 'Systems', stats: ['range', 'scope', 'essence', 'startFlux'] },
];
let forgeTab = 'weapons', wsTab = 'offense';
const valid = (cats: TabCat[], id: string): boolean => cats.some(c => c.id === id);
export function getForgeTab(): string { return forgeTab; }
export function setForgeTab(id: string): void { if (valid(FORGE_CATS, id)) forgeTab = id; }
export function getWsTab(): string { return wsTab; }
export function setWsTab(id: string): void { if (valid(WS_CATS, id)) wsTab = id; }
```

Markup: replace the flat `#side` forge list with `<div class="tabbar" id="forge-tabs">` (3 buttons `tab-forge-weapons/hull/systems`) + cards keep ids, each card gets `data-fcat="weapons|hull|systems"`. Workshop: same with `tab-ws-offense/defense/systems` + `data-wscat`, replacing the `<h2 class="ws-cat">` headers (keep headers as fallback? No — remove headers, tabs replace them; keep `.ws-cat` CSS unused or delete). hud.ts render: after writing card texts, toggle `card.style.display` by active tab for both panels. main.ts: wire 6 tab buttons → setter + renderHud. CSS: `.tabbar{display:flex;gap:6px;position:sticky;top:0;background:#05070f;padding:8px 0;z-index:3}` + `.tabbar button{flex:1;min-height:44px;...}` mirror dock style + `.tabbar button.on` neon gradient (reuse pattern). Menu workshop tabbar sticks below `.menu-sticky` (top offset = sticky header height ~76px; use `top:84px`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tabs.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tabs.ts index.html src/ui/hud.ts src/main.ts src/style.css tests/tabs.test.ts
git commit -m "feat: category tabs for forge and workshop"
```

### Task 4: Ultimate weapons — charge, unlock, fire

**Files:**
- Create: `src/game/ultimates.ts`
- Modify: `src/sim/balance.ts`, `src/game/state.ts`, `src/game/update.ts`, `src/ui/tabs.ts`, `src/ui/hud.ts`, `index.html`, `src/main.ts`, `src/style.css`, `README.md`
- Test: `tests/ultimates.test.ts`

**Interfaces:**
- Consumes: `costFor` (balance.ts), `GameState`, `setWsTab` catalog (tabs.ts)
- Produces: `ULTS`, `ultChargeForKill(s, essence): void`, `canFire(s, id): boolean`, `fireUlt(s, id): boolean`

Design (locked): charge meter 0-100, +2 per kill, +10 per Cache kill. Unlock each ultimate once in the new Workshop Ultimates tab for essence (Nova 20, Overdrive 35, Aegis 50). Fire buttons live in the dock, enabled only at full charge + unlocked.
- Nova Burst: deals 10x current `dmg` to every ship on screen (fx spark each).
- Overdrive: 8s window (`odUntil` on `timeS` clock) with `rate x3`.
- Aegis: 12s window (`aegisUntil`) with zero hull damage.
State: `ultCharge:number` (fresh 0, kept across restart? No — reset per run like flux), `ult:{nova:boolean;overdrive:boolean;aegis:boolean}` unlocks (persisted in save via spread — add to SaveData? Save uses `{...s}` spread so it persists automatically; hydrate in main.ts alongside workshop). `odUntil:number; aegisUntil:number` (fresh 0).

- [ ] **Step 1: Write the failing test**

```ts
// tests/ultimates.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { ultChargeForKill, canFire, fireUlt, ULT_COST } from '../src/game/ultimates.js';
describe('ultimates', () => {
  it('charge builds per kill and gates firing', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false };
    expect(canFire(s, 'nova')).toBe(false);
    for (let i = 0; i < 50; i++) ultChargeForKill(s, false);
    expect(s.ultCharge).toBe(100);
    expect(canFire(s, 'nova')).toBe(true);
    expect(canFire(s, 'overdrive')).toBe(false);
  });
  it('nova clears the screen for 10x damage', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false };
    s.dmg = 10;
    s.ships.push({ id: 1, kind: 'dart', x: 100, y: 100, hp: 90, dmg: 0, speed: 0, essence: 0 });
    s.ultCharge = 100;
    expect(fireUlt(s, 'nova')).toBe(true);
    expect(s.ships.length).toBe(0);
    expect(s.ultCharge).toBe(0);
  });
  it('overdrive triples rate for 8s and aegis blocks hull damage', () => {
    const s = freshState();
    s.ult = { nova: false, overdrive: true, aegis: true };
    s.ultCharge = 100;
    expect(fireUlt(s, 'overdrive')).toBe(true);
    expect(s.odUntil).toBeGreaterThan(s.timeS ?? 0);
    s.ultCharge = 100;
    fireUlt(s, 'aegis');
    s.hull = 100; s.maxHull = 500;
    s.ships.push({ id: 2, kind: 'dart', x: 280, y: 275, hp: 10000, dmg: 50, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.hull).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ultimates.test.ts`
Expected: FAIL with "Cannot find module '../src/game/ultimates.js'".

- [ ] **Step 3: Write minimal implementation**

```ts
// balance.ts — append:
export const ULT_CHARGE_PER_KILL = 2;
export const ULT_CHARGE_PER_CACHE = 10;
export const ULT_CHARGE_MAX = 100;
export const ULT_COST = { nova: 20, overdrive: 35, aegis: 50 } as const;
export type UltId = keyof typeof ULT_COST;
export const ULT_NOVA_MULT = 10;
export const ULT_OD_MULT = 3;
export const ULT_OD_SECS = 8;
export const ULT_AEGIS_SECS = 12;
```

```ts
// src/game/ultimates.ts
import { ULT_CHARGE_PER_KILL, ULT_CHARGE_PER_CACHE, ULT_CHARGE_MAX, ULT_COST, ULT_NOVA_MULT, ULT_OD_MULT, ULT_OD_SECS, ULT_AEGIS_SECS, type UltId } from '../sim/balance.js';
import type { GameState } from './state.js';
export type { UltId };
export const ULTS: UltId[] = ['nova', 'overdrive', 'aegis'];
export function ultChargeForKill(s: GameState, cache: boolean): void {
  s.ultCharge = Math.min(ULT_CHARGE_MAX, (s.ultCharge ?? 0) + (cache ? ULT_CHARGE_PER_CACHE : ULT_CHARGE_PER_KILL));
}
export function canFire(s: GameState, id: UltId): boolean {
  return !!s.ult?.[id] && (s.ultCharge ?? 0) >= ULT_CHARGE_MAX && !isDeadLike(s);
}
function isDeadLike(s: GameState): boolean { return s.hull <= 0; }
export function fireUlt(s: GameState, id: UltId): boolean {
  if (!canFire(s, id)) return false;
  s.ultCharge = 0;
  if (id === 'nova') {
    const hit = s.dmg * ULT_NOVA_MULT;
    for (const sh of s.ships) { sh.hp -= hit; s.fx = [...(s.fx ?? []), { kind: 'spark', x: 280, y: 280, tx: sh.x, ty: sh.y, ttl: 0.3 }]; }
    s.ships = s.ships.filter(x => x.hp > 0);
    creditNovaKills(s);
  } else if (id === 'overdrive') { s.odUntil = (s.timeS ?? 0) + ULT_OD_SECS; }
  else { s.aegisUntil = (s.timeS ?? 0) + ULT_AEGIS_SECS; }
  return true;
}
function creditNovaKills(s: GameState): void { /* kills/flux for nova slain ship count delta handled by caller */ }
```

Kill crediting: nova kills should grant flux/kills/essence like normal kills. Implement inside fireUlt: before filtering, collect slain (`hp<=0` after hit), then for each apply the same credit block as update.ts ranged kills (`flux+=6+wave`, kills++, essence+mult). Write it inline (duplicate the 3 lines — sim-exempt path, no mirror needed) rather than an empty helper. (Plan shows the helper shape; implement the crediting inline and delete `creditNovaKills` to avoid dead code.)

```ts
// state.ts += ultCharge:number; ult:{nova:boolean;overdrive:boolean;aegis:boolean}; odUntil:number; aegisUntil:number;
// freshState += ultCharge:0, ult:{nova:false,overdrive:false,aegis:false}, odUntil:0, aegisUntil:0
// update.ts: (a) all three kill-credit sites call ultChargeForKill(s, !!cache); (b) effective rate = s.rate * (timeS<odUntil ? 3 : 1) — compute once at tick top: const rate = s.rate * ((s.timeS ?? 0) < (s.odUntil ?? 0) ? ULT_OD_MULT : 1); use rate in shots accumulator; (c) hull damage line guarded: if ((s.timeS ?? 0) >= (s.aegisUntil ?? 0)) s.hull -= ...;
// tabs.ts WS_CATS += { id:'ultimates', label:'Ultimates', stats:[] } + export const ULT_CATS... simpler: WS_CATS push ultimates with stats:[] and hud renders unlock cards from ULTS (not WORKSHOP_STATS).
// hud.ts: workshop loop skips ultimates tab content; separate renderUltCards(s): for each ULTS show unlock state (owned vs cost essence button id btn-ult-nova...) + dock charge bar (ult-charge-fill width %) + fire buttons (btn-fire-nova/overdrive/aegis, disabled unless canFire).
// main.ts: wire 3 unlock buttons (spend essence via buyUlt(s,id) in ultimates.ts: checks essence>=ULT_COST, deducts, sets ult[id]=true, persists) + 3 fire buttons (fireUlt + renderHud). Dock charge bar element ult-charge.
// index.html: dock += <div id="ult-bar"><div id="ult-charge-fill"></div></div> + 3 fire buttons; workshop menu += Ultimates tab button + section with 3 unlock cards.
// style.css: .ult-fire styles + charge bar (reuse neon tokens, 44px).
// README.md: Ultimates section (charge, costs, effects).
```

`buyUlt` (add to ultimates.ts): `export function buyUlt(s, id): boolean { if (s.ult?.[id]) return false; const c = ULT_COST[id]; if ((s.essence ?? 0) < c) return false; s.essence -= c; s.ult = {...}; s.ult[id] = true; return true; }`. Main.ts hydrate: read `saved.ult` object + `saved.ultCharge`? Charge resets per run — do NOT hydrate charge (fresh 0), DO hydrate unlocks. restartRun: keep `ult` unlocks, reset charge/windows (add to fresh object; lifecycle.ts is prior-plan file — Task 4 may touch it; additive fields only).

sim.mjs: ultimates excluded — no mirror (document in header one-liner). Wall unaffected (policy never fires).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ultimates.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS (untouched paths).

- [ ] **Step 5: Commit**

```bash
git add src/game/ultimates.ts src/sim/balance.ts src/game/state.ts src/game/update.ts src/ui/tabs.ts src/ui/hud.ts index.html src/main.ts src/style.css tests/ultimates.test.ts README.md
git commit -m "feat: ultimate weapons with charge meter and essence unlocks"
```

## Self-Review
- Spec coverage: wipe (fail-safe ownership) → Task 1; intel (§2 readability) → Task 2; tabs (§5 UI density) → Task 3 (every old+new track covered, ultimates tab reserved); ultimates (new §3.5-adjacent power fantasy) → Task 4.
- Placeholder scan: no TBD/TODO; numbers exact (costs 20/35/50, +2/+10 charge, 10x/3x/8s/12s, 44px).
- Type consistency: `UltId` single-sourced from balance.ts `ULT_COST`; `RunSummary` untouched; tab catalogs reference `Stat`/`WorkshopStat` unions; `ult` object shape shared by state/ultimates/hud/main.
