import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import type { GameState } from '../src/game/state.js';
describe('seeded simulation', () => {
  it('two states with the same seed produce identical ships and hull after 300 ticks', () => {
    const a = freshState(), b = freshState();
    a.rngState = b.rngState = 1234;
    // Pin player decisions: no manual Forge buys, no ults, no augments chosen.
    for (let i = 0; i < 300; i++) { tickSim(a, 1 / 60); tickSim(b, 1 / 60); }
    expect(a.ships.map(s => [s.kind, s.x, s.y, s.hp, s.wander]))
      .toEqual(b.ships.map(s => [s.kind, s.x, s.y, s.hp, s.wander]));
    expect(a.hull).toBe(b.hull);
  });
  it('a state missing RNG fields hydrates with usable defaults', () => {
    const s = freshState();
    expect(s.rngState).toBe(0); expect(s.mode).toBe('normal');
    const legacy = { wave: 60, flux: 10 } as unknown as GameState;
    expect(() => tickSim({ ...freshState(), ...legacy }, 1 / 60)).not.toThrow();
  });
});
