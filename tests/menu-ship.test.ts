import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { menuRingRadius } from '../src/game/mothership.js';

describe('menu hero canvas', () => {
  it('is emitted by the generator into index.html', () => {
    const gen = readFileSync('scripts/gen_index.py', 'utf8');
    expect(gen).toContain('id="menu-ship"');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('id="menu-ship"');
  });

  it('marks the hero canvas aria-hidden', () => {
    const html = readFileSync('index.html', 'utf8');
    const start = html.indexOf('<canvas id="menu-ship"');
    expect(start).toBeGreaterThan(-1);
    const tag = html.slice(start, html.indexOf('>', start) + 1);
    expect(tag).toContain('aria-hidden="true"');
  });

  it('sits inside the menu overlay, before the sheet, so the sheet paints over it', () => {
    const html = readFileSync('index.html', 'utf8');
    const overlay = html.indexOf('id="menu-overlay"');
    const canvas = html.indexOf('id="menu-ship"');
    const sheet = html.indexOf('class="menu-sheet"');
    expect(overlay).toBeGreaterThan(-1);
    expect(canvas).toBeGreaterThan(overlay);
    expect(sheet).toBeGreaterThan(canvas);
  });

  it('main.ts draws the menu ring', () => {
    const src = readFileSync('src/main.ts', 'utf8');
    expect(src).toContain("getElementById('menu-ship')");
    expect(src).toContain('menuRingRadius');
  });

  it('the overlay is no longer near-opaque', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('#menu-overlay{');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).not.toMatch(/rgba\(2,4,8,\.92\)/);
    expect(rule).toMatch(/radial-gradient/);
    expect(rule).toMatch(/backdrop-filter:none/);
    expect(css).toMatch(/#menu-ship\{[^}]*position:fixed/);
    expect(css).toMatch(/#menu-ship\{[^}]*pointer-events:none/);
  });

  it('keeps the sheet above the hero canvas', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('.menu-sheet{');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).toMatch(/position:relative/);
    expect(rule).toMatch(/z-index:1/);
  });

  it('resets the global canvas frame on the hero', () => {
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('#menu-ship{');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).toMatch(/border:none/);
    expect(rule).toMatch(/border-radius:0/);
    expect(rule).toMatch(/box-sizing:border-box/);
  });

  it('hides gameplay chrome behind the menu', () => {
    const src = readFileSync('src/ui/menu.ts', 'utf8');
    expect(src).toMatch(/visibility = phase === 'menu' \? 'hidden' : 'visible'/);
    expect(src).toContain("el('topbar')");
    expect(src).toContain("el('layout')");
  });

  it('ring radius always exceeds half the largest viewport dimension', () => {
    for (const [vw, vh] of [[1920, 1080], [1280, 800], [390, 844], [360, 640]] as const) {
      const r = menuRingRadius(vw, vh);
      expect(r * 2).toBeGreaterThan(Math.max(vw, vh));
    }
  });

  it('clamps to a sensible minimum on tiny viewports', () => {
    expect(menuRingRadius(200, 150)).toBe(320);
  });

  it('spans 58% of the larger viewport dimension', () => {
    expect(menuRingRadius(2000, 1000)).toBeCloseTo(1160, 6);
    expect(menuRingRadius(1000, 2000)).toBeCloseTo(1160, 6);
  });
});
