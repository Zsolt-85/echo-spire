import {drawMothership,SHIP_PATHS} from './ships.js';
import {RIFT_POS} from './rifts.js';
import type {GameState} from './state.js';
const KIND_STYLE:Record<string,string>={dart:'#7dd3fc',bomber:'#f0abfc',hex:'#a78bfa'};
const CACHE_STYLE='#ffd700';
let trauma=0;
function reducedMotion():boolean{
  try{if(typeof matchMedia!=='undefined')return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{/* ssr */}
  return false;
}
export function drawSpace(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,s?:GameState|null,dt?:number){
  const frameDt=typeof dt==='number'&&dt>0?dt:1/60;
  const rm=reducedMotion();
  ctx.fillStyle='#05070f';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';for(let i=0;i<60;i++){ctx.globalAlpha=.5;ctx.fillRect((i*97)%w,(i*57)%h,1.5,1.5);}ctx.globalAlpha=1;
  ctx.save();
  if(s&&!rm){
    if(s.fx&&s.fx.some(e=>e.kind==='flash'))trauma=1;
    else trauma=Math.max(0,trauma-frameDt*2);
    if(trauma>0){const ox=(Math.random()-0.5)*6*trauma,oy=(Math.random()-0.5)*6*trauma;ctx.translate(ox,oy);}
  } else if(s&&rm){trauma=0;}
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
    const cache=!!sh.cache;const boss=!!(sh as {boss?:boolean}).boss;
    const special=cache||boss;
    ctx.save();ctx.translate(sh.x,sh.y);
    ctx.rotate(Math.atan2(280-sh.y,280-sh.x)+Math.PI/2);
    const sc=boss?1.6:cache?1:0.8;ctx.scale(sc,sc);ctx.translate(-20,-18);
    ctx.fillStyle=special?CACHE_STYLE:(KIND_STYLE[sh.kind]??'#fff');
    ctx.globalAlpha=special?1:.9;ctx.fill(path);
    if(special){ctx.globalAlpha=1;ctx.strokeStyle=boss?'#ffd700':'#fff';ctx.lineWidth=1.5;ctx.stroke(path);}
    ctx.restore();
  }
  ctx.globalAlpha=1;
  // Combat fx: beams / sparks / flash (pooled: no per-frame Path2D alloc).
  if(s&&s.fx&&s.fx.length){
    for(const e of s.fx){
      if(e.kind==='beam'){
        const a=Math.max(0,Math.min(1,e.ttl/0.12));
        ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#5eead4';ctx.lineWidth=2;ctx.shadowColor='#5eead4';ctx.shadowBlur=8;
        ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.tx,e.ty);ctx.stroke();ctx.restore();
      }else if(e.kind==='spark'){
        const a=Math.max(0,Math.min(1,e.ttl/0.3));
        ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fb923c';
        ctx.fillRect(e.tx-1.5,e.ty-1.5,3,3);ctx.restore();
      }else if(e.kind==='flash'&&!rm){
        const a=Math.max(0,Math.min(1,e.ttl/0.15));
        ctx.save();ctx.globalAlpha=Math.min(1,a*0.9);ctx.strokeStyle='#f43f5e';ctx.lineWidth=10;
        ctx.beginPath();ctx.arc(280,280,60+(0.15-e.ttl)*160,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }
    for(const e of s.fx)e.ttl-=frameDt;
    s.fx=s.fx.filter(e=>e.ttl>0);
  }
  ctx.restore();
  ctx.globalAlpha=1;
}
