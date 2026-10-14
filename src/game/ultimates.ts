import { ULT_CHARGE_PER_KILL, ULT_CHARGE_PER_CACHE, ULT_CHARGE_MAX, ULT_COST, ULT_NOVA_MULT, ULT_OD_SECS, ULT_AEGIS_SECS, type UltId } from '../sim/balance.js';
import type { GameState } from './state.js';
export type { UltId };
export { ULT_COST, ULT_CHARGE_MAX } from '../sim/balance.js';
export const ULTS: UltId[] = ['nova', 'overdrive', 'aegis'];
export function ultChargeForKill(s: GameState, cache: boolean): void {
  s.ultCharge = Math.min(ULT_CHARGE_MAX, (s.ultCharge ?? 0) + (cache ? ULT_CHARGE_PER_CACHE : ULT_CHARGE_PER_KILL));
}
function isDeadLike(s: GameState): boolean { return s.hull <= 0; }
export function canFire(s: GameState, id: UltId): boolean {
  return !!s.ult?.[id] && (s.ultCharge ?? 0) >= ULT_CHARGE_MAX && !isDeadLike(s);
}
export function buyUlt(s: GameState, id: UltId): boolean {
  if (s.ult?.[id]) return false;
  const c = ULT_COST[id];
  if ((s.essence ?? 0) < c) return false;
  s.essence -= c;
  s.ult = { nova: !!s.ult?.nova, overdrive: !!s.ult?.overdrive, aegis: !!s.ult?.aegis };
  s.ult[id] = true;
  return true;
}
export function fireUlt(s: GameState, id: UltId): boolean {
  if (!canFire(s, id)) return false;
  s.ultCharge = 0;
  if (id === 'nova') {
    const hit = s.dmg * ULT_NOVA_MULT;
    const essenceMult = (s as unknown as { _essenceMult?: number })._essenceMult ?? 1;
    for (const sh of s.ships) {
      sh.hp -= hit;
      s.fx = [...(s.fx ?? []), { kind: 'spark', x: 280, y: 280, tx: sh.x, ty: sh.y, ttl: 0.3 }];
    }
    const slain = s.ships.filter(x => x.hp <= 0);
    s.ships = s.ships.filter(x => x.hp > 0);
    for (const t of slain) {
      s.flux += 6 + s.wave; s.fluxEarned = (s.fluxEarned ?? 0) + 6 + s.wave; s.kills = (s.kills ?? 0) + 1;
      if (t.cache) { const e = t.essence * essenceMult; s.essence += e; s.essenceEarned = (s.essenceEarned ?? 0) + e; }
    }
  } else if (id === 'overdrive') { s.odUntil = (s.timeS ?? 0) + ULT_OD_SECS; }
  else { s.aegisUntil = (s.timeS ?? 0) + ULT_AEGIS_SECS; }
  return true;
}
