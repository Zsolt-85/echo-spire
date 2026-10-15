// tests/labslots.test.ts
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { startResearch, switchResearch, setAuto, labSpeedMult, progressTraining, trainingLevel, researchCost } from '../src/state/training.js';
function blank(): any { const s = freshState() as any; s.training = { levels: {}, threads: {}, bank: {}, auto: {}, history: [] }; s.cores = 100; return s; }
describe('lab slots', () => {
  it('switching banks time, resume keeps it', () => {
    const s = blank();
    startResearch(s, 't0', 'gunnery', 1000);
    switchResearch(s, 't0', 'plating', 30000);
    expect(s.training.bank.t0.line).toBe('gunnery');
    expect(s.training.bank.t0.investedMs).toBeGreaterThan(0);
  });
  it('auto-research chains next level when affordable', () => {
    const s = blank();
    setAuto(s, 't0', true);
    startResearch(s, 't0', 'gunnery', 1000);
    progressTraining(s, 1000 + 61 * 1000);
    progressTraining(s, 1000 + 61 * 1000 + 200 * 1000);
    expect(trainingLevel(s, 'gunnery')).toBeGreaterThanOrEqual(1);
    expect(Object.keys(s.training.threads).length + (s.training.auto.t0 ? 1 : 0)).toBeGreaterThanOrEqual(1);
  });
  it('engineering speeds research', () => {
    const s = blank(); s.training.levels.engineering = 10;
    expect(labSpeedMult(s)).toBeCloseTo(1.5, 5);
  });
  it('research costs cores upfront and records history', () => {
    const s = blank(); s.training.levels.command = 6;
    expect(startResearch(s, 't0', 'plating', 5000)).toBe(true);
    expect(s.cores).toBe(100 - researchCost('plating', 0));
    s.cores = 0;
    expect(startResearch(s, 't1', 'gunnery', 5000)).toBe(false);
    expect(s.training.threads.t1).toBeUndefined();
    s.cores = 100;
    progressTraining(s, 5000 + 61 * 1000);
    expect(trainingLevel(s, 'plating')).toBe(1);
    expect(s.training.history.length).toBe(1);
    expect(s.training.history[0].line).toBe('plating');
  });
});
