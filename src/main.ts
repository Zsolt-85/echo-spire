import {startLoop} from './game/loop.js';import {drawSpace} from './game/render.js';import {freshState} from './game/state.js';import {tickSim} from './game/update.js';import {renderHud} from './ui/hud.js';import {buyUpgrade} from './ui/panel.js';import {saveGame,loadGame} from './state/save.js';import {collapseRun} from './state/prestige.js';
const cv=document.getElementById('game') as HTMLCanvasElement;
const ctx=cv.getContext('2d')!;
function fit(){cv.width=560*devicePixelRatio;cv.height=560*devicePixelRatio;}
fit();addEventListener('resize',fit);
const s=freshState();
try{
  const saved=loadGame();
  if(saved){
    if(typeof saved.wave==='number'&&saved.wave>=1)s.wave=Math.floor(saved.wave);
    if(typeof saved.flux==='number')s.flux=saved.flux+(saved.offlineFlux??0);
    if(typeof saved.essence==='number')s.essence=saved.essence;
    if(typeof saved.cores==='number')s.cores=saved.cores;
    if(saved.levels&&typeof saved.levels==='object')s.levels=saved.levels;
    if(Array.isArray(saved.augments))s.augments=saved.augments;
    if(typeof saved.maxHull==='number'){s.maxHull=saved.maxHull;s.hull=saved.hull??saved.maxHull;}
    if(typeof saved.dmg==='number')s.dmg=saved.dmg;
    if(typeof saved.rate==='number')s.rate=saved.rate;
    if(typeof saved.range==='number')s.range=saved.range;
  }
}catch{/* corrupt save: fresh start, backup preserved by loadGame */}
const loop=startLoop(cv,(dt)=>tickSim(s,dt),()=>{ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);drawSpace(ctx,560,560,performance.now(),s);ctx.restore();renderHud(s);});
function wire(id:string,fn:()=>void){const el=document.getElementById(id);if(el)el.addEventListener('click',()=>{fn();renderHud(s);});}
wire('buy-dmg',()=>{buyUpgrade(s,'dmg');});
wire('buy-rate',()=>{buyUpgrade(s,'rate');});
wire('buy-maxHull',()=>{buyUpgrade(s,'maxHull');});
wire('btn-speed-1',()=>loop.setSpeed(1));
wire('btn-speed-2',()=>loop.setSpeed(2));
wire('btn-speed-4',()=>loop.setSpeed(4));
wire('btn-collapse',()=>{
  const gained=collapseRun(s);
  if(gained>0){saveGame(s);}
  else{
    // Below gate: flash the requirement via button label, no state change.
    const el=document.getElementById('btn-collapse');
    if(el){const t=el.textContent;el.textContent=`Collapse (needs wave 50, have ${s.wave})`;setTimeout(()=>{el.textContent=t;},1200);}
  }
});
if(typeof window!=='undefined'){
  setInterval(()=>{try{saveGame(s);}catch{}},10000);
  addEventListener('pagehide',()=>{try{saveGame(s);}catch{}});
}
const pauseBtn=document.getElementById('btn-pause');
if(pauseBtn)pauseBtn.addEventListener('click',()=>{
  const p=!loop.isPaused();loop.setPaused(p);pauseBtn.textContent=p?'Resume':'Pause';
});
renderHud(s);
