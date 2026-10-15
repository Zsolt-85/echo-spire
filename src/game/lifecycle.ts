import type { GameState } from './state.js';
import { coresFor, collapseShardBonus } from '../state/prestige.js';
export type RunSummary = { wave:number; kills:number; fluxEarned:number; essenceEarned:number; timeS:number; coresGained:number };
export function isDead(s:GameState):boolean { return s.hull <= 0; }
export function endRun(s:GameState):RunSummary {
  s.hull = Math.max(0, s.hull);
  return { wave: s.wave, kills: s.kills ?? 0, fluxEarned: s.fluxEarned ?? 0, essenceEarned: s.essenceEarned ?? 0, timeS: s.timeS ?? 0, coresGained: coresFor(s.wave) };
}
export function restartRun(s:GameState):number {
  const gained = coresFor(s.wave);
  s.cores = (s.cores ?? 0) + gained;
  s.shards = (s.shards ?? 0) + collapseShardBonus(s.wave);
  const keepWorkshop = s.workshop ?? {};
  const keepLevels = s.levels ?? {};
  const keepEssence = s.essence ?? 0;
  const keepShards = s.shards ?? 0;
  const keepUlt = s.ult ?? { nova: false, overdrive: false, aegis: false };
  const fresh = { wave: 1, hull: s.maxHull, flux: 0, ships: [], _acc: 0, kills: 0, fluxEarned: 0, essenceEarned: 0, timeS: 0, pendingAugment: null as null, augments: [] as string[], _surgeWave: undefined as number|undefined, _augmentWave: undefined as number|undefined, _queue: 0, _timer: 0, fx: [] as GameState['fx'], ultCharge: 0, odUntil: 0, aegisUntil: 0, shield: s.shieldMax ?? 0 };
  Object.assign(s, fresh);
  s.workshop = keepWorkshop; s.levels = keepLevels; s.essence = keepEssence; s.shards = keepShards; s.ult = keepUlt;
  return gained;
}
