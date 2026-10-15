import { costFor, WORKSHOP_BASE, type WorkshopStat } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
import { labWorkshopCostMult, applyLineEffects, noteCoresSpent } from './training.js';
export type { WorkshopStat };
export const WORKSHOP_STATS: WorkshopStat[] = ['dmg','rate','maxHull','range','regen','crit','volley','bounce','essence','startFlux','bulkhead','scope'];
export function workshopCost(stat: WorkshopStat, lvl: number, mult = 1): number { return Math.max(1, Math.floor(costFor(WORKSHOP_BASE[stat].base, WORKSHOP_BASE[stat].growth, lvl) * mult)); }
export function buyWorkshop(s: GameState, stat: WorkshopStat): boolean {
  const lvl = s.workshop?.[stat] ?? 0;
  const c = workshopCost(stat, lvl, labWorkshopCostMult(s));
  if ((s.cores ?? 0) < c) return false;
  s.cores = (s.cores ?? 0) - c;
  noteCoresSpent(s, c);
  s.workshop = s.workshop ?? {}; s.workshop[stat] = lvl + 1;
  recomputeStats(s);
  return true;
}
// Single stat-recompute: workshop base first, then lab folds. Call at ALL
// stat-mutation sites (hydrate, launch/restart, workshop buy) so lab folds
// are never wiped mid-run; mid-run research completions use the incremental
// applyLineDelta instead (never call this per completion — it re-folds).
export function recomputeStats(s: GameState): void {
  applyWorkshop(s);
  applyLineEffects(s);
}
export function applyWorkshop(s: GameState): void {
  const w = s.workshop ?? {};
  const base = { dmg: 12, rate: 1, maxHull: 500, range: 180 };
  s.dmg = Math.round(base.dmg * Math.pow(1.12, w.dmg ?? 0));
  s.rate = Math.round((base.rate + 0.08 * (w.rate ?? 0)) * 100) / 100;
  s.maxHull = Math.round(base.maxHull * Math.pow(1.1, w.maxHull ?? 0) * Math.pow(1.08, w.bulkhead ?? 0) + 50 * (w.maxHull ?? 0));
  s.range = base.range + 12 * (w.range ?? 0) + 10 * (w.scope ?? 0);
  s.regen = 2 * (w.regen ?? 0);
  s.critCh = 0.02 * (w.crit ?? 0);
  s.volley = (w.volley ?? 0);
  s.bounce = (w.bounce ?? 0);
  (s as unknown as { _essenceMult?: number })._essenceMult = 1 + 0.15 * (w.essence ?? 0);
  if (s.flux === 0) s.flux += 150 * (w.startFlux ?? 0);
  if (s.hull > s.maxHull) s.hull = s.maxHull;
}
