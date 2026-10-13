import {drawMothership} from './ships.js';
export function drawSpace(ctx:CanvasRenderingContext2D,w:number,h:number,t:number){
  ctx.fillStyle='#05070f';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';for(let i=0;i<60;i++){ctx.globalAlpha=.5;ctx.fillRect((i*97)%w,(i*57)%h,1.5,1.5);}ctx.globalAlpha=1;
  drawMothership(ctx,w/2,h/2,1,t);
}
