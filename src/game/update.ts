import type {GameState} from './state.js';import {isDead} from './lifecycle.js';import {spawnWave} from './spawning.js';import {maybeSpawnSurge,offerAugment} from './rifts.js';export {freshState} from './state.js';export {spawnWave} from './spawning.js';
export function tickSim(s:GameState,dt:number){
  if(s.ships.length===0){spawnWave(s);maybeSpawnSurge(s);
    if(s.wave>=10&&s.wave%10===0&&s._augmentWave!==s.wave&&!s.pendingAugment){s.pendingAugment=offerAugment();s._augmentWave=s.wave;}}
  // mothership fire: nearest in range, volley/crit/bounce
  s.ships.sort((a,b)=>((a.x-280)**2+(a.y-280)**2)-((b.x-280)**2+(b.y-280)**2));
  const essenceMult=(s as unknown as {_essenceMult?:number})._essenceMult??1;
  const targets=1+Math.floor((s.volley??0)/3);
  let shots=(s._acc??0)+s.rate*dt, guard=20;
  while(shots>=1&&guard-->0&&s.ships.length){shots-=1;
    let hits=0;
    for(const t of s.ships){
      if(hits>=targets)break;
      if(t.hp<=0)continue;
      if((t.x-280)**2+(t.y-280)**2>s.range**2)continue;
      let dmg=s.dmg;
      if(Math.random()<(s.critCh??0))dmg*=2;
      t.hp-=dmg;hits++;
      if(t.hp<=0){s.flux+=6+s.wave;s.fluxEarned=(s.fluxEarned??0)+6+s.wave;s.kills=(s.kills??0)+1;if(t.cache){const e=t.essence*essenceMult;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}
        const chains=Math.floor((s.bounce??0)/2);
        for(let c=0;c<chains;c++){let best:null|typeof t=null;let bestD=Infinity;
          for(const o of s.ships){if(o===t||o.hp<=0)continue;const d2=(o.x-280)**2+(o.y-280)**2;if(d2<bestD){bestD=d2;best=o;}}
          if(!best)break;best.hp-=s.dmg*0.5;
          if(best.hp<=0){s.flux+=6+s.wave;s.fluxEarned=(s.fluxEarned??0)+6+s.wave;s.kills=(s.kills??0)+1;if(best.cache){const e=best.essence*essenceMult;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}}}}
    }
    if(s.ships.some(x=>x.hp<=0))s.ships=s.ships.filter(x=>x.hp>0);}
  s._acc=shots;
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;sh.x+=dx/d*sh.speed*dt;sh.y+=dy/d*sh.speed*dt;
    if(d<26){s.hull-=sh.dmg*dt*2;const alive=sh.hp>0;sh.hp-=s.dmg*dt*0.5;
      if(alive&&sh.hp<=0){s.flux+=6+s.wave;s.fluxEarned=(s.fluxEarned??0)+6+s.wave;s.kills=(s.kills??0)+1;if(sh.cache){const em=(s as unknown as {_essenceMult?:number})._essenceMult??1;const e=sh.essence*em;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}}}}
  s.ships=s.ships.filter(x=>x.hp>0);
  s.hull=Math.min(s.maxHull,s.hull+(s.regen??0)*dt);
  s.hull=Math.max(0,s.hull); s.timeS=(s.timeS??0)+dt;
  if(isDead(s)) return;
  if(s.ships.length===0){s.wave+=1;}
}
