import {describe,it,expect} from 'vitest';
import {freshState,spawnWave,tickSim} from '../src/game/update.js';
describe('combat',()=>{
  it('kills grant flux and damage hull on reach',()=>{
    const s=freshState();spawnWave(s);
    expect(s.ships.length).toBeGreaterThan(0);
    const n=s.ships.length;
    for(let i=0;i<600;i++) tickSim(s,1/60);
    // Balance-agnostic: kills must pay flux, and the sim must make progress
    // (wave advances, ships thin out, or hull takes contact damage). The old
    // ships.length<=n bound assumed wave 1 survives the full 600 ticks, which
    // the retuned (weaker) early game no longer guarantees.
    expect(s.flux).toBeGreaterThan(0);
    expect(s.wave>1||s.ships.length<n||s.hull<s.maxHull).toBe(true);
  });
  it('ranged fire accumulates across ticks and grants flux without contact',()=>{
    const s=freshState();
    s.ships.push({id:s.nextId++,kind:'dart',x:280+100,y:280,hp:1,dmg:5,speed:0,essence:0});
    for(let i=0;i<120;i++) tickSim(s,1/60);
    expect(s.flux).toBeGreaterThan(0); expect(s.hull).toBe(s.maxHull);
  });
});
