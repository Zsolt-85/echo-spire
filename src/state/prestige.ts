import type { GameState } from '../game/state.js';

export const COLLAPSE_WAVE = 50;

export function coresFor(wave: number): number {
  if (!Number.isFinite(wave) || wave < COLLAPSE_WAVE) return 0;
  return Math.floor(Math.sqrt(wave));
}

type Collapsible = GameState & {
  cores?: number;
  levels?: Record<string, number>;
};

export function collapseShardBonus(w: number): number { return w < 50 ? 0 : Math.floor(Math.sqrt(w) / 10); }

/** Collapse (prestige): wave>=50 grants cores, resets the cycle but keeps
 *  permanent progress (cores, hangar levels, essence). Returns cores gained
 *  (0 + no mutation when below the gate). */
export function collapseRun(s: Collapsible): number {
  const gained = coresFor(s.wave);
  if (gained <= 0) return 0;
  s.cores = (s.cores ?? 0) + gained;
  (s as unknown as { shards?: number }).shards = ((s as unknown as { shards?: number }).shards ?? 0) + collapseShardBonus(s.wave);
  s.wave = 1;
  s.flux = 0;
  s.ships = [];
  s.hull = s.maxHull;
  s.pendingAugment = null;
  s.augments = [];
  s._surgeWave = undefined;
  s._augmentWave = undefined;
  s._acc = 0;
  return gained;
}
