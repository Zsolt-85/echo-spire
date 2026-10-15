import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, hadLegacySave, SAVE_KEY, SAVE_VERSION } from '../src/state/save.js';
function raw(): any { return JSON.parse((globalThis as any).localStorage.getItem(SAVE_KEY)); }
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
describe('migration', () => {
  it('v2 loads; v1 snapshot resets to fresh with legacy flag', () => {
    // NOTE: the plan verbatim wrote the legacy snapshot via saveGame({...v:1}),
    // but saveGame always stamps SAVE_VERSION, so a v1 snapshot can only exist
    // as raw bytes (written by the old client). Write it raw to be faithful.
    (globalThis as any).localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ wave: 60, flux: 500, ts: Date.now(), v: 1 }),
    );
    expect(raw().v).toBe(1);
    expect(hadLegacySave()).toBe(true);
    expect(loadGame()).toBeNull();
    saveGame({ wave: 60, flux: 500, ts: Date.now() } as any);
    expect(raw().v).toBe(SAVE_VERSION);
    expect(loadGame()).not.toBeNull();
    expect(hadLegacySave()).toBe(false);
  });
});
