import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { spawnWave } from '../src/game/spawning.js';
import { restartRun } from '../src/game/lifecycle.js';
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
  it('restartRun clears the spawn queue (no stale drain into wave 1)', () => {
    expect(freshState()._queue).toBe(0);
    const s = freshState(); s.wave = 20;
    spawnWave(s);
    expect(s._queue).toBeGreaterThan(0);
    restartRun(s);
    expect(s._queue).toBe(0);
    expect(s.ships.length).toBe(0);
    const budget = 4 + Math.floor(1 * 0.7);
    for (let i = 0; i < 5; i++) tickSim(s, 1 / 60);
    expect(s.ships.length + (s._queue ?? 0)).toBeLessThanOrEqual(budget);
  });
});
