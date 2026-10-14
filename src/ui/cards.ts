import type { GameState } from '../game/state.js';
import { upgradeCost, type Stat } from './panel.js';
import { workshopCost, type WorkshopStat } from '../state/workshop.js';
export type Card = { name: string; desc: string; cur: (s: GameState) => string; next: (s: GameState) => string };
const FORGE: Record<Stat, Card> = {
  dmg: { name: 'Railguns', desc: 'Main guns. Each level hits harder — your primary DPS lever.',
    cur: s => `${s.dmg} dmg`, next: s => `${Math.round(s.dmg * 1.12 + 2)} dmg` },
  rate: { name: 'Targeting Core', desc: 'Fire rate. More shots per second, melts swarms.',
    cur: s => `${s.rate.toFixed(2)}/s`, next: s => `${(Math.round((s.rate + 0.08) * 100) / 100).toFixed(2)}/s` },
  maxHull: { name: 'Hull Plating', desc: 'Max integrity. Bigger buffer, refills to full on buy.',
    cur: s => `${s.maxHull} HP`, next: s => `${Math.round(s.maxHull * 1.1 + 50)} HP` },
};
export function describeStat(stat: Stat): Card { return FORGE[stat]; }
export function upgradeBlurb(stat: Stat, lvl: number): string { return `Lv ${lvl} • ${upgradeCost(stat, lvl)} flux`; }
const WS: Record<WorkshopStat, Card> = {
  dmg: { name: 'Gun Foundry', desc: 'Permanent +12% railgun damage per level.', cur: s => `x${(1 + 0.12 * (s.workshop?.dmg ?? 0)).toFixed(2)}`, next: s => `x${(1 + 0.12 * ((s.workshop?.dmg ?? 0) + 1)).toFixed(2)}` },
  rate: { name: 'Servo Works', desc: 'Permanent +0.08 shots/s per level.', cur: s => `+${((s.workshop?.rate ?? 0) * 0.08).toFixed(2)}/s`, next: s => `+${(((s.workshop?.rate ?? 0) + 1) * 0.08).toFixed(2)}/s` },
  maxHull: { name: 'Drydock', desc: 'Permanent +10% hull and +50 flat per level.', cur: s => `Lv ${s.workshop?.maxHull ?? 0}`, next: s => `Lv ${(s.workshop?.maxHull ?? 0) + 1}` },
  range: { name: 'Long Scopes', desc: 'Permanent +12 sensor range per level. Shoot roamers earlier.', cur: s => `+${12 * (s.workshop?.range ?? 0)}`, next: s => `+${12 * ((s.workshop?.range ?? 0) + 1)}` },
  regen: { name: 'Nanobot Bay', desc: 'Repairs hull every second, even mid-fight.', cur: s => `${(s.regen ?? 0).toFixed(1)}/s`, next: s => `${((s.regen ?? 0) + 2).toFixed(1)}/s` },
  crit: { name: 'Lucky Coils', desc: 'Chance for 2x critical hits.', cur: s => `${((s.critCh ?? 0) * 100).toFixed(0)}%`, next: s => `${(((s.critCh ?? 0) + 0.02) * 100).toFixed(0)}%` },
  volley: { name: 'Split Battery', desc: 'Engage +1 simultaneous target. Level 3/6/9 unlock it.', cur: s => `${1 + Math.floor((s.volley ?? 0) / 3)} targets`, next: s => `${1 + Math.floor(((s.volley ?? 0) + 1) / 3)} targets` },
  bounce: { name: 'Ricochet Mesh', desc: 'Kills chain to +1 nearby ship. Every 2nd level.', cur: s => `${Math.floor((s.bounce ?? 0) / 2)} chains`, next: s => `${Math.floor(((s.bounce ?? 0) + 1) / 2)} chains` },
};
export function describeWorkshop(stat: WorkshopStat): Card { return WS[stat]; }
