import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { RESEARCH_LINES, migrateDuplicates } from '../src/state/training.js';
describe('dedupe', () => {
  it('exactly one line per effect', () => {
    const seen = new Map<string, string>();
    for (const [id, l] of Object.entries(RESEARCH_LINES) as any) {
      expect(seen.has(l.effect)).toBe(false);
      seen.set(l.effect, id);
    }
  });
  it('removed twin levels fold into survivor, overflow refunds cores', () => {
    const s = freshState() as any;
    s.training = { levels: { muzzle: 8, gunnery: 48 }, threads: {}, bank: {}, auto: {}, history: [] };
    s.cores = 0;
    const r = migrateDuplicates(s);
    expect(s.training.levels.gunnery).toBe(50);
    expect(s.cores).toBe(6);
    expect(s.training.levels.muzzle ?? 0).toBe(0);
    expect(r.moved).toBe(2 + 6);
  });
  it('migration is idempotent', () => {
    const s = freshState() as any;
    s.training = { levels: { muzzle: 8 }, threads: {}, bank: {}, auto: {}, history: [] };
    s.cores = 0;
    migrateDuplicates(s);
    const cores = s.cores;
    migrateDuplicates(s);
    expect(s.cores).toBe(cores);
  });
});
