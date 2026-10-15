// tests/megacatalog.test.ts (mega-labs plan Task 1, Step 1)
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { RESEARCH_LINES, FAMILIES, familyUnlocked, wsBatchUnlocked } from '../src/state/training.js';
describe('mega catalog', () => {
  it('holds at least 100 lines in 10 ordered families', () => {
    expect(Object.keys(RESEARCH_LINES).length).toBeGreaterThanOrEqual(100);
    expect(FAMILIES.length).toBe(10);
    const gates = FAMILIES.map(f => f.best);
    expect([...gates].sort((a, b) => a - b)).toEqual(gates);
  });
  it('old 12 ids still exist with levels intact', () => {
    for (const id of ['gunnery','logistics','engineering','command','celerity']) {
      expect(RESEARCH_LINES[id]).toBeDefined();
    }
  });
  it('ladders gate correctly', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] };
    expect(familyUnlocked(s, 'exotics', 0)).toBe(false);
    expect(familyUnlocked(s, 'exotics', 400)).toBe(true);
    expect(familyUnlocked(s, 'gunnery', 0)).toBe(true);
    s.lifetimeCoresSpent = 99; expect(wsBatchUnlocked(s, 2)).toBe(false);
    s.lifetimeCoresSpent = 100; expect(wsBatchUnlocked(s, 2)).toBe(true);
    s.lifetimeCoresSpent = 500; expect(wsBatchUnlocked(s, 3)).toBe(true);
  });
  it('new combat fields exist at zero', () => {
    const s = freshState();
    expect(s.thorns ?? -1).toBe(0); expect(s.shieldMax ?? -1).toBe(0);
    expect(s.critMult ?? -1).toBe(0); expect(s.bossMult ?? -1).toBe(0);
  });
});
