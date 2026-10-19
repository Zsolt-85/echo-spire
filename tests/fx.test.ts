import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
describe('fx', () => {
  it('firing pushes beam events, kills push sparks', () => {
    const s = freshState();
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect((s.fx ?? []).some(e => e.kind === 'beam')).toBe(true);
    expect((s.fx ?? []).some(e => e.kind === 'spark')).toBe(true);
  });
  it('contact flash records the attacker position, not the arena centre', () => {
    const s = freshState();
    s.ships.push({ id: 1, kind: 'dart', x: 262, y: 280, hp: 100, dmg: 1, speed: 22, essence: 0 });
    tickSim(s, 0.016);
    const flash = (s.fx ?? []).find(e => e.kind === 'flash');
    expect(flash).toBeDefined();
    expect(flash!.x).toBeLessThan(270);
    expect(flash!.y).toBeCloseTo(280, 6);
  });
  it('fx queue is capped', () => {
    const s = freshState();
    for (let i = 0; i < 50; i++) s.ships.push({ id: i, kind: 'dart', x: 280, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect((s.fx ?? []).length).toBeLessThanOrEqual(60);
  });
});
