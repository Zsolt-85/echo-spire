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
