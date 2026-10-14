import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { isDead, endRun, restartRun } from '../src/game/lifecycle.js';
describe('lifecycle', () => {
  it('dies at hull 0 and reports a summary', () => {
    const s = freshState(); s.hull = 1;
    s.ships.push({ id: 9, kind: 'dart', x: 280, y: 270, hp: 50, dmg: 500, speed: 0, essence: 0 });
    for (let i = 0; i < 120 && !isDead(s); i++) tickSim(s, 1 / 60);
    expect(isDead(s)).toBe(true);
    expect(s.hull).toBe(0);
    const sum = endRun(s);
    expect(sum.wave).toBe(s.wave);
    expect(sum.coresGained).toBeGreaterThanOrEqual(0);
  });
  it('restart keeps meta and opens a fresh cycle', () => {
    const s = freshState(); s.wave = 60; s.essence = 5; s.levels = { dmg: 3 };
    const gained = restartRun(s);
    expect(gained).toBe(Math.floor(Math.sqrt(60)));
    expect(s.wave).toBe(1); expect(s.hull).toBe(s.maxHull);
    expect(s.ships).toEqual([]); expect(s.essence).toBe(5);
    expect(s.levels).toEqual({ dmg: 3 });
  });
});
