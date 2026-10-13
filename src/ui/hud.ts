import type {GameState} from '../game/state.js';import {upgradeCost} from './panel.js';
function txt(id:string,v:string){const el=document.getElementById(id);if(el)el.textContent=v;}
export function renderHud(s:GameState):void{
  if(typeof document==='undefined')return;
  const lv=(s as unknown as {levels?:Record<string,number>}).levels??{};
  txt('hud-wave',String(s.wave));
  txt('hud-hull',`${Math.max(0,Math.ceil(s.hull))}/${s.maxHull}`);
  txt('hud-flux',String(Math.floor(s.flux)));
  txt('cost-dmg',String(upgradeCost('dmg',lv['dmg']??0)));
  txt('cost-rate',String(upgradeCost('rate',lv['rate']??0)));
  txt('cost-maxHull',String(upgradeCost('maxHull',lv['maxHull']??0)));
}
