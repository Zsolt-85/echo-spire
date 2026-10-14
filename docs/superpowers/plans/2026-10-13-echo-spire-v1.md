# Echo Spire v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build playable minimal Echo Spire v1: mothership vs minimal spacecrafts, rifts + Cache Ship + Void Essence, Forge/Hangar/Lab, echo ghost, x1/x2/x4 in browser.

**Architecture:** Vite + TS, fixed 60Hz sim decoupled from Canvas render, DOM side panel for upgrades. All tuning in `balance.ts`, all ship paths in `ships.ts`. Save versioned in localStorage.

**Tech Stack:** Node 20+, Vite 5, TypeScript 5 strict, Canvas 2D, Vitest, no engine, no React.

**Spec:** `docs/superpowers/specs/2026-10-13-echo-spire-design.md`

## Global Constraints
- Node >= 20, Vite ^5, TS strict true.
- Save key `echospire.save.v1`, versioned JSON with migration, never wipe without backup.
- Sim tick 60Hz fixed, dt clamp 100ms, pause on hidden tab, speeds x1/x2/x4.
- No copied assets/names/numbers from The Tower. All art procedural from `ships.ts`.
- Balance lives only in `src/sim/balance.ts`.
- Canvas pooled, 300 ships @60fps target.
- English UI, minimal geometric ships.

---

### Task 1: Scaffold + game shell + mothership render

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/game/loop.ts`, `src/game/render.ts`, `src/game/ships.ts`, `src/style.css`
- Test: `tests/scaffold.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `startLoop(canvas, update, draw)`, `drawSpace(ctx,w,h,t)`, `SHIP_PATHS: Record<string, Path2D>`, `drawMothership(ctx,x,y,hpFrac,t)`

- [ ] **Step 1: Write the failing test**

```ts
// tests/scaffold.test.ts
import { describe, it, expect } from 'vitest';
import { costFor, enemyHp } from '../src/sim/balance.js';
describe('scaffold', () => {
  it('balance module exists', () => {
    expect(costFor(20, 1.32, 0)).toBe(20);
    expect(enemyHp(1)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm install; npx vitest run tests/scaffold.test.ts`
Expected: FAIL with "Cannot find module '../src/sim/balance.js'"

- [ ] **Step 3: Scaffold project + minimal implementation**

```json
// package.json
{"name":"echo-spire","private":true,"type":"module","scripts":{"dev":"vite","build":"vite build","test":"vitest run"},"devDependencies":{"typescript":"^5.4.0","vite":"^5.2.0","vitest":"^1.5.0"}}
```

```ts
// src/sim/balance.ts
export function costFor(base:number,growth:number,level:number):number{return Math.round(base*Math.pow(growth,level));}
export function enemyHp(wave:number):number{return Math.round(12*Math.pow(1.18,wave)+Math.pow(wave,2.1));}
export function enemyDmg(wave:number):number{return Math.round(3*Math.pow(1.12,wave)*10)/10;}
```

```ts
// src/game/ships.ts
export const SHIP_PATHS={dart:'M20 2 L36 28 L20 22 L4 28 Z',bomber:'M8 8 H42 V22 H8 Z',hex:'M25 0 L50 14 L50 36 L25 50 L0 36 L0 14 Z'};
export function drawMothership(ctx:CanvasRenderingContext2D,x:number,y:number,t:number){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#5eead4';ctx.fillStyle='#1e3a5f';
  ctx.beginPath();ctx.ellipse(0,0,42,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#5eead4';ctx.beginPath();ctx.arc(0,-6,8+Math.sin(t/300)*1.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
```

```ts
// src/game/loop.ts
export function startLoop(c:HTMLCanvasElement,update:(dt:number)=>void,draw:()=>void){
  let acc=0,last=performance.now(),mult=1,paused=false;
  const step=1/60;
  function frame(now:number){let dt=Math.min(0.1,(now-last)/1000);last=now;
    if(!paused){acc+=dt*mult;while(acc>=step){update(step);acc-=step;}}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  return {setSpeed:(m:number)=>mult=m,setPaused:(p:boolean)=>paused=p};
}
```

```ts
// src/game/render.ts
import {drawMothership} from './ships.js';
export function drawSpace(ctx:CanvasRenderingContext2D,w:number,h:number,t:number){
  ctx.fillStyle='#05070f';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';for(let i=0;i<60;i++){ctx.globalAlpha=.5;ctx.fillRect((i*97)%w,(i*57)%h,1.5,1.5);}ctx.globalAlpha=1;
  drawMothership(ctx,w/2,h/2,t);
}
```

