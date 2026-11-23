// Echo Spire tuning — SINGLE SOURCE for all scaling (plan Global Constraint).
// Task 1 grind retune: tripled Forge BASE, explicit fluxForKill income,
// piecewise enemyHp bending up past wave 40 (continuous at 40 by
// construction). Wall re-targeted in Task 4 — do not chase 40-60 here.
export function costFor(base:number,growth:number,level:number):number{return Math.round(base*Math.pow(growth,level));}
export function fluxForKill(wave:number):number { return 3 + Math.floor(wave / 2); }
export function enemyHp(wave:number):number { const base = 10*Math.pow(1.05,wave); const tail = wave<=40 ? Math.pow(wave,1.25) : Math.pow(40,1.25) + (Math.pow(wave,1.35)-Math.pow(40,1.35)); return Math.round(base+tail); }
export function enemyDmg(wave:number):number{return Math.round(2*Math.pow(1.025,wave)*10)/10;}
// Forge upgrade cost table, canonical home (src/ui/panel.ts re-exports).
// Task 1 grind retune (old: 15/1.24, 22/1.28, 20/1.26, 25/1.35, 30/1.4,
// 60/1.5, 150/1.6, 150/1.6).
export type UpgradeStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce';
export const BASE:Record<UpgradeStat,{base:number;growth:number}>={dmg:{base:30,growth:1.32},rate:{base:44,growth:1.36},maxHull:{base:40,growth:1.34},range:{base:50,growth:1.43},regen:{base:60,growth:1.48},crit:{base:120,growth:1.58},volley:{base:300,growth:1.68},bounce:{base:300,growth:1.68}};
// Offline gains, canonical home (src/state/save.ts re-exports). Spec §3.3: 12h cap.
export const OFFLINE_CAP_HRS=12;
export const OFFLINE_FLUX_PER_HR=120;
// Lab research, canonical home (src/state/lab.ts re-exports). Spec §3.3:
// fractional power gain per level, real-time cost t = 60 * 1.6^level seconds.
export const LAB_GAIN_PER_LEVEL=0.08;
export const LAB_TIME_BASE_S=60;
export const LAB_TIME_GROWTH=1.6;
export type WorkshopStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce'|'essence'|'startFlux'|'bulkhead'|'scope';
export const WORKSHOP_BASE:Record<WorkshopStat,{base:number;growth:number}>={dmg:{base:1,growth:1.8},rate:{base:2,growth:1.8},maxHull:{base:2,growth:1.8},range:{base:3,growth:1.9},regen:{base:3,growth:1.9},crit:{base:5,growth:2.1},volley:{base:8,growth:2.2},bounce:{base:8,growth:2.2},essence:{base:4,growth:2.0},startFlux:{base:4,growth:2.0},bulkhead:{base:6,growth:2.0},scope:{base:6,growth:2.0}};
// Ultimates, canonical home (src/game/ultimates.ts consumes). Charge 0-100,
// +2 per kill, +10 per Cache kill. Unlock for shards: Nova 2, Overdrive 3,
// Aegis 5. Nova 10x screen hit, Overdrive 8s rate-x3, Aegis 12s invulnerable.
export const ULT_CHARGE_PER_KILL=2;
export const ULT_CHARGE_PER_CACHE=10;
export const ULT_CHARGE_MAX=100;
export const ULT_COST={nova:2,overdrive:3,aegis:5} as const;
export type UltId=keyof typeof ULT_COST;
export const ULT_NOVA_MULT=10;
export const ULT_OD_MULT=3;
export const ULT_OD_SECS=8;
export const ULT_AEGIS_SECS=12;
// Training Academy (spec §4): idle research threads, real-time cost
// t = 60 * 1.6^level seconds, 12h offline cap. Gates unlock features.
export const TRAIN_TIME_BASE_S=60;
export const TRAIN_TIME_GROWTH=1.6;
export const TRAIN_OFFLINE_CAP_HRS=12;
export const GUNNERY_PCT=0.02;
export const ENG_OFFLINE_PCT=0.05;
export const THREAD_2_CMD=2;
export const THREAD_3_CMD=4;
export const THREAD_4_CMD=6;
export const SPEED2_LOG=1;
export const SPEED4_LOG=4;
export const SPEED8_LOG=8;
export const AUTOFORGE_ENG=4;
export const WAVESKIP_CMD=5;
// Stellar Shards + dreadnought boss (Task 3): bosses are the only new spawn
// type; ultimates moved off essence onto shards.
export const SHARD_W_BOSS=1;
export const SHARD_W_COLLAPSE=1;
export const SHARD_W_MILESTONE=0;
export const BOSS_EVERY=25;
export const BOSS_HP_MULT=10;
export const BOSS_DMG_MULT=3;
// Tower-style laboratories (tower-labs plan Task 1): per-line caps, time
// multipliers, milestone gates (best wave), and effect rates. All original
// numbers; the four legacy lines keep generous caps so old saves keep levels.
export type LabCat='offense'|'defense'|'economy'|'command'|'mastery';
export const LAB_MIN_SECS=30;
export const LAB_LINE_MAX:Record<string,number>={gunnery:50,deadeye:30,barrage:20,plating:50,nanites:50,engineering:50,salvage:50,siphon:30,broker:20,logistics:10,command:10,celerity:25};
export const LAB_LINE_TIME_MULT:Record<string,number>={gunnery:1.0,deadeye:1.2,barrage:1.5,plating:1.0,nanites:1.2,engineering:1.0,salvage:1.0,siphon:1.3,broker:1.4,logistics:1.0,command:1.0,celerity:1.6};
export const LAB_LINE_GATE:Record<string,number>={gunnery:0,deadeye:60,barrage:100,plating:0,nanites:0,engineering:0,salvage:0,siphon:60,broker:100,logistics:0,command:0,celerity:150};
export const LAB_LINE_CAT:Record<string,LabCat>={gunnery:'offense',deadeye:'offense',barrage:'offense',plating:'defense',nanites:'defense',engineering:'defense',salvage:'economy',siphon:'economy',broker:'economy',logistics:'command',command:'command',celerity:'mastery'};
export const LAB_DEADEYE_PCT=0.003;
export const LAB_BARRAGE_EVERY=5;
export const LAB_PLATING_PCT=0.03;
export const LAB_NANITES_FLAT=0.4;
export const LAB_SALVAGE_PCT=0.03;
export const LAB_SIPHON_PCT=0.03;
export const LAB_BROKER_PCT=0.01;
export const LAB_CELERITY_PCT=0.04;
// --- Mega-labs catalog (plan 1): 10 gated families generating 100+ lines ---
// Legacy LAB_LINE_* tables above are frozen for save/display compat; the
// generated LINE_SPECS below is the authoritative catalog. Every line carries
// fam/cat/max/timeMult/costDiv/minBest. Cost: (1 + floor(level/3)) * costDiv
// cores (before thrift discount). Time: researchTime(level) * timeMult,
// floor LAB_MIN_SECS. Effective gate: max(family.best, line.minBest).
export type FamilyId='gunnery'|'hull'|'sensors'|'salvage'|'command'|'mastery'|'riftcraft'|'aegis'|'echoes'|'exotics';
export type FamDef={id:FamilyId;best:number;cat:LabCat};
export const FAMILIES:FamDef[]=[
  {id:'gunnery',best:0,cat:'offense'},
  {id:'hull',best:0,cat:'defense'},
  {id:'sensors',best:30,cat:'offense'},
  {id:'salvage',best:60,cat:'economy'},
  {id:'command',best:60,cat:'command'},
  {id:'mastery',best:100,cat:'mastery'},
  {id:'riftcraft',best:150,cat:'economy'},
  {id:'aegis',best:250,cat:'defense'},
  {id:'echoes',best:250,cat:'mastery'},
  {id:'exotics',best:400,cat:'mastery'},
];
// Workshop invest ladder: batch tabs unlock on lifetime core-equivalent spend
// (workshop cores + research cores + ult shard costs). Indexed batch-1.
export const WS_BATCH_COST=[0,100,500];
// Batch composition (spec §2 verbatim: 'hull' is the maxHull workshop track).
export const WS_BATCH_STATS:Record<number,readonly string[]>={
  1:['dmg','rate','maxHull','range'],
  2:['regen','crit','volley','bounce'],
  3:['essence','startFlux','bulkhead','scope'],
};
// Per-level effect kinds. 'speed'/'threads'/'autoOffline' apply at live read
// sites (no stat fold); 'spawnGap'/'surgeLuck'/'heraldLuck'/'echoDps' are
// consumed by later plans (no fold yet); 'slow' folds into slowPct (effect
// capped 0.5 at the tick read site); the rest fold via applyLineEffects
// (full, after applyWorkshop) and applyLineDelta (incremental, mid-run).
export type LineEffectKind='dmgPct'|'maxHullPct'|'critAdd'|'volleyEvery'|'bounceEvery'|'rateStep'|'ratePct'|'critMult'|'splash'|'slow'|'shieldFlat'|'shieldPct'|'thorns'|'regenFlat'|'regenPct'|'rangeFlat'|'bossMult'|'cacheLuck'|'cacheQuality'|'fluxPct'|'essencePct'|'ultCharge'|'offlinePct'|'researchDisc'|'costRed'|'startFlux'|'spawnGap'|'surgeLuck'|'heraldLuck'|'echoDps'|'speed'|'threads'|'autoOffline';
export type LineSpec={id:string;fam:FamilyId;effect:LineEffectKind;per:number;every?:number;max:number;timeMult:number;costDiv:number;minBest:number;name:string;desc:string};
// Verbatim catalog tuples (id | per-level bonus | cap | timeMult | minBest);
// costDiv is 1 for every line. Old-12 ids keep their legacy effect numbers.
export const LINE_SPECS:LineSpec[]=[
  // gunnery (gate 0)
  {id:'gunnery',fam:'gunnery',effect:'dmgPct',per:0.02,max:50,timeMult:1.0,costDiv:1,minBest:0,name:'Gunnery',desc:'+2% damage per level.'},
  {id:'deadeye',fam:'gunnery',effect:'critAdd',per:0.003,max:30,timeMult:1.2,costDiv:1,minBest:60,name:'Deadeye',desc:'+0.3% crit chance per level. Best 60 to unlock.'},
  {id:'barrage',fam:'gunnery',effect:'volleyEvery',per:1,every:5,max:20,timeMult:1.5,costDiv:1,minBest:100,name:'Barrage',desc:'+1 volley point per 5 levels. Best 100 to unlock.'},
  {id:'executioner',fam:'gunnery',effect:'critMult',per:0.05,max:20,timeMult:1.4,costDiv:1,minBest:60,name:'Executioner',desc:'+0.05x crit multiplier per level. Best 60 to unlock.'},
  {id:'shrapnel',fam:'gunnery',effect:'splash',per:4,max:30,timeMult:1.3,costDiv:1,minBest:100,name:'Shrapnel',desc:'+4 splash radius per level. Best 100 to unlock.'},
  {id:'ricochet',fam:'gunnery',effect:'bounceEvery',per:1,every:4,max:20,timeMult:1.5,costDiv:1,minBest:150,name:'Ricochet',desc:'+1 bounce per 4 levels. Best 150 to unlock.'},
  {id:'cyclic',fam:'gunnery',effect:'rateStep',per:0.02,every:5,max:20,timeMult:1.3,costDiv:1,minBest:0,name:'Cyclic',desc:'+0.02 fire rate per 5 levels.'},
  // hull (gate 0)
  {id:'nanites',fam:'hull',effect:'regenFlat',per:0.4,max:50,timeMult:1.2,costDiv:1,minBest:0,name:'Nanites',desc:'+0.4 hull regen/s per level.'},
  {id:'ablative',fam:'hull',effect:'shieldFlat',per:6,max:40,timeMult:1.3,costDiv:1,minBest:60,name:'Ablative',desc:'+6 shield per level. Best 60 to unlock.'},
  {id:'retribution',fam:'hull',effect:'thorns',per:0.02,max:30,timeMult:1.4,costDiv:1,minBest:100,name:'Retribution',desc:'+2% thorns per level. Best 100 to unlock.'},
  {id:'secondwind',fam:'hull',effect:'regenPct',per:0.01,max:60,timeMult:1.2,costDiv:1,minBest:0,name:'Secondwind',desc:'+1% regen per level.'},
  {id:'plating',fam:'hull',effect:'maxHullPct',per:0.03,max:50,timeMult:1.0,costDiv:1,minBest:0,name:'Plating',desc:'+3% max hull per level.'},
  // sensors (gate 30)
  {id:'farsight',fam:'sensors',effect:'rangeFlat',per:12,max:40,timeMult:1.0,costDiv:1,minBest:0,name:'Farsight',desc:'+12 range per level.'},
  {id:'tracker',fam:'sensors',effect:'bossMult',per:0.03,max:30,timeMult:1.3,costDiv:1,minBest:60,name:'Tracker',desc:'+3% boss damage per level. Best 60 to unlock.'},
  {id:'sweep',fam:'sensors',effect:'cacheLuck',per:0.02,max:30,timeMult:1.3,costDiv:1,minBest:100,name:'Sweep',desc:'+2% cache luck per level. Best 100 to unlock.'},
  {id:'drag',fam:'sensors',effect:'slow',per:0.04,max:20,timeMult:1.4,costDiv:1,minBest:150,name:'Drag',desc:'+4% slow per level (effect caps at 50%). Best 150 to unlock.'},
  // salvage (gate 60; siphon/broker/salvage preserved)
  {id:'siphon',fam:'salvage',effect:'essencePct',per:0.03,max:30,timeMult:1.3,costDiv:1,minBest:60,name:'Siphon',desc:'+3% essence income per level. Best 60 to unlock.'},
  {id:'broker',fam:'salvage',effect:'costRed',per:0.01,max:20,timeMult:1.4,costDiv:1,minBest:100,name:'Broker',desc:'-1% workshop core costs per level. Best 100 to unlock.'},
  {id:'assay',fam:'salvage',effect:'cacheQuality',per:0.03,max:30,timeMult:1.4,costDiv:1,minBest:150,name:'Assay',desc:'+3% cache quality per level. Best 150 to unlock.'},
  {id:'vault',fam:'salvage',effect:'startFlux',per:50,max:20,timeMult:1.1,costDiv:1,minBest:0,name:'Vault',desc:'+50 starting flux per level.'},
  {id:'salvage',fam:'salvage',effect:'fluxPct',per:0.03,max:50,timeMult:1.0,costDiv:1,minBest:0,name:'Salvage',desc:'+3% flux income per level.'},
  // command (gate 60; logistics/command preserved)
  {id:'logistics',fam:'command',effect:'speed',per:0,max:10,timeMult:1.0,costDiv:1,minBest:0,name:'Logistics',desc:'Speed x2/x4/x8 at levels 1/4/8.'},
  {id:'command',fam:'command',effect:'threads',per:0,max:10,timeMult:1.0,costDiv:1,minBest:0,name:'Command',desc:'Extra research threads and wave skip.'},
  {id:'muster',fam:'command',effect:'ratePct',per:0.01,max:30,timeMult:1.2,costDiv:1,minBest:100,name:'Muster',desc:'+1% fire rate per level. Best 100 to unlock.'},
  {id:'charter',fam:'command',effect:'offlinePct',per:0.05,max:20,timeMult:1.3,costDiv:1,minBest:0,name:'Charter',desc:'+5% offline gains per level.'},
  // mastery (gate 100)
  {id:'engineering',fam:'mastery',effect:'autoOffline',per:0.05,max:10,timeMult:1.0,costDiv:1,minBest:0,name:'Engineering',desc:'Offline gains and auto-forge.'},
  {id:'focus',fam:'mastery',effect:'ultCharge',per:0.02,max:30,timeMult:1.4,costDiv:1,minBest:100,name:'Focus',desc:'+2% ult charge per level. Best 100 to unlock.'},
  {id:'thrift',fam:'mastery',effect:'researchDisc',per:0.02,max:20,timeMult:1.5,costDiv:1,minBest:150,name:'Thrift',desc:'-2% research core costs per level. Best 150 to unlock.'},
  // riftcraft (gate 150)
  {id:'riftwise',fam:'riftcraft',effect:'spawnGap',per:0.02,max:20,timeMult:1.3,costDiv:1,minBest:150,name:'Riftwise',desc:'-2% spawn gap per level. Best 150 to unlock.'},
  {id:'surge',fam:'riftcraft',effect:'surgeLuck',per:0.05,max:30,timeMult:1.4,costDiv:1,minBest:150,name:'Surge',desc:'+5% surge luck per level. Best 150 to unlock.'},
  {id:'herald',fam:'riftcraft',effect:'heraldLuck',per:0.08,max:20,timeMult:1.6,costDiv:1,minBest:250,name:'Herald',desc:'+8% herald luck per level. Best 250 to unlock.'},
  {id:'stabilizer',fam:'riftcraft',effect:'shieldPct',per:0.03,max:30,timeMult:1.2,costDiv:1,minBest:150,name:'Stabilizer',desc:'+3% shield per level. Best 150 to unlock.'},
  // aegis (gate 250)
  // echoes (gate 250; echoDps lines feed a later plan)
  {id:'remnant',fam:'echoes',effect:'echoDps',per:0.05,max:30,timeMult:1.2,costDiv:1,minBest:250,name:'Remnant',desc:'+5% echo damage per level. Best 250 to unlock.'},
  // exotics (gate 400)
];
// Ghost trace recorder (competitive layer): sim-time sample cadence and byte
// cap for compact, shareable run traces. Canonical home — feature code consumes.
export const GHOST_SAMPLE_MS = 500;
export const GHOST_MAX_BYTES = 65536;
