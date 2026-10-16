import { describe, it, expect } from 'vitest';
import { segmentDash, SEGMENT_START, detailFor, DETAIL_MIN_R, HULL_OUTER } from '../src/game/mothership.js';

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
    for (const g of gaps) expect(g).toBeCloseTo(24, 6);
  });

  it('leaves four equal dashes at the odd indices', () => {
    const d = segmentDash(50);
    const dashes = d.filter((_, i) => i % 2 === 1);
    expect(dashes).toHaveLength(4);
    for (const x of dashes) expect(x).toBeCloseTo(54.5398, 3);
  });

  it('starts at 45 degrees so gaps sit on the diagonals', () => {
    expect(SEGMENT_START).toBeCloseTo(Math.PI / 4, 9);
  });

  it('drops to lite detail below the radius threshold', () => {
    expect(detailFor(DETAIL_MIN_R)).toBe('full');
    expect(detailFor(DETAIL_MIN_R - 1)).toBe('lite');
    expect(detailFor(54)).toBe('full');
  });

  it('derives inner and outer hull radii from the band width', () => {
    expect(HULL_OUTER - 50).toBe(8);
    expect(50 - 42).toBe(8);
  });
});