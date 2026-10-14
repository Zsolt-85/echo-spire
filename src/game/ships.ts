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
  const pulse=Math.sin(t/300)*1.5;
  ctx.save();ctx.translate(x,y);
  // Engine glow (stern).
  ctx.save();ctx.globalAlpha=.8;ctx.fillStyle='#38bdf8';ctx.shadowColor='#38bdf8';ctx.shadowBlur=12;
  ctx.beginPath();ctx.ellipse(-46+pulse*.6,0,6,4,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(46-pulse*.6,0,6,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Hull: layered saucer with neon rim.
  ctx.fillStyle='#243b5c';ctx.strokeStyle='#5eead4';ctx.lineWidth=2;
  ctx.shadowColor='#5eead4';ctx.shadowBlur=10;
  ctx.beginPath();ctx.ellipse(0,0,42,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#334c72';
  ctx.beginPath();ctx.ellipse(0,-3,26,11,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(147,197,253,.8)';ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(0,-3,26,11,0,0,Math.PI*2);ctx.stroke();
  // Bridge core, breathing with hp.
  ctx.globalAlpha=.35+.65*frac;ctx.fillStyle='#5eead4';ctx.shadowColor='#5eead4';ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(0,-6,8+pulse,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#06251f';
  ctx.beginPath();ctx.arc(0,-6,3.5,0,Math.PI*2);ctx.fill();ctx.restore();
  // Shield ring, fading as hull drops.
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=0.2+0.6*frac;ctx.strokeStyle='#5eead4';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,0,54,27,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.globalAlpha=1;
}
