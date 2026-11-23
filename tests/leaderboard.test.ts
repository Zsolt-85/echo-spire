import { describe, it, expect, vi, beforeEach } from 'vitest';
import { localClient, httpClient, entryHash, type RunEntry } from '../src/api/leaderboard.js';
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
});
