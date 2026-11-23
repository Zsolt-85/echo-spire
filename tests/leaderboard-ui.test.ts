import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { installCanvasGlobals, makeCtx } from './helpers/canvas-stub.js';

// This project runs vitest in Node with no jsdom dependency. The board UI only
// needs element creation, text, child buttons, click listeners, and dispatch,
// so a tiny shim keeps the brief's DOM-style test runnable without new deps.
// The same shim also covers the wired launch buttons used by the daily-skip test.
class FakeEl {
  private _text = '';
  readonly children: FakeEl[] = [];
  private listeners = new Map<string, Array<() => void>>();
  hidden = false;
  disabled = false;
  type = '';
  value = '';
  width = 0;
  height = 0;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  readonly classList = {
    toggle: (_c: string, _on?: boolean) => {}, add: () => {}, remove: () => {}, contains: () => false,
  };
  constructor(readonly tag: string) {}
  get textContent(): string { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v: string) { this._text = String(v); this.children.length = 0; }
  appendChild<T extends FakeEl>(child: T): T { this.children.push(child); return child; }
  replaceChildren(...nodes: FakeEl[]): void { this.children.length = 0; this.children.push(...nodes); }
  addEventListener(type: string, fn: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  dispatchEvent(ev: { type: string }): boolean {
    for (const fn of this.listeners.get(ev.type) ?? []) fn();
    return true;
  }
  querySelector(sel: string): FakeEl | null {
    return sel === 'button' ? this.children.find(c => c.tag === 'button') ?? null : null;
  }
  get childElementCount(): number { return this.children.length; }
  setAttribute(): void {}
  getContext(): unknown { return makeCtx().ctx; }
}

const nodes = new Map<string, FakeEl>();
const savedGlobals = new Map<string, unknown>();
function setGlobal(k: string, v: unknown): void {
  savedGlobals.set(k, (globalThis as any)[k]);
  (globalThis as any)[k] = v;
}

beforeAll(() => {
  installCanvasGlobals(); // ships.ts builds Path2D paths at module scope
  const storage = new Map<string, string>();
  // Command research level 5 arms the opt-in wave skip on the boot state.
  storage.set('echospire.save.v1', JSON.stringify({
    v: 2, wave: 1, flux: 0, essence: 0, ts: Date.now(),
    training: { levels: { command: 5 }, threads: {} },
  }));
  setGlobal('MouseEvent', class { constructor(readonly type: string) {} });
  setGlobal('document', {
    getElementById: (id: string) => {
      if (!nodes.has(id)) nodes.set(id, new FakeEl('div'));
      return nodes.get(id)!;
    },
    createElement: (tag: string) => new FakeEl(tag),
    addEventListener: () => {},
  });
  setGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
  setGlobal('requestAnimationFrame', () => 0); // loop must not advance in tests
  setGlobal('addEventListener', () => {});
  setGlobal('innerWidth', 1280);
  setGlobal('innerHeight', 800);
  setGlobal('devicePixelRatio', 1);
  setGlobal('location', { search: '' });
});
afterAll(() => {
  for (const [k, v] of savedGlobals) {
    if (v === undefined) delete (globalThis as any)[k];
    else (globalThis as any)[k] = v;
  }
});

import { renderBoard } from '../src/ui/leaderboard.js';
describe('board ui', () => {
  it('renders rows and calls onPick with the entry id', () => {
    const host = document.createElement('div');
    const onPick = vi.fn();
    renderBoard(host, [{ id: 'g1', playerName: 'Vango', best: 88, kills: 900 }] as any, onPick);
    expect(host.textContent).toContain('Vango');
    host.querySelector('button')!.dispatchEvent(new MouseEvent('click'));
    expect(onPick).toHaveBeenCalledWith('g1');
  });
});

describe('daily launch parity', () => {
  it('keeps a daily run at wave 1 even with the wave skip armed', async () => {
    await import('../src/main.js'); // boots main with the seeded command level 5
    const wave = () => document.getElementById('hud-wave')!.textContent;
    const click = (id: string) => document.getElementById(id)!.dispatchEvent(new MouseEvent('click'));

    click('btn-skip'); // arm the opt-in skip
    click('btn-launch'); // normal run: skip applies (control case)
    expect(wave()).toBe('10');

    click('btn-launch-daily'); // daily run: same player, same armed skip
    expect(wave()).toBe('1');
  });
});

describe('demo row arms a raceable ghost', () => {
  it('clicking a seeded demo row arms a trace that renders after launch', async () => {
    await import('../src/main.js'); // module singleton: boot already ran on first import
    const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));
    await flush(); // let the boot-time client.list().then(renderBoard) settle

    const host = document.getElementById('board-list')!;
    const row = (host.children as unknown as FakeEl[]).find(c => c.textContent.includes('Vango'))!;
    expect(row).toBeTruthy();
    row.dispatchEvent(new MouseEvent('click'));
    await flush(); // let client.trace(id).then(...) arm the ghost

    expect(document.getElementById('board-status')!.textContent).toContain('armed — Wave 60');
    // Launch re-applies the armed ghost; a filled Echo pill proves s.ghostTrace was set.
    document.getElementById('btn-launch')!.dispatchEvent(new MouseEvent('click'));
    expect(document.getElementById('hud-ghost')!.textContent).not.toBe('-');
  });
});
