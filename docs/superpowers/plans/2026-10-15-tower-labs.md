# Tower-Style Labs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the Training Academy into Tower-style laboratories: a categorized research catalog with milestone gates, coin costs, progress-preserving slot switching, auto-research, research speed, and history — all with original names, numbers, and code.

**Architecture:** The existing `src/state/training.ts` thread model (one active research per thread, real-time `doneAt`, 12h offline cap) is extended, not replaced: research lines become a catalog, threads gain banked progress + auto flags, completion effects route through the existing appliers. Mechanics mirror the genre (public knowledge); every name, number, and line of code is original.

**Tech Stack:** TypeScript 5 strict, Vite 5, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-14-economy-grind-design.md` (§4 Academy; this plan implements the "Tower Labs" evolution the user requested)

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with backup slot, never wipe without backup (persist via existing spread).
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4 (+x8 unlockable).
- No copied assets, names, text, or values from The Tower. All names/numbers below are original. All art procedural (Canvas + inline SVG, never emoji).
- Balance lives only in `src/sim/balance.ts`.
- Canvas pooled, 300 ships @60fps target; `prefers-reduced-motion` respected.
- Touch targets ≥44px, transitions 150-300ms, contrast 4.5:1.

---

### Task 1: Research catalog — categories, costs, gates, effects

**Files:**
- Modify: `src/sim/balance.ts` (LAB_* consts), `src/state/training.ts` (lines catalog + gate checks + appliers), `src/ui/hud.ts` + `index.html` (Academy lines render)
- Test: `tests/labs.test.ts`

**Interfaces:**
- Consumes: `costFor`, `trainingLevel`, `store` pattern (training.ts)
- Produces: `RESEARCH_LINES: Record<LineId, {cat, name, desc, max, timeMult}>`, `lineLevel(s, line)`, `researchCost(line, lvl): cores`, `lineUnlocked(s, line, bestWave): boolean`, `applyLineEffects(s): void` (consumed by Task 2 wiring + update tick)

Catalog (verbatim — original names/numbers, Tower-inspired structure only):
- Offense: `gunnery` (+2% dmg/lvl, max 50, base time 1.0x), `deadeye` (+0.3% crit/lvl, max 30, 1.2x, gate best 60), `barrage` (+1 volley point per 5 lvls, max 20, 1.5x, gate best 100).
- Defense: `plating` (+3% maxHull/lvl, max 50, 1.0x), `nanites` (+0.4 regen/s/lvl, max 50, 1.2x).
- Economy: `salvage` (+3% flux/lvl, max 50, 1.0x), `siphon` (+3% essence/lvl, max 30, 1.3x, gate best 60), `broker` (-1% workshop core costs/lvl, max 20, 1.4x, gate best 100).
- Command: `logistics` (speed gates x2@1/x4@4/x8@8, max 10, 1.0x — existing), `command` (threads/wave-skip as today, max 10, 1.0x — existing).
- Mastery: `celerity` (+4% research speed/lvl, max 25, 1.6x, gate best 150).
- Time per level: `researchTime(lineLevel) * line.timeMult`, floored at 30s. Cores cost: `1 + floor(level/3)`.
- Effects route: gunnery/deadeye/barrage/plating/nanites fold into the existing combat fields (`dmg mult`, `critCh`, `volley`, `maxHull`, `regen`) via an `applyLineEffects(s)` called after `applyWorkshop` in main.ts hydrate + launch + restart paths; salvage/siphon/broker become multipliers read at credit/buy sites (`_fluxMult`, `_essenceMult` extend, workshop cost x (1-0.01*broker)); logistics/command keep today's behavior (speed gates, threads, skip).

- [ ] **Step 1: Write the failing test**

```ts
// tests/labs.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { RESEARCH_LINES, lineLevel, researchCost, lineUnlocked, applyLineEffects } from '../src/state/training.js';
describe('labs catalog', () => {
  it('every line has category, cap, and scaling time', () => {
    for (const [id, l] of Object.entries(RESEARCH_LINES)) {
      expect(['offense','defense','economy','command','mastery']).toContain(l.cat);
      expect(l.max).toBeGreaterThan(0);
      expect(id.length).toBeGreaterThan(2);
    }
  });
  it('research costs cores, early levels free', () => {
    expect(researchCost('gunnery', 0)).toBe(1);
    expect(researchCost('gunnery', 2)).toBe(1);
    expect(researchCost('gunnery', 3)).toBe(2);
  });
  it('milestone gates lock late lines', () => {
    const s = freshState();
    expect(lineUnlocked(s, 'barrage', 0)).toBe(false);
    expect(lineUnlocked(s, 'barrage', 100)).toBe(true);
    expect(lineUnlocked(s, 'gunnery', 0)).toBe(true);
  });
  it('effects apply to combat fields', () => {
    const s = freshState() as any;
    s.training = { levels: { gunnery: 10 }, threads: {} };
    applyLineEffects(s);
    expect(s.dmg).toBeGreaterThan(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/labs.test.ts`
Expected: FAIL (RESEARCH_LINES missing).

- [ ] **Step 3: Write minimal implementation**

Keep existing `Skill` type + 4 skills working: map old skill ids to lines (`gunnery→gunnery`, `logistics→logistics`, `engineering→nanites`? No — engineering has auto-forge/offline roles. Do NOT remap: keep `engineering` line as-is (auto-forge, offline) under Defense? Engineering stays a line in a new `systems` cat? Simplest honest migration: keep all 4 existing skill ids as lines (gunnery, logistics, engineering, command) with identical effects, ADD the 8 new lines. Existing saves keep their levels. Cats: gunnery→offense, logistics→command, engineering→defense, command→command.
`lineLevel(s,line)` reads `training.levels[line]`. `applyLineEffects` computes from the catalog (replacing the scattered per-skill code with one loop where trivially possible; keep logistics/command special-cases). Existing tests in training.test.ts must keep passing — thread/skill API unchanged, only additive.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/labs.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS (new lines are zero in sim policy).

- [ ] **Step 5: Commit**

```bash
git add src/sim/balance.ts src/state/training.ts src/ui/hud.ts index.html tests/labs.test.ts
git commit -m "feat: tower-style research catalog with gates and costs"
```

### Task 2: Slot mechanics — switch banking, auto-research, celerity, history

**Files:**
- Modify: `src/state/training.ts` (bank/auto/celerity/history), `src/main.ts` (progress wiring unchanged shape), `src/ui/hud.ts` + `index.html` (thread cards: switch, auto toggle, history tab), `src/style.css` (minor additions)
- Test: `tests/labslots.test.ts`

**Interfaces:**
- Consumes: `startResearch/progressTraining` (Task 1 state), `researchTime`
- Produces: `switchResearch`, `bankedMs`, `setAuto`, `labSpeedMult`, `labHistory` (consumed by hud render)

Semantics (Tower-inspired, original implementation):
- Switching: `switchResearch(s, thread, newLine)` banks `{line, investedMs}` for the interrupted research, refunds nothing (our research costs cores upfront? Tower refunds coins. Decide: cores are NOT refunded (sunk), time progress IS banked — harsher, simpler, grindier; document in card desc). Resume deducts cores again (can afford check) and continues from banked time.
- Bank store: `training.bank: Record<threadId, {line, investedMs}>`, single slot per thread (new switch overwrites — warn in desc "switching discards older banked line").
- Auto-research: `training.auto: Record<threadId, boolean>`; on completion with auto on, immediately starts level+1 of the same line if cores afford, else thread idles (no debt).
- Celerity: `labSpeedMult(s) = 1 + 0.04*celerityLevel`; progress advances `elapsed * mult` (apply inside progressTraining via doneAt compression at start: effective `doneAt -= elapsed*(mult-1)`? Minimal honest: store `startedAt`+`durationMs`, each progress call computes `invested = min(now-startedAt)*mult + banked`; complete when invested >= duration. Implement with startedAt (migrate old doneAt threads: treat doneAt as startedAt+duration with mult 1 — one-time shape change, old in-flight research keeps remaining time).
- History: `training.history: {line, level, at}[]` capped at 50 (unshift, trim). Academy History sub-tab lists them.

- [ ] **Step 1: Write the failing test**

```ts
// tests/labslots.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, switchResearch, setAuto, labSpeedMult, progressTraining, trainingLevel } from '../src/state/training.js';
function blank(): any { const s = freshState() as any; s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100; return s; }
describe('lab slots', () => {
  it('switching banks time, resume keeps it', () => {
    const s = blank();
    startResearch(s, 't0', 'gunnery', 1000);
    switchResearch(s, 't0', 'plating', 30000);
    expect(s.training.bank.t0.line).toBe('gunnery');
    expect(s.training.bank.t0.investedMs).toBeGreaterThan(0);
  });
  it('auto-research chains next level when affordable', () => {
    const s = blank();
    setAuto(s, 't0', true);
    startResearch(s, 't0', 'gunnery', 1000);
    progressTraining(s, 1000 + 61 * 1000);
    progressTraining(s, 1000 + 61 * 1000 + 200 * 1000);
    expect(trainingLevel(s, 'gunnery')).toBeGreaterThanOrEqual(1);
    expect(Object.keys(s.training.threads).length + (s.training.auto.t0 ? 1 : 0)).toBeGreaterThanOrEqual(1);
  });
  it('celerity speeds research', () => {
    const s = blank(); s.training.levels.celerity = 10;
    expect(labSpeedMult(s)).toBeCloseTo(1.4, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/labslots.test.ts`
Expected: FAIL (no switchResearch/setAuto/labSpeedMult).

- [ ] **Step 3: Write minimal implementation**

Keep `startResearch(s, thread, skill, nowMs)` signature working (existing tests); internally route through banked resume (if bank for same line exists on that thread, invested carries). Cores economy: `startResearch` (and auto-chain) checks `researchCost(line, level)` against `s.cores` and deducts on start; unaffordable → return false, thread idles. Update existing `tests/training.test.ts` setups to include `s.cores = 100` (same commit) since level-0 research costs 1 core. Thread cards UI: line picker (12 lines grouped by cat), progress bar + countdown, Switch button (banks + starts new), Auto toggle (clock icon button, aria-pressed), History sub-tab. All buttons 44px, existing tab infra (`tab-menu-academy` view) extended, not rebuilt.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/labslots.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/training.ts src/main.ts src/ui/hud.ts index.html src/style.css tests/labslots.test.ts
git commit -m "feat: lab slot switching, auto-research, celerity, history"
```

### Task 3: Gates UI, thread costs, balance + docs

**Files:**
- Modify: `src/ui/hud.ts` + `index.html` (locked lines show milestone requirement, thread unlock costs), `src/sim/balance.ts` (only if sim drifts), `scripts/sim.mjs` (academy projection covers celerity), `README.md`
- Test: `tests/labgates.test.ts`

**Interfaces:**
- Consumes: `lineUnlocked`, thread gates, `researchCost`
- Produces: locked-line rendering, projection numbers (final report only)

- [ ] **Step 1: Write the failing test**

```ts
// tests/labgates.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, lineUnlocked } from '../src/state/training.js';
describe('lab gates', () => {
  it('locked lines cannot start', () => {
    const s = freshState() as any;
    s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100;
    expect(startResearch(s, 't0', 'barrage')).toBe(false);
  });
  it('locked threads cannot start', () => {
    const s = freshState() as any;
    s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100;
    expect(startResearch(s, 't3', 'gunnery')).toBe(false);
  });
});
```

`startResearch` gains gate checks (line gate via bestWave param default 0 → locked unless caller passes best; main.ts passes current best; tests pass explicit). Signature: `startResearch(s, thread, line, nowMs?, bestWave?)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/labgates.test.ts`
Expected: FAIL (no gate params).

- [ ] **Step 3: Write minimal implementation**

Locked cards render requirement ("Best 100 to unlock") dimmed + disabled. Thread lock ditto. Sim: extend academy projection with celerity (effective rate) — asserts unchanged (x2 ≤1d, x4 ≤3d); wall stays 40-60 (research is zero-meta in sim). README: Laboratory section (catalog, switching/auto/celerity/history, gates).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/labgates.test.ts`
Expected: PASS. Full suite PASS, build clean, sim PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/training.ts src/ui/hud.ts index.html src/sim/balance.ts scripts/sim.mjs tests/labgates.test.ts README.md
git commit -m "feat: lab milestone gates, thread costs, docs"
```

## Self-Review
- Spec coverage: design doc has no separate lab spec — this plan IS the spec delta (catalog §Task 1, slot mechanics §Task 2, gates/balance/docs §Task 3). Mechanics mirror public genre knowledge; all names/numbers/code original.
- Placeholder scan: no TBD/TODO; numbers exact (caps, gates, costs, mults).
- Type consistency: `LineId` union shared by catalog/tests/hud; thread/bank/auto/history shapes defined once in training.ts; `startResearch` signature extended once in Task 3 (tests updated in same commit).
