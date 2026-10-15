import { describe, it, expect } from 'vitest';
import { menuView, setMenuView } from '../src/ui/menu.js';
describe('menu hub', () => {
  it('navigates home/workshop/academy and rejects unknown', () => {
    setMenuView('workshop'); expect(menuView()).toBe('workshop');
    setMenuView('academy'); expect(menuView()).toBe('academy');
    setMenuView('nope' as any); expect(menuView()).toBe('academy');
    setMenuView('home'); expect(menuView()).toBe('home');
  });
});