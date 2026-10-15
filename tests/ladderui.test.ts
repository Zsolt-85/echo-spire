// tests/ladderui.test.ts (mega-labs plan Task 3, Step 1)
import { describe, it, expect } from 'vitest';
import { familyUnlocked, wsBatchUnlocked, RESEARCH_LINES, FAMILIES, lineGate, familyProgress, wsBatchOf, WS_BATCH_STATS, lifetimeCores } from '../src/state/training.js';
import { freshState } from '../src/game/state.js';
import { buyWorkshop } from '../src/state/workshop.js';
describe('ladder ui data', () => {
  it('locked families expose teaser progress', () => {
    const s = { best: 42 } as any;
    expect(familyUnlocked(s, 'salvage', 42)).toBe(false);
    const lines = Object.entries(RESEARCH_LINES).filter(([, l]: any) => l.fam === 'salvage');
    expect(lines.length).toBe(5);
  });
  it('batch gates read lifetime investment', () => {
    const s = { lifetimeCoresSpent: 68 } as any;
    expect(wsBatchUnlocked(s, 2)).toBe(false);
  });
  it('catalog holds 33 lines with exact family counts', () => {
    expect(Object.keys(RESEARCH_LINES).length).toBe(33);
    const per: Record<string, number> = {};
    for (const l of Object.values(RESEARCH_LINES) as any[]) per[l.fam] = (per[l.fam] ?? 0) + 1;
    expect(per).toEqual({ gunnery: 7, hull: 5, sensors: 4, salvage: 5, command: 4, mastery: 3, riftcraft: 4, echoes: 1 });
    expect(FAMILIES.map(f => f.id)).toEqual(['gunnery', 'hull', 'sensors', 'salvage', 'command', 'mastery', 'riftcraft', 'aegis', 'echoes', 'exotics']);
  });
  it('line gates fold family and per-line minimums', () => {
    expect(lineGate('gunnery')).toBe(0);
    expect(lineGate('deadeye')).toBe(60);
    expect(lineGate('barrage')).toBe(100);
    expect(lineGate('engineering')).toBe(100);
    expect(lineGate('remnant')).toBe(250);
  });
  it('family progress reports have/need for locked teasers', () => {
    const s = { best: 42 } as any;
    const p = familyProgress(s, 'salvage', 42);
    expect(p.unlocked).toBe(false);
    expect(p.need).toBe(60);
    expect(p.have).toBe(42);
    const open = familyProgress(s, 'gunnery', 42);
    expect(open.unlocked).toBe(true);
  });
  it('workshop batches partition the 12 tracks per spec', () => {
    expect(WS_BATCH_STATS[1]).toEqual(['dmg', 'rate', 'maxHull', 'range']);
    expect(WS_BATCH_STATS[2]).toEqual(['regen', 'crit', 'volley', 'bounce']);
    expect(WS_BATCH_STATS[3]).toEqual(['essence', 'startFlux', 'bulkhead', 'scope']);
    expect(wsBatchOf('dmg')).toBe(1);
    expect(wsBatchOf('bounce')).toBe(2);
    expect(wsBatchOf('scope')).toBe(3);
  });
  it('lifetime spend counts workshop, research, and ult shards', () => {
    const s = { lifetimeCoresSpent: 68 } as any;
    expect(lifetimeCores(s)).toBe(68);
    expect(wsBatchOf('dmg')).toBe(1);
    expect(wsBatchUnlocked(s, 1)).toBe(true);
  });
  it('batch purchases refuse until the invest threshold is met', () => {
    const s = freshState(); s.cores = 10000;
    expect(buyWorkshop(s, 'bounce')).toBe(false);
    expect((s.workshop ?? {}).bounce ?? 0).toBe(0);
    s.lifetimeCoresSpent = 100;
    expect(buyWorkshop(s, 'bounce')).toBe(true);
    expect(buyWorkshop(s, 'scope')).toBe(false);
    s.lifetimeCoresSpent = 500;
    expect(buyWorkshop(s, 'scope')).toBe(true);
  });
});
