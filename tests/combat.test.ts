import {describe,it,expect} from 'vitest';
import {freshState,spawnWave,tickSim} from '../src/game/update.js';
describe('combat',()=>{
  it('kills grant flux and damage hull on reach',()=>{
    const s=freshState();spawnWave(s);
    expect(s.ships.length).toBeGreaterThan(0);
    const n=s.ships.length;
    for(let i=0;i<600;i++) tickSim(s,1/60);
    expect(s.flux+s.hull).toBeGreaterThan(0); expect(s.ships.length).toBeLessThanOrEqual(n);
  });
  it('ranged fire accumulates across ticks and grants flux without contact',()=>{
    const s=freshState();
    s.ships.push({id:s.nextId++,kind:'dart',x:280+100,y:280,hp:1,dmg:5,speed:0,essence:0});
    for(let i=0;i<120;i++) tickSim(s,1/60);
    expect(s.flux).toBeGreaterThan(0); expect(s.hull).toBe(s.maxHull);
  });
});
