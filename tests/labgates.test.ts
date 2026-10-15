// tests/labgates.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, lineUnlocked } from '../src/state/training.js';
describe('lab gates', () => {
  it('locked lines cannot start', () => {
    const s = freshState() as any;
    s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100;
    expect(startResearch(s, 't0', 'barrage')).toBe(false);
  });
  it('locked threads cannot start', () => {
    const s = freshState() as any;
    s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100;
    expect(startResearch(s, 't3', 'gunnery')).toBe(false);
  });
});
