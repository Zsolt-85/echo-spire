import { describe, it, expect } from 'vitest';
import { waveIntel } from '../src/game/spawning.js';
import { enemyHp, enemyDmg } from '../src/sim/balance.js';
describe('intel', () => {
  it('reports count, hp, dmg, speed for a wave', () => {
    const w = waveIntel(10);
    expect(w.count).toBe(4 + Math.floor(10 * 0.7));
    expect(w.hp).toBe(enemyHp(10));
    expect(w.dmg).toBe(enemyDmg(10));
    expect(w.speed).toBeGreaterThan(22);
  });
  it('wave 1 is weaker than wave 50', () => {
    expect(waveIntel(50).hp).toBeGreaterThan(waveIntel(1).hp);
    expect(waveIntel(50).count).toBeGreaterThan(waveIntel(1).count);
  });
});
