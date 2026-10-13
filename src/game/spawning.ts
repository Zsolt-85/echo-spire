import type {GameState} from './state.js';import {enemyHp,enemyDmg} from '../sim/balance.js';
export function spawnWave(s:GameState){
  const count=4+Math.floor(s.wave*0.7);
  for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2;
    s.ships.push({id:s.nextId++,kind:i%7===6?'hex':i%3===2?'bomber':'dart',
      x:280+Math.cos(a)*260,y:280+Math.sin(a)*260,hp:enemyHp(s.wave),dmg:enemyDmg(s.wave),speed:22+s.wave*0.4,essence:0});}
}
