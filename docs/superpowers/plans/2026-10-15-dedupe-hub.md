# Dedupe + Menu Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 102-line catalog to one line per unique effect with lossless level migration, and rebuild the menu as a hub with hidden-until-unlocked content.

**Architecture:** Catalog shrinks in `balance.ts` (delete twin tuples); a one-time `migrateDuplicates()` folds removed ids into survivors (levels summed, capped, overflow refunded as cores) at boot; menu overlay gains home/workshop/academy views with Back navigation while locked batches/families render nothing but a single teaser line.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest.

**Spec:** user-approved dedupe proposal (chat 2026-10-15) + `docs/superpowers/specs/2026-10-15-mega-labs-implants-design.md` (§§2-3 structure, counts superseded)

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup (migration preserves all invested levels as levels-or-cores — zero loss).
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4 (+x8 unlockable).
- No copied names/text/values from The Tower or EVE. All art procedural (Canvas + inline SVG, never emoji).
- Balance lives only in `src/sim/balance.ts`.
- Canvas pooled, 300 ships @60fps target; `prefers-reduced-motion` respected.
- Touch targets ≥44px, transitions 150-300ms, contrast 4.5:1.

---

### Survivor map (verbatim — legacy id wins ties, else earliest gate)

dmgPct→gunnery; fluxPct→salvage; echoDps→remnant; maxHullPct→plating; shieldFlat→ablative; critAdd→deadeye; thorns→retribution; bossMult→tracker; essencePct→siphon; ultCharge→focus; regenFlat→nanites; regenPct→secondwind; rangeFlat→farsight; cacheLuck→sweep; ratePct→muster; offlinePct→charter; cacheQuality→assay; startFlux→vault; autoOffline→engineering; volleyEvery→barrage; critMult→executioner; splash→shrapnel; bounceEvery→ricochet; rateStep→cyclic; slow→drag; costRed→broker; speed→logistics; threads→command; researchDisc→thrift; spawnGap→riftwise; surgeLuck→surge; heraldLuck→herald; shieldPct→stabilizer.
Result: 33 lines. Survivor keeps its numbers/cap/gate exactly; removed ids disappear from catalog, UI, and picker.

### Task 1: Catalog collapse + lossless migration

**Files:**
- Modify: `src/sim/balance.ts` (delete 69 twin tuples), `src/state/training.ts` (migrateDuplicates + survivor folds), `src/main.ts` (run migration at boot before hydrate), `tests/megacatalog.test.ts` + `tests/labs.test.ts` + `tests/labslots.test.ts` + `tests/labgates.test.ts` (update counts/gates to 33-line reality)
- Test: `tests/dedupe.test.ts`

**Interfaces:**
- Consumes: RESEARCH_LINES, store pattern
- Produces: `migrateDuplicates(s): {moved: number, refunded: number}` (consumed by Task 3 hub stats only for a "recovered" toast — optional, skip if costly; drop it: no consumer. Migration is silent.)

