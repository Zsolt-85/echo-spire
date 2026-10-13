import {startLoop} from './game/loop.js';import {drawSpace} from './game/render.js';
const cv=document.getElementById('game') as HTMLCanvasElement;
const ctx=cv.getContext('2d')!;
function fit(){cv.width=560*devicePixelRatio;cv.height=560*devicePixelRatio;}
fit();addEventListener('resize',fit);
startLoop(cv,()=>{},()=>{ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);drawSpace(ctx,560,560,performance.now());ctx.restore();});
