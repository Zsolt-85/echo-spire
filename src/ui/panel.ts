import {costFor,BASE} from '../sim/balance.js';import type {GameState} from '../game/state.js';
export type Stat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce';
// Canonical tuning lives in balance.ts (plan Global Constraint); re-exported
// here so existing imports keep working.
export {BASE};
type WithLevels=GameState&{levels?:Record<string,number>};
export function upgradeCost(stat:Stat,lvl:number):number{return costFor(BASE[stat].base,BASE[stat].growth,lvl);}
export function buyUpgrade(s:GameState,stat:Stat):boolean{
  const st=s as WithLevels;
  const lvl=st.levels?.[stat]??0;const c=upgradeCost(stat,lvl);
  if(s.flux<c) return false;s.flux-=c;st.levels=st.levels??{};st.levels[stat]=lvl+1;
  if(stat==='dmg')s.dmg=Math.round(s.dmg*1.12+2);if(stat==='rate')s.rate=Math.round((s.rate+0.08)*100)/100;if(stat==='maxHull'){s.maxHull=Math.round(s.maxHull*1.1+50);s.hull=s.maxHull;}if(stat==='range')s.range+=15;if(stat==='regen')s.regen+=1.5;if(stat==='crit')s.critCh+=0.02;if(stat==='volley')s.volley+=1;if(stat==='bounce')s.bounce+=1;
  return true;
}
