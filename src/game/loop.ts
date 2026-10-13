export function startLoop(c:HTMLCanvasElement,update:(dt:number)=>void,draw:()=>void){
  let acc=0,last=performance.now(),mult=1,paused=false,userPaused=false;
  const step=1/60;
  function frame(now:number){let dt=Math.min(0.1,(now-last)/1000);last=now;
    if(!paused){acc+=dt*mult;while(acc>=step){update(step);acc-=step;}}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)paused=true;else paused=userPaused;});
  return {setSpeed:(m:number)=>{mult=m;},setPaused:(p:boolean)=>{userPaused=p;paused=p;},isPaused:()=>paused};
}
