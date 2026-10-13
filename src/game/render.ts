import {drawMothership,SHIP_PATHS} from './ships.js';
import {RIFT_POS} from './rifts.js';
import type {GameState} from './state.js';
const KIND_STYLE:Record<string,string>={dart:'#7dd3fc',bomber:'#f0abfc',hex:'#a78bfa'};
const CACHE_STYLE='#ffd700';
export function drawSpace(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,s?:GameState|null){
  ctx.fillStyle='#05070f';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';for(let i=0;i<60;i++){ctx.globalAlpha=.5;ctx.fillRect((i*97)%w,(i*57)%h,1.5,1.5);}ctx.globalAlpha=1;
  // Void rifts (spec §3.4): violet rings at every RIFT_POS.
  for(const [rx,ry] of RIFT_POS){
    ctx.save();ctx.translate(rx,ry);
    ctx.globalAlpha=.85;ctx.strokeStyle='#8b5cf6';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,26,14+Math.sin(t/500+rx)*2,rx,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.3;ctx.beginPath();ctx.ellipse(0,0,34,20,rx,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
  const hpFrac=s?Math.max(0,Math.min(1,s.hull/s.maxHull)):1;
  drawMothership(ctx,w/2,h/2,hpFrac,t);
  // Enemy spacecrafts + golden Cache Ship, drawn from the shared SHIP_PATHS lib.
  if(s)for(const sh of s.ships){
    const path=SHIP_PATHS[sh.kind];if(!path)continue;
    const cache=!!sh.cache;
    ctx.save();ctx.translate(sh.x,sh.y);
    ctx.rotate(Math.atan2(280-sh.y,280-sh.x)+Math.PI/2);
    const sc=cache?1:0.8;ctx.scale(sc,sc);ctx.translate(-20,-18);
    ctx.fillStyle=cache?CACHE_STYLE:(KIND_STYLE[sh.kind]??'#fff');
    ctx.globalAlpha=cache?1:.9;ctx.fill(path);
    if(cache){ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke(path);}
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
