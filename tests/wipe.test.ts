import { describe, it, expect } from 'vitest';
import { saveGame, loadGame, wipeSave } from '../src/state/save.js';
describe('wipe', () => {
  it('removes primary, backup, and memory so load returns null', () => {
    saveGame({ wave: 60, flux: 500, ts: Date.now(), v: 1 } as any);
    expect(loadGame()).not.toBeNull();
    wipeSave();
    expect(loadGame()).toBeNull();
  });
  it('fresh state after wipe starts at wave 1 with zero meta', async () => {
    const { freshState } = await import('../src/game/state.js');
    wipeSave();
    const s = freshState();
    expect(s.wave).toBe(1); expect(s.cores ?? 0).toBe(0); expect(s.essence).toBe(0);
  });
});
