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
