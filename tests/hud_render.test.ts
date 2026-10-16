import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshState } from '../src/game/state.js';

type El = { textContent: string; className: string; hidden: boolean; disabled: boolean; style: any; appendChild: (n: El) => void; replaceChildren: (...n: El[]) => void; addEventListener: () => void; childElementCount: number; classList: any; dataset: any; setAttribute: () => void };

const nodes = new Map<string, El>();
function mk(id: string): El {
  const el: any = {
    textContent: '', className: '', hidden: false, disabled: false,
    style: {}, dataset: {}, childElementCount: 0,
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {}, replaceChildren: () => {}, addEventListener: () => {}, setAttribute: () => {},
  };
  return el as El;
}

beforeAll(() => {
  (globalThis as any).document = {
    getElementById: (id: string) => { if (!nodes.has(id)) nodes.set(id, mk(id)); return nodes.get(id); },
    createElement: () => mk('created'),
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
});
afterAll(() => { delete (globalThis as any).document; });

describe('renderHud fills real cards', () => {
  it('populates workshop card text without throwing', async () => {
    const { renderHud } = await import('../src/ui/hud.js');
    const s = freshState();
    let err: unknown = null;
    try { renderHud(s); } catch (e) { err = e; }
    expect(err).toBeNull();
    const name = nodes.get('card-ws-name-dmg');
    expect(name?.textContent ?? '').not.toBe('');
    expect(name?.textContent).toBe('Gun Foundry');
  });

  it('populates topbar readouts', async () => {
    const { renderHud } = await import('../src/ui/hud.js');
    renderHud(freshState());
    expect((nodes.get('hud-wave')?.textContent ?? '')).toBe('1');
    expect((nodes.get('hud-income')?.textContent ?? '')).toContain('/kill');
  });
});