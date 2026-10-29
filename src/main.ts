import {startLoop} from './game/loop.js';import {drawSpace} from './game/render.js';import {freshState} from './game/state.js';import {tickSim} from './game/update.js';import {renderHud} from './ui/hud.js';import {buyUpgrade} from './ui/panel.js';import {saveGame,loadGame,wipeSave,isFreshBoot,hadLegacySave} from './state/save.js';import {collapseRun} from './state/prestige.js';import {showMenu,showGameOver,hideOverlays,getPhase,setMenuView,menuView} from './ui/menu.js';import {isDead,endRun,restartRun} from './game/lifecycle.js';import {recomputeStats,buyWorkshop,WORKSHOP_STATS} from './state/workshop.js';import {drawMothership,defaultMotion,menuRingRadius} from './game/mothership.js';
import {setForgeTab,setWsTab} from './ui/tabs.js';
import {wsBatchOf,wsBatchUnlocked,lifetimeCores} from './state/training.js';
import {WS_BATCH_COST} from './sim/balance.js';
import {buyUlt,fireUlt,ULTS} from './game/ultimates.js';
import {startResearch,progressTraining,advanceOffline,trainingLevel,speedUnlocked,switchResearch,setAuto,autoOn,THREADS,TRAIN_SKILLS,labOfflineMult,migrateDuplicates,RESEARCH_LINES,type LineId} from './state/training.js';
import {WAVESKIP_CMD} from './sim/balance.js';
const cv=document.getElementById('game') as HTMLCanvasElement;
const ctx=cv.getContext('2d')!;
const mcv=document.getElementById('menu-ship') as HTMLCanvasElement|null;
const mctx=mcv?mcv.getContext('2d')!:null;
function fitMenu(){if(!mcv)return;mcv.width=Math.ceil(innerWidth*devicePixelRatio);mcv.height=Math.ceil(innerHeight*devicePixelRatio);}
fitMenu();addEventListener('resize',fitMenu);
function fit(){cv.width=560*devicePixelRatio;cv.height=560*devicePixelRatio;}
fit();addEventListener('resize',fit);
const s=freshState();
if(typeof location!=='undefined'&&isFreshBoot(location.search))wipeSave();
// v2 clean break (grind-economy plan Task 4): a v1 payload refuses to load
// (version gate in loadGame), so flag it for the menu notice, then wipe the
// stale bytes — backup follows on the next persist.
try{
  if(hadLegacySave()){
    const n=document.getElementById('menu-notice');
    if(n)n.textContent='Economy rebalanced — fresh start (old save retired)';
    wipeSave();
  }
}catch{/* notice best-effort; boot continues fresh */}
try{
  const saved=loadGame();
  if(saved){
    if(typeof saved.wave==='number'&&saved.wave>=1)s.wave=Math.floor(saved.wave);
    if(typeof saved.flux==='number')s.flux=saved.flux;
    if(typeof saved.essence==='number')s.essence=saved.essence;
    if(typeof saved.cores==='number')s.cores=saved.cores;
    if(typeof (saved as unknown as {lifetimeCoresSpent?:unknown}).lifetimeCoresSpent==='number')s.lifetimeCoresSpent=Math.max(0,Math.floor((saved as unknown as {lifetimeCoresSpent:number}).lifetimeCoresSpent));
    if(typeof (saved as unknown as {shards?:unknown}).shards==='number')s.shards=(saved as unknown as {shards:number}).shards;
    if(saved.levels&&typeof saved.levels==='object')s.levels=saved.levels;
    if(saved.workshop&&typeof saved.workshop==='object')s.workshop=saved.workshop;
    {const u=(saved as unknown as {ult?:unknown}).ult;
    if(u&&typeof u==='object'){const r=u as Record<string,unknown>;s.ult={nova:!!r.nova,overdrive:!!r.overdrive,aegis:!!r.aegis};}}
    if(Array.isArray(saved.augments))s.augments=saved.augments;
    if(typeof saved.maxHull==='number'){s.maxHull=saved.maxHull;s.hull=saved.hull??saved.maxHull;}
    if(typeof saved.dmg==='number')s.dmg=saved.dmg;
    if(typeof saved.rate==='number')s.rate=saved.rate;
    if(typeof saved.range==='number')s.range=saved.range;
    if(saved.training&&typeof saved.training==='object')(s as any).training=saved.training;
    try{migrateDuplicates(s);}catch{/* migration best-effort; boot continues */}
    if(typeof saved.offlineFlux==='number'&&saved.offlineFlux>0){
      s.flux+=Math.round(saved.offlineFlux*labOfflineMult(s));
    }
    try{
      const elapsed=typeof saved.ts==='number'?Date.now()-saved.ts:0;
      if(elapsed>0)advanceOffline(s,elapsed);
    }catch{/* offline training best-effort */}
    progressTraining(s);
    recomputeStats(s);
    // Saved shield pool survives only up to the recomputed max.
    if(typeof (saved as unknown as {shield?:unknown}).shield==='number')s.shield=Math.min(Math.max(0,(saved as unknown as {shield:number}).shield),s.shieldMax??0);
  }
}catch{/* corrupt save: fresh start, backup preserved by loadGame */}
let best=1;
try{const sv:any=loadGame();if(sv){if(typeof sv.best==='number')best=Math.floor(sv.best);else if(typeof sv.wave==='number'&&sv.wave>=1)best=Math.floor(sv.wave);}}catch{}
(s as unknown as {best?:number}).best=best;
function persist():void{best=Math.max(best,s.wave);(s as unknown as {best?:number}).best=best;try{saveGame({...s,best} as any);}catch{}}
let lastDraw:number|null=null;
function finishRun():void{const prev=best;const sum=endRun(s);persist();showGameOver(sum,prev);loop.setPaused(true);}
const loop=startLoop(cv,(dt)=>{if(getPhase()!=='run')return;tickSim(s,dt);if(isDead(s))finishRun();},()=>{const now=performance.now();const dt=Math.min(0.1,(now-(lastDraw??now))/1000);lastDraw=now;ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);drawSpace(ctx,560,560,now,s,dt);ctx.restore();if(mctx&&getPhase()==='menu'){mctx.save();mctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);mctx.clearRect(0,0,innerWidth,innerHeight);drawMothership(mctx,innerWidth/2,innerHeight/2,{r:menuRingRadius(innerWidth,innerHeight),hpFrac:1,t:now,motion:defaultMotion('menu')});mctx.restore();}renderHud(s);});
function wire(id:string,fn:()=>void){const el=document.getElementById(id);if(el)el.addEventListener('click',()=>{fn();renderHud(s);});}
wire('buy-dmg',()=>{buyUpgrade(s,'dmg');});
wire('buy-rate',()=>{buyUpgrade(s,'rate');});
wire('buy-maxHull',()=>{buyUpgrade(s,'maxHull');});
wire('buy-range',()=>{buyUpgrade(s,'range');});
wire('buy-regen',()=>{buyUpgrade(s,'regen');});
wire('buy-crit',()=>{buyUpgrade(s,'crit');});
wire('buy-volley',()=>{buyUpgrade(s,'volley');});
wire('buy-bounce',()=>{buyUpgrade(s,'bounce');});
for(const st of WORKSHOP_STATS){wire(`btn-ws-${st}`,()=>{
  // Batch wires respect the invest ladder: locked batches refuse with a
  // flashed requirement instead of spending cores (buyWorkshop also refuses).
  const batch=wsBatchOf(st);
  if(!wsBatchUnlocked(s,batch)){
    const el=document.getElementById(`btn-ws-${st}`);
    if(el){const t=el.textContent;el.textContent=`Batch ${batch} — invest ${WS_BATCH_COST[batch-1] ?? 0} core-equiv (${lifetimeCores(s)}/${WS_BATCH_COST[batch-1] ?? 0})`;setTimeout(()=>{if(t)el.textContent=t;},1200);}
    return;
  }
  if(buyWorkshop(s,st))persist();
});}
wire('tab-forge-weapons',()=>{setForgeTab('weapons');});
wire('tab-forge-hull',()=>{setForgeTab('hull');});
wire('tab-forge-systems',()=>{setForgeTab('systems');});
wire('tab-ws-batch1',()=>{setWsTab('batch1');});
wire('tab-ws-batch2',()=>{setWsTab('batch2');});
wire('tab-ws-batch3',()=>{setWsTab('batch3');});
wire('tab-ws-ultimates',()=>{setWsTab('ultimates');});
for(const id of ULTS){wire(`btn-ult-${id}`,()=>{if(buyUlt(s,id))persist();});}
for(const id of ULTS){wire(`btn-fire-${id}`,()=>{fireUlt(s,id);});}
function markSpeed(id:string){for(const b of ['btn-speed-1','btn-speed-2','btn-speed-4','btn-speed-8']){const e=document.getElementById(b);if(e)e.classList.toggle('on',b===id);}}
function gateSpeed(min:number,label:string,apply:()=>void){
  if(speedUnlocked(s)>=min){apply();return;}
  const map:Record<number,string>={2:'Logistics 1',4:'Logistics 4',8:'Logistics 8'};
  const el=document.getElementById(label);
  if(el){const t=el.textContent;el.textContent=`${label.replace('btn-speed-','x')} (needs ${map[min]})`;setTimeout(()=>{if(t)el.textContent=t;},1200);}
}
wire('btn-speed-1',()=>{loop.setSpeed(1);markSpeed('btn-speed-1');});
wire('btn-speed-2',()=>{gateSpeed(2,'btn-speed-2',()=>{loop.setSpeed(2);markSpeed('btn-speed-2');});});
wire('btn-speed-4',()=>{gateSpeed(4,'btn-speed-4',()=>{loop.setSpeed(4);markSpeed('btn-speed-4');});});
wire('btn-speed-8',()=>{gateSpeed(8,'btn-speed-8',()=>{loop.setSpeed(8);markSpeed('btn-speed-8');});});
markSpeed('btn-speed-1');
let skipOn=false;
wire('btn-skip',()=>{skipOn=!skipOn;const el=document.getElementById('btn-skip');if(el)el.classList.toggle('on',skipOn);});
function launch():void{restartRun(s);recomputeStats(s);s.shield=s.shieldMax??0;if(skipOn&&trainingLevel(s,'command')>=WAVESKIP_CMD)s.wave=10;hideOverlays();loop.setPaused(false);}
wire('btn-retreat',()=>{if(getPhase()==='run')finishRun();});
wire('btn-endrun',()=>{if(getPhase()==='run')finishRun();});
wire('btn-collapse',()=>{  const gained=collapseRun(s);
  if(gained>0){persist();}
  else{
    // Below gate: flash the requirement via button label, no state change.
    const el=document.getElementById('btn-collapse');
    if(el){const t=el.textContent;el.textContent=`Collapse (needs wave 50, have ${s.wave})`;setTimeout(()=>{el.textContent=t;},1200);}
  }
});
wire('btn-launch',()=>{launch();});
wire('btn-launch-secondary',()=>{launch();});
wire('tab-menu-home',()=>{setMenuView('home');});
wire('btn-back',()=>{setMenuView('home');});
wire('btn-wipe',()=>{
  const b=document.getElementById('btn-wipe');
  if(b&&(b as HTMLElement).dataset.armed==='1'){wipeSave();if(typeof location!=='undefined')location.reload();return;}
  if(b){
    (b as HTMLElement).dataset.armed='1';const t=b.textContent;b.textContent='Sure? Click again to erase everything';
    setTimeout(()=>{(b as HTMLElement).dataset.armed='';if(t)b.textContent=t;},3000);
  }
});
wire('btn-relaunch',()=>{launch();});
wire('btn-menu-workshop',()=>{setMenuView('workshop');showMenu(best);loop.setPaused(true);});
wire('tab-menu-workshop',()=>{setMenuView('workshop');});
wire('tab-menu-academy',()=>{setMenuView('academy');});
for(const t of THREADS){for(const sk of TRAIN_SKILLS){wire(`btn-train-${t}-${sk}`,()=>{startResearch(s,t,sk,Date.now(),Math.max(best,s.wave));});}}
for(const [id, l] of Object.entries(RESEARCH_LINES) as [LineId, unknown][]){wire(`btn-lab-${id}`,()=>{if(startResearch(s,'t0',id,Date.now(),Math.max(best,s.wave)))persist();});}
for(const t of THREADS){
  wire(`btn-switch-${t}`,()=>{const pick=document.getElementById(`lab-pick-${t}`) as HTMLSelectElement|null;const line=((pick?.value ?? 'gunnery') as LineId);switchResearch(s,t,line,Date.now(),Math.max(best,s.wave));});
  wire(`btn-auto-${t}`,()=>{setAuto(s,t,!autoOn(s,t));});
}
wire('btn-over-menu',()=>{showMenu(best);loop.setPaused(true);});
showMenu(best);loop.setPaused(true);
if(typeof window!=='undefined'){
  setInterval(()=>{persist();},10000);
  setInterval(()=>{progressTraining(s);renderHud(s);},5000);
  addEventListener('pagehide',()=>{persist();});
}
const pauseBtn=document.getElementById('btn-pause');
if(pauseBtn)pauseBtn.addEventListener('click',()=>{
  const p=!loop.isPaused();loop.setPaused(p);pauseBtn.textContent=p?'Resume':'Pause';
});
renderHud(s);
