import type {GameState} from './state.js';import {isDead} from './lifecycle.js';import {spawnWave} from './spawning.js';import {enemyHp,enemyDmg,fluxForKill,costFor,ULT_OD_MULT,BASE,AUTOFORGE_ENG} from '../sim/balance.js';import {ultChargeForKill} from './ultimates.js';import {maybeSpawnSurge,offerAugment} from './rifts.js';export {freshState} from './state.js';export {spawnWave} from './spawning.js';
import {trainingMult,trainingLevel} from '../state/training.js';import {buyUpgrade,type Stat} from '../ui/panel.js';
function buyCheapest(s:GameState):void{
  const stats:Stat[]=['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
  let best:Stat|null=null;let bestC=Infinity;
  for(const st of stats){const lvl=(s.levels as Record<string,number>|undefined)?.[st]??0;const c=costFor(BASE[st].base,BASE[st].growth,lvl);if(c<bestC){bestC=c;best=st;}}
  if(best&&s.flux>=bestC)buyUpgrade(s,best);
}
export function trainingAutoForge(s:GameState,dt:number):void{
  if((s.timeS??0)%1<dt&&trainingLevel(s,'engineering')>=AUTOFORGE_ENG)buyCheapest(s);
}
export function tickSim(s:GameState,dt:number){
  s.fx=s.fx??[];
  const dmgEff=s.dmg*trainingMult(s);
  const pushFx=(e:{kind:'beam'|'spark'|'flash';x:number;y:number;tx:number;ty:number;ttl:number})=>{s.fx!.push(e);if(s.fx!.length>60)s.fx!.splice(0,s.fx!.length-60);};
  if((s._queue??0)>0){s._timer=(s._timer??0)-dt;const gap=Math.max(0.15,1.1-s.wave*0.008);while((s._timer??0)<=0&&(s._queue??0)>0){const id=s.nextId;const a=id*2.399963229728653;const kind=id%7===6?'hex':id%3===2?'bomber':'dart';s.ships.push({id:s.nextId++,kind,x:280+Math.cos(a)*260,y:280+Math.sin(a)*260,hp:enemyHp(s.wave),dmg:enemyDmg(s.wave),speed:22+s.wave*0.4,essence:0,behavior:id%3===2?'roamer':'seeker',wander:Math.random()*Math.PI*2});s._queue=(s._queue??1)-1;s._timer=(s._timer??0)+gap;}}
  if(s.ships.length===0&&(s._queue??0)<=0){spawnWave(s);maybeSpawnSurge(s);
    if(s.wave>=10&&s.wave%10===0&&s._augmentWave!==s.wave&&!s.pendingAugment){s.pendingAugment=offerAugment();s._augmentWave=s.wave;}}
  // mothership fire: nearest in range, volley/crit/bounce
  s.ships.sort((a,b)=>((a.x-280)**2+(a.y-280)**2)-((b.x-280)**2+(b.y-280)**2));
  const essenceMult=(s as unknown as {_essenceMult?:number})._essenceMult??1;
  const targets=1+Math.floor((s.volley??0)/3);
  const odRate=s.rate*((s.timeS??0)<(s.odUntil??0)?ULT_OD_MULT:1);
  let shots=(s._acc??0)+odRate*dt, guard=20;
  while(shots>=1&&guard-->0&&s.ships.length){shots-=1;
    let hits=0;
    for(const t of s.ships){
      if(hits>=targets)break;
      if(t.hp<=0)continue;
      if((t.x-280)**2+(t.y-280)**2>s.range**2)continue;
      let dmg=dmgEff;
      if(Math.random()<(s.critCh??0))dmg*=2;
      t.hp-=dmg;hits++;
      pushFx({kind:'beam',x:280,y:280,tx:t.x,ty:t.y,ttl:0.12});
      if(t.hp<=0){pushFx({kind:'spark',x:t.x,y:t.y,tx:t.x,ty:t.y,ttl:0.3});s.flux+=fluxForKill(s.wave);s.fluxEarned=(s.fluxEarned??0)+fluxForKill(s.wave);s.kills=(s.kills??0)+1;if(t.cache){const e=t.essence*essenceMult;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}ultChargeForKill(s,!!t.cache);
        const chains=Math.floor((s.bounce??0)/2);
        for(let c=0;c<chains;c++){let best:null|typeof t=null;let bestD=Infinity;
          for(const o of s.ships){if(o===t||o.hp<=0)continue;const d2=(o.x-280)**2+(o.y-280)**2;if(d2<bestD){bestD=d2;best=o;}}
          if(!best)break;best.hp-=dmgEff*0.5;
          if(best.hp<=0){pushFx({kind:'spark',x:best.x,y:best.y,tx:best.x,ty:best.y,ttl:0.3});s.flux+=fluxForKill(s.wave);s.fluxEarned=(s.fluxEarned??0)+fluxForKill(s.wave);s.kills=(s.kills??0)+1;if(best.cache){const e=best.essence*essenceMult;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}ultChargeForKill(s,!!best.cache);}}}
    }
    if(s.ships.some(x=>x.hp<=0))s.ships=s.ships.filter(x=>x.hp>0);}
  s._acc=shots;
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;
    if(sh.behavior==='roamer'){const px=-dy/d,py=dx/d;const tt=(s.timeS??0)+dt;const strafe=Math.sin((sh.wander??0)+tt)*40*dt;sh.x+=dx/d*sh.speed*dt+px*strafe;sh.y+=dy/d*sh.speed*dt+py*strafe;sh.wander=(sh.wander??0)+1.5*dt;}
    else{sh.x+=dx/d*sh.speed*dt;sh.y+=dy/d*sh.speed*dt;}
    if(d<26){if((s.timeS??0)>=(s.aegisUntil??0))s.hull-=sh.dmg*dt*4;
      if(!s.fx!.some(e=>e.kind==='flash'))pushFx({kind:'flash',x:280,y:280,tx:280,ty:280,ttl:0.15});
      const alive=sh.hp>0;sh.hp-=dmgEff*dt*0.5;
      if(alive&&sh.hp<=0){pushFx({kind:'spark',x:sh.x,y:sh.y,tx:sh.x,ty:sh.y,ttl:0.3});s.flux+=fluxForKill(s.wave);s.fluxEarned=(s.fluxEarned??0)+fluxForKill(s.wave);s.kills=(s.kills??0)+1;if(sh.cache){const em=(s as unknown as {_essenceMult?:number})._essenceMult??1;const e=sh.essence*em;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}ultChargeForKill(s,!!sh.cache);}}}
  s.ships=s.ships.filter(x=>x.hp>0);
  s.hull=Math.min(s.maxHull,s.hull+(s.regen??0)*dt);
  s.hull=Math.max(0,s.hull); s.timeS=(s.timeS??0)+dt;
  if(isDead(s)) return;
  trainingAutoForge(s,dt);
  if((s._queue??0)<=0&&s.ships.length===0){s.wave+=1;}
}
