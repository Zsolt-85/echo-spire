// Lab infinite research (spec §3.3): fractional power gain per level,
// real-time cost t = 60 * 1.6^level seconds (continues offline, capped 12h).
// Canonical constants live in balance.ts (plan Global Constraint);
// re-exported here so existing imports keep working.
import {LAB_GAIN_PER_LEVEL,LAB_TIME_BASE_S,LAB_TIME_GROWTH} from '../sim/balance.js';
export {LAB_GAIN_PER_LEVEL,LAB_TIME_BASE_S,LAB_TIME_GROWTH};
export function labGain(level: number): number {
  return level * LAB_GAIN_PER_LEVEL;
}
export function labTime(level: number): number {
  return Math.round(LAB_TIME_BASE_S * Math.pow(LAB_TIME_GROWTH, level));
}
