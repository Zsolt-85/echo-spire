import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCtx } from './helpers/canvas-stub.js';
import { shareRunCard, runCardPng } from '../src/ui/run-card.js';
const sum = { wave: 73, kills: 1200, fluxEarned: 500, essenceEarned: 4, timeS: 600, coresGained: 9 };
let ctx: ReturnType<typeof makeCtx>['ctx'];
let created: Array<Record<string, any>> = [];
beforeEach(() => {
  // Same createElement stub as the brief, with a shared 2D context so tests can
  // inspect what was drawn and an anchor click so the download path is real.
  const made = makeCtx();
  ctx = made.ctx;
  created = [];
  (globalThis as any).document = {
    createElement: (tag: string) => {
      const el: Record<string, any> = {
        tag, width: 0, height: 0,
        getContext: () => ctx,
        toDataURL: () => 'data:image/png;base64,AAAA',
        click: vi.fn(),
      };
      created.push(el);
      return el;
    },
  };
  delete (navigator as any).share;
  delete (navigator as any).canShare;
});
describe('run card', () => {
  it('uses Web Share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share; (navigator as any).canShare = () => true;
    expect(await shareRunCard(sum)).toBe('shared');
    expect(share).toHaveBeenCalled();
  });
  it('falls back to download when sharing is unavailable', async () => {
    delete (navigator as any).share;
    expect(await shareRunCard(sum)).toBe('downloaded');
  });
  it('headline copy is fixed', () => {
    expect(runCardPng(sum)).toMatch(/^data:image\/png/);
  });
  it('draws a 600x320 card with the headline and run stats', () => {
    const fonts: string[] = [];
    let font = '';
    Object.defineProperty(ctx, 'font', {
      get: () => font,
      set: (v: string) => { font = v; fonts.push(v); },
      configurable: true,
    });
    runCardPng(sum);
    const canvas = created.find(el => el.tag === 'canvas');
    expect(canvas?.width).toBe(600);
    expect(canvas?.height).toBe(320);
    const texts = ctx.calls.filter(c => c.op === 'fillText').map(c => String(c.args[0]));
    expect(texts).toContain('I HELD THE LINE TO WAVE 73');
    expect(texts.some(t => t.includes('1200'))).toBe(true);
    expect(texts.some(t => t.includes('9'))).toBe(true);
    expect(fonts.some(f => f.includes('Orbitron'))).toBe(true);
    expect(fonts.some(f => f.includes('JetBrains Mono'))).toBe(true);
  });
  it('adds a vs line for the raced ghost', () => {
    const ghost = { playerName: 'Nyx-7' } as any;
    runCardPng(sum, ghost);
    expect(ctx.calls.some(c => c.op === 'fillText' && String(c.args[0]) === 'vs Nyx-7')).toBe(true);
  });
  it('falls back to download when Web Share rejects (user cancel)', async () => {
    (navigator as any).share = vi.fn().mockRejectedValue(new Error('cancel'));
    (navigator as any).canShare = () => true;
    expect(await shareRunCard(sum)).toBe('downloaded');
    expect(created.some(el => el.tag === 'a' && typeof el.click === 'function')).toBe(true);
  });
  it('returns unsupported when there is no DOM', async () => {
    (globalThis as any).document = undefined;
    expect(await shareRunCard(sum)).toBe('unsupported');
  });
});
