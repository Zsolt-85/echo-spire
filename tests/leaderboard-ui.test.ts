import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// This project runs vitest in Node with no jsdom dependency. The board UI only
// needs element creation, text, child buttons, click listeners, and dispatch,
// so a tiny shim keeps the brief's DOM-style test runnable without new deps.
class FakeEl {
  private _text = '';
  readonly children: FakeEl[] = [];
  private listeners = new Map<string, Array<() => void>>();
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
}

beforeAll(() => {
  (globalThis as any).MouseEvent = class { constructor(readonly type: string) {} };
  (globalThis as any).document = {
    createElement: (tag: string) => new FakeEl(tag),
    getElementById: () => null,
    addEventListener: () => {},
  };
});
afterAll(() => {
  delete (globalThis as any).document;
  delete (globalThis as any).MouseEvent;
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
