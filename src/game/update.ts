import type {GameState} from './state.js';import {spawnWave} from './spawning.js';export {freshState} from './state.js';export {spawnWave} from './spawning.js';
export function tickSim(s:GameState,dt:number){
  if(s.ships.length===0) spawnWave(s);
  // mothership fire: nearest in range
  s.ships.sort((a,b)=>((a.x-280)**2+(a.y-280)**2)-((b.x-280)**2+(b.y-280)**2));
  let shots=s.rate*dt, guard=20;
  while(shots>=1&&guard-->0&&s.ships.length){shots-=1;const t=s.ships[0];
    if((t.x-280)**2+(t.y-280)**2<=s.range**2){t.hp-=s.dmg;if(t.hp<=0){s.flux+=6+s.wave;s.ships.shift();}}}
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;sh.x+=dx/d*sh.speed*dt;sh.y+=dy/d*sh.speed*dt;
    if(d<26){s.hull-=sh.dmg*dt*2;sh.hp-=s.dmg*dt*0.5;}}
  s.ships=s.ships.filter(x=>x.hp>0);
  if(s.ships.length===0){s.wave+=1;}
}
