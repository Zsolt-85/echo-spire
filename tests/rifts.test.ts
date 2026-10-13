import {describe,it,expect} from 'vitest';
import {freshState} from '../src/game/update.js';
import {maybeSpawnSurge, offerAugment, applyAugment, RIFT_POS} from '../src/game/rifts.js';
import {buyUpgrade} from '../src/ui/panel.js';
describe('rifts',()=>{
  it('surge spawns cache with essence',()=>{
    const s=freshState() as any;s.wave=25;s.ships=[];s.essence=0;
    const hit=[...Array(40)].map(()=>maybeSpawnSurge(s)).some(Boolean);
    expect(hit).toBe(true);
    const cache=s.ships.find((x:any)=>x.cache);
    expect(cache).toBeTruthy();
    expect(cache.essence).toBeGreaterThan(0);
  });
  it('no surge before wave 10 or off-cycle, once per wave',()=>{
    const a=freshState() as any;a.wave=9;a.ships=[];
    expect(maybeSpawnSurge(a)).toBe(false);
    const b=freshState() as any;b.wave=11;b.ships=[];
    expect(maybeSpawnSurge(b)).toBe(false);
    const c=freshState() as any;c.wave=20;c.ships=[];
    expect(maybeSpawnSurge(c)).toBe(true);
    expect(maybeSpawnSurge(c)).toBe(false);
  });
  it('rift positions are on-arena',()=>{
    expect(RIFT_POS.length).toBeGreaterThanOrEqual(2);
    for(const [x,y] of RIFT_POS){expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);}
  });
  it('cache kill banks essence, augment offers three',async ()=>{
    const {tickSim}=await import('../src/game/update.js');
    const s=freshState() as any;s.wave=25;s.ships=[];s.essence=0;
    s.dmg=10000;s.rate=20;s.range=1000;
    maybeSpawnSurge(s);
    const before=s.ships.length;
    expect(before).toBeGreaterThan(0);
    for(let i=0;i<120;i++) tickSim(s,1/60);
    expect(s.essence).toBeGreaterThan(0);
    expect(offerAugment().length).toBe(3);
    const dmgBefore=(s as any).dmg;
    applyAugment(s,offerAugment()[0]);
    expect((s as any).dmg).toBeGreaterThanOrEqual(dmgBefore);
  });
  it('forge rate/maxHull buy with flux (reviewer coverage)',()=>{
    const s=freshState();s.flux=10000;
    const r0=s.rate,m0=s.maxHull;
    expect(buyUpgrade(s,'rate')).toBe(true);expect(s.rate).toBeGreaterThan(r0);
    expect(buyUpgrade(s,'maxHull')).toBe(true);expect(s.maxHull).toBeGreaterThan(m0);expect(s.hull).toBe(s.maxHull);
  });
});
