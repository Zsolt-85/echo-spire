import type {GameState} from '../game/state.js';import {upgradeCost} from './panel.js';import {applyAugment} from '../game/rifts.js';
function txt(id:string,v:string){const el=document.getElementById(id);if(el)el.textContent=v;}
export function renderHud(s:GameState):void{
  if(typeof document==='undefined')return;
  const lv=(s as unknown as {levels?:Record<string,number>}).levels??{};
  txt('hud-wave',String(s.wave));
  txt('hud-hull',`${Math.max(0,Math.ceil(s.hull))}/${s.maxHull}`);
  txt('hud-flux',String(Math.floor(s.flux)));
  txt('hud-essence',String(s.essence??0));
  txt('cost-dmg',String(upgradeCost('dmg',lv['dmg']??0)));
  txt('cost-rate',String(upgradeCost('rate',lv['rate']??0)));
  txt('cost-maxHull',String(upgradeCost('maxHull',lv['maxHull']??0)));
  renderAugmentModal(s);
}
export function renderAugmentModal(s:GameState):void{
  if(typeof document==='undefined')return;
  const modal=document.getElementById('augment-modal');
  const box=document.getElementById('augment-opts');
  if(!modal||!box)return;
  const opts=s.pendingAugment;
  if(!opts||opts.length===0){modal.style.display='none';box.replaceChildren();return;}
  modal.style.display='flex';
  if(box.childElementCount!==opts.length){
    box.replaceChildren();
    for(const o of opts){
      const b=document.createElement('button');
      b.textContent=o;
      b.addEventListener('click',()=>{applyAugment(s,o);renderHud(s);});
      box.appendChild(b);
    }
  }
}
