import { describe, it, expect } from 'vitest';
import { nextRandom, seedFromString } from '../src/sim/rng.js';
describe('seeded rng', () => {
  it('is deterministic and advances state', () => {
    const a = { rngState: 42 }, b = { rngState: 42 };
    const seqA = Array.from({ length: 8 }, () => nextRandom(a));
    const seqB = Array.from({ length: 8 }, () => nextRandom(b));
    expect(seqA).toEqual(seqB);
    expect(a.rngState).not.toBe(42);
    expect(seqA.every(n => n >= 0 && n < 1)).toBe(true);
  });
  it('starts from the seed on a zero-state object and hashes strings stably', () => {
    expect(nextRandom({})).toBe(nextRandom({ rngState: 0 }));
    expect(seedFromString('echo-spire:2026-11-23')).toBe(seedFromString('echo-spire:2026-11-23'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });
});
