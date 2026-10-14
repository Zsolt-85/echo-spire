// tests/training.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, progressTraining, trainingLevel, speedUnlocked, researchTime } from '../src/state/training.js';
describe('training', () => {
  it('research takes 60 x 1.6^level seconds', () => {
    expect(researchTime(0)).toBe(60); expect(researchTime(1)).toBe(96);
  });
  it('completes in real time and levels the skill', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    expect(startResearch(s, 't0', 'gunnery')).toBe(true);
    progressTraining(s, Date.now() + 61 * 1000);
    expect(trainingLevel(s, 'gunnery')).toBe(1);
  });
  it('one active research per thread', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    startResearch(s, 't0', 'gunnery');
    expect(startResearch(s, 't0', 'logistics')).toBe(false);
  });
  it('speed gates follow logistics', () => {
    const s = freshState() as any; s.training = { levels: {}, threads: {} };
    expect(speedUnlocked(s)).toBe(1);
    s.training.levels.logistics = 1; expect(speedUnlocked(s)).toBe(2);
    s.training.levels.logistics = 4; expect(speedUnlocked(s)).toBe(4);
    s.training.levels.logistics = 8; expect(speedUnlocked(s)).toBe(8);
  });
});
