import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, SAVE_KEY } from '../src/state/save.js';
import { coresFor, collapseRun } from '../src/state/prestige.js';
import { freshState } from '../src/game/state.js';

// Minimal localStorage shim for node env (browsers have it natively).
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
});

describe('save', () => {
  it('roundtrips and computes offline', () => {
    const s: any = { wave: 50, flux: 100, essence: 10, ts: Date.now() - 3600e3 };
    saveGame(s);
    const l: any = loadGame();
    expect(l.wave).toBe(50);
    expect(l.offlineFlux).toBeGreaterThanOrEqual(0);
  });

  it('caps offline gains at 12h', () => {
    const s: any = { wave: 10, flux: 0, essence: 0 };
    saveGame(s);
    // Simulate a 48h-old save by aging the stored snapshot (saveGame stamps now).
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    raw.ts = Date.now() - 48 * 3600e3;
    localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
    const l: any = loadGame();
    expect(l.offlineFlux).toBe(12 * 120);
  });

  it('keeps a backup slot and recovers from corrupt primary', () => {
    const s: any = { wave: 50, flux: 100, essence: 10 };
    saveGame(s);
    localStorage.setItem(SAVE_KEY, '###corrupt###');
    const l: any = loadGame();
    expect(l).toBeTruthy();
    expect(l.wave).toBe(50);
  });

  it('returns null when no save exists', () => {
    expect(loadGame()).toBeNull();
  });
});

describe('prestige', () => {
  it('coresFor gates at wave 50 with sqrt scaling', () => {
    expect(coresFor(49)).toBe(0);
    expect(coresFor(50)).toBe(Math.floor(Math.sqrt(50)));
    expect(coresFor(100)).toBe(10);
  });

  it('collapseRun refuses below wave 50, resets but keeps essence/cores', () => {
    const s: any = freshState();
    s.wave = 20;
    expect(collapseRun(s)).toBe(0);
    expect(s.wave).toBe(20);
    s.wave = 64;
    s.flux = 500;
    s.essence = 7;
    const cores = collapseRun(s);
    expect(cores).toBe(Math.floor(Math.sqrt(64)));
    expect(s.wave).toBe(1);
    expect(s.flux).toBe(0);
    expect(s.essence).toBe(7);
    expect(s.cores).toBe(cores);
  });
});
