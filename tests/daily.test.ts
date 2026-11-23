import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { restartRun } from '../src/game/lifecycle.js';
import { dateKey, dailySeed, startDaily, startNormal, isDaily } from '../src/game/daily.js';
describe('daily runs', () => {
  it('derives a stable UTC date key and seed', () => {
    const d = new Date('2026-11-23T23:30:00Z');
    expect(dateKey(d)).toBe('2026-11-23');
    expect(dailySeed(d)).toBe(dailySeed(new Date('2026-11-23T01:00:00Z')));
    expect(dailySeed(d)).not.toBe(dailySeed(new Date('2026-11-24T01:00:00Z')));
  });
  it('sets and clears mode across a restart', () => {
    const s = freshState(); startDaily(s, new Date('2026-11-23T12:00:00Z'));
    expect(isDaily(s)).toBe(true); expect(s.seed).toBe(dailySeed(new Date('2026-11-23')));
    const gained = restartRun(s); expect(gained).toBeGreaterThanOrEqual(0);
    expect(isDaily(s)).toBe(false);
    startNormal(s, 99); expect(s.rngState).toBe(99); expect(isDaily(s)).toBe(false);
  });
});