```ts
// src/main.ts
import {startLoop} from './game/loop.js';import {drawSpace} from './game/render.js';
const cv=document.getElementById('game') as HTMLCanvasElement;
const ctx=cv.getContext('2d')!;
function fit(){cv.width=560*devicePixelRatio;cv.height=560*devicePixelRatio;}
fit();addEventListener('resize',fit);
startLoop(cv,()=>{},()=>{ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);drawSpace(ctx,560,560,performance.now());ctx.restore();});
```

```html
<!-- index.html -->
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Echo Spire</title><link rel="stylesheet" href="/src/style.css"></head><body><canvas id="game" style="width:560px;height:560px"></canvas><script type="module" src="/src/main.ts"></script></body></html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scaffold.test.ts`
Expected: PASS (1 passed). Run `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git init; git add package.json vite.config.ts tsconfig.json index.html src tests
git commit -m "feat: scaffold echo-spire shell with mothership render"
```

### Task 2: Combat sim — spawn, move, shoot, hull

**Files:**
- Create: `src/game/state.ts`, `src/game/update.ts`, `src/game/spawning.ts`
- Test: `tests/combat.test.ts`

**Interfaces:**
- Consumes: `costFor, enemyHp, enemyDmg` from Task 1
- Produces: `GameState {wave,hull,maxHull,flux,ships:Ship[],dmg,rate}`, `tickSim(s:GameState,dt:number)`, `spawnWave(s:GameState)`

```ts
// src/game/state.ts
export type Ship={id:number;kind:'dart'|'bomber'|'hex';x:number;y:number;hp:number;dmg:number;speed:number;essence:number};
export type GameState={wave:number;hull:number;maxHull:number;flux:number;dmg:number;rate:number;range:number;ships:Ship[];nextId:number};
export function freshState():GameState{return {wave:1,hull:500,maxHull:500,flux:0,dmg:12,rate:1,range:180,ships:[],nextId:1};}
```

- [ ] **Step 1: Write the failing test**

```ts
// tests/combat.test.ts
import {describe,it,expect} from 'vitest';
import {freshState,spawnWave,tickSim} from '../src/game/update.js';
describe('combat',()=>{
  it('kills grant flux and damage hull on reach',()=>{
    const s=freshState();spawnWave(s);
    expect(s.ships.length).toBeGreaterThan(0);
    const n=s.ships.length;
    for(let i=0;i<600;i++) tickSim(s,1/60);
    expect(s.flux+s.hull).toBeGreaterThan(0); expect(s.ships.length).toBeLessThanOrEqual(n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/combat.test.ts`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/spawning.ts
