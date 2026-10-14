import { describe, it, expect } from 'vitest';
import { getPhase, toMenu, toRun } from '../src/ui/menu.js';
describe('menu phases', () => {
  it('starts in menu and transitions to run', () => {
    toMenu();
    expect(getPhase()).toBe('menu');
    toRun();
    expect(getPhase()).toBe('run');
  });
});
