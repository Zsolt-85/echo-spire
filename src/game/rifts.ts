import type {GameState} from './state.js';
export const RIFT_POS=[[70,70],[490,120],[90,470]] as const;
export const AUGMENT_CHOICES=['Split rounds +1 bounce','Crit surge +10%','Halo thorns'] as const;
export function maybeSpawnSurge(s:GameState):boolean{
  if(s.wave<10||s.wave%5!==0) return false;
  if(s._surgeWave===s.wave) return false;
  s._surgeWave=s.wave;
  s.ships.push({id:s.nextId++,kind:'hex',x:RIFT_POS[0][0],y:RIFT_POS[0][1],hp:200+s.wave*20,dmg:0,speed:14,essence:15,cache:true});
  return true;
}
export function offerAugment():string[]{return [...AUGMENT_CHOICES];}
export function applyAugment(s:GameState,pick:string):void{
  s.augments=s.augments??[];
  s.augments.push(pick);
  s.pendingAugment=null;
  if(pick.startsWith('Split rounds')){s.dmg=Math.round(s.dmg*1.1+1);}
  else if(pick.startsWith('Crit surge')){s.rate=Math.round((s.rate*1.1+0.05)*100)/100;}
  else{s.maxHull=Math.round(s.maxHull*1.08+30);s.hull=Math.min(s.maxHull,s.hull+Math.round(s.maxHull*0.25));}
}
