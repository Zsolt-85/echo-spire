import { costFor, WORKSHOP_BASE, type WorkshopStat } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type { WorkshopStat };
export const WORKSHOP_STATS: WorkshopStat[] = ['dmg','rate','maxHull','range','regen','crit','volley','bounce'];
export function workshopCost(stat: WorkshopStat, lvl: number): number { return costFor(WORKSHOP_BASE[stat].base, WORKSHOP_BASE[stat].growth, lvl); }
export function buyWorkshop(s: GameState, stat: WorkshopStat): boolean {
  const lvl = s.workshop?.[stat] ?? 0;
  const c = workshopCost(stat, lvl);
  if ((s.cores ?? 0) < c) return false;
  s.cores = (s.cores ?? 0) - c;
  s.workshop = s.workshop ?? {}; s.workshop[stat] = lvl + 1;
  applyWorkshop(s);
  return true;
}
export function applyWorkshop(s: GameState): void {
  const w = s.workshop ?? {};
  const base = { dmg: 12, rate: 1, maxHull: 500, range: 180 };
  s.dmg = Math.round(base.dmg * Math.pow(1.12, w.dmg ?? 0));
  s.rate = Math.round((base.rate + 0.08 * (w.rate ?? 0)) * 100) / 100;
  s.maxHull = Math.round(base.maxHull * Math.pow(1.1, w.maxHull ?? 0) + 50 * (w.maxHull ?? 0));
  s.range = base.range + 12 * (w.range ?? 0);
  if (s.hull > s.maxHull) s.hull = s.maxHull;
}
