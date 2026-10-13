import {startLoop} from './game/loop.js';import {drawSpace} from './game/render.js';import {freshState} from './game/state.js';import {tickSim} from './game/update.js';import {renderHud} from './ui/hud.js';import {buyUpgrade} from './ui/panel.js';
const cv=document.getElementById('game') as HTMLCanvasElement;
const ctx=cv.getContext('2d')!;
function fit(){cv.width=560*devicePixelRatio;cv.height=560*devicePixelRatio;}
fit();addEventListener('resize',fit);
const s=freshState();
const loop=startLoop(cv,(dt)=>tickSim(s,dt),()=>{ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);drawSpace(ctx,560,560,performance.now());ctx.restore();renderHud(s);});
function wire(id:string,fn:()=>void){const el=document.getElementById(id);if(el)el.addEventListener('click',()=>{fn();renderHud(s);});}
wire('buy-dmg',()=>{buyUpgrade(s,'dmg');});
wire('buy-rate',()=>{buyUpgrade(s,'rate');});
wire('buy-maxHull',()=>{buyUpgrade(s,'maxHull');});
wire('btn-speed-1',()=>loop.setSpeed(1));
wire('btn-speed-2',()=>loop.setSpeed(2));
wire('btn-speed-4',()=>loop.setSpeed(4));
const pauseBtn=document.getElementById('btn-pause');
if(pauseBtn)pauseBtn.addEventListener('click',()=>{
  const p=!loop.isPaused();loop.setPaused(p);pauseBtn.textContent=p?'Resume':'Pause';
});
renderHud(s);
