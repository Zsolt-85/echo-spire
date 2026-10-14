import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { restartRun } from '../src/game/lifecycle.js';
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
    const base = s.dmg;
    buyWorkshop(s, 'dmg'); buyWorkshop(s, 'dmg');
    applyWorkshop(s);
    expect(s.dmg).toBeGreaterThan(base);
  });
  it('restart preserves workshop and reapplies it', () => {
    const s = freshState(); s.cores = 100; s.wave = 60;
    buyWorkshop(s, 'range');
    restartRun(s);
    expect((s.workshop ?? {}).range).toBe(1);
  });
});
