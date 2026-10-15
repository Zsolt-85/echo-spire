// tests/labs.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { RESEARCH_LINES, lineLevel, researchCost, lineUnlocked, applyLineEffects } from '../src/state/training.js';
describe('labs catalog', () => {
  it('every line has category, cap, and scaling time', () => {
    expect(Object.keys(RESEARCH_LINES).length).toBe(33);
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
