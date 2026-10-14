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
// +2 per kill, +10 per Cache kill. Unlock for essence: Nova 20, Overdrive 35,
// Aegis 50. Nova 10x screen hit, Overdrive 8s rate-x3, Aegis 12s invulnerable.
export const ULT_CHARGE_PER_KILL=2;
export const ULT_CHARGE_PER_CACHE=10;
export const ULT_CHARGE_MAX=100;
export const ULT_COST={nova:20,overdrive:35,aegis:50} as const;
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
