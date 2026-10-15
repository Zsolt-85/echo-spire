// tests/newmechanics.test.ts (mega-labs plan Task 2, Step 1)
// 9 guarded tick branches: shield-first, thorns, splash, critMult, slow,
// bossMult, cacheLuck, cacheQuality, ultChargeMult.
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { tickSim } from '../src/game/update.js';
import { applyLineDelta, applyLineEffects } from '../src/state/training.js';
describe('new mechanics', () => {
  it('shield absorbs before hull', () => {
    const s = freshState(); s.shieldMax = 100; s.shield = 100; s.hull = 500;
    s.ships.push({ id: 1, kind: 'dart', x: 280, y: 270, hp: 100000, dmg: 10, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.shield).toBeLessThan(100); expect(s.hull).toBe(500);
  });
  it('thorns reflect kill credit normally', () => {
    const s = freshState(); s.thorns = 1; s.dmg = 0; s.rate = 0;
    s.ships.push({ id: 2, kind: 'dart', x: 280, y: 270, hp: 5, dmg: 10, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.kills ?? 0).toBeGreaterThan(0);
  });
  it('splash damages neighbors once', () => {
    // NOTE(plan deviation): verbatim pushed the hp-1 ship first at (200,200),
    // but tickSim targets nearest-first, so the hp-100000 ship at (210,200)
    // eats the single shot and nothing dies. Swapped so the fragile ship is
    // nearest, and assert the neighbor actually took splash damage.
    const s = freshState(); s.dmg = 100; s.splashR = 60;
    s.ships.push({ id: 3, kind: 'dart', x: 200, y: 200, hp: 100000, dmg: 0, speed: 0, essence: 0 });
    s.ships.push({ id: 4, kind: 'dart', x: 210, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.ships.length).toBe(1);
    expect(s.ships[0].hp).toBeLessThan(100000);
    expect(s.ships[0].hp).toBeGreaterThan(0);
  });
  it('splash is a single hop, no chain', () => {
    const s = freshState(); s.dmg = 100; s.splashR = 60;
    s.ships.push({ id: 5, kind: 'dart', x: 250, y: 250, hp: 1, dmg: 0, speed: 0, essence: 0 });
    s.ships.push({ id: 6, kind: 'dart', x: 210, y: 210, hp: 20, dmg: 0, speed: 0, essence: 0 });
    s.ships.push({ id: 7, kind: 'dart', x: 160, y: 200, hp: 100000, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.kills ?? 0).toBe(2);
    expect(s.ships.length).toBe(1);
    expect(s.ships[0].hp).toBe(100000);
  });
  it('crits deal 2+critMult', () => {
    const s = freshState(); s.dmg = 10; s.critCh = 1; s.critMult = 1;
    s.ships.push({ id: 8, kind: 'dart', x: 200, y: 200, hp: 100, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.ships[0].hp).toBe(70);
  });
  it('slow halves in-range movement', () => {
    const s = freshState(); s.dmg = 0; s.rate = 0; s.slowPct = 0.5;
    s.ships.push({ id: 9, kind: 'dart', x: 380, y: 280, hp: 100, dmg: 0, speed: 20, essence: 0, behavior: 'seeker' });
    tickSim(s, 1);
    expect(s.ships[0].x).toBeCloseTo(370, 6);
  });
  it('slow effect caps at 0.5', () => {
    const s = freshState(); s.dmg = 0; s.rate = 0; s.slowPct = 10;
    s.ships.push({ id: 10, kind: 'dart', x: 380, y: 280, hp: 100, dmg: 0, speed: 20, essence: 0, behavior: 'seeker' });
    tickSim(s, 1);
    expect(s.ships[0].x).toBeCloseTo(370, 6);
  });
  it('boss ships take (1+bossMult) from all hits', () => {
    const s = freshState(); s.dmg = 10; s.bossMult = 1;
    s.ships.push({ id: 11, kind: 'hex', x: 200, y: 200, hp: 100, dmg: 0, speed: 0, essence: 0, boss: true });
    tickSim(s, 1);
    expect(s.ships[0].hp).toBe(80);
  });
  it('cacheLuck rolls a bonus surge, zero stays scheduled-only', () => {
    const plain = freshState(); plain.wave = 11; plain.cacheLuck = 0;
    tickSim(plain, 1);
    expect(plain.ships.some(x => x.cache)).toBe(false);
    const lucky = freshState(); lucky.wave = 11; lucky.cacheLuck = 1;
    tickSim(lucky, 1);
    expect(lucky.ships.some(x => x.cache)).toBe(true);
  });
  it('cacheQuality scales cache essence, rounded', () => {
    const s = freshState(); s.dmg = 100; s.cacheQuality = 1;
    s.ships.push({ id: 12, kind: 'hex', x: 200, y: 200, hp: 1, dmg: 0, speed: 0, essence: 15, cache: true });
    tickSim(s, 1);
    expect(s.essence).toBe(30);
  });
  it('ultCharge gains scale with mult', () => {
    const s = freshState(); s.dmg = 100; s.ultChargeMult = 1;
    s.ships.push({ id: 13, kind: 'dart', x: 200, y: 200, hp: 1, dmg: 0, speed: 0, essence: 0 });
    tickSim(s, 1);
    expect(s.ultCharge).toBe(4);
  });
  it('drag line folds into slowPct', () => {
    const d = freshState();
    applyLineDelta(d, 'drag', 1);
    expect(d.slowPct ?? -1).toBeCloseTo(0.04, 9);
    const e = freshState() as any;
    e.training = { levels: { drag: 3 }, threads: {}, bank: {}, auto: {}, history: [] };
    applyLineEffects(e);
    expect(e.slowPct ?? -1).toBeCloseTo(0.12, 9);
  });
  it('later-plan kinds stay fold-free', () => {
    // echoDps/surgeLuck/heraldLuck/spawnGap collect levels but fold nowhere
    // in this task (no consumers yet) — locked here so a stray fold fails.
    const s = freshState() as any;
    s.training = { levels: { remnant: 5, surge: 5, herald: 5, riftwise: 5 }, threads: {}, bank: {}, auto: {}, history: [] };
    applyLineEffects(s);
    expect(s.bossMult ?? -1).toBe(0); expect(s.cacheLuck ?? -1).toBe(0);
    expect(s.slowPct ?? -1).toBe(0); expect(s.ultChargeMult ?? -1).toBe(0);
  });
});