Migration semantics: for each removed id with level L>0: `room = survivor.max - survivor.level; take = min(room, L); survivor.level += take; cores += (L - take)` (1 core per overflow level). Runs once at boot (guard flag `s._deduped`). Old banked/auto/history entries referencing removed ids: remap to survivor (bank/auto) or drop with no loss (history entries keep text as-is — history stores line name strings? If it stores ids, remap; if names, untouched. Implementer reads code first.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/dedupe.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { RESEARCH_LINES, migrateDuplicates } from '../src/state/training.js';
describe('dedupe', () => {
  it('exactly one line per effect', () => {
    const seen = new Map<string, string>();
    for (const [id, l] of Object.entries(RESEARCH_LINES) as any) {
      expect(seen.has(l.effect)).toBe(false);
      seen.set(l.effect, id);
    }
  });
  it('removed twin levels fold into survivor, overflow refunds cores', () => {
    const s = freshState() as any;
    s.training = { levels: { muzzle: 8, gunnery: 48 }, threads: {}, bank: {}, auto: {}, history: [] };
    s.cores = 0;
    const r = migrateDuplicates(s);
    expect(s.training.levels.gunnery).toBe(50);
    expect(s.cores).toBe(6);
    expect(s.training.levels.muzzle ?? 0).toBe(0);
    expect(r.moved).toBe(2 + 6);
  });
  it('migration is idempotent', () => {
    const s = freshState() as any;
    s.training = { levels: { muzzle: 8 }, threads: {}, bank: {}, auto: {}, history: [] };
    s.cores = 0;
    migrateDuplicates(s);
    const cores = s.cores;
    migrateDuplicates(s);
    expect(s.cores).toBe(cores);
  });
});
```

(Survivor gunnery max 50 assumed from current catalog — implementer verifies against live values and adjusts the test numbers to match, keeping the shape.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dedupe.test.ts`
Expected: FAIL (duplicate effects present; no migrateDuplicates).

- [ ] **Step 3: Write minimal implementation**

Delete the 69 twin tuples per survivor map. Wire migration at boot before hydrate. Update the 4 existing test files to 33-line reality (counts, gates, removed ids). Keep `FAMILIES` order/gates; families keep all their survivors (some families shrink — fine).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dedupe.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/state/training.ts src/main.ts tests/dedupe.test.ts tests/megacatalog.test.ts tests/labs.test.ts tests/labslots.test.ts tests/labgates.test.ts
git commit -m "feat: collapse catalog to one line per effect with migration"
```

### Task 2: Menu hub with hidden locks

**Files:**
- Modify: `index.html` (hub views), `src/ui/menu.ts` (view state), `src/ui/hud.ts` (render per view, hidden-until-unlocked + teaser), `src/main.ts` (nav wires), `src/style.css` (hub styles), `src/ui/tabs.ts` (delete batch tabs, render unlocked batches inline)
- Test: `tests/menuhub.test.ts`

**Interfaces:**
- Consumes: menu phase store, familyUnlocked, wsBatchUnlocked, lifetimeCores
- Produces: `menuView: 'home'|'workshop'|'academy'`, `setMenuView` (DOM-free, tested)

Hub: home view = Launch CTA + best stats + nav cards (Workshop with invested progress, Laboratory with active-research count, Wipe). Workshop view = unlocked batches rendered together (no batch tab buttons) + ONE teaser line for next batch ("Invest 68/100 core-equiv to unlock more"). Academy view = unlocked families rendered together + ONE teaser ("Best 42/60 for Sensors"). Locked content renders nothing. Back buttons return home. Existing tab infra for forge (in-run) stays untouched.

- [ ] **Step 1: Write the failing test**

```ts
// tests/menuhub.test.ts
import { describe, it, expect } from 'vitest';
import { menuView, setMenuView } from '../src/ui/menu.js';
describe('menu hub', () => {
  it('navigates home/workshop/academy and rejects unknown', () => {
    setMenuView('workshop'); expect(menuView()).toBe('workshop');
    setMenuView('academy'); expect(menuView()).toBe('academy');
    setMenuView('nope' as any); expect(menuView()).toBe('academy');
    setMenuView('home'); expect(menuView()).toBe('home');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menuhub.test.ts`
Expected: FAIL (no menuView).

- [ ] **Step 3: Write minimal implementation**

menu.ts gains view store (default home). hud render branches per view; hidden-until-unlocked: skip locked families/batches entirely, append single teaser line. Delete WS batch tab buttons + `tab-ws-*` wires (keep FORGE_CATS in-run tabs). CSS: hub cards, back row, teaser line style. All buttons 44px.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/menuhub.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS. Verify index.html UTF-8 no BOM (Python byte-safe I/O only).

- [ ] **Step 5: Commit**

```bash
git add index.html src/ui/menu.ts src/ui/hud.ts src/main.ts src/style.css src/ui/tabs.ts tests/menuhub.test.ts tests/tabs.test.ts
git commit -m "feat: menu hub with hidden-until-unlocked content"
```

### Task 3: README + counts + final numbers

**Files:**
- Modify: `README.md`, `src/sim/balance.ts` (only if sim drifts), `scripts/sim.mjs` (only if asserts reference counts)
- Test: none new (full suite is the gate)

- [ ] **Step 1: Update README (33-line catalog, hub nav, migration note, unlock rules) and fix any count asserts (sim notes, hud labels) to 33-line reality**
- [ ] **Step 2: Run full verification**

Run: `npx vitest run` (PASS), `npm run build` (clean), `node scripts/sim.mjs` (PASS 40-60)
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add README.md src/sim/balance.ts scripts/sim.mjs src/ui/hud.ts index.html
git commit -m "docs: dedupe README and count asserts"
```

## Self-Review
- Spec coverage: dedupe + migration → Task 1; hub + hidden locks + batch-button deletion → Task 2; docs/counts → Task 3.
- Placeholder scan: no TBD/TODO; survivor map verbatim; migration math exact.
- Type consistency: menuView store mirrors phase store pattern; batch helpers reused; LineId union shrinks (tests updated same commits).
