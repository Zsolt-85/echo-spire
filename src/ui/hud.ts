import type {GameState} from '../game/state.js';import {upgradeCost, type Stat} from './panel.js';import {applyAugment} from '../game/rifts.js';import {WORKSHOP_STATS,workshopCost, type WorkshopStat} from '../state/workshop.js';
import {waveIntel} from '../game/spawning.js';
import {FORGE_CATS, WS_CATS, getForgeTab, getWsTab} from './tabs.js';
import {ULT_COST, ULT_CHARGE_MAX, fluxForKill, THREAD_2_CMD, THREAD_3_CMD, THREAD_4_CMD, WAVESKIP_CMD, LAB_LINE_GATE, type UltId} from '../sim/balance.js';
import {ULTS, canFire} from '../game/ultimates.js';
import {TRAIN_SKILLS, THREADS, RESEARCH_LINES, lineLevel, researchCost, lineUnlocked, lineResearchTime, labWorkshopCostMult, labSpeedMult, autoOn, labHistory, trainingLevel, speedUnlocked, type LineId, type LineDef} from '../state/training.js';
import {describeStat, describeWorkshop, upgradeBlurb} from './cards.js';
function txt(id:string,v:string){const el=document.getElementById(id);if(el)el.textContent=v;}
const FORGE_STATS:Stat[]=['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
const ULT_META: Record<UltId, { name: string; desc: string }> = {
  nova: { name: 'Nova Burst', desc: '10x dmg to every ship on screen' },
  overdrive: { name: 'Overdrive', desc: 'Rate x3 for 8s' },
  aegis: { name: 'Aegis', desc: 'Invulnerable for 12s' },
};
function setAfford(cardId:string,btnId:string,afford:boolean):void{
  const card=document.getElementById(cardId);
  if(card){card.classList.toggle('afford',afford);card.classList.toggle('dim',!afford);}
  const btn=document.getElementById(btnId) as HTMLButtonElement|null;
  if(btn){btn.disabled=!afford;btn.classList.toggle('afford',afford);btn.classList.toggle('dim',!afford);}
}
export function renderHud(s:GameState):void{
  if(typeof document==='undefined')return;
  const lv=(s as unknown as {levels?:Record<string,number>}).levels??{};
  txt('hud-wave',String(s.wave));
  txt('hud-hull',`${Math.max(0,Math.ceil(s.hull))}/${s.maxHull}`);
  txt('hud-flux',String(Math.floor(s.flux)));
  txt('hud-essence',String(s.essence??0));
  txt('hud-cores',String(s.cores??0));
  txt('hud-shards',String(s.shards??0));
  {
    const perKill = fluxForKill(s.wave);
    const perMin = Math.round((s.fluxEarned ?? 0) / Math.max(1, s.timeS ?? 0) * 60);
    txt('hud-income', `+${perKill}/kill • ${perMin}/min`);
  }
  txt('menu-cores',String(s.cores??0));
  for(const st of FORGE_STATS){
    const d=describeStat(st);
    const lvl=lv[st]??0;
    txt(`card-name-${st}`,d.name);
    txt(`card-desc-${st}`,d.desc);
    txt(`card-cur-${st}`,d.cur(s));
    txt(`card-next-${st}`,d.next(s));
    txt(`card-blurb-${st}`,upgradeBlurb(st,lvl));
    txt(`cost-${st}`,String(upgradeCost(st,lvl)));
    setAfford(`card-${st}`,`buy-${st}`,s.flux>=upgradeCost(st,lvl));
  }
  const w=(s as unknown as {workshop?:Record<string,number>}).workshop??{};
  const wmult=labWorkshopCostMult(s);
  for(const st of WORKSHOP_STATS){
    const d=describeWorkshop(st as WorkshopStat);
    const lvl=w[st]??0;
    txt(`card-ws-name-${st}`,d.name);
    txt(`card-ws-desc-${st}`,d.desc);
    txt(`card-ws-cur-${st}`,d.cur(s));
    txt(`card-ws-next-${st}`,d.next(s));
    txt(`card-ws-blurb-${st}`,`Lv ${lvl} • ${workshopCost(st as WorkshopStat,lvl,wmult)} cores`);
    setAfford(`card-ws-${st}`,`btn-ws-${st}`,(s.cores??0)>=workshopCost(st as WorkshopStat,lvl,wmult));
  }
  {
    const w = waveIntel(s.wave);
    const hp = w.hp >= 10000 ? (w.hp / 1000).toFixed(1) + 'K' : String(w.hp);
    txt('hud-intel', `${w.count} ships • ${hp} HP • ${w.dmg} dmg`);
  }
  {
    const active = FORGE_CATS.find(c => c.id === getForgeTab()) ?? FORGE_CATS[0];
    for (const st of FORGE_STATS) {
      const card = document.getElementById(`card-${st}`);
      if (card) card.style.display = (active.stats as readonly string[]).includes(st) ? '' : 'none';
    }
    for (const c of FORGE_CATS) {
      const b = document.getElementById(`tab-forge-${c.id}`);
      if (b) b.classList.toggle('on', c.id === active.id);
    }
    const wactive = WS_CATS.find(c => c.id === getWsTab()) ?? WS_CATS[0];
    for (const st of WORKSHOP_STATS) {
      const card = document.getElementById(`card-ws-${st}`);
      if (card) card.style.display = (wactive.stats as readonly string[]).includes(st as string) ? '' : 'none';
    }
    for (const c of WS_CATS) {
      const b = document.getElementById(`tab-ws-${c.id}`);
      if (b) b.classList.toggle('on', c.id === wactive.id);
    }
    const ultSec = document.getElementById('ws-ultimates');
    if (ultSec) ultSec.style.display = wactive.id === 'ultimates' ? '' : 'none';
  }
  {
    for (const id of ULTS) {
      const owned = !!s.ult?.[id];
      txt(`card-ult-name-${id}`, ULT_META[id].name);
      txt(`card-ult-desc-${id}`, ULT_META[id].desc);
      txt(`card-ult-blurb-${id}`, owned ? 'Owned' : `${ULT_COST[id]} shards`);
      setAfford(`card-ult-${id}`, `btn-ult-${id}`, !owned && (s.shards ?? 0) >= ULT_COST[id]);
    }
    const charge = Math.min(ULT_CHARGE_MAX, s.ultCharge ?? 0);
    const fill = document.getElementById('ult-charge-fill');
    if (fill) fill.style.width = `${Math.round(charge / ULT_CHARGE_MAX * 100)}%`;
    txt('ult-charge-label', `${Math.floor(charge)}/${ULT_CHARGE_MAX}`);
    for (const id of ULTS) {
      const btn = document.getElementById(`btn-fire-${id}`) as HTMLButtonElement | null;
      const ready = canFire(s, id);
      if (btn) { btn.disabled = !ready; btn.classList.toggle('on', ready); }
    }
  }
  {
    const sp = speedUnlocked(s);
    const b8 = document.getElementById('btn-speed-8');
    if (b8) b8.style.display = sp >= 8 ? '' : 'none';
    const skip = document.getElementById('btn-skip');
    if (skip) skip.style.display = trainingLevel(s, 'command') >= WAVESKIP_CMD ? '' : 'none';
  }
  renderAcademy(s);
  renderAugmentModal(s);
}
const THREAD_NEED: Record<string, number> = { t0: 0, t1: THREAD_2_CMD, t2: THREAD_3_CMD, t3: THREAD_4_CMD };
type AcademyThreads = Record<string, { skill: LineId; startedAt?: number; durationMs?: number; doneAt?: number }>;
export function renderAcademy(s:GameState):void{
  if(typeof document==='undefined')return;
  const t = (s as unknown as {training?:{levels?:Partial<Record<LineId,number>>;threads?:AcademyThreads;bank?:Record<string,{line:LineId;investedMs:number}>;auto?:Record<string,boolean>}}).training;
  const levels = t?.levels ?? {};
  const threads = t?.threads ?? {};
  const bank = t?.bank ?? {};
  const auto = t?.auto ?? {};
  const cmd = trainingLevel(s, 'command');
  const mult = labSpeedMult(s);
  const now = Date.now();
  const best = Math.max((s as unknown as {best?:number}).best ?? 0, s.wave ?? 0);
  for(const th of THREADS){
    const need = THREAD_NEED[th] ?? 0;
    const locked = cmd < need;
    const card = document.getElementById(`card-thread-${th}`);
    if(card){ card.style.display = ''; card.classList.toggle('dim', locked); card.setAttribute('aria-disabled', String(locked)); }
    const r = threads[th];
    for(const sk of TRAIN_SKILLS){
      const b = document.getElementById(`btn-train-${th}-${sk}`) as HTMLButtonElement | null;
      if(b){ b.disabled = locked || !!r || !lineUnlocked(s, sk, best); b.classList.toggle('on', !!r && r.skill === sk); }
    }
    // Line picker: options built once (grouped by category), value + locks synced per frame.
    const pick = document.getElementById(`lab-pick-${th}`) as HTMLSelectElement | null;
    if(pick && pick.childElementCount === 0){
      for(const cat of LAB_CAT_ORDER){
        const g = document.createElement('optgroup');
        g.label = cat[0].toUpperCase() + cat.slice(1);
        for(const [id, l] of Object.entries(RESEARCH_LINES) as [LineId, LineDef][]){
          if(l.cat !== cat) continue;
          const o = document.createElement('option');
          o.value = id; o.textContent = labPickLabel(s, id, best);
          g.appendChild(o);
        }
        pick.appendChild(g);
      }
    }
    if(pick){
      pick.disabled = locked;
      const want = r?.skill ?? bank[th]?.line ?? pick.value;
      if(want && pick.value !== want) pick.value = want;
      for(const o of Array.from(pick.querySelectorAll('option'))){
        const id = o.value as LineId;
        o.disabled = !lineUnlocked(s, id, best);
        const label = labPickLabel(s, id, best);
        if(o.textContent !== label) o.textContent = label;
      }
    }
    const picked = ((pick?.value ?? 'gunnery') as LineId);
    const sw = document.getElementById(`btn-switch-${th}`) as HTMLButtonElement | null;
    if(sw) sw.disabled = locked || !lineUnlocked(s, picked, best);
    const au = document.getElementById(`btn-auto-${th}`) as HTMLButtonElement | null;
    if(au){
      au.disabled = locked;
      au.setAttribute('aria-pressed', autoOn(s, th) ? 'true' : 'false');
      au.textContent = autoOn(s, th) ? 'Auto: on' : 'Auto: off';
      au.classList.toggle('on', autoOn(s, th));
    }
    // Countdown + progress from startedAt/durationMs (legacy doneAt fallback).
    let remain = 0; let pct = 0;
    if(r){
      if(typeof r.startedAt === 'number' && typeof r.durationMs === 'number' && r.durationMs > 0){
        const invested = Math.max(0, (now - r.startedAt) * mult);
        remain = Math.max(0, Math.ceil((r.durationMs - invested) / 1000));
        pct = Math.min(100, Math.round(invested / r.durationMs * 100));
      } else if(typeof r.doneAt === 'number'){
        remain = Math.max(0, Math.ceil((r.doneAt - now) / 1000));
      }
    }
    const lvlLine = locked ? `Locked (Command ${need})`
      : r ? `${r.skill} Lv ${levels[r.skill] ?? 0} → ${remain}s`
      : 'Idle — pick a line';
    txt(`thread-status-${th}`, lvlLine);
    const fill = document.getElementById(`lab-progress-fill-${th}`);
    if(fill) fill.style.width = r ? `${pct}%` : '0%';
    const b = bank[th];
    txt(`thread-bank-${th}`, b ? `Banked ${b.line} ${Math.ceil(b.investedMs / 1000)}s — switching discards older bank` : '');
    const lvTxt = TRAIN_SKILLS.map(sk => `${sk.slice(0,3)}:${levels[sk] ?? 0}`).join(' ');
    txt(`thread-levels-${th}`, locked ? '' : lvTxt);
  }
  renderLabLines(s);
  renderLabHistory(s);
}
let labHistKey = '';
export function renderLabHistory(s:GameState):void{
  if(typeof document==='undefined')return;
  const host = document.getElementById('lab-history');
  if(!host) return;
  const h = labHistory(s).slice(0, 10);
  const key = JSON.stringify(h);
  if(key === labHistKey) return;
  labHistKey = key;
  host.replaceChildren();
  if(h.length === 0){
    const d = document.createElement('div');
    d.textContent = 'No completions yet.';
    host.appendChild(d);
    return;
  }
  for(const e of h){
    const d = document.createElement('div');
    d.textContent = `${e.line} → Lv ${e.level} • ${new Date(e.at).toLocaleString()}`;
    host.appendChild(d);
  }
}
const LAB_CAT_ORDER = ['offense','defense','economy','command','mastery'] as const;
function labPickLabel(s: GameState, id: LineId, best: number): string {
  const l = RESEARCH_LINES[id];
  const gate = LAB_LINE_GATE[id] ?? 0;
  const base = `${l.name} (Lv ${lineLevel(s, id)}/${l.max})`;
  return best < gate ? `${base} — Best ${gate}` : base;
}
function labStatus(id: LineId, s: GameState, best: number): string {
  const l = RESEARCH_LINES[id];
  const lvl = lineLevel(s, id);
  const gate = LAB_LINE_GATE[id] ?? 0;
  if (best < gate) return `Locked — Best ${gate} to unlock`;
  if (lvl >= l.max) return `MAX ${l.max}`;
  return `Lv ${lvl}/${l.max} • ${lineResearchTime(id, lvl)}s • ${researchCost(id, lvl)} cores`;
}
export function renderLabLines(s:GameState):void{
  if(typeof document==='undefined')return;
  const host=document.getElementById('lab-lines');
  if(!host)return;
  const best=Math.max((s as unknown as {best?:number}).best ?? 0, s.wave ?? 0);
  if(host.childElementCount===0){
    for(const cat of LAB_CAT_ORDER){
      const h=document.createElement('div');
      h.className='card-name'; h.id=`lab-cat-${cat}`;
      h.textContent=cat[0].toUpperCase()+cat.slice(1);
      host.appendChild(h);
      for(const [id, l] of Object.entries(RESEARCH_LINES) as [LineId, LineDef][]){
        if(l.cat!==cat)continue;
        const card=document.createElement('div');
        card.className='card'; card.id=`lab-line-${id}`;
        const nm=document.createElement('div');
        nm.className='card-name'; nm.id=`lab-line-name-${id}`; nm.textContent=l.name;
        const ds=document.createElement('div');
        ds.className='card-desc'; ds.id=`lab-line-desc-${id}`; ds.textContent=l.desc;
        const row=document.createElement('div');
        row.className='card-cur-next';
        const sp=document.createElement('span');
        sp.id=`lab-line-status-${id}`;
        row.appendChild(sp);
        card.appendChild(nm); card.appendChild(ds); card.appendChild(row);
        host.appendChild(card);
      }
    }
  }
  for(const [id, l] of Object.entries(RESEARCH_LINES) as [LineId, LineDef][]){
    txt(`lab-line-name-${id}`,l.name);
    txt(`lab-line-desc-${id}`,l.desc);
    txt(`lab-line-status-${id}`,labStatus(id,s,best));
    const card=document.getElementById(`lab-line-${id}`);
    const gated = !lineUnlocked(s,id,best);
    if(card){ card.classList.toggle('dim', gated); card.setAttribute('aria-disabled', String(gated)); }
  }
}
export function renderAugmentModal(s:GameState):void{
  if(typeof document==='undefined')return;
  const modal=document.getElementById('augment-modal');
  const box=document.getElementById('augment-opts');
  if(!modal||!box)return;
  const opts=s.pendingAugment;
  if(!opts||opts.length===0){modal.style.display='none';box.replaceChildren();return;}
  modal.style.display='flex';
  if(box.childElementCount!==opts.length){
    box.replaceChildren();
    for(const o of opts){
      const b=document.createElement('button');
      b.textContent=o;
      b.addEventListener('click',()=>{applyAugment(s,o);renderHud(s);});
      box.appendChild(b);
    }
  }
}
