import {describe,it,expect} from 'vitest';
import {freshState} from '../src/game/update.js';import {buyUpgrade,upgradeCost} from '../src/ui/panel.js';
describe('forge',()=>{it('blocks without flux, buys with flux',()=>{
  const s=freshState();s.flux=0;expect(buyUpgrade(s,'dmg')).toBe(false);
  s.flux=10000;(s as any).levels={dmg:0};expect(buyUpgrade(s,'dmg')).toBe(true);expect(s.dmg).toBeGreaterThan(12);
});});
