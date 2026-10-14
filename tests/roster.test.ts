import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { buyUpgrade } from '../src/ui/panel.js';
import { buyWorkshop, applyWorkshop } from '../src/state/workshop.js';
describe('roster', () => {
  it('new forge tracks spend flux and move stats', () => {
    const s = freshState(); s.flux = 100000;
    expect(buyUpgrade(s, 'range')).toBe(true);
    expect(s.range).toBeGreaterThan(180);
    expect(buyUpgrade(s, 'regen')).toBe(true);
    expect(s.regen).toBeGreaterThan(0);
    expect(buyUpgrade(s, 'crit')).toBe(true);
    expect(s.critCh).toBeGreaterThan(0);
  });
  it('volley and bounce engage extra targets', () => {
    const s = freshState(); s.flux = 100000;
    buyUpgrade(s, 'volley'); buyUpgrade(s, 'bounce');
    expect(s.volley).toBe(1); expect(s.bounce).toBe(1);
  });
  it('new workshop tracks persist and apply', () => {
    const s = freshState(); s.cores = 500;
    expect(buyWorkshop(s, 'essence')).toBe(true);
    expect(buyWorkshop(s, 'startFlux')).toBe(true);
    expect((s.workshop ?? {}).essence).toBe(1);
    applyWorkshop(s);
    expect(s.flux).toBeGreaterThanOrEqual(150);
  });
});
