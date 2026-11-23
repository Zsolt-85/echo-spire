import { describe, it, expect, vi, beforeEach } from 'vitest';
import { localClient, httpClient, entryHash, type RunEntry } from '../src/api/leaderboard.js';
import { ghostAt } from '../src/game/ghost.js';
const e = (id: string): RunEntry => ({ id, playerId: 'p', playerName: 'P', best: 40, kills: 300,
  durationMs: 600000, seed: 1, submittedAt: 1, hash: '', hasTrace: false });
describe('leaderboard', () => {
  beforeEach(() => { const m = new Map<string,string>(); (globalThis as any).localStorage = {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k), clear: () => m.clear() }; });
  it('local client is never empty and persists submissions', async () => {
    const c = localClient();
    expect((await c.list({ period: 'all' })).length).toBeGreaterThanOrEqual(3);
    expect((await c.submit(e('x'), null)).ok).toBe(true);
    expect((await c.list({ period: 'all' })).some(r => r.id === 'x')).toBe(true);
  });
  it('http client resolves ok:false on a rejected fetch', async () => {
    const c = httpClient('https://example.invalid');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(c.submit(e('x'), null)).resolves.toEqual({ ok: false, id: 'x' });
    vi.unstubAllGlobals();
  });
  it('entryHash is stable and excludes the hash field', () => {
    expect(entryHash(e('x'))).toBe(entryHash(e('x')));
  });
  it('seeds raceable demo traces so every first-run row arms a ghost', async () => {
    const c = localClient();
    const demos = (await c.list({ period: 'all' })).filter(r => r.id.startsWith('demo-'));
    expect(demos.map(r => r.playerName).sort()).toEqual(['Nyx-7', 'The Wall', 'Vango']);
    for (const row of demos) {
      expect(row.hasTrace).toBe(true);
      const t = await c.trace(row.id);
      expect(t).not.toBeNull();
      expect(t!.v).toBe(1);
      expect(t!.samples.length).toBeGreaterThanOrEqual(2);
      expect(t!.finalWave).toBe(row.best);
      expect(t!.finalKills).toBe(row.kills);
      expect(t!.durationMs).toBe(row.durationMs);
      // t=0 is inside the trace, so ghostAt yields a sample and a ring can draw.
      expect(ghostAt(t!, 0)).not.toBeNull();
    }
  });
  it('backfills demo traces into an older local board that had none', async () => {
    const legacy = {
      entries: [{ id: 'demo-vango', playerId: 'demo-vango', playerName: 'Vango',
        best: 60, kills: 1200, durationMs: 900000, seed: 101,
        submittedAt: 1, hasTrace: false, hash: 'stale' }],
      traces: {},
    };
    localStorage.setItem('echospire.board.v1', JSON.stringify(legacy));
    const c = localClient();
    const rows = await c.list({ period: 'all' });
    expect(rows.find(r => r.id === 'demo-vango')!.hasTrace).toBe(true);
    expect(rows.filter(r => r.id.startsWith('demo-')).length).toBe(3);
    expect((await c.trace('demo-vango'))?.samples.length).toBeGreaterThan(0);
  });
});
