// tests/shards.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { buyUlt, canFire } from '../src/game/ultimates.js';
import { collapseShardBonus } from '../src/state/prestige.js';
describe('shards', () => {
  it('boss kills drop exactly 1 shard, normal kills drop 0', () => {
    const s = freshState(); s.dmg = 1000000;
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.shards ?? 0).toBe(0);
    s.ships.push({ id: 2, kind: 'hex', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0, boss: true });
    tickSim(s, 1);
    expect(s.shards ?? 0).toBe(1);
  });
  it('collapse bonus scales with wave', () => {
    expect(collapseShardBonus(49)).toBe(0);
    expect(collapseShardBonus(100)).toBe(1);
  });
  it('ultimates cost shards, not essence', () => {
    const s = freshState(); s.essence = 9999; s.shards = 0;
    expect(buyUlt(s, 'nova')).toBe(false);
    s.shards = 5;
    expect(buyUlt(s, 'nova')).toBe(true);
    expect(s.essence).toBe(9999);
  });
  it('unlocked ultimates still fire on charge', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false }; s.shards = 0; s.ultCharge = 100;
    expect(canFire(s, 'nova')).toBe(true);
  });
});