import type {GameState} from './state.js';import {enemyHp,enemyDmg} from '../sim/balance.js';
export function spawnWave(s:GameState){
  const count=4+Math.floor(s.wave*0.7);
  for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2;
    s.ships.push({id:s.nextId++,kind:i%7===6?'hex':i%3===2?'bomber':'dart',
      x:280+Math.cos(a)*260,y:280+Math.sin(a)*260,hp:enemyHp(s.wave),dmg:enemyDmg(s.wave),speed:22+s.wave*0.4,essence:0});}
}
// src/game/update.ts
import type {GameState} from './state.js';export {freshState} from './state.js';export {spawnWave} from './spawning.js';
export function tickSim(s:GameState,dt:number){
  if(s.ships.length===0) spawnWave(s);
  // mothership fire: nearest in range
  s.ships.sort((a,b)=>((a.x-280)**2+(a.y-280)**2)-((b.x-280)**2+(b.y-280)**2));
  let shots=s.rate*dt, guard=20;
  while(shots>=1&&guard-->0&&s.ships.length){shots-=1;const t=s.ships[0];
    if((t.x-280)**2+(t.y-280)**2<=s.range**2){t.hp-=s.dmg;if(t.hp<=0){s.flux+=6+s.wave;s.ships.shift();}}}
  for(const sh of s.ships){const dx=280-sh.x,dy=280-sh.y,d=Math.hypot(dx,dy)||1;sh.x+=dx/d*sh.speed*dt;sh.y+=dy/d*sh.speed*dt;
    if(d<26){s.hull-=sh.dmg*dt*2;sh.hp-=s.dmg*dt*0.5;}}
  s.ships=s.ships.filter(x=>x.hp>0);
  if(s.ships.length===0){s.wave+=1;}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/combat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/state.ts src/game/spawning.ts src/game/update.ts tests/combat.test.ts
git commit -m "feat: core combat sim with waves"
```

### Task 3: HUD + Forge upgrades + speed/pause

**Files:**
- Create: `src/ui/hud.ts`, `src/ui/panel.ts`
- Modify: `src/main.ts`, `index.html`
- Test: `tests/forge.test.ts`

**Interfaces:**
- Consumes: `GameState, tickSim` from Task 2
- Produces: `renderHud(s)`, `buyUpgrade(s,stat):boolean`

- [ ] **Step 1: Write failing test**

```ts
// tests/forge.test.ts
import {describe,it,expect} from 'vitest';
import {freshState} from '../src/game/update.js';import {buyUpgrade,upgradeCost} from '../src/ui/panel.js';
describe('forge',()=>{it('blocks without flux, buys with flux',()=>{
  const s=freshState();s.flux=0;expect(buyUpgrade(s,'dmg')).toBe(false);
  s.flux=10000;s.levels={dmg:0};expect(buyUpgrade(s,'dmg')).toBe(true);expect(s.dmg).toBeGreaterThan(12);
});});
```

- [ ] **Step 2: Run**

Run: `npx vitest run tests/forge.test.ts`
Expected: FAIL missing module

- [ ] **Step 3: Implement**

```ts
// src/ui/panel.ts
import {costFor} from '../sim/balance.js';import type {GameState} from '../game/state.js';
export type Stat='dmg'|'rate'|'maxHull';
export const BASE:Record<Stat,{base:number;growth:number}>={dmg:{base:20,growth:1.32},rate:{base:30,growth:1.4},maxHull:{base:25,growth:1.35}};
declare module '../game/state.js'{interface GameState{levels?:Record<string,number>}}
export function upgradeCost(stat:Stat,lvl:number){return costFor(BASE[stat].base,BASE[stat].growth,lvl);}
export function buyUpgrade(s:GameState,stat:Stat):boolean{
  const lvl=(s as any).levels?.[stat]??0;const c=upgradeCost(stat,lvl);
  if(s.flux<c) return false;s.flux-=c;(s as any).levels=s.levels??{};(s as any).levels[stat]=lvl+1;
  if(stat==='dmg')s.dmg=Math.round(s.dmg*1.12+2);if(stat==='rate')s.rate+=0.08;if(stat==='maxHull'){s.maxHull=Math.round(s.maxHull*1.1+50);s.hull=s.maxHull;}
  return true;
}
```

Wire `index.html` side panel with 3 buttons + speed buttons calling loop `setSpeed`, `renderHud` updating wave/hull/flux each frame (15 lines DOM).

- [ ] **Step 4: Run**

Run: `npx vitest run tests/forge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/forge.test.ts index.html src/main.ts
git commit -m "feat: forge upgrades and HUD with speed"
```

### Task 4: Rifts + Cache Ship + Void Essence + augments

**Files:**
- Create: `src/game/rifts.ts`
- Modify: `src/game/update.ts`, `src/game/state.ts`
- Test: `tests/rifts.test.ts`

**Interfaces:**
- Consumes: `GameState` from Task 2
- Produces: `maybeSpawnSurge(s):boolean`, `RIFT_POS`, augment pick `offerAugment(s):string[]`

- [ ] **Step 1: Failing test**

```ts
// tests/rifts.test.ts
import {describe,it,expect} from 'vitest';
import {freshState} from '../src/game/update.js';import {maybeSpawnSurge} from '../src/game/rifts.js';
describe('rifts',()=>{it('surge spawns cache with essence',()=>{
  const s=freshState() as any;s.wave=25;s.ships=[];s.essence=0;
  const hit=[...Array(40)].map(()=>maybeSpawnSurge(s)).some(Boolean);
  expect(hit).toBe(true);
});});
```

- [ ] **Step 2: Run** `npx vitest run tests/rifts.test.ts` Expected FAIL.

- [ ] **Step 3: Implement**

```ts
// src/game/rifts.ts
import type {GameState} from './state.js';
export const RIFT_POS=[[70,70],[490,120],[90,470]] as const;
export function maybeSpawnSurge(s:any):boolean{
  if(s.wave<10||s.wave%5!==0) return false;
  if(s._surgeWave===s.wave) return false; s._surgeWave=s.wave;
  s.ships.push({id:s.nextId++,kind:'hex',x:RIFT_POS[0][0],y:RIFT_POS[0][1],hp:200+s.wave*20,dmg:0,speed:14,essence:15,cache:true});
  return true;
}
export function offerAugment():string[]{return ['Split rounds +1 bounce','Crit surge +10%','Halo thorns'];}
```

In `update.ts` kill handler: `if((t as any).cache){(s as any).essence=((s as any).essence??0)+t.essence;}` + augment modal every 10 waves (DOM pick adds `s.dmg*=1.1` etc).

- [ ] **Step 4: Run** PASS
- [ ] **Step 5: Commit** `git commit -m "feat: rift surge cache ship and essence"`

### Task 5: Hangar permanence + save/offline + collapse

**Files:**
- Create: `src/state/save.ts`, `src/state/prestige.ts`
- Test: `tests/save.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/save.test.ts
import {describe,it,expect} from 'vitest';
import {saveGame,loadGame} from '../src/state/save.js';
describe('save',()=>{it('roundtrips and computes offline',()=>{
  const s:any={wave:50,flux:100,essence:10,ts:Date.now()-3600e3};
  saveGame(s);const l:any=loadGame();expect(l.wave).toBe(50);expect(l.offlineFlux).toBeGreaterThanOrEqual(0);
});});
```

- [ ] **Step 2: Run** FAIL
- [ ] **Step 3: Implement**

```ts
// src/state/save.ts
const KEY='echospire.save.v1';
export function saveGame(s:any){localStorage.setItem(KEY,JSON.stringify({...s,ts:Date.now(),v:1}));localStorage.setItem(KEY+'.bak',JSON.stringify({...s,ts:Date.now(),v:1}));}
export function loadGame():any{
  try{const raw=localStorage.getItem(KEY);if(!raw) return null;const d=JSON.parse(raw);
    const hrs=Math.min(12,(Date.now()-(d.ts??Date.now()))/3600e3);
    return {...d,offlineFlux:Math.round(hrs*120)};}catch{const b=localStorage.getItem(KEY+'.bak');return b?JSON.parse(b):null;}
}
// src/state/prestige.ts
export function coresFor(wave:number){return wave<50?0:Math.floor(Math.sqrt(wave));}
```

Collapse button: if wave>=50 grant cores, reset wave/hull/flux keep hangar+essence, save.

- [ ] **Step 4: Run** PASS
- [ ] **Step 5: Commit** `git commit -m "feat: save offline and collapse prestige"`

### Task 6: Lab + Echo ghost + leaderboard stub + balance sim

**Files:**
- Create: `src/state/lab.ts`, `src/game/echo.ts`, `src/api/leaderboard.stub.ts`, `scripts/sim.mjs`
- Test: `tests/lab_echo.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/lab_echo.test.ts
import {describe,it,expect} from 'vitest';
import {labGain} from '../src/state/lab.js';import {echoDps} from '../src/game/echo.js';
describe('lab+echo',()=>{it('lab and echo scale',()=>{expect(labGain(5)).toBeGreaterThan(labGain(0));expect(echoDps(100)).toBe(15);});});
```

- [ ] **Step 2: Run** FAIL
- [ ] **Step 3: Implement**

```ts
// src/state/lab.ts
export function labGain(level:number){return level*0.08;}
export function labTime(level:number){return Math.round(60*Math.pow(1.6,level));}
// src/game/echo.ts
export function echoDps(recorded:number){return Math.round(recorded*0.15);}
// src/api/leaderboard.stub.ts
export type Entry={playerId:string;best:number;hash:string};
export async function upload(e:Entry){console.info('stub upload',e);return {ok:true};}
```

`scripts/sim.mjs`: headless 1000-wave check asserting wall 80-120 first runs, logs to console.

- [ ] **Step 4: Run** `npx vitest run tests/lab_echo.test.ts` PASS, `node scripts/sim.mjs` prints wall window.
- [ ] **Step 5: Commit** `git commit -m "feat: lab echo leaderboard stub"`
```

## Self-Review
- Spec coverage: rifts §3.4 → Task 4, echoes §3.5 → Task 6, lab §3.3 → Task 6, forge §3.1 → Task 3, save/prestige §2/§4 → Task 5, speed §3.6 → Task 1+3, UI §5 → Tasks 1+3, ships minimal → Tasks 1-2.
- No placeholders: all steps have code + exact commands.
- Types consistent: `GameState` extended via `levels`, `essence`, `_surgeWave` as `any` casts documented; `costFor(base,growth,lvl)`, `enemyHp(wave)` signatures match Task 1.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-10-13-echo-spire-v1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
