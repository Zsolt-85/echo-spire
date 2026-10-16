import { describe, it, expect } from 'vitest';
import { segmentDash, SEGMENT_START, detailFor, DETAIL_MIN_R, HULL_R, HULL_INNER, HULL_OUTER } from '../src/game/mothership.js';

describe('ring geometry', () => {
  it('dash pattern tiles exactly once around the circumference', () => {
    for (const r of [20, 54, 320, 1000]) {
      const total = segmentDash(r).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(2 * Math.PI * r, 6);
    }
  });

  it('produces four equal gaps at the even indices', () => {
    const d = segmentDash(50);
    expect(d).toHaveLength(8);
    const gaps = d.filter((_, i) => i % 2 === 0);
    expect(gaps).toHaveLength(4);
    expect(gaps).toEqual([24, 24, 24, 24].map(v => expect.closeTo(v, 6)));
  });

  it('leaves four equal dashes at the odd indices', () => {
    const d = segmentDash(50);
    const dashes = d.filter((_, i) => i % 2 === 1);
    expect(dashes).toHaveLength(4);
    expect(dashes).toEqual([54.5398, 54.5398, 54.5398, 54.5398].map(v => expect.closeTo(v, 3)));
  });

  it('starts half a gap before the diagonal so gap centres land on 45/135/225/315', () => {
    // GAP_ARC is 0.48 rad, so half of it is 0.24. Starting at PI/4 would put a gap's
    // LEADING EDGE on the diagonal and centre it 13.75 degrees past - spokes would then
    // clip into the solid band instead of bridging a gap.
    expect(SEGMENT_START).toBeCloseTo(Math.PI / 4 - 0.24, 9);
  });

  it('drops to lite detail below the radius threshold', () => {
    expect(detailFor(DETAIL_MIN_R)).toBe('full');
    expect(detailFor(DETAIL_MIN_R - 1)).toBe('lite');
    expect(detailFor(54)).toBe('full');
  });

  it('derives inner and outer hull radii from the band width', () => {
    expect(HULL_OUTER - HULL_R).toBe(8);
    expect(HULL_R - HULL_INNER).toBe(8);
  });
});
