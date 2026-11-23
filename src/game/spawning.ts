import type {GameState} from './state.js';import {enemyHp,enemyDmg,BOSS_EVERY,BOSS_HP_MULT,BOSS_DMG_MULT} from '../sim/balance.js';import {nextRandom} from '../sim/rng.js';
export function spawnWave(s:GameState){
  const budget=4+Math.floor(s.wave*0.7);
  const released=Math.min(2,budget);
  for(let k=0;k<released;k++){const id=s.nextId;
    const a=(k/budget)*Math.PI*2;
    const kind=id%7===6?'hex':id%3===2?'bomber':'dart';
    s.ships.push({id:s.nextId++,kind,
      x:280+Math.cos(a)*260,y:280+Math.sin(a)*260,hp:enemyHp(s.wave),dmg:enemyDmg(s.wave),speed:22+s.wave*0.4,essence:0,
      behavior:id%3===2?'roamer':'seeker',wander:nextRandom(s)*Math.PI*2});}
  s._queue=budget-released;s._timer=0;
  if(s.wave%BOSS_EVERY===0&&s.wave>0){
    s.ships.push({id:s.nextId++,kind:'hex',x:280+Math.cos(0)*260,y:280+Math.sin(0)*260,hp:enemyHp(s.wave)*BOSS_HP_MULT,dmg:enemyDmg(s.wave)*BOSS_DMG_MULT,speed:10,essence:0,boss:true,behavior:'seeker',wander:0});
  }
}
export type WaveIntel = { count: number; hp: number; dmg: number; speed: number };
export function waveIntel(wave: number): WaveIntel {
  return { count: 4 + Math.floor(wave * 0.7), hp: enemyHp(wave), dmg: enemyDmg(wave), speed: 22 + wave * 0.4 };
}
