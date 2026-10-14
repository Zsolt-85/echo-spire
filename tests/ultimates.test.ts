import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { ultChargeForKill, canFire, fireUlt, ULT_COST } from '../src/game/ultimates.js';
describe('ultimates', () => {
  it('charge builds per kill and gates firing', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false };
    expect(canFire(s, 'nova')).toBe(false);
    for (let i = 0; i < 50; i++) ultChargeForKill(s, false);
    expect(s.ultCharge).toBe(100);
    expect(canFire(s, 'nova')).toBe(true);
    expect(canFire(s, 'overdrive')).toBe(false);
  });
  it('nova clears the screen for 10x damage', () => {
    const s = freshState();
    s.ult = { nova: true, overdrive: false, aegis: false };
    s.dmg = 10;
    s.ships.push({ id: 1, kind: 'dart', x: 100, y: 100, hp: 90, dmg: 0, speed: 0, essence: 0 });
    s.ultCharge = 100;
    expect(fireUlt(s, 'nova')).toBe(true);
    expect(s.ships.length).toBe(0);
    expect(s.ultCharge).toBe(0);
  });
  it('overdrive triples rate for 8s and aegis blocks hull damage', () => {
    const s = freshState();
    s.ult = { nova: false, overdrive: true, aegis: true };
    s.ultCharge = 100;
    expect(fireUlt(s, 'overdrive')).toBe(true);
    expect(s.odUntil).toBeGreaterThan(s.timeS ?? 0);
    s.ultCharge = 100;
    fireUlt(s, 'aegis');
    s.hull = 100; s.maxHull = 500;
    s.ships.push({ id: 2, kind: 'dart', x: 280, y: 275, hp: 10000, dmg: 50, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.hull).toBe(100);
  });
});
