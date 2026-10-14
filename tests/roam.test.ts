import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { spawnWave } from '../src/game/spawning.js';
import { tickSim } from '../src/game/update.js';
describe('roam', () => {
  it('wave budget releases over time, not all at once', () => {
    const s = freshState(); s.wave = 20;
    spawnWave(s);
    expect(s.ships.length).toBeLessThanOrEqual(3);
    expect(s._queue).toBeGreaterThan(0);
  });
  it('roamers strafe instead of flying straight', () => {
    const s = freshState();
    s.ships.push({ id: 1, kind: 'dart', x: 100, y: 100, hp: 1000, dmg: 0, speed: 30, essence: 0, behavior: 'roamer', wander: 0 });
    const y0 = 100;
    tickSim(s, 0.5);
    const sh = s.ships[0];
    const straight = Math.atan2(280 - 100, 280 - 100);
    const actual = Math.atan2(sh.y - 100, sh.x - 100);
    expect(Math.abs(actual - straight)).toBeGreaterThan(0.02);
  });
});
