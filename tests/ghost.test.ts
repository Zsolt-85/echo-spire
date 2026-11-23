import { describe, it, expect } from 'vitest';
import { freshState } from '../src/game/state.js';
import { GHOST_SAMPLE_MS } from '../src/sim/balance.js';
import { startTrace, sampleTrace, ghostAt, encodeTrace, decodeTrace } from '../src/game/ghost.js';
describe('ghost trace', () => {
  it('samples on sim time, not wall clock, so speed changes stay aligned', () => {
    const t = startTrace('r1', 7), s = freshState();
    s.timeS = 0; sampleTrace(t, s);
    s.timeS = 0.4; sampleTrace(t, s);
    expect(t.samples.length).toBe(1);
    s.timeS = 0.5; sampleTrace(t, s);
    expect(t.samples.length).toBe(2);
    expect(t.samples[1][0]).toBe(GHOST_SAMPLE_MS);
    sampleTrace(t, s, true);
    expect(t.samples.length).toBe(3); // forced final sample
  });
  it('interpolates and rejects malformed payloads', () => {
    const t = startTrace('r1', 7);
    t.samples = [[0, 1, 1, 12, 0], [1000, 5, 0.5, 20, 30]];
    expect(ghostAt(t, 500)).toEqual({ wave: 3, hullFrac: 0.75, dmg: 16, kills: 15 });
    expect(ghostAt(t, 2000)).toBeNull();
    expect(decodeTrace('{nope')).toBeNull();
    const rt = decodeTrace(encodeTrace(t));
    expect(rt?.samples).toEqual(t.samples);
  });
});
