// tests/tabs.test.ts
import { describe, it, expect } from 'vitest';
import { FORGE_CATS, WS_CATS, getForgeTab, setForgeTab, getWsTab, setWsTab } from '../src/ui/tabs.js';
import type { Stat } from '../src/ui/panel.js';
import { WORKSHOP_STATS } from '../src/state/workshop.js';
describe('tabs', () => {
  it('every forge stat is in exactly one tab', () => {
    const all: Stat[] = ['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
    for (const st of all) {
      const hits = FORGE_CATS.filter(c => (c.stats as readonly string[]).includes(st));
      expect(hits.length).toBe(1);
    }
  });
  it('every workshop track is in exactly one tab', () => {
    for (const st of WORKSHOP_STATS) {
      const hits = WS_CATS.filter(c => (c.stats as readonly string[]).includes(st as string));
      expect(hits.length).toBe(1);
    }
  });
  it('tab store round-trips and rejects unknown ids', () => {
    setForgeTab('hull'); expect(getForgeTab()).toBe('hull');
    setForgeTab('nope'); expect(getForgeTab()).toBe('hull');
    setWsTab('batch2'); expect(getWsTab()).toBe('batch2');
    setWsTab('nope'); expect(getWsTab()).toBe('batch2');
  });
});
