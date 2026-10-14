// Echo Spire tuning — SINGLE SOURCE for all scaling (plan Global Constraint).
// Formulas keep the Task 1 shape; constants retuned (fix wave) so the
// headless first-run sim (scripts/sim.mjs, cheapest-affordable forge policy,
// Lab/meta excluded) walls at waves 80-120 per spec §4.
//
// Evidence (temp search scripts, same tickSim/spendFlux as sim.mjs):
// - committed 1.18/1.12 curves wall at wave 7; even fully flat exponentials
//   (1.0/1.0) wall at 12 — the wave^2.1 term + 0.7/wave spawn growth outscale
//   log-grown forge DPS. Enemy-only tuning peaked at wall ~59.
// - Easing forge costs alongside the enemy nerf lands the wall mid-window and
//   holds 83-104 across 9 policy/augment variants (cheapest/dmg-first/
//   hull-first x Split/Crit/Halo), no stall-guard trips.
export function costFor(base:number,growth:number,level:number):number{return Math.round(base*Math.pow(growth,level));}
export function enemyHp(wave:number):number{return Math.round(10*Math.pow(1.05,wave)+Math.pow(wave,1.25));}
export function enemyDmg(wave:number):number{return Math.round(2*Math.pow(1.025,wave)*10)/10;}
// Forge upgrade cost table, canonical home (src/ui/panel.ts re-exports).
// Eased vs Task 3 (20/1.32, 30/1.4, 25/1.35): same shape, gentler growth so
// affordable forge DPS tracks enemy scaling out to wave ~100.
export type UpgradeStat='dmg'|'rate'|'maxHull'|'range'|'regen'|'crit'|'volley'|'bounce';
export const BASE:Record<UpgradeStat,{base:number;growth:number}>={dmg:{base:15,growth:1.24},rate:{base:22,growth:1.28},maxHull:{base:20,growth:1.26},range:{base:25,growth:1.35},regen:{base:30,growth:1.4},crit:{base:60,growth:1.5},volley:{base:150,growth:1.6},bounce:{base:150,growth:1.6}};
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
