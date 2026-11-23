import {SHIP_PATHS} from './ships.js';
import {drawMothership, defaultMotion} from './mothership.js';
import {RIFT_POS} from './rifts.js';
import {ghostAt} from './ghost.js';
import type {GameState} from './state.js';
const KIND_STYLE:Record<string,string>={dart:'#7dd3fc',bomber:'#f0abfc',hex:'#a78bfa'};
const CACHE_STYLE='#ffd700';
let trauma=0;
function reducedMotion():boolean{
  try{if(typeof matchMedia!=='undefined')return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{/* ssr */}
  return false;
}
/** The raced echo: a static, translucent violet arc in the free arena corner.
 *  No shake or time-based motion — it is drawn outside drawSpace's shake
 *  transform, so prefers-reduced-motion is respected automatically. */
export function drawGhost(ctx:CanvasRenderingContext2D,x:number,y:number,sample:{hullFrac:number;dmg:number},t:number):void{
  ctx.save();
  ctx.translate(x,y);
  ctx.globalAlpha=0.35;
  ctx.strokeStyle='#a78bfa';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(0,0,28,0,Math.PI*2*Math.max(0,Math.min(1,sample.hullFrac)));
  ctx.stroke();
  ctx.restore();
  // Explicit reset: restore() is a no-op on lightweight stub contexts used in
  // tests, and the echo must never leak its alpha into the next frame.
  ctx.globalAlpha=1;
}
export function impactFeedback(s:GameState|null|undefined,cx:number,cy:number):{hitFlash:number;hitAngle:number}{
  const e=s?.fx?.find(e=>e.kind==='flash');
  if(!e)return {hitFlash:0,hitAngle:0};
  return {hitFlash:Math.max(0,Math.min(1,e.ttl/0.15)),hitAngle:Math.atan2(e.y-cy,e.x-cx)};
}
export function drawSpace(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,s?:GameState|null,dt?:number){
  const frameDt=typeof dt==='number'&&dt>0?dt:1/60;
  const rm=reducedMotion();
  // Layered background: radial vignette + parallax starfield.
  const bg=ctx.createRadialGradient(w/2,h/2,20,w/2,h/2,Math.max(w,h)*0.7);
  bg.addColorStop(0,'#0b1426');bg.addColorStop(1,'#02040a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const layers=[{speed:0.006,size:0.9,alpha:0.30,count:55},{speed:0.018,size:1.3,alpha:0.50,count:35},{speed:0.040,size:2.0,alpha:0.78,count:20}];
  for(const L of layers){
    ctx.globalAlpha=L.alpha;ctx.fillStyle='#cbd5e1';
    for(let i=0;i<L.count;i++){
      const baseX=(i*97+i*13)%w,baseY=(i*57+i*29)%h;
      const x=rm?baseX:(baseX+t*L.speed*w)%w;
      ctx.fillRect(x,baseY,L.size,L.size);
    }
  }
  ctx.globalAlpha=1;
  ctx.save();
  if(s&&!rm){
    if(s.fx&&s.fx.some(e=>e.kind==='flash'))trauma=1;
    else trauma=Math.max(0,trauma-frameDt*2);
    if(trauma>0){const ox=(Math.random()-0.5)*6*trauma,oy=(Math.random()-0.5)*6*trauma;ctx.translate(ox,oy);}
  } else if(s&&rm){trauma=0;}
  // Void rifts — violet rings with a soft glow.
  for(const [rx,ry] of RIFT_POS){
    ctx.save();ctx.translate(rx,ry);
    ctx.globalAlpha=.8;ctx.strokeStyle='#8b5cf6';ctx.lineWidth=2;
    if(!rm){ctx.shadowColor='#8b5cf6';ctx.shadowBlur=12;}
    ctx.beginPath();ctx.ellipse(0,0,26,14+Math.sin(t/500+rx)*2,rx,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;ctx.globalAlpha=.28;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(0,0,34,20,rx,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
  // Mothership glow halo.
  const hx=w/2,hy=h/2;
  const halo=ctx.createRadialGradient(hx,hy,8,hx,hy,90);
  halo.addColorStop(0,'rgba(94,234,212,0.16)');halo.addColorStop(1,'rgba(94,234,212,0)');
  ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
  const hpFrac=s?Math.max(0,Math.min(1,s.hull/s.maxHull)):1;
  drawMothership(ctx,w/2,h/2,{r:54,hpFrac,t,motion:defaultMotion('run'),...impactFeedback(s,w/2,h/2)});
  // Enemy spacecrafts — trails, glow, distinct silhouettes.
  if(s)for(const sh of s.ships){
    const cache=!!sh.cache;const boss=!!(sh as {boss?:boolean}).boss;
    const special=cache||boss;
    const col=KIND_STYLE[sh.kind]??'#fff';
    const sc=boss?1.6:cache?1:0.8;
    // Motion trail pointing away from the core.
    const dx=sh.x-280,dy=sh.y-280,d=Math.hypot(dx,dy)||1;
    const trailLen=special?24:15;
    ctx.save();
    ctx.globalAlpha=special?0.45:0.30;ctx.strokeStyle=special?'#ffd700':col;ctx.lineWidth=special?2:1.2;
    if(!rm){ctx.shadowColor=special?'#ffd700':col;ctx.shadowBlur=6;}
    ctx.beginPath();ctx.moveTo(sh.x+dx/d*trailLen,sh.y+dy/d*trailLen);ctx.lineTo(sh.x,sh.y);ctx.stroke();
    ctx.shadowBlur=0;ctx.restore();
    // Body.
    ctx.save();ctx.translate(sh.x,sh.y);
    ctx.rotate(Math.atan2(280-sh.y,280-sh.x)+Math.PI/2);
    ctx.scale(sc,sc);ctx.translate(-20,-18);
    if(!rm){ctx.shadowColor=special?'#ffd700':col;ctx.shadowBlur=special?12:6;}
    ctx.fillStyle=special?CACHE_STYLE:(KIND_STYLE[sh.kind]??'#fff');
    ctx.globalAlpha=special?1:.92;ctx.fill(SHIP_PATHS[sh.kind]);
    if(special){ctx.globalAlpha=1;ctx.strokeStyle=boss?'#ffd700':'#fff';ctx.lineWidth=1.5;ctx.stroke(SHIP_PATHS[sh.kind]);}
    ctx.shadowBlur=0;ctx.restore();
  }
  ctx.globalAlpha=1;
  // Combat fx: beams / sparks / flash (pooled: no per-frame Path2D alloc).
  if(s&&s.fx&&s.fx.length){
    for(const e of s.fx){
      if(e.kind==='beam'){
        const a=Math.max(0,Math.min(1,e.ttl/0.12));
        ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#5eead4';ctx.lineWidth=2;
        if(!rm){ctx.shadowColor='#5eead4';ctx.shadowBlur=8;}
        ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.tx,e.ty);ctx.stroke();
        ctx.shadowBlur=0;ctx.restore();
      }else if(e.kind==='spark'){
        const a=Math.max(0,Math.min(1,e.ttl/0.3));
        ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fb923c';
        if(!rm){ctx.shadowColor='#fb923c';ctx.shadowBlur=8;}
        ctx.fillRect(e.tx-2,e.ty-2,4,4);
        ctx.shadowBlur=0;ctx.restore();
      }else if(e.kind==='flash'&&!rm){
        const a=Math.max(0,Math.min(1,e.ttl/0.15));
        ctx.save();ctx.globalAlpha=Math.min(1,a*0.9);ctx.strokeStyle='#f43f5e';ctx.lineWidth=10;
        if(!rm){ctx.shadowColor='#f43f5e';ctx.shadowBlur=14;}
        ctx.beginPath();ctx.arc(280,280,60+(0.15-e.ttl)*160,0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0;ctx.restore();
      }
    }
    for(const e of s.fx)e.ttl-=frameDt;
    s.fx=s.fx.filter(e=>e.ttl>0);
  }
  const pushFx2=(e:{kind:'beam'|'spark'|'flash';x:number;y:number;tx:number;ty:number;ttl:number},game?:GameState)=>{const fx=(game??s)?.fx??[];fx.push(e);if(fx.length>60)fx.splice(0,fx.length-60);};
  if(s&&s.ships){for(const sh of s.ships){if(sh.hp<=0&&Math.random()<0.3){pushFx2({kind:'spark',x:sh.x,y:sh.y,tx:sh.x,ty:sh.y,ttl:0.35},s as GameState);}}}
  ctx.restore();
  ctx.globalAlpha=1;
  // Echo ring last, outside the shake transform: it stays pinned to the
  // corner even when the arena shakes (and under reduced motion, where the
  // shake is suppressed entirely).
  if(s?.ghostTrace){
    const ghost=ghostAt(s.ghostTrace,s.ghostT ?? 0);
    if(ghost)drawGhost(ctx,w-70,h-90,ghost,t);
  }
}
