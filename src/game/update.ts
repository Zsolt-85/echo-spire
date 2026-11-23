import type {GameState,Ship} from './state.js';import {isDead} from './lifecycle.js';import {spawnWave} from './spawning.js';import {enemyHp,enemyDmg,fluxForKill,costFor,ULT_OD_MULT,BASE,AUTOFORGE_ENG,SHARD_W_BOSS} from '../sim/balance.js';import {ultChargeForKill} from './ultimates.js';import {maybeSpawnSurge,offerAugment,RIFT_POS,riftIndexForWave} from './rifts.js';export {freshState} from './state.js';export {spawnWave} from './spawning.js';
import {trainingLevel,labFluxMult} from '../state/training.js';import {buyUpgrade,type Stat} from '../ui/panel.js';import {nextRandom} from '../sim/rng.js';
// --- Mega-labs Task 2 mechanics (all guarded: zero-cost when zero) ---
const CRIT_BASE=2; // crits deal (2 + s.critMult)x
const SPLASH_PCT=0.3; // splash deals 30% of s.dmg, single hop, no chain
const SLOW_CAP=0.5; // slowPct effect capped at 0.5
function bossMul(s:GameState,t:Ship):number{return t.boss?1+(s.bossMult??0):1;}
function critMul(s:GameState):number{return CRIT_BASE+(s.critMult??0);}
function slowFactor(s:GameState):number{return 1-Math.min(SLOW_CAP,Math.max(0,s.slowPct??0));}
function creditKill(s:GameState,t:Ship,fluxMult:number,essenceMult:number):void{
  const fgain=Math.round(fluxForKill(s.wave)*fluxMult);s.flux+=fgain;s.fluxEarned=(s.fluxEarned??0)+fgain;s.kills=(s.kills??0)+1;
  if(t.cache){const e=Math.round(t.essence*(1+(s.cacheQuality??0)))*essenceMult;s.essence+=e;s.essenceEarned=(s.essenceEarned??0)+e;}
  if(t.boss)s.shards=(s.shards??0)+SHARD_W_BOSS;ultChargeForKill(s,!!t.cache);
}
function splashFrom(s:GameState,x:number,y:number,fluxMult:number,essenceMult:number,spark:(x:number,y:number)=>void):void{
  const r=s.splashR??0;const dmg=(s.dmg??0)*SPLASH_PCT;
  if(!(r>0)||!(dmg>0))return;
  const r2=r*r;const slain:Ship[]=[];
  for(const o of s.ships){
    if(o.hp<=0)continue;const dx=o.x-x,dy=o.y-y;
    if(dx*dx+dy*dy>r2)continue;
    o.hp-=dmg*bossMul(s,o);
    if(o.hp<=0)slain.push(o);
  }
  for(const d of slain){spark(d.x,d.y);creditKill(s,d,fluxMult,essenceMult);}
  if(slain.length)s.ships=s.ships.filter(x=>x.hp>0);
}
// Bonus surge roll: cacheLuck adds a luck-based extra cache ship on waves
// that can host surges (>=10). luck<=0 short-circuits before the RNG roll so
// zero-luck runs keep the scheduled-only behavior AND the RNG stream.
function spawnBonusSurge(s:GameState):void{
  const rp=RIFT_POS[(riftIndexForWave(s.wave)+1)%RIFT_POS.length];
  s.ships.push({id:s.nextId++,kind:'hex',x:rp[0],y:rp[1],hp:200+s.wave*20,dmg:0,speed:14,essence:15,cache:true});
}
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
  const dmgEff=s.dmg;
  const pushFx=(e:{kind:'beam'|'spark'|'flash';x:number;y:number;tx:number;ty:number;ttl:number})=>{s.fx!.push(e);if(s.fx!.length>60)s.fx!.splice(0,s.fx!.length-60);};
  const spark=(x:number,y:number)=>pushFx({kind:'spark',x,y,tx:x,ty:y,ttl:0.3});
  if((s._queue??0)>0){s._timer=(s._timer??0)-dt;const gap=Math.max(0.15,1.1-s.wave*0.008);while((s._timer??0)<=0&&(s._queue??0)>0){const id=s.nextId;const a=id*2.399963229728653;const kind=id%7===6?'hex':id%3===2?'bomber':'dart';s.ships.push({id:s.nextId++,kind,x:280+Math.cos(a)*260,y:280+Math.sin(a)*260,hp:enemyHp(s.wave),dmg:enemyDmg(s.wave),speed:22+s.wave*0.4,essence:0,behavior:id%3===2?'roamer':'seeker',wander:nextRandom(s)*Math.PI*2});s._queue=(s._queue??1)-1;s._timer=(s._timer??0)+gap;}}
  if(s.ships.length===0&&(s._queue??0)<=0){spawnWave(s);maybeSpawnSurge(s);
    const luck=s.cacheLuck??0;
    if(s.wave>=10&&luck>0&&nextRandom(s)<Math.min(1,luck))spawnBonusSurge(s);
    if(s.wave>=10&&s.wave%10===0&&s._augmentWave!==s.wave&&!s.pendingAugment){s.pendingAugment=offerAugment();s._augmentWave=s.wave;}}
  // mothership fire: nearest in range, volley/crit/bounce
  s.ships.sort((a,b)=>((a.x-280)**2+(a.y-280)**2)-((b.x-280)**2+(b.y-280)**2));
  const essenceMult=(s as unknown as {_essenceMult?:number})._essenceMult??1;
  const fluxMult=labFluxMult(s);
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
      if(nextRandom(s)<(s.critCh??0))dmg*=critMul(s);
      t.hp-=dmg*bossMul(s,t);hits++;
      pushFx({kind:'beam',x:280,y:280,tx:t.x,ty:t.y,ttl:0.12});
      if(t.hp<=0){spark(t.x,t.y);creditKill(s,t,fluxMult,essenceMult);splashFrom(s,t.x,t.y,fluxMult,essenceMult,spark);
        const chains=Math.floor((s.bounce??0)/2);
        for(let c=0;c<chains;c++){let best:null|typeof t=null;let bestD=Infinity;
          for(const o of s.ships){if(o===t||o.hp<=0)continue;const d2=(o.x-280)**2+(o.y-280)**2;if(d2<bestD){bestD=d2;best=o;}}
          if(!best)break;best.hp-=dmgEff*0.5*bossMul(s,best);
          if(best.hp<=0){spark(best.x,best.y);creditKill(s,best,fluxMult,essenceMult);splashFrom(s,best.x,best.y,fluxMult,essenceMult,spark);}}}
    }
    if(s.ships.some(x=>x.hp<=0))s.ships=s.ships.filter(x=>x.hp>0);}
  s._acc=shots;
  const sF=slowFactor(s);const range2=s.range**2;
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;
    const sp=sh.speed*((dx*dx+dy*dy<=range2)?sF:1);
    if(sh.behavior==='roamer'){const px=-dy/d,py=dx/d;const tt=(s.timeS??0)+dt;const strafe=Math.sin((sh.wander??0)+tt)*40*dt;sh.x+=dx/d*sp*dt+px*strafe;sh.y+=dy/d*sp*dt+py*strafe;sh.wander=(sh.wander??0)+1.5*dt;}
    else{sh.x+=dx/d*sp*dt;sh.y+=dy/d*sp*dt;}
    if(d<26){
      // Shield absorbs contact damage first, spill hits hull; aegis still
      // blocks the hull remainder. Thorns reflect contact damage back and can
      // kill (credited normally, single splash hop).
      const contact=sh.dmg*dt*4;
      let rem=contact;
      const sh0=s.shield??0;
      if(sh0>0){const abs=Math.min(sh0,rem);s.shield=sh0-abs;rem-=abs;}
      if(rem>0&&(s.timeS??0)>=(s.aegisUntil??0))s.hull-=rem;
      if(!s.fx!.some(e=>e.kind==='flash'))pushFx({kind:'flash',x:sh.x,y:sh.y,tx:sh.x,ty:sh.y,ttl:0.15});
      const th=s.thorns??0;
      let thornKill=false;
      if(th>0&&contact>0){sh.hp-=th*contact;
        if(sh.hp<=0){spark(sh.x,sh.y);creditKill(s,sh,fluxMult,essenceMult);splashFrom(s,sh.x,sh.y,fluxMult,essenceMult,spark);thornKill=true;}}
      const alive=!thornKill&&sh.hp>0;sh.hp-=dmgEff*dt*0.5*bossMul(s,sh);
      if(alive&&sh.hp<=0){spark(sh.x,sh.y);creditKill(s,sh,fluxMult,essenceMult);splashFrom(s,sh.x,sh.y,fluxMult,essenceMult,spark);}}}
  s.ships=s.ships.filter(x=>x.hp>0);
  s.hull=Math.min(s.maxHull,s.hull+(s.regen??0)*dt);
  s.hull=Math.max(0,s.hull); s.timeS=(s.timeS??0)+dt;
  if(isDead(s)) return;
  trainingAutoForge(s,dt);
  if((s._queue??0)<=0&&s.ships.length===0){s.wave+=1;}
}
