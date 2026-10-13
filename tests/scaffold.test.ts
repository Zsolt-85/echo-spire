import { describe, it, expect } from 'vitest';
import { costFor, enemyHp } from '../src/sim/balance.js';
describe('scaffold', () => {
  it('balance module exists', () => {
    expect(costFor(20, 1.32, 0)).toBe(20);
    expect(enemyHp(1)).toBeGreaterThan(0);
  });
});
