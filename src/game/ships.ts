const DART = 'M20 2 L36 28 L20 22 L4 28 Z';
const BOMBER = 'M8 8 H42 V22 H8 Z';
const HEX = 'M25 0 L50 14 L50 36 L25 50 L0 36 L0 14 Z';
export const SHIP_PATHS: Record<string, Path2D> = {
  dart: new Path2D(DART),
  bomber: new Path2D(BOMBER),
  hex: new Path2D(HEX),
};
export function drawMothership(ctx:CanvasRenderingContext2D,x:number,y:number,hpFrac:number=1,t:number=0){
  const frac=Math.max(0,Math.min(1,hpFrac));
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#5eead4';ctx.fillStyle='#1e3a5f';
  ctx.beginPath();ctx.ellipse(0,0,42,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.globalAlpha=0.25+0.55*frac;
  ctx.beginPath();ctx.ellipse(0,0,52,26,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#5eead4';ctx.beginPath();ctx.arc(0,-6,8+Math.sin(t/300)*1.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
