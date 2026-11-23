// Daily run mode and seed lifecycle (competitive layer, Task 3).
// The daily challenge derives its seed from the UTC calendar date so every
// player on a given day races the exact same deterministic run.
import type { GameState } from './state.js';
import { seedFromString } from '../sim/rng.js';

export function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailySeed(d: Date): number {
  return seedFromString('echo-spire:' + dateKey(d));
}

export function startDaily(s: GameState, d: Date): void {
  s.mode = 'daily';
  s.seed = dailySeed(d);
  s.rngState = s.seed;
  s.ghostTrace = null;
  s.ghostT = 0;
}

export function startNormal(s: GameState, seed: number = Date.now() >>> 0): void {
  s.mode = 'normal';
  s.seed = seed;
  s.rngState = seed;
  s.ghostTrace = null;
  s.ghostT = 0;
}

export function isDaily(s: GameState): boolean {
  return s.mode === 'daily';
}
