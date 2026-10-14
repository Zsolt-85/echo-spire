import type {GameState} from '../game/state.js';import {upgradeCost, type Stat} from './panel.js';import {applyAugment} from '../game/rifts.js';import {WORKSHOP_STATS,workshopCost, type WorkshopStat} from '../state/workshop.js';
import {describeStat, describeWorkshop, upgradeBlurb} from './cards.js';
function txt(id:string,v:string){const el=document.getElementById(id);if(el)el.textContent=v;}
const FORGE_STATS:Stat[]=['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
function setAfford(cardId:string,btnId:string,afford:boolean):void{
  const card=document.getElementById(cardId);
  if(card){card.classList.toggle('afford',afford);card.classList.toggle('dim',!afford);}
  const btn=document.getElementById(btnId) as HTMLButtonElement|null;
  if(btn){btn.disabled=!afford;btn.classList.toggle('afford',afford);btn.classList.toggle('dim',!afford);}
}
export function renderHud(s:GameState):void{
  if(typeof document==='undefined')return;
  const lv=(s as unknown as {levels?:Record<string,number>}).levels??{};
  txt('hud-wave',String(s.wave));
  txt('hud-hull',`${Math.max(0,Math.ceil(s.hull))}/${s.maxHull}`);
  txt('hud-flux',String(Math.floor(s.flux)));
  txt('hud-essence',String(s.essence??0));
  txt('hud-cores',String(s.cores??0));
  txt('menu-cores',String(s.cores??0));
  for(const st of FORGE_STATS){
    const d=describeStat(st);
    const lvl=lv[st]??0;
    txt(`card-name-${st}`,d.name);
    txt(`card-desc-${st}`,d.desc);
    txt(`card-cur-${st}`,d.cur(s));
    txt(`card-next-${st}`,d.next(s));
    txt(`card-blurb-${st}`,upgradeBlurb(st,lvl));
    txt(`cost-${st}`,String(upgradeCost(st,lvl)));
    setAfford(`card-${st}`,`buy-${st}`,s.flux>=upgradeCost(st,lvl));
  }
  const w=(s as unknown as {workshop?:Record<string,number>}).workshop??{};
  for(const st of WORKSHOP_STATS){
    const d=describeWorkshop(st as WorkshopStat);
    const lvl=w[st]??0;
    txt(`card-ws-name-${st}`,d.name);
    txt(`card-ws-desc-${st}`,d.desc);
    txt(`card-ws-cur-${st}`,d.cur(s));
    txt(`card-ws-next-${st}`,d.next(s));
    txt(`card-ws-blurb-${st}`,`Lv ${lvl} • ${workshopCost(st as WorkshopStat,lvl)} cores`);
    setAfford(`card-ws-${st}`,`btn-ws-${st}`,(s.cores??0)>=workshopCost(st as WorkshopStat,lvl));
  }
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
